import { motion } from 'framer-motion';
import { Activity, Stethoscope, HeartPulse } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: 28, text: 'text-lg', sub: 'text-[10px]' },
  md: { icon: 36, text: 'text-2xl', sub: 'text-xs' },
  lg: { icon: 52, text: 'text-4xl', sub: 'text-sm' },
};

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const s = sizeMap[size];
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="relative flex items-center justify-center"
      >
        <div className="absolute inset-0 rounded-2xl bg-medical-500/20 pulse-ring" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-medical-500 to-medical-700 shadow-lg shadow-medical-500/30">
          <HeartPulse size={s.icon} className="text-white" strokeWidth={2.5} />
        </div>
      </motion.div>
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold tracking-tight text-slate-800 ${s.text}`}>Mediex</span>
          <span className={`font-medium uppercase tracking-wider text-medical-600 ${s.sub}`}>
            AI Clinical History Assistant
          </span>
        </div>
      )}
    </div>
  );
}
