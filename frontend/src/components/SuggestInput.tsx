import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, Sparkles } from 'lucide-react';

export interface SuggestOption {
  id: string;
  label: string;
  sub?: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  meta?: string;
}

interface SuggestInputProps {
  options: SuggestOption[];
  value: string;
  onSelect: (opt: SuggestOption) => void;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  emptyText?: string;
  hintLabel?: string;
}

const SuggestInput: React.FC<SuggestInputProps> = ({
  options, value, onSelect, onChange, icon,
  placeholder = 'Search…', disabled, emptyText = 'No options available',
  hintLabel = 'options',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(o =>
      o.label.toLowerCase().includes(q) ||
      (o.sub && o.sub.toLowerCase().includes(q)) ||
      (o.meta && o.meta.toLowerCase().includes(q))
    );
  }, [options, query]);

  const handleSelect = useCallback((opt: SuggestOption) => {
    onSelect(opt);
    setQuery('');
    setOpen(false);
  }, [onSelect]);

  const handleFocus = () => { setOpen(true); setQuery(''); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    if (!open) setOpen(true);
  };

  return (
    <div className="sm__autocomplete" ref={wrapRef}>
      <div className={`sm__input-wrap ${open ? 'sm__input-wrap--focused' : ''}`}>
        <span className="sm__input-icon">{icon}</span>
        <input
          ref={inputRef}
          value={open ? query : value}
          onFocus={handleFocus}
          onChange={handleChange}
          placeholder={disabled ? placeholder : placeholder}
          disabled={disabled}
          autoComplete="off"
        />
        {options.length > 0 && !disabled && (
          <button type="button" className="sm__autocomplete-toggle"
            onClick={() => { setOpen(!open); inputRef.current?.focus(); }} tabIndex={-1}>
            <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        )}
      </div>

      {open && !disabled && (
        <div className="sm__dropdown">
          {options.length === 0 ? (
            <div className="sm__dropdown-empty"><Sparkles size={16} /><span>{emptyText}</span></div>
          ) : filtered.length === 0 ? (
            <div className="sm__dropdown-empty"><Search size={16} /><span>No match for "{query}"</span></div>
          ) : (
            <>
              <div className="sm__dropdown-hint">
                <Sparkles size={10} />
                {filtered.length} {hintLabel}
              </div>
              <div className="sm__dropdown-list">
                {filtered.map(opt => (
                  <button key={opt.id} type="button"
                    className={`sm__dropdown-item ${value === opt.label ? 'sm__dropdown-item--selected' : ''}`}
                    onClick={() => handleSelect(opt)}>
                    <div className="sm__dropdown-item-main">
                      <span className="sm__dropdown-item-name">{opt.label}</span>
                      {opt.sub && (
                        <div className="sm__dropdown-item-meta">
                          <code>{opt.sub}</code>
                          {opt.meta && <span className="sm__dropdown-item-credits">{opt.meta}</span>}
                        </div>
                      )}
                    </div>
                    {opt.badge && (
                      <span className="sm__dropdown-item-type"
                        style={{ background: opt.badgeBg || 'rgba(59,108,245,0.08)', color: opt.badgeColor || '#3b6cf5' }}>
                        {opt.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SuggestInput;
