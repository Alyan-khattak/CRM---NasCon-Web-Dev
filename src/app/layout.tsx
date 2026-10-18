import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Olema | Agentic AI Done For You",
  description: "Stop firefighting and start scaling with Olema. We build AI agents that handle leads, tickets, and orders from day one. No tech skills needed.",
  openGraph: {
    title: "Olema | Agentic AI Done For You",
    description: "Stop firefighting and start scaling with Olema. We build AI agents that handle leads, tickets, and orders from day one.",
    url: "https://olema.com",
    siteName: "Olema",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Olema | Agentic AI Done For You",
    description: "Stop firefighting and start scaling with Olema. We build AI agents that handle leads, tickets, and orders from day one.",
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

