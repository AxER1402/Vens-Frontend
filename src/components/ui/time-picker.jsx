import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';

const MORNING_TIMES = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'
];
const AFTERNOON_TIMES = [
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
];

const format12H = (time24) => {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
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

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="form-control flex items-center justify-between gap-2 text-left cursor-pointer hover:border-brand-slate h-[42px] px-3 py-0 w-full bg-white"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Clock size={16} className="text-brand-slate shrink-0" />
          <span className={`text-xs sm:text-sm truncate ${value ? 'text-brand-text font-medium' : 'text-brand-text-muted'}`}>
            {value ? format12H(value) : placeholder}
          </span>
        </div>
        <ChevronDown size={16} className="text-brand-slate shrink-0 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] right-0 mt-1 w-full min-w-[240px] p-3 bg-white border border-brand-border-light rounded-xl shadow-2xl animate-in fade-in-0 zoom-in-95 max-h-[280px] overflow-y-auto">
          <div className="text-xs font-semibold text-brand-text-muted mb-2 px-1">
            ☀️ Mañana
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {MORNING_TIMES.map((t) => {
              const selected = value === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleSelect(t)}
                  className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all flex items-center justify-between ${
                    selected
                      ? 'bg-brand-deep text-white border-brand-deep shadow-xs'
                      : 'bg-brand-surface text-brand-text border-brand-border-light hover:border-brand-slate hover:bg-brand-surface-alt'
                  }`}
                >
                  <span>{format12H(t)}</span>
                  {selected && <Check size={12} className="text-white" />}
                </button>
              );
            })}
          </div>

          <div className="text-xs font-semibold text-brand-text-muted mb-2 px-1 border-t border-brand-border-light pt-2">
            🌙 Tarde
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {AFTERNOON_TIMES.map((t) => {
              const selected = value === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleSelect(t)}
                  className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all flex items-center justify-between ${
                    selected
                      ? 'bg-brand-deep text-white border-brand-deep shadow-xs'
                      : 'bg-brand-surface text-brand-text border-brand-border-light hover:border-brand-slate hover:bg-brand-surface-alt'
                  }`}
                >
                  <span>{format12H(t)}</span>
                  {selected && <Check size={12} className="text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
