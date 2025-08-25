import type { Metadata } from "next";
import "./globals.css";
import "./lib/envSetup";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Game Orchard | Talk Your Way Out of Anything",
  description:
    "Woo aliens, sell a lemon, befriend a paranoid turkey. Quick, witty, and slightly unhinged—powered by realtime AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
