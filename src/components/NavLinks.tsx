"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

export default function NavLinks() {
  const { t } = useLang();
  return (
    <div className="flex items-center gap-4">
      <Link href="/snap" className="text-sm font-semibold text-white/80 hover:text-white">
        {t("snapNav")}
      </Link>
      <Link href="/kids" className="text-sm font-semibold text-white/80 hover:text-white">
        {t("progressMap")}
      </Link>
    </div>
  );
}
