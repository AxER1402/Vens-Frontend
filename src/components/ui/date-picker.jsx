import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export function DatePicker({ value, onChange, placeholder = "Seleccionar fecha…" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Current view year & month
  const initialDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Close when clicking outside
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

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Get first day of month (0 = Sunday, 1 = Monday...)
  let firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  // Adjust so Monday is 0
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const dateStrFor = (dayNum) => {
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(dayNum).padStart(2, '0');
    return `${viewYear}-${monthStr}-${dayStr}`;
  };

  const handleSelectDay = (dayNum) => {
    onChange(dateStrFor(dayNum));
    setIsOpen(false);
  };

  const todayDate = new Date();
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  const formattedDisplay = () => {
    if (!value) return placeholder;
    const d = new Date(value + 'T00:00:00');
    if (isNaN(d.getTime())) return placeholder;
    return d.toLocaleDateString('es-GT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleToday = () => {
    onChange(todayStr);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="form-control select-trigger"
      >
        <span className="select-trigger-label">
          <CalendarIcon size={15} />
          <span className={`select-trigger-text capitalize ${value ? '' : 'is-placeholder'}`}>
            {formattedDisplay()}
          </span>
        </span>
        <span className="select-trigger-icons">
          <ChevronDown size={15} className="select-caret" />
        </span>
      </button>

      {isOpen && (
        <div className="picker-pop picker-pop-cal animate-in fade-in-0 zoom-in-95">
          {/* Cabecera de navegación */}
          <div className="picker-head">
            <button type="button" className="picker-nav" onClick={prevMonth} title="Mes anterior">
              <ChevronLeft size={16} />
            </button>
            <span className="picker-head-title">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button type="button" className="picker-nav" onClick={nextMonth} title="Mes siguiente">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="cal-grid">
            {WEEKDAYS.map((wd) => (
              <span key={wd} className="cal-dow">{wd}</span>
            ))}

            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <span key={`empty-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const iso = dateStrFor(dayNum);
              const selected = value === iso;
              const today = todayStr === iso;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`cal-day${selected ? ' is-selected' : ''}${today && !selected ? ' is-today' : ''}`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          <div className="picker-foot">
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleToday}>
              Hoy
            </button>
            {value && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { onChange(''); setIsOpen(false); }}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
