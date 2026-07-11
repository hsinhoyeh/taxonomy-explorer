import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import LangToggle from "@/components/LangToggle";
import PageTransition from "@/components/PageTransition";
import NavLinks from "@/components/NavLinks";
import AuthArea from "@/components/AuthArea";
import { LangProvider } from "@/lib/i18n";
import { ProfilesProvider } from "@/lib/profiles";
import { authEnabled } from "@/auth";
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
        <LangProvider>
          <ProfilesProvider>
            <header className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-5">
                <Link href="/" className="font-extrabold text-xl">
                  🧭 Taxonomy Explorer
                </Link>
                <NavLinks />
              </div>
              <div className="flex items-center gap-3">
                <ProfileSwitcher />
                <LangToggle />
                <AuthArea enabled={authEnabled} />
              </div>
            </header>
            <PageTransition>{children}</PageTransition>
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
          </ProfilesProvider>
        </LangProvider>
      </body>
    </html>
  );
}
