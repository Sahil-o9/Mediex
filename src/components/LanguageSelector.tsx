import { useEffect, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";
import { LANGUAGES } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Compact language switcher used in the app header and on public screens.
 * The selection is persisted in localStorage by LanguageProvider.
 */
export default function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const active = LANGUAGES.find((item) => item.code === lang) ?? LANGUAGES[0]!;

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t.language.change}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 md:text-sm"
      >
        <Globe size={16} className="text-medical-600" />
        <span className={compact ? "hidden sm:inline" : ""}>{active.label}</span>
        <span className={compact ? "sm:hidden" : "hidden"}>{active.short}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-2xl bg-white py-1 shadow-xl ring-1 ring-slate-200"
        >
          {LANGUAGES.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                role="option"
                aria-selected={item.code === lang}
                onClick={() => {
                  setLang(item.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-medical-50 ${
                  item.code === lang ? "font-semibold text-medical-700" : "text-slate-600"
                }`}
              >
                {item.label}
                {item.code === lang && <Check size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
