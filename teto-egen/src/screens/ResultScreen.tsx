import React from 'react';
import type { AnalysisResult, Tendency } from '../types';

interface ResultScreenProps {
  name: string;
  result: AnalysisResult;
  deepUnlocked: boolean;
  adLoading: boolean;
  onUnlockDeep: () => void;
  onRetry: () => void;
}

function TipIcon({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v18m9-9H3" />
      </svg>
    );
  }
  if (index === 1) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12h16m-8-8v16" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m20 7-8.5 8.5L8 12" />
      <path d="M5 12a7 7 0 1 0 2-4.9" />
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

function tendencyBadgeClass(tendency: Tendency) {
  if (tendency === '테토') {
    return 'bg-[#E6F6F2] text-[#0C7364]';
  }
  if (tendency === '에겐') {
    return 'bg-[#EAF0F8] text-[#215180]';
  }
  return 'bg-[#F2F4F7] text-[#475467]';
}

export function ResultScreen({
  name,
  result,
  deepUnlocked,
  adLoading,
  onUnlockDeep,
  onRetry,
}: ResultScreenProps) {
  return (
    <section className="space-y-4">
      <article className="rounded-3xl border border-white/80 bg-white/92 p-5 shadow-sm">
        <p className="text-xs font-semibold text-slate-500">{name} 님의 오늘 축</p>
        <div className="mt-2 flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${tendencyBadgeClass(result.tendency)}`}>
            {result.tendency}
          </span>
          <h2 className="text-lg font-bold text-slate-900">{result.title}</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">{result.summary}</p>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>테토</span>
            <span>에겐</span>
          </div>
          <div className="relative h-2.5 rounded-full bg-gradient-to-r from-[#0f4f78] via-[#0a7a7b] to-[#80c6b8]">
            <span
              className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900 shadow"
              style={{ left: `${result.axisPosition}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
        </div>
      </article>

      <article className="rounded-3xl border border-white/80 bg-white/92 p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">오늘 액션 3</p>
        <div className="mt-3 space-y-2">
          {result.quickTips.map((tip, index) => (
            <div key={tip} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
              <span className="text-slate-500">
                <TipIcon index={index} />
              </span>
              <p className="text-sm text-slate-700">{tip}</p>
            </div>
          ))}
        </div>
      </article>

      {!deepUnlocked ? (
        <article className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm">
          <div className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <LockIcon />
            <span>심화</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-900">심화 해석 열기</p>
          <p className="mt-1 text-xs text-slate-600">광고 후 3줄 해석을 볼 수 있어요.</p>
          <button
            type="button"
            onClick={onUnlockDeep}
            disabled={adLoading}
            className="mt-3 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {adLoading ? '준비 중...' : '심화 보기'}
          </button>
        </article>
      ) : (
        <article className="rounded-3xl border border-white/80 bg-white/92 p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">심화 해석</p>
          <div className="mt-3 space-y-2">
            {result.deepDive.map((line) => (
              <p key={line} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {line}
              </p>
            ))}
          </div>
        </article>
      )}

      <button
        type="button"
        onClick={onRetry}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        다시 하기
      </button>
    </section>
  );
}
