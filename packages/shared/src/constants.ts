export const SUPPORTED_LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'cpp'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const JUDGE0_LANGUAGE_IDS: Record<SupportedLanguage, number> = {
  javascript: 63,
  typescript: 74,
  python: 71,
  java: 62,
  cpp: 54,
};

export const INTERVIEW_STATUSES = ['scheduled', 'live', 'completed', 'cancelled'] as const;

export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const RECOMMENDATIONS = ['strong_hire', 'hire', 'no_hire', 'strong_no_hire'] as const;

export type Recommendation = (typeof RECOMMENDATIONS)[number];

export const SIGNAL_TYPES = [
  'tab_hidden',
  'tab_visible',
  'window_blur',
  'window_focus',
  'paste',
] as const;

export type SignalType = (typeof SIGNAL_TYPES)[number];

export const QUESTION_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];
