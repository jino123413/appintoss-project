import React from 'react';
import type { Axis, Question } from '../types';

interface QuizScreenProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  selectedValue?: Axis;
  errorMessage: string;
  onPick: (questionId: string, value: Axis) => void;
  onPrev: () => void;
  onNext: () => void;
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function QuizScreen({
  question,
  questionIndex,
  totalQuestions,
  selectedValue,
  errorMessage,
  onPick,
  onPrev,
  onNext,
}: QuizScreenProps) {
  const progress = ((questionIndex + 1) / totalQuestions) * 100;
  const isLast = questionIndex === totalQuestions - 1;

  return (
    <section className="space-y-4">
      <article className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onPrev}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeftIcon />
          </button>
          <p className="text-sm font-semibold text-slate-700">
            {questionIndex + 1} / {totalQuestions}
          </p>
          <div className="h-9 w-9" />
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <h2 className="mt-6 text-xl font-bold leading-tight text-slate-900">{question.prompt}</h2>

        <div className="mt-5 grid grid-cols-1 gap-2.5">
          {question.options.map((option) => {
            const selected = selectedValue === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onPick(question.id, option.value)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                  selected
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {errorMessage && <p className="mt-3 text-xs font-medium text-rose-600">{errorMessage}</p>}

        <button
          type="button"
          onClick={onNext}
          className="mt-5 inline-flex w-full items-center justify-center gap-1 rounded-2xl bg-[#0b3a5c] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a3452]"
        >
          <span>{isLast ? '결과 보기' : '다음'}</span>
          {!isLast && <ArrowRightIcon />}
        </button>
      </article>
    </section>
  );
}
