import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface AnimatedBackgroundProps {
  children: ReactNode;
}

export default function AnimatedBackground({ children }: AnimatedBackgroundProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-medical-50 to-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-medical-200/30 blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-medical-300/20 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 h-72 w-72 rounded-full bg-teal-200/20 blur-3xl" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
