import type { Question } from '../types';

export const QUESTIONS: Question[] = [
  {
    id: 'q1',
    prompt: '새 팀에서 먼저 하는 행동은?',
    options: [
      { value: 'teto', label: '먼저 말 건다' },
      { value: 'egen', label: '분위기 본다' },
    ],
  },
  {
    id: 'q2',
    prompt: '일정이 갑자기 바뀌면?',
    options: [
      { value: 'teto', label: '바로 수정한다' },
      { value: 'egen', label: '이유 먼저 본다' },
    ],
  },
  {
    id: 'q3',
    prompt: '메시지 답장 스타일은?',
    options: [
      { value: 'teto', label: '핵심만 짧게' },
      { value: 'egen', label: '톤까지 맞춘다' },
    ],
  },
  {
    id: 'q4',
    prompt: '결정할 때 더 중요한 건?',
    options: [
      { value: 'teto', label: '속도' },
      { value: 'egen', label: '합의' },
    ],
  },
  {
    id: 'q5',
    prompt: '휴일 계획은 보통?',
    options: [
      { value: 'teto', label: '즉흥형' },
      { value: 'egen', label: '여유형' },
    ],
  },
  {
    id: 'q6',
    prompt: '갈등이 생기면?',
    options: [
      { value: 'teto', label: '바로 정리' },
      { value: 'egen', label: '온도 먼저 낮춤' },
    ],
  },
  {
    id: 'q7',
    prompt: '회의에서 먼저 꺼내는 건?',
    options: [
      { value: 'teto', label: '결론' },
      { value: 'egen', label: '맥락' },
    ],
  },
  {
    id: 'q8',
    prompt: '선물 고를 때 기준은?',
    options: [
      { value: 'teto', label: '실용성' },
      { value: 'egen', label: '취향 정밀도' },
    ],
  },
  {
    id: 'q9',
    prompt: '사진 업로드 타이밍은?',
    options: [
      { value: 'teto', label: '찍고 바로' },
      { value: 'egen', label: '고르고 올림' },
    ],
  },
  {
    id: 'q10',
    prompt: '오늘 에너지는 어느 쪽?',
    options: [
      { value: 'teto', label: '실행 모드' },
      { value: 'egen', label: '관찰 모드' },
    ],
  },
];
