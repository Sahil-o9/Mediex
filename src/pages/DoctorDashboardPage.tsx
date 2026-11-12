import { motion } from "framer-motion";
import { useNavigate } from "@/lib/router";
import {
  LogOut,
  Stethoscope,
  Users,
  FileText,
  Calendar,
  Activity,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import Logo from "@/components/Logo";
import LanguageSelector from "@/components/LanguageSelector";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function DoctorDashboardPage() {
  const navigate = useNavigate();
  const { doctor, logoutDoctor } = useAuth();
  const { t, format } = useLanguage();

  if (!doctor) return null;

  const handleLogout = () => {
    logoutDoctor();
    navigate("/");
  };

  const stats = [
    {
      icon: <Users size={24} />,
      label: t.doctorDash.patientsToday,
      value: "12",
      color: "from-medical-500 to-medical-700",
    },
    {
      icon: <FileText size={24} />,
      label: t.doctorDash.pendingReviews,
      value: "5",
      color: "from-blue-500 to-blue-700",
    },
    {
      icon: <Calendar size={24} />,
      label: t.doctorDash.appointments,
      value: "8",
      color: "from-amber-500 to-amber-700",
    },
    {
      icon: <Activity size={24} />,
      label: t.doctorDash.completed,
      value: "24",
      color: "from-emerald-500 to-emerald-700",
    },
  ];

  const upcomingModules = [
    { icon: <Sparkles size={22} />, title: t.doctorDash.mod1Title, desc: t.doctorDash.mod1Desc },
    { icon: <TrendingUp size={22} />, title: t.doctorDash.mod2Title, desc: t.doctorDash.mod2Desc },
    { icon: <FileText size={22} />, title: t.doctorDash.mod3Title, desc: t.doctorDash.mod3Desc },
    { icon: <Activity size={22} />, title: t.doctorDash.mod4Title, desc: t.doctorDash.mod4Desc },
  ];

  return (
    <AnimatedBackground>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-12">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-white/60 px-4 py-2 text-sm font-medium text-slate-600 backdrop-blur-sm md:flex">
              <Stethoscope size={16} className="text-medical-600" />
              {doctor.name}
            </div>
            <LanguageSelector compact />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-full bg-white/60 px-4 py-2 text-sm font-medium text-slate-600 backdrop-blur-sm transition-colors hover:bg-white/80"
            >
              <LogOut size={16} />
              {t.common.logout}
            </button>
          </div>
        </header>

        <main className="flex flex-1 flex-col px-6 pb-12 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-slate-800 md:text-4xl">{t.doctorDash.title}</h1>
            <p className="mt-2 text-lg text-slate-500">
              {format(t.doctorDash.welcomeBack, { name: doctor.name })}
            </p>
          </motion.div>

          {/* Stats */}
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
              >
                <div
                  className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}
                >
                  {stat.icon}
                </div>
                <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-sm font-medium text-slate-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>
          <p className="-mt-4 mb-8 text-xs text-slate-400">{t.doctorDash.demoNote}</p>

          {/* Upcoming modules */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 md:p-8"
          >
            <div className="mb-6 flex items-center gap-2">
              <Clock size={20} className="text-medical-600" />
              <h2 className="text-xl font-bold text-slate-800">{t.doctorDash.upcomingTitle}</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {upcomingModules.map((mod, i) => (
                <motion.div
                  key={mod.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                  className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 transition-colors hover:bg-slate-100"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-medical-100 text-medical-600">
                    {mod.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-700">{mod.title}</h3>
                    <p className="text-sm text-slate-400">{mod.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </main>
      </div>
    </AnimatedBackground>
  );
}
