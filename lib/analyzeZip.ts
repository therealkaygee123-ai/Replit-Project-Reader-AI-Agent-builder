import AdmZip from "adm-zip";

export type ScriptEntry = {
  name: string;
  command: string;
};

export type AnalysisReport = {
  projectName: string;
  stacks: string[];
  entryPoints: string[];
  scripts: ScriptEntry[];
  envVars: string[];
  runInstructions: string[];
  notes: string[];
};

type PackageJson = {
  name?: string;
  main?: string;
  module?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const TEXT_FILE_REGEX = /\.(ts|tsx|js|jsx|mjs|cjs|py|json|env|md|txt|toml|yaml|yml)$/i;
const MAX_SCAN_SIZE = 200_000;

export function analyzeZip(buffer: Buffer): AnalysisReport {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const fileNames = entries.map((entry) => entry.entryName);
  const projectName = detectProjectName(fileNames);

  const packageJsonEntry = findEntry(entries, "package.json");
  const packageJson = packageJsonEntry ? parsePackageJson(packageJsonEntry.getData()) : null;

  const stacks = detectStacks(fileNames, packageJson);
  const scripts = extractScripts(packageJson);
  const entryPoints = detectEntryPoints(fileNames, packageJson);
  const envVars = detectEnvVars(entries);
  const runInstructions = buildRunInstructions({
    packageJson,
    fileNames,
    scripts,
    entryPoints,
    hasPython: stacks.includes("Python")
  });

  const notes: string[] = [];
  if (entryPoints.length === 0) {
    notes.push("No obvious entry point found. Check README or configuration files.");
  }
  if (envVars.length === 0) {
    notes.push("No environment variables detected via simple scan.");
  }

  return {
    projectName,
    stacks,
    entryPoints,
    scripts,
    envVars,
    runInstructions,
    notes
  };
}

function findEntry(entries: AdmZip.IZipEntry[], fileName: string) {
  return entries.find((entry) => entry.entryName.endsWith(fileName));
}

function detectProjectName(fileNames: string[]): string {
  const rootSegments = fileNames
    .map((name) => name.split("/")[0])
    .filter((segment) => segment.length > 0);
  const [first] = rootSegments;
  if (!first) {
    return "Unknown project";
  }
  const isSingleRoot = rootSegments.every((segment) => segment === first);
  return isSingleRoot ? first : "Replit project";
}

function parsePackageJson(buffer: Buffer): PackageJson | null {
  try {
    return JSON.parse(buffer.toString("utf-8")) as PackageJson;
  } catch {
    return null;
  }
}

function detectStacks(fileNames: string[], packageJson: PackageJson | null): string[] {
  const stacks = new Set<string>();
  const hasPackageJson = Boolean(packageJson);
  const hasPython = fileNames.some((name) =>
    ["requirements.txt", "pyproject.toml", "Pipfile"].some((file) => name.endsWith(file))
  );

  if (hasPackageJson) {
    stacks.add("Node.js");
    const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };
    if (deps.next || fileNames.some((name) => name.includes("next.config"))) {
      stacks.add("Next.js");
    }
    if (deps.vite || fileNames.some((name) => name.includes("vite.config"))) {
      stacks.add("Vite");
    }
    if (deps.react) {
      stacks.add("React");
    }
  }

  if (hasPython) {
    stacks.add("Python");
  }

  if (stacks.size === 0) {
    stacks.add("Unknown");
  }

  return Array.from(stacks);
}

function extractScripts(packageJson: PackageJson | null): ScriptEntry[] {
  const scripts = packageJson?.scripts ?? {};
  return Object.entries(scripts).map(([name, command]) => ({ name, command }));
}

function detectEntryPoints(fileNames: string[], packageJson: PackageJson | null): string[] {
  const entryPoints = new Set<string>();
  const candidates = [
    packageJson?.main,
    packageJson?.module,
    "index.js",
    "index.ts",
    "server.js",
    "server.ts",
    "src/index.js",
    "src/index.ts",
    "src/index.tsx",
    "src/main.tsx",
    "app.py",
    "main.py"
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (fileNames.some((name) => name.endsWith(candidate))) {
      entryPoints.add(candidate);
    }
  }

  return Array.from(entryPoints);
}

function detectEnvVars(entries: AdmZip.IZipEntry[]): string[] {
  const envVars = new Set<string>();
  const envRegexes = [
    /process\.env\.([A-Z0-9_]+)/g,
    /import\.meta\.env\.([A-Z0-9_]+)/g,
    /os\.getenv\(["']([A-Z0-9_]+)["']\)/g,
    /os\.environ\.get\(["']([A-Z0-9_]+)["']\)/g
  ];

  for (const entry of entries) {
    if (entry.isDirectory) {
      continue;
    }

    if (!TEXT_FILE_REGEX.test(entry.entryName)) {
      continue;
    }

    if (entry.header.size > MAX_SCAN_SIZE) {
      continue;
    }

    const content = entry.getData().toString("utf-8");

    for (const regex of envRegexes) {
      let match = regex.exec(content);
      while (match) {
        envVars.add(match[1]);
        match = regex.exec(content);
      }
    }

    if (isEnvExample(entry.entryName)) {
      const envMatches = content
        .split("\n")
        .map((line) => line.split("=")[0].trim())
        .filter((line) => line && !line.startsWith("#"));
      for (const envKey of envMatches) {
        envVars.add(envKey);
      }
    }
  }

  return Array.from(envVars).sort();
}

function isEnvExample(name: string) {
  return name.endsWith(".env.example") || name.endsWith(".env.sample");
}

function buildRunInstructions(options: {
  packageJson: PackageJson | null;
  fileNames: string[];
  scripts: ScriptEntry[];
  entryPoints: string[];
  hasPython: boolean;
}): string[] {
  const instructions: string[] = [];
  const packageManager = detectPackageManager(options.fileNames);

  if (options.packageJson) {
    const installCommand = `${packageManager} install`;
    instructions.push(`Install dependencies: ${installCommand}.`);

    if (options.scripts.length > 0) {
      const devScript = options.scripts.find((script) => script.name === "dev");
      const startScript = options.scripts.find((script) => script.name === "start");
      if (devScript) {
        instructions.push(`Run the dev server: ${packageManager} run ${devScript.name}.`);
      } else if (startScript) {
        instructions.push(`Run the app: ${packageManager} run ${startScript.name}.`);
      }
    } else if (options.entryPoints.length > 0) {
      instructions.push(`Run with Node: node ${options.entryPoints[0]}.`);
    }

    instructions.push("Add required environment variables before starting.");
  }

  if (options.hasPython) {
    instructions.push("Create a virtual environment (python -m venv .venv).");
    instructions.push("Activate the venv and install requirements (pip install -r requirements.txt).");
    if (options.entryPoints.length > 0) {
      const pythonEntry = options.entryPoints.find((entry) => entry.endsWith(".py"));
      if (pythonEntry) {
        instructions.push(`Run the app: python ${pythonEntry}.`);
      }
    }
  }

  if (instructions.length === 0) {
    instructions.push("Inspect README.md or config files for run instructions.");
  }

  return instructions;
}

function detectPackageManager(fileNames: string[]) {
  if (fileNames.some((name) => name.endsWith("pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (fileNames.some((name) => name.endsWith("yarn.lock"))) {
    return "yarn";
  }
  return "npm";
}
