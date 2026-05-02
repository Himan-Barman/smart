import React, { useState, useRef, useCallback } from 'react';
import { Clock } from 'lucide-react';

const pad = (n: number) => n.toString().padStart(2, '0');
const clampH = (v: number) => Math.max(1, Math.min(12, v));
const clampM = (v: number) => Math.max(0, Math.min(59, v));

interface Props {
  value: string;
  onChange: (v: string) => void;
  label: string;
}

/* ── Tiny clock face popup ── */
const ClockDial: React.FC<{ h24: number; min: number; onSelect: (h: number, m: number) => void; onClose: () => void }> = ({ h24, min, onSelect, onClose }) => {
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const [tempH, setTempH] = useState(h24);
  const [tempM, setTempM] = useState(min);
  const isAm = tempH < 12;
  const h12 = tempH % 12 || 12;

  const R = 80, CX = 95, CY = 95, NR = 62;
  const polar = (deg: number, r: number) => ({ x: CX + r * Math.cos((deg - 90) * Math.PI / 180), y: CY + r * Math.sin((deg - 90) * Math.PI / 180) });

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const mins = Array.from({ length: 12 }, (_, i) => i * 5);

  const selAngle = mode === 'hour' ? ((h12 % 12) / 12) * 360 : (tempM / 60) * 360;
  const hand = polar(selAngle, NR);

  const pickFromEvent = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let a = Math.atan2(e.clientY - rect.top - CY, e.clientX - rect.left - CX) * 180 / Math.PI + 90;
    if (a < 0) a += 360;
    if (mode === 'hour') {
      let hr = Math.round(a / 30) % 12; if (hr === 0) hr = 12;
      const new24 = isAm ? (hr === 12 ? 0 : hr) : (hr === 12 ? 12 : hr + 12);
      setTempH(new24);
      setTimeout(() => setMode('minute'), 200);
    } else {
      let m = Math.round(a / 6) % 60;
      m = Math.round(m / 5) * 5; if (m === 60) m = 0;
      setTempM(m);
    }
  }, [mode, isAm]);

  const togglePeriod = () => setTempH(isAm ? tempH + 12 : tempH - 12);
  const confirm = () => { onSelect(tempH, tempM); onClose(); };

  return (
    <div className="cd-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cd">
        <div className="cd__head">
          <button type="button" className={`cd__digit ${mode === 'hour' ? 'cd__digit--on' : ''}`} onClick={() => setMode('hour')}>{pad(h12)}</button>
          <span className="cd__colon">:</span>
          <button type="button" className={`cd__digit ${mode === 'minute' ? 'cd__digit--on' : ''}`} onClick={() => setMode('minute')}>{pad(tempM)}</button>
          <button type="button" className="cd__period" onClick={togglePeriod}>{isAm ? 'AM' : 'PM'}</button>
        </div>
        <svg className="cd__face" viewBox="0 0 190 190" onClick={pickFromEvent}>
          <circle cx={CX} cy={CY} r={R} className="cd__bg" />
          <line x1={CX} y1={CY} x2={hand.x} y2={hand.y} className="cd__hand" />
          <circle cx={CX} cy={CY} r={3} className="cd__center" />
          <circle cx={hand.x} cy={hand.y} r={15} className="cd__dot" />
          {mode === 'hour'
            ? hours.map(hr => { const p = polar(((hr % 12) / 12) * 360, NR); return <text key={hr} x={p.x} y={p.y} className={`cd__num ${hr === h12 ? 'cd__num--on' : ''}`} dominantBaseline="central" textAnchor="middle">{hr}</text>; })
            : mins.map(m => { const p = polar((m / 60) * 360, NR); return <text key={m} x={p.x} y={p.y} className={`cd__num ${m === tempM ? 'cd__num--on' : ''}`} dominantBaseline="central" textAnchor="middle">{pad(m)}</text>; })
          }
        </svg>
        <div className="cd__foot">
          <button type="button" className="cd__btn cd__btn--ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="cd__btn cd__btn--primary" onClick={confirm}>OK</button>
        </div>
      </div>
    </div>
  );
};

/* ── Main component ── */
const AdvancedTimePicker: React.FC<Props> = ({ value, onChange, label }) => {
  const [h24, min] = value.split(':').map(Number);
  const [showDial, setShowDial] = useState(false);
  const [hText, setHText] = useState(pad(h24 % 12 || 12));
  const [mText, setMText] = useState(pad(min));
  const hRef = useRef<HTMLInputElement>(null);
  const mRef = useRef<HTMLInputElement>(null);
  const isAm = h24 < 12;

  // Sync display when value changes externally (e.g. from clock dial)
  React.useEffect(() => {
    setHText(pad(h24 % 12 || 12));
    setMText(pad(min));
  }, [h24, min]);

  const commit = (newH24: number, newM: number) => {
    const ch = Math.max(0, Math.min(23, newH24));
    const cm = Math.max(0, Math.min(59, newM));
    onChange(`${pad(ch)}:${pad(cm)}`);
  };

  const to24 = (h12: number, am: boolean) => am ? (h12 === 12 ? 0 : h12) : (h12 === 12 ? 12 : h12 + 12);

  /* ── Hour input ── */
  const onHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    // Allow empty or partial typing
    if (raw === '') { setHText(''); return; }
    // Only allow up to 2 digits
    const digits = raw.slice(0, 2);
    const num = parseInt(digits, 10);
    // If first digit is 2-9, treat as final (can't be 20+)
    if (digits.length === 1 && num >= 2) {
      const clamped = clampH(num);
      setHText(pad(clamped));
      commit(to24(clamped, isAm), min);
      mRef.current?.focus();
      mRef.current?.select();
      return;
    }
    // If 2 digits entered, clamp and commit
    if (digits.length === 2) {
      const clamped = clampH(num);
      setHText(pad(clamped));
      commit(to24(clamped, isAm), min);
      mRef.current?.focus();
      mRef.current?.select();
      return;
    }
    // Single digit 0 or 1 — allow, wait for second digit
    setHText(digits);
  };

  const onHourBlur = () => {
    const num = parseInt(hText, 10);
    if (isNaN(num) || hText === '') {
      setHText(pad(h24 % 12 || 12));
      return;
    }
    const clamped = clampH(num);
    setHText(pad(clamped));
    commit(to24(clamped, isAm), min);
  };

  /* ── Minute input ── */
  const onMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw === '') { setMText(''); return; }
    const digits = raw.slice(0, 2);
    const num = parseInt(digits, 10);
    // If first digit is 6-9, clamp to 59
    if (digits.length === 1 && num >= 6) {
      setMText(pad(clampM(num)));
      commit(h24, clampM(num));
      return;
    }
    // If 2 digits, clamp and commit
    if (digits.length === 2) {
      const clamped = clampM(num);
      setMText(pad(clamped));
      commit(h24, clamped);
      return;
    }
    setMText(digits);
  };

  const onMinBlur = () => {
    const num = parseInt(mText, 10);
    if (isNaN(num) || mText === '') {
      setMText(pad(min));
      return;
    }
    const clamped = clampM(num);
    setMText(pad(clamped));
    commit(h24, clamped);
  };

  /* ── Key handlers ── */
  const onHourKey = (e: React.KeyboardEvent) => {
    if (e.key === ':' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      onHourBlur();
      mRef.current?.focus();
      mRef.current?.select();
    }
    if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); const h12 = h24 % 12 || 12; const n = h12 >= 12 ? 1 : h12 + 1; commit(to24(n, isAm), min); }
    if (e.key === 'ArrowDown') { e.preventDefault(); const h12 = h24 % 12 || 12; const n = h12 <= 1 ? 12 : h12 - 1; commit(to24(n, isAm), min); }
  };

  const onMinKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); commit(h24, min >= 59 ? 0 : min + 1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); commit(h24, min <= 0 ? 59 : min - 1); }
  };

  const toggleAmPm = () => commit(isAm ? h24 + 12 : h24 - 12, min);
  const onDialSelect = (h: number, m: number) => commit(h, m);

  return (
    <div className="atp">
      <span className="atp__label">{label}</span>
      <div className="atp__box">
        <button type="button" className="atp__clock-btn" onClick={() => setShowDial(true)} title="Pick from clock">
          <Clock size={14} />
        </button>
        <input
          ref={hRef}
          className="atp__input"
          type="text"
          inputMode="numeric"
          value={hText}
          onChange={onHourChange}
          onFocus={e => e.target.select()}
          onBlur={onHourBlur}
          onKeyDown={onHourKey}
          maxLength={2}
          aria-label="Hour"
        />
        <span className="atp__sep">:</span>
        <input
          ref={mRef}
          className="atp__input"
          type="text"
          inputMode="numeric"
          value={mText}
          onChange={onMinChange}
          onFocus={e => e.target.select()}
          onBlur={onMinBlur}
          onKeyDown={onMinKey}
          maxLength={2}
          aria-label="Minute"
        />
        <button type="button" className="atp__ampm" onClick={toggleAmPm}>
          {isAm ? 'AM' : 'PM'}
        </button>
      </div>
      {showDial && <ClockDial h24={h24} min={min} onSelect={onDialSelect} onClose={() => setShowDial(false)} />}
    </div>
  );
};

export default AdvancedTimePicker;
