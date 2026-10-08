import type { StatusFilterOption } from '../../../features/dictionary/domain/dictionary';
import './StatusFilter.css';

interface StatusFilterProps {
  value: StatusFilterOption;
  onChange: (value: StatusFilterOption) => void;
}

export const StatusFilter = ({ value, onChange }: StatusFilterProps) => {
  return (
    <div className="seg" role="group" aria-label="Filtro de estado">
      <button
        type="button"
        className={value === 'active' ? 'on' : ''}
        onClick={() => onChange('active')}
      >
        Solo activos
      </button>
      <button
        type="button"
        className={value === 'inactive' ? 'on' : ''}
        onClick={() => onChange('inactive')}
      >
        Solo inactivos
      </button>
      <button
        type="button"
        className={value === 'all' ? 'on' : ''}
        onClick={() => onChange('all')}
      >
        Todos
      </button>
    </div>
  );
};
