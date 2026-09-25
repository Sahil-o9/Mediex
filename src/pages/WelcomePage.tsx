import { motion } from "framer-motion";
import { useNavigate } from "@/lib/router";
import { UserRound, Stethoscope, ArrowRight, HeartPulse, ShieldCheck, Clock } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import Logo from "@/components/Logo";
import LanguageSelector from "@/components/LanguageSelector";
import { useLanguage } from "@/context/LanguageContext";

export default function WelcomePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <AnimatedBackground>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-12">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-white/60 px-4 py-2 text-sm font-medium text-slate-600 backdrop-blur-sm md:flex">
              <Clock size={16} className="text-medical-600" />
              {t.welcome.kioskMode}
            </div>
            <LanguageSelector compact />
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-10 text-center md:mb-16"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-medical-100 px-4 py-1.5 text-sm font-medium text-medical-700">
              <HeartPulse size={16} />
              {t.welcome.badge}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-800 md:text-6xl">
              {t.welcome.titleLine1}
              <br />
              <span className="bg-gradient-to-r from-medical-600 to-medical-800 bg-clip-text text-transparent">
                {t.welcome.titleLine2}
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-slate-500 md:text-xl">
              {t.welcome.subtitle}
            </p>
          </motion.div>

          <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
            <motion.button
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/patient/auth")}
              className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-3xl bg-white p-8 text-left shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 transition-shadow hover:shadow-2xl hover:shadow-medical-200/40 md:p-10"
            >
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-medical-100/60" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-medical-500 to-medical-700 shadow-lg shadow-medical-500/30">
                <UserRound size={32} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="relative">
                <h2 className="text-2xl font-bold text-slate-800 md:text-3xl">
                  {t.welcome.patientTitle}
                </h2>
                <p className="mt-2 text-base text-slate-500 md:text-lg">{t.welcome.patientDesc}</p>
              </div>
              <div className="relative mt-2 flex items-center gap-2 font-semibold text-medical-600 transition-transform group-hover:gap-3">
                {t.welcome.patientCta}
                <ArrowRight size={20} />
              </div>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/doctor/login")}
              className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-3xl bg-slate-800 p-8 text-left shadow-xl shadow-slate-300/30 transition-shadow hover:shadow-2xl hover:shadow-slate-400/30 md:p-10"
            >
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-slate-700/40" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-white shadow-lg">
                <Stethoscope size={32} className="text-slate-700" strokeWidth={2.5} />
              </div>
              <div className="relative">
                <h2 className="text-2xl font-bold text-white md:text-3xl">
                  {t.welcome.doctorTitle}
                </h2>
                <p className="mt-2 text-base text-slate-300 md:text-lg">{t.welcome.doctorDesc}</p>
              </div>
              <div className="relative mt-2 flex items-center gap-2 font-semibold text-medical-300 transition-transform group-hover:gap-3">
                {t.welcome.doctorCta}
                <ArrowRight size={20} />
              </div>
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-10 flex items-center gap-2 text-sm text-slate-400"
          >
            <ShieldCheck size={16} className="text-medical-500" />
            {t.welcome.privacy}
          </motion.div>
        </main>
      </div>
    </AnimatedBackground>
  );
}
