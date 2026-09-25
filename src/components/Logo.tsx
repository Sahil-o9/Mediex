import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { box: "h-10 w-10", cross: 18, text: "text-lg", sub: "text-[10px]" },
  md: { box: "h-12 w-12", cross: 22, text: "text-2xl", sub: "text-xs" },
  lg: { box: "h-16 w-16", cross: 30, text: "text-4xl", sub: "text-sm" },
};

/** Medical cross mark — the universally recognised healthcare symbol. */
function MedicalCross({ size }: { size: number }) {
  const arm = size * 0.34;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <rect x={12 - arm / 2} y="3" width={arm} height="18" rx={arm / 2.6} fill="currentColor" />
      <rect x="3" y={12 - arm / 2} width="18" height={arm} rx={arm / 2.6} fill="currentColor" />
    </svg>
  );
}

export default function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const s = sizeMap[size];
  const { t } = useLanguage();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative flex items-center justify-center"
      >
        <div className="absolute inset-0 rounded-2xl bg-medical-500/20 pulse-ring" />
        <div
          className={`relative flex ${s.box} items-center justify-center rounded-2xl bg-gradient-to-br from-medical-500 to-medical-700 text-white shadow-lg shadow-medical-500/30`}
        >
          <MedicalCross size={s.cross} />
        </div>
      </motion.div>
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold tracking-tight text-slate-800 ${s.text}`}>{t.app.name}</span>
          <span className={`font-medium uppercase tracking-wider text-medical-600 ${s.sub}`}>
            {t.app.tagline}
          </span>
        </div>
      )}
    </div>
  );
}
