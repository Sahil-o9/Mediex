import { motion } from "framer-motion";
import { useNavigate } from "@/lib/router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  HeartPulse,
  MapPin,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
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
            <div className="hidden items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/70 md:flex">
              <HeartPulse size={16} className="text-medical-600" />
              {t.welcome.kioskMode}
            </div>
            <LanguageSelector compact />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 pb-8 md:px-10 lg:px-12">
          <section className="grid items-center gap-10 py-5 md:grid-cols-[1fr_0.92fr] lg:gap-16 lg:py-8">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center md:text-left"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-medical-200 bg-white/75 px-4 py-2 text-sm font-semibold text-medical-800 shadow-sm">
                <HeartPulse size={17} />
                {t.welcome.badge}
              </div>
              <h1 className="max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
                {t.welcome.titleLine1}
                <span className="mt-1 block text-medical-700">{t.welcome.titleLine2}</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-600 md:mx-0 md:text-xl">
                {t.welcome.subtitle}
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
                <button
                  type="button"
                  onClick={() => navigate("/patient/auth")}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-medical-700 px-5 py-3 font-semibold text-white shadow-lg shadow-medical-700/20 transition hover:-translate-y-0.5 hover:bg-medical-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-600 focus-visible:ring-offset-2"
                >
                  {t.welcome.patientCta}
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/doctor/login")}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-5 py-3 font-semibold text-slate-700 transition hover:border-medical-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-600 focus-visible:ring-offset-2"
                >
                  <Stethoscope size={18} />
                  {t.welcome.doctorCta}
                </button>
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-medium text-slate-600 md:justify-start">
                {[
                  t.welcome.featureTriage,
                  t.welcome.featureDiscovery,
                  t.welcome.featureBooking,
                ].map((feature) => (
                  <span key={feature} className="inline-flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-medical-100 text-medical-700">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    {feature}
                  </span>
                ))}
              </div>
            </motion.div>

            <DoctorSearchPreview
              eyebrow={t.welcome.posterEyebrow}
              title={t.welcome.posterTitle}
              searchLabel={t.welcome.previewSearch}
              locationLabel={t.welcome.previewLocation}
              sampleLabel={t.welcome.previewSample}
              actionLabel={t.welcome.previewCta}
              onExplore={() => navigate("/patient/auth")}
              doctors={[
                {
                  name: t.welcome.sampleDoctor1,
                  specialty: t.welcome.sampleSpecialty1,
                  initials: "AS",
                  availability: t.welcome.sampleAvailability1,
                },
                {
                  name: t.welcome.sampleDoctor2,
                  specialty: t.welcome.sampleSpecialty2,
                  initials: "RV",
                  availability: t.welcome.sampleAvailability2,
                },
              ]}
            />
          </section>

          <section
            aria-label={t.welcome.choosePortal}
            className="grid gap-4 border-t border-slate-200/80 pt-6 sm:grid-cols-2"
          >
            <button
              type="button"
              onClick={() => navigate("/patient/auth")}
              className="group flex items-center gap-4 rounded-2xl border border-white/80 bg-white/85 p-5 text-left shadow-md shadow-slate-200/50 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-600"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-medical-100 text-medical-700">
                <UserRound size={23} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-slate-900">{t.welcome.patientTitle}</span>
                <span className="mt-1 block text-sm text-slate-600">{t.welcome.patientDesc}</span>
                <span className="mt-2 block text-xs font-medium text-medical-700">
                  {t.welcome.patientDetails}
                </span>
              </span>
              <ArrowRight
                size={19}
                className="shrink-0 text-medical-700 transition-transform group-hover:translate-x-1"
              />
            </button>

            <button
              type="button"
              onClick={() => navigate("/doctor/login")}
              className="group flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-800 p-5 text-left shadow-md shadow-slate-300/40 transition hover:-translate-y-0.5 hover:bg-slate-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-600 focus-visible:ring-offset-2"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-slate-800">
                <Stethoscope size={23} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-white">{t.welcome.doctorTitle}</span>
                <span className="mt-1 block text-sm text-slate-300">{t.welcome.doctorDesc}</span>
                <span className="mt-2 block text-xs font-medium text-teal-200">
                  {t.welcome.doctorDetails}
                </span>
              </span>
              <ArrowRight
                size={19}
                className="shrink-0 text-teal-300 transition-transform group-hover:translate-x-1"
              />
            </button>
          </section>

          <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
            <ShieldCheck size={15} className="shrink-0 text-medical-700" />
            {t.welcome.privacy}
          </p>
        </main>
      </div>
    </AnimatedBackground>
  );
}

function DoctorSearchPreview({
  eyebrow,
  title,
  searchLabel,
  locationLabel,
  sampleLabel,
  actionLabel,
  onExplore,
  doctors,
}: {
  eyebrow: string;
  title: string;
  searchLabel: string;
  locationLabel: string;
  sampleLabel: string;
  actionLabel: string;
  onExplore: () => void;
  doctors: { name: string; specialty: string; initials: string; availability: string }[];
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, delay: 0.1 }}
      aria-label={title}
      className="relative mx-auto w-full max-w-xl overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/95 p-5 shadow-2xl shadow-teal-950/10 sm:p-7"
    >
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-medical-100/80"
      />
      <div className="relative">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-medical-700 text-white shadow-md shadow-medical-700/20">
              <HeartPulse size={21} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-medical-700">
                Mediex
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-700">{eyebrow}</p>
            </div>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
            {sampleLabel}
          </span>
        </div>

        <h2 className="mb-4 text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
        <div className="mb-4 grid gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
          <div className="flex min-w-0 items-center gap-2 rounded-xl bg-white px-3 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
            <Search size={17} className="shrink-0 text-medical-700" />
            <span className="truncate">{searchLabel}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-xl bg-white px-3 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
            <MapPin size={17} className="shrink-0 text-medical-700" />
            <span className="truncate">{locationLabel}</span>
          </div>
          <button
            type="button"
            onClick={onExplore}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-medical-700 px-4 text-sm font-semibold text-white transition hover:bg-medical-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-600 focus-visible:ring-offset-2"
          >
            <Search size={17} />
            <span>{actionLabel}</span>
          </button>
        </div>

        <div className="space-y-3">
          {doctors.map((doctor) => (
            <div
              key={doctor.name}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-medical-100 to-sky-100 text-sm font-bold text-medical-800 ring-2 ring-white">
                {doctor.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-900">
                  {doctor.name}
                </span>
                <span className="mt-1 block truncate text-xs text-slate-600">
                  {doctor.specialty}
                </span>
                <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-medical-700">
                  <CalendarDays size={13} />
                  {doctor.availability}
                </span>
              </span>
              <Clock3 size={16} className="hidden shrink-0 text-slate-500 sm:block" />
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
