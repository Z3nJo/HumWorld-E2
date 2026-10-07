import './SearchBar.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  count: number;
}

export const SearchBar = ({ value, onChange, count }: SearchBarProps) => {
  return (
    <div className="dict-search-wrapper">
      <div className="dict-search-input-box">
        <input
          type="text"
          className="inp"
          placeholder="Buscar término…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Buscar término"
        />
        {value && (
          <button
            type="button"
            className="dict-search-clear-btn"
            onClick={() => onChange('')}
            aria-label="Limpiar búsqueda"
          >
            ×
          </button>
        )}
      </div>

      <span className="meta">
        {count} {count === 1 ? 'término' : 'términos'}
      </span>
    </div>
  );
};
