import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export function Combobox({
  items = [],
  value,
  onChange,
  placeholder = "Seleccionar…",
  searchPlaceholder = "Buscar…",
  emptyText = "No se encontraron resultados.",
  onAddNew = null,
  addNewText = "+ Registrar nuevo",
  icon = null,
  clearable = true,
  /** Por defecto el buscador sólo aparece cuando la lista lo amerita */
  searchable = null,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Normalize items to { value, label }
  const normalizedItems = items.map(item => {
    if (typeof item === 'object' && item !== null) {
      return {
        value: item.value ?? item.label,
        label: item.label ?? item.value,
        busqueda: item.busqueda ?? null,
      };
    }
    return { value: item, label: item };
  });

  const selectedItem = normalizedItems.find(i => String(i.value) === String(value));
  const showSearch = searchable ?? (normalizedItems.length > 6 || Boolean(onAddNew));

  // Filter items
  // Un item puede traer `busqueda` con lo que además debería encontrarlo: el
  // teléfono de un paciente, por ejemplo. Quien llama por teléfono lo tiene a
  // mano antes que el nombre completo.
  const filteredItems = normalizedItems.filter(i => {
    const aguja = search.toLowerCase();
    const pajar = `${i.label} ${i.busqueda ?? ''}`.toLowerCase();
    return pajar.includes(aguja);
  });

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
    if (isOpen && showSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, showSearch]);

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
      {/* Disparador: hereda tamaño, color y radio de .form-control */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="form-control select-trigger"
      >
        <span className="select-trigger-label">
          {icon}
          <span className={`select-trigger-text ${selectedItem ? '' : 'is-placeholder'}`}>
            {selectedItem ? selectedItem.label : placeholder}
          </span>
        </span>
        <span className="select-trigger-icons">
          {clearable && selectedItem && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="select-trigger-clear"
              title="Limpiar selección"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown size={15} className="select-caret" />
        </span>
      </button>

      {isOpen && (
        <div className="picker-pop animate-in fade-in-0 zoom-in-95">
          {/* Buscador */}
          {showSearch && (
            <div className="combobox-search-wrapper">
              <span className="combobox-search-icon">
                <Search size={14} />
              </span>
              <input
                ref={inputRef}
                type="text"
                className="combobox-search-input"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          {/* Listado */}
          <div className="combobox-list">
            {filteredItems.length === 0 ? (
              <div className="combobox-empty">
                <span>{emptyText}</span>
                {onAddNew && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNew(search);
                    }}
                  >
                    {addNewText}
                  </button>
                )}
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = String(item.value) === String(value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleSelect(item.value)}
                    className={`combobox-item ${isSelected ? 'selected' : ''}`}
                  >
                    <span className="truncate">{item.label}</span>
                    {isSelected && <Check size={14} className="shrink-0" />}
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
