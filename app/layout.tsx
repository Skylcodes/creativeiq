import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  adjustFontFallback: true,
  display: "swap",
});

export const metadata: Metadata = {
  title: "CreativeIQ — AI Funnel Intelligence for DTC Brands",
  description:
    "Stop launching ads blind. CreativeIQ runs 5 AI agents against your ad creative and landing page together — delivering a full funnel intelligence report before you spend on Meta or TikTok.",
  openGraph: {
    title: "CreativeIQ — AI Funnel Intelligence for DTC Brands",
    description:
      "Stress-test your entire ad funnel with 5 specialized AI agents. Ad analysis, conversion scoring, ICP simulation, and a prioritized action plan — in minutes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full scroll-smooth`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
