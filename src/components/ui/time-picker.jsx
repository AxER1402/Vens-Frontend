import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';

/** Franja de atención: 07:00 a 19:00 en bloques de 30 minutos */
const buildSlots = () => {
  const slots = [];
  for (let h = 7; h <= 19; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    if (h !== 19) slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
};

const SLOTS = buildSlots();
const MORNING = SLOTS.filter(t => Number(t.split(':')[0]) < 12);
const AFTERNOON = SLOTS.filter(t => Number(t.split(':')[0]) >= 12);

const format12H = (time24) => {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

export function TimePicker({ value, onChange, placeholder = "Seleccionar hora…" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (timeStr) => {
    onChange(timeStr);
    setIsOpen(false);
  };

  const renderSlots = (list) => (
    <div className="time-grid">
      {list.map((t) => {
        const selected = value === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => handleSelect(t)}
            className={`time-slot${selected ? ' is-selected' : ''}`}
          >
            {format12H(t)}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="form-control select-trigger"
      >
        <span className="select-trigger-label">
          <Clock size={15} />
          <span className={`select-trigger-text ${value ? '' : 'is-placeholder'}`}>
            {value ? format12H(value) : placeholder}
          </span>
        </span>
        <span className="select-trigger-icons">
          {value && !SLOTS.includes(value) && <Check size={13} />}
          <ChevronDown size={15} className="select-caret" />
        </span>
      </button>

      {isOpen && (
        <div className="picker-pop animate-in fade-in-0 zoom-in-95" style={{ maxHeight: 320, overflowY: 'auto' }}>
          <div className="picker-label">Mañana</div>
          {renderSlots(MORNING)}

          <div className="picker-label" style={{ paddingTop: 10 }}>Tarde</div>
          {renderSlots(AFTERNOON)}

          {/* Cualquier otra hora fuera de los bloques predefinidos */}
          <div className="picker-foot">
            <span className="picker-label" style={{ padding: 0, whiteSpace: 'nowrap' }}>Otra hora</span>
            <input
              type="time"
              className="form-control"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
