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

  const handleSelectDay = (dayNum) => {
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(dayNum).padStart(2, '0');
    const dateStr = `${viewYear}-${monthStr}-${dayStr}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isSelected = (dayNum) => {
    if (!value) return false;
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(dayNum).padStart(2, '0');
    return value === `${viewYear}-${monthStr}-${dayStr}`;
  };

  const isToday = (dayNum) => {
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(dayNum).padStart(2, '0');
    return todayStr === `${viewYear}-${monthStr}-${dayStr}`;
  };

  const formattedDisplay = () => {
    if (!value) return placeholder;
    const d = new Date(value + 'T00:00:00');
    if (isNaN(d.getTime())) return placeholder;
    return d.toLocaleDateString('es-GT', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="form-control flex items-center justify-between gap-2 text-left cursor-pointer hover:border-brand-slate h-[42px] px-3 py-0 w-full bg-white"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <CalendarIcon size={16} className="text-brand-slate shrink-0" />
          <span className={`capitalize text-sm truncate ${value ? 'text-brand-text font-medium' : 'text-brand-text-muted'}`}>
            {formattedDisplay()}
          </span>
        </div>
        <ChevronDown size={16} className="text-brand-slate shrink-0 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] left-0 mt-1 w-full min-w-[280px] p-4 bg-white border border-brand-border-light rounded-xl shadow-2xl animate-in fade-in-0 zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-brand-border-light">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-md hover:bg-brand-surface-alt text-brand-slate transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-sm text-brand-deep capitalize">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-md hover:bg-brand-surface-alt text-brand-slate transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {WEEKDAYS.map((wd) => (
              <span key={wd} className="text-xs font-semibold text-brand-text-muted">
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots for padding */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8 w-8" />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const selected = isSelected(dayNum);
              const today = isToday(dayNum);

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 w-8 text-xs font-medium rounded-lg flex items-center justify-center transition-all ${
                    selected
                      ? 'bg-[#243757] text-white font-bold shadow-sm'
                      : today
                      ? 'bg-[#F5F3EE] text-[#243757] font-bold border border-[#3A5F6F]'
                      : 'hover:bg-[#F5F3EE] text-[#243757]'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
