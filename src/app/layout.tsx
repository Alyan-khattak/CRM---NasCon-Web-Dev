import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Financify — Connected Customer & Business Operations",
  description: "Bring leads, customer conversations, sales pipelines, appointments, and payment activity together in one connected business workspace with Financify.",
  openGraph: {
    title: "Financify — Connected Customer & Business Operations",
    description: "Bring leads, customer conversations, sales pipelines, appointments, and payment activity together in one connected business workspace with Financify.",
    url: "https://financify.si",
    siteName: "Financify",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Financify — Connected Customer & Business Operations",
    description: "Bring leads, customer conversations, sales pipelines, appointments, and payment activity together in one connected business workspace with Financify.",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}

