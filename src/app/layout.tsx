import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import NameBar from "@/components/NameBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Taxonomy Explorer",
  description: "An interactive map of what kids learn, for families to explore together.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <Link href="/" className="font-extrabold text-xl">
            🧭 Taxonomy Explorer
          </Link>
          <NameBar />
        </header>
        {children}
        <footer className="text-center text-xs text-slate-400 py-6 px-6">
          Built on the{" "}
          <a
            href="https://github.com/withmarbleapp/os-taxonomy"
            className="underline"
          >
            Marble Skill Taxonomy (v1)
          </a>{" "}
          © Generative Spark, Inc. (Marble) ·{" "}
          <a href="https://withmarble.com" className="underline">
            withmarble.com
          </a>{" "}
          · licensed under ODbL 1.0 (database) and CC BY-SA 4.0 (content).
        </footer>
      </body>
    </html>
  );
}
