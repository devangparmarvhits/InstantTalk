import React from 'react';

export const Toggle = ({ checked, onChange, label, description = '' }) => (
  <div className="setting-row">
    <div className="setting-row-info">
      <div className="setting-row-label">{label}</div>
      {description && <div className="setting-row-desc">{description}</div>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`toggle ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-knob" />
    </button>
  </div>
);

export const Segmented = ({ options, value, onChange }) => (
  <div className="segmented-group">
    {options.map((opt) => (
      <button
        type="button"
        key={opt.value}
        className={`segmented-option ${value === opt.value ? 'active' : ''}`}
        onClick={() => onChange(opt.value)}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export const OptionRow = ({ label, description = '', control }) => (
  <div className="setting-row">
    <div className="setting-row-info">
      <div className="setting-row-label">{label}</div>
      {description && <div className="setting-row-desc">{description}</div>}
    </div>
    {control}
  </div>
);