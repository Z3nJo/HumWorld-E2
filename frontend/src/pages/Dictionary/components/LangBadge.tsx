import type { Language } from '../../../features/dictionary/domain/dictionary';

interface LangBadgeProps {
  lang: Language;
  isInactive?: boolean;
}

export const LangBadge = ({ lang, isInactive = false }: LangBadgeProps) => {
  const displayLang = (lang || 'es').toUpperCase();
  return (
    <span
      className={`pill ${isInactive ? 'prov' : ''}`}
      title={lang === 'es' ? 'Español' : 'Inglés'}
    >
      {displayLang}
    </span>
  );
};
