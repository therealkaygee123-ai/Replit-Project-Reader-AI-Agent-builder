import { NextResponse } from "next/server";
import { analyzeZip } from "@/lib/analyzeZip";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.text("Missing zip file.", { status: 400 });
  }

  if (!file.name.endsWith(".zip")) {
    return NextResponse.text("Please upload a .zip file.", { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const report = analyzeZip(buffer);
  return NextResponse.json(report);
}
