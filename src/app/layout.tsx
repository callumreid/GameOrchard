import type { Metadata } from "next";
import "./globals.css";
import "./lib/envSetup";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://gameorchard.beer"),
  title: "Game Orchard | Talk Your Way Out of Anything",
  description:
    "Woo aliens, sell a lemon, befriend a paranoid turkey. Quick, witty, and slightly unhinged—powered by realtime AI.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Game Orchard | Talk Your Way Out of Anything",
    description:
      "Woo aliens, sell a lemon, befriend a paranoid turkey. Quick, witty, and slightly unhinged—powered by realtime AI.",
    url: "https://gameorchard.beer",
    siteName: "Game Orchard",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Game Orchard",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Game Orchard | Talk Your Way Out of Anything",
    description:
      "Woo aliens, sell a lemon, befriend a paranoid turkey. Quick, witty, and slightly unhinged—powered by realtime AI.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
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
