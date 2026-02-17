import React from 'react';

interface HomeScreenProps {
  name: string;
  streak: number;
  onNameChange: (value: string) => void;
  onStart: () => void;
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v5m0 10v5m10-10h-5M7 12H2m16.2-6.2-3.5 3.5m-5.4 5.4-3.5 3.5m0-12.4 3.5 3.5m5.4 5.4 3.5 3.5" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12h4l2.2-4 3.6 8 2.5-5H22" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-1.5 text-xs font-medium text-emerald-700">
      {icon}
      <span>{label}</span>
    </div>
  );
}

export function HomeScreen({ name, streak, onNameChange, onStart }: HomeScreenProps) {
  const canStart = name.trim().length > 0;

  return (
    <section className="space-y-4">
      <article className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-emerald-700">테토 · 에겐 진단</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">넌 테토야 에겐이야</h1>
          </div>
          {streak > 0 && (
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {streak}일 연속
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <FeaturePill icon={<PulseIcon />} label="10문항" />
          <FeaturePill icon={<SparkIcon />} label="30초" />
          <FeaturePill icon={<LockIcon />} label="심화" />
        </div>

        <div className="mt-4">
          <label htmlFor="name" className="sr-only">
            이름
          </label>
          <input
            id="name"
            value={name}
            maxLength={12}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="이름"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500"
          />
        </div>

        <button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          className="mt-4 w-full rounded-2xl bg-[#0b3a5c] px-4 py-3 text-sm font-semibold text-white transition enabled:hover:bg-[#0a3452] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          시작
        </button>
      </article>
    </section>
  );
}
