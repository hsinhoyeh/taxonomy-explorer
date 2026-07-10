"use client";

import { useChildName } from "@/lib/useChildName";
import { useLang } from "@/lib/i18n";

export default function NameBar() {
  const [name, setName] = useChildName();
  const { t } = useLang();

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="child-name" className="text-white/80 whitespace-nowrap">
        {t("childName")}:
      </label>
      <input
        id="child-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("childNamePlaceholder")}
        className="w-28 rounded-full bg-white/20 placeholder-white/60 text-white px-3 py-1 outline-none focus:ring-2 focus:ring-white/60"
      />
    </div>
  );
}
