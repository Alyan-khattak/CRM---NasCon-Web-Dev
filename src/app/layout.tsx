import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Financify — Connected Customer & Business Operations",
  description: "Manage leads, pipelines, payments, and appointments in one workspace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
