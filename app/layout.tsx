import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Replit Reader",
  description: "Upload a Replit project and get a runnable report."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <div>
              <h1>Replit Reader</h1>
              <p>Analyze a zipped Replit project and generate run instructions.</p>
            </div>
          </header>
          <main className="app-main">{children}</main>
          <footer className="app-footer">
            <span>Phase 1: Project analyzer · Phase 2: AI Agent (toggle)</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
