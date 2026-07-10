"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

export default function NavLinks() {
  const { t } = useLang();
  return (
    <Link href="/kids" className="text-sm font-semibold text-white/80 hover:text-white">
      {t("progressMap")}
    </Link>
  );
}
