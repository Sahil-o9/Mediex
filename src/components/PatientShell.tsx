import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@/lib/router";
import { useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MessageSquareHeart,
  FileText,
  Hospital,
  CalendarCheck,
  Siren,
  UserRound,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import Logo from "@/components/Logo";
import LanguageSelector from "@/components/LanguageSelector";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export function useNavItems() {
  const { t } = useLanguage();
  return [
    { to: "/patient/home", label: t.nav.dashboard, icon: LayoutDashboard },
    { to: "/patient/assistant", label: t.nav.assistant, icon: MessageSquareHeart },
    { to: "/patient/reports", label: t.nav.reports, icon: FileText },
    { to: "/patient/hospitals", label: t.nav.hospitals, icon: Hospital },
    { to: "/patient/appointments", label: t.nav.appointments, icon: CalendarCheck },
    { to: "/patient/emergency", label: t.nav.emergency, icon: Siren },
    { to: "/patient/profile", label: t.nav.profile, icon: UserRound },
  ];
}

interface PatientShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function PatientShell({ title, subtitle, children }: PatientShellProps) {
  const { patient, logoutPatient } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navItems = useNavItems();

  const handleLogout = () => {
    logoutPatient();
    navigate("/");
  };

  const nav = (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-medical-600 text-white shadow-sm shadow-medical-500/30"
                : "text-slate-600 hover:bg-medical-50 hover:text-medical-700"
            }`}
          >
            <Icon size={18} />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-medical-50 to-slate-100">
      <div className="mx-auto flex w-full max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col justify-between border-r border-slate-200/70 bg-white/70 px-5 py-6 backdrop-blur-sm lg:flex">
          <div>
            <div className="flex items-center justify-between gap-2">
              <Link to="/patient/home">
                <Logo size="sm" />
              </Link>
            </div>
            <div className="mt-4">
              <LanguageSelector />
            </div>
            <div className="mt-6">{nav}</div>
          </div>
          <div className="space-y-3">
            {patient && (
              <div className="rounded-2xl bg-medical-50 p-3 ring-1 ring-medical-100">
                <p className="truncate text-sm font-semibold text-slate-700">{patient.fullName}</p>
                <p className="text-xs font-medium text-medical-700">{patient.patientId}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <LogOut size={18} />
              {t.common.logout}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-md md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setOpen(true)}
                aria-label={t.nav.openMenu}
                className="rounded-xl bg-white p-2 text-slate-600 ring-1 ring-slate-200 lg:hidden"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-slate-800 md:text-2xl">{title}</h1>
                {subtitle && (
                  <p className="truncate text-xs text-slate-500 md:text-sm">{subtitle}</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="lg:hidden">
                <LanguageSelector compact />
              </div>
              <Link
                to="/patient/emergency"
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 md:px-4 md:text-sm"
              >
                <Siren size={16} />
                {t.common.emergency}
              </Link>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>

          <footer className="px-4 pb-8 text-xs text-slate-400 md:px-8">
            {t.footer.disclaimer}
          </footer>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col justify-between bg-white px-5 py-6 shadow-2xl">
            <div>
              <div className="flex items-center justify-between">
                <Logo size="sm" showText={false} />
                <button
                  onClick={() => setOpen(false)}
                  aria-label={t.nav.closeMenu}
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-4">
                <LanguageSelector />
              </div>
              <div className="mt-6">{nav}</div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              <LogOut size={18} />
              {t.common.logout}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
