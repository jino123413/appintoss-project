export type Axis = 'teto' | 'egen';

export type Tendency = '테토' | '에겐' | '밸런스';

export interface QuestionOption {
  value: Axis;
  label: string;
}

export interface Question {
  id: string;
  prompt: string;
  options: [QuestionOption, QuestionOption];
}

export interface AnalysisResult {
  tendency: Tendency;
  title: string;
  summary: string;
  axisPosition: number;
  quickTips: string[];
  deepDive: string[];
}

export interface ProfileRecord {
  dateKey: string;
  name: string;
  tendency: Tendency;
}

export interface ProfileStore {
  lastVisit: string;
  streak: number;
  records: ProfileRecord[];
}
