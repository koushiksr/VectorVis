import { useState } from 'react';
import { motion } from 'framer-motion';
import { InfoIcon, LabelWithInfo } from './Tooltip';
import KNOWLEDGE from '../utils/knowledge';

const PARAMS = [
  {
    id: 'temperature', label: 'Temperature', min: 0.1, max: 2.0, step: 0.05, default: 0.8,
    color: '#f472b6', icon: '🌡️', knowledge: KNOWLEDGE.temperature,
  },
  {
    id: 'topK', label: 'Top-K', min: 1, max: 100, step: 1, default: 40,
    color: '#8b5cf6', icon: '🔝', knowledge: KNOWLEDGE.topK,
  },
  {
    id: 'topP', label: 'Top-P (Nucleus)', min: 0.0, max: 1.0, step: 0.01, default: 0.9,
    color: '#00f5ff', icon: '🎯', knowledge: KNOWLEDGE.topP,
  },
  {
    id: 'repetitionPenalty', label: 'Repetition Penalty', min: 1.0, max: 2.0, step: 0.05, default: 1.1,
    color: '#34d399', icon: '🔁', knowledge: KNOWLEDGE.repetitionPenalty,
  },
  {
    id: 'numHeads', label: 'Attention Heads', min: 1, max: 12, step: 1, default: 4,
    color: '#fbbf24', icon: '👁️', knowledge: KNOWLEDGE.numHeads,
  },
  {
    id: 'maxTokens', label: 'Max New Tokens', min: 5, max: 100, step: 5, default: 30,
    color: '#fb923c', icon: '📏', knowledge: KNOWLEDGE.maxTokens,
  },
  {
    id: 'embedDim', label: 'Embedding Dim', min: 64, max: 1024, step: 64, default: 768,
    color: '#a78bfa', icon: '📐', displayOnly: true, knowledge: KNOWLEDGE.embeddingDim,
  },
  {
    id: 'layers', label: 'Transformer Layers', min: 1, max: 48, step: 1, default: 12,
    color: '#6ee7b7', icon: '🏗️', displayOnly: true, knowledge: KNOWLEDGE.transformerArch,
  },
];

function EffectPreview({ param, value }) {
  if (param.id === 'temperature') {
    const baseLogits = [2.5, 1.8, 1.2, 0.8, 0.4, 0.1];
    const temp = Math.max(value, 0.01);
    const scaled = baseLogits.map(l => Math.exp(l / temp));
    const sum = scaled.reduce((a, b) => a + b, 0);
    const probs = scaled.map(s => s / sum);
    const tokens = ['the', 'a', 'an', 'this', 'that', 'it'];
    return (
      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: 3 }}>Probability distribution preview:</div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 30 }}>
          {probs.map((p, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flex: 1 }}>
              <div style={{ width: '100%', height: `${p * 28}px`, background: `${param.color}80`, borderRadius: '2px 2px 0 0', transition: 'height 0.2s', minHeight: 1 }} />
              <div style={{ fontSize: '7px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 20 }}>{tokens[i]}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (param.id === 'topK') {
    const numBars = 12;
    return (
      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: 3 }}>Tokens considered (sampling window):</div>
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {Array.from({ length: numBars }).map((_, i) => (
            <div key={i} style={{ width: '100%', height: 8, borderRadius: 2, background: i < Math.min(Math.round(value / 9), numBars) ? `${param.color}90` : 'rgba(100,120,200,0.1)', transition: 'background 0.1s' }} />
          ))}
          <span style={{ fontSize: '8px', color: param.color, whiteSpace: 'nowrap', marginLeft: 4 }}>top {value}</span>
        </div>
      </div>
    );
  }
  if (param.id === 'topP') {
    return (
      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: 3 }}>Nucleus probability mass:</div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(100,120,200,0.1)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${value * 100}%`, background: `linear-gradient(90deg, ${param.color}60, ${param.color})`, borderRadius: 3, transition: 'width 0.15s' }} />
        </div>
      </div>
    );
  }
  return null;
}

function SliderControl({ param, value, onChange }) {
  const pct = ((value - param.min) / (param.max - param.min)) * 100;
  return (
    <div className="slider-group" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div className="slider-label">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px' }}>{param.icon}</span>
          <span className="slider-label-name">{param.label}</span>
          {param.knowledge && <InfoIcon knowledge={param.knowledge} placement="left" size={11} />}
          {param.displayOnly && (
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', background: 'rgba(100,120,200,0.1)', padding: '1px 5px', borderRadius: 3 }}>
              display
            </span>
          )}
        </div>
        <span className="slider-label-value" style={{ color: param.color }}>
          {param.step < 1 ? value.toFixed(2) : value}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, width: `${pct}%`, height: 4, background: `linear-gradient(90deg, ${param.color}80, ${param.color})`, borderRadius: 2, transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }} />
        <input type="range" min={param.min} max={param.max} step={param.step} value={value}
          onChange={e => onChange(param.id, parseFloat(e.target.value))}
          style={{ position: 'relative', zIndex: 2 }}
        />
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
        {param.knowledge?.sections?.[0]?.text?.split('\n')[0] || ''}
      </div>
      <EffectPreview param={param} value={value} />
    </div>
  );
}

const PRESETS = [
  { name: 'Creative', icon: '🎨', values: { temperature: 1.2, topK: 60, topP: 0.95, repetitionPenalty: 1.0, numHeads: 4, maxTokens: 50 } },
  { name: 'Balanced', icon: '⚖️', values: { temperature: 0.8, topK: 40, topP: 0.9, repetitionPenalty: 1.1, numHeads: 4, maxTokens: 30 } },
  { name: 'Precise', icon: '🎯', values: { temperature: 0.3, topK: 10, topP: 0.7, repetitionPenalty: 1.2, numHeads: 8, maxTokens: 20 } },
  { name: 'Wild', icon: '🌪️', values: { temperature: 1.8, topK: 100, topP: 1.0, repetitionPenalty: 1.0, numHeads: 2, maxTokens: 60 } },
];

const DECODING_INFO = KNOWLEDGE.decodingStrategy;

export default function ParameterPanel({ params, onChange }) {
  const [expanded, setExpanded] = useState(true);

  const applyPreset = (preset) => {
    Object.entries(preset.values).forEach(([k, v]) => onChange(k, v));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Presets */}
      <div className="panel-section">
        <div className="panel-header">
          <div className="panel-header-icon" style={{ background: 'rgba(251,191,36,0.1)' }}>⚡</div>
          <span className="panel-header-title">Presets</span>
          <InfoIcon knowledge={DECODING_INFO} placement="left" size={11} />
        </div>
        <div className="panel-body">
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: 8 }}>
            Quick configs for different generation styles
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {PRESETS.map(p => (
              <motion.button key={p.name} className="btn"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '11px', flexDirection: 'column', padding: '8px 4px', gap: 3 }}
                whileHover={{ scale: 1.03, borderColor: 'rgba(139,92,246,0.5)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => applyPreset(p)}
              >
                <span style={{ fontSize: '16px' }}>{p.icon}</span>
                <span>{p.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Sliders */}
      <div className="panel-section">
        <div className="panel-header" onClick={() => setExpanded(e => !e)} style={{ cursor: 'pointer' }}>
          <div className="panel-header-icon" style={{ background: 'rgba(139,92,246,0.1)' }}>🎛️</div>
          <span className="panel-header-title">Sampling Parameters</span>
          <span className={`panel-chevron ${expanded ? 'open' : ''}`}>▼</span>
        </div>
        {expanded && (
          <div className="panel-body" style={{ padding: '0 16px' }}>
            {PARAMS.map(param => (
              <SliderControl key={param.id} param={param}
                value={params[param.id] ?? param.default}
                onChange={onChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Config summary */}
      <div className="panel-section">
        <div className="panel-header">
          <div className="panel-header-icon" style={{ background: 'rgba(52,211,153,0.1)' }}>📊</div>
          <span className="panel-header-title">Config JSON</span>
        </div>
        <div className="panel-body">
          <div style={{ background: 'rgba(5,8,16,0.8)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 2 }}>
            {PARAMS.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{p.id}:</span>
                  {p.knowledge && <InfoIcon knowledge={p.knowledge} size={9} placement="right" />}
                </div>
                <span style={{ color: p.color }}>
                  {params[p.id] !== undefined ? (p.step < 1 ? params[p.id].toFixed(2) : params[p.id]) : p.default}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
