import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export function Combobox({
  items = [],
  value,
  onChange,
  placeholder = "Seleccionar…",
  searchPlaceholder = "Buscar…",
  emptyText = "No se encontraron resultados.",
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Normalize items to { value, label }
  const normalizedItems = items.map(item => {
    if (typeof item === 'object' && item !== null) {
      return { value: item.value ?? item.label, label: item.label ?? item.value };
    }
    return { value: item, label: item };
  });

  const selectedItem = normalizedItems.find(i => i.value === value);

  // Filter items
  const filteredItems = normalizedItems.filter(i =>
    String(i.label).toLowerCase().includes(search.toLowerCase())
  );

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

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (itemValue) => {
    onChange(itemValue);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="form-control flex items-center justify-between gap-2 text-left cursor-pointer hover:border-brand-slate h-[42px] px-3 py-0 w-full bg-white"
      >
        <span className={`truncate text-sm ${selectedItem ? 'text-brand-text font-medium' : 'text-brand-text-muted'}`}>
          {selectedItem ? selectedItem.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selectedItem && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-brand-surface-alt text-brand-text-muted hover:text-brand-text transition-colors cursor-pointer"
              title="Limpiar selección"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            className="text-brand-slate transition-transform duration-200"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
          />
        </div>
      </button>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="combobox-dropdown animate-in fade-in-0 zoom-in-95">
          {/* Search Bar */}
          <div className="combobox-search-wrapper">
            <Search size={15} className="absolute left-3 text-brand-slate pointer-events-none z-10" />
            <input
              ref={inputRef}
              type="text"
              className="combobox-search-input"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Items List */}
          <div className="combobox-list">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-sm text-brand-text-muted">
                {emptyText}
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.value === value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleSelect(item.value)}
                    className={`combobox-item ${isSelected ? 'selected' : ''}`}
                  >
                    <span className="truncate">{item.label}</span>
                    {isSelected && <Check size={16} className="text-white shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
