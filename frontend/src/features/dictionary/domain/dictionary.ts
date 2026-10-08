export type Language = 'es' | 'en';
export type StatusFilterOption = 'active' | 'inactive' | 'all';
export type LanguageFilterOption = Language | 'all';

export interface Term {
  id: number;
  word: string;
  lang: Language;
  value: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTermInput {
  word: string;
  lang: Language;
  value: number;
  active?: boolean;
}

export interface PatchTermInput {
  word?: string;
  lang?: Language;
  value?: number;
  active?: boolean;
}

export const compareTerms = (a: Term, b: Term) => (
  a.word.localeCompare(b.word, 'es', { sensitivity: 'base' })
  || a.lang.localeCompare(b.lang)
  || a.id - b.id
);
