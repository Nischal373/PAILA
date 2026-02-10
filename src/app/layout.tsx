import type { Metadata } from "next";
import { Space_Grotesk, Manrope } from "next/font/google";
import "./globals.css";
import TopNav from "@/components/layout/TopNav";

const nepaliDisplay = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const nepaliBody = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paila · Nepal Pothole Radar",
  description:
    "Real-time pothole reporting, voting, and fix tracking for Nepal-wide departments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${nepaliDisplay.variable} ${nepaliBody.variable} min-h-screen bg-white text-slate-900 antialiased`}
      >
        <TopNav />
        {children}
      </body>
    </html>
  );
}
