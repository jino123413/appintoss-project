import { QUESTIONS } from '../data/questions';
import type { AnalysisResult, Axis, Tendency } from '../types';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hashText(input: string) {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPreviousDateKey(dateKey: string) {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  parsed.setDate(parsed.getDate() - 1);
  return getDateKey(parsed);
}

export function createAnalysis(name: string, answers: Record<string, Axis>): AnalysisResult {
  const scoreFromAnswers = QUESTIONS.reduce((acc, question) => {
    return acc + (answers[question.id] === 'teto' ? 1 : -1);
  }, 0);

  const nameBias = (hashText(name) % 3) - 1;
  const score = scoreFromAnswers + nameBias;
  const axisPosition = clamp(50 + score * 6, 8, 92);

  let tendency: Tendency = '밸런스';
  if (score >= 3) {
    tendency = '테토';
  } else if (score <= -3) {
    tendency = '에겐';
  }

  if (tendency === '테토') {
    return {
      tendency,
      title: '빠른 실행형',
      summary: '결정 속도가 빠르고 추진력이 강해요.',
      axisPosition,
      quickTips: ['오늘 목표 1개만 먼저 끝내기', '의견 말하기 전 2초 점검', '대화 마무리는 한 줄 결론'],
      deepDive: ['오전에는 실행, 오후에는 정리 루틴이 좋아요.', '큰 결정은 속도+근거를 함께 남기면 완성도가 올라가요.', '오늘은 짧은 집중 세션이 효율적이에요.'],
    };
  }

  if (tendency === '에겐') {
    return {
      tendency,
      title: '섬세 조율형',
      summary: '맥락을 읽고 분위기를 안정시키는 힘이 좋아요.',
      axisPosition,
      quickTips: ['핵심 요청은 한 문장으로', '결정 마감 시간 먼저 잡기', '공감 후 결론 순서로 말하기'],
      deepDive: ['대화 초반에 목적을 먼저 공유하면 피로가 줄어요.', '오늘은 작은 선택을 빠르게 끝내는 연습이 좋아요.', '저녁에는 혼자 정리 시간이 집중력을 높여줘요.'],
    };
  }

  return {
    tendency,
    title: '균형 하이브리드',
    summary: '실행과 조율이 균형 있게 잡힌 날이에요.',
    axisPosition,
    quickTips: ['일정은 우선순위 2개만 유지', '회의는 시작 5분에 결론 후보', '관계 대화는 질문 1개 추가'],
    deepDive: ['상황에 따라 모드 전환이 빨라 강점이 큽니다.', '중요 일정은 시작 시간 고정이 효과적이에요.', '오늘은 균형보다 선택 선명도를 조금 더 높이면 좋아요.'],
  };
}
