export type Language = 'es' | 'en';

export type StatusFilterOption = 'active' | 'inactive' | 'all';

export interface Term {
  id: number;
  word: string;
  lang: Language;
  value: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTermDto {
  word: string;
  lang: Language;
  value: number;
  active?: boolean;
}

export interface PatchTermDto {
  word?: string;
  lang?: Language;
  value?: number;
  active?: boolean;
}
