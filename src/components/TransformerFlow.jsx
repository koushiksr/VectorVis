import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InfoIcon, Term } from './Tooltip';
import KNOWLEDGE from '../utils/knowledge';

// ── Neural network layer definitions ────────────────────────────────────────
const LAYERS = [
  { id: 'input',    label: 'Input',     sublabel: 'Tokens',         color: '#00f5ff', neurons: 6,  type: 'input'    },
  { id: 'embed',    label: 'Embed',     sublabel: 'Pos + Token',    color: '#34d399', neurons: 8,  type: 'dense'    },
  { id: 'q',        label: 'Query',     sublabel: 'Q = xWᵠ',        color: '#a78bfa', neurons: 5,  type: 'attn'     },
  { id: 'k',        label: 'Key',       sublabel: 'K = xWᴷ',        color: '#8b5cf6', neurons: 5,  type: 'attn'     },
  { id: 'v',        label: 'Value',     sublabel: 'V = xWᵛ',        color: '#7c3aed', neurons: 5,  type: 'attn'     },
  { id: 'attn_out', label: 'Attn',      sublabel: 'softmax(QKᵀ)V',  color: '#c4b5fd', neurons: 7,  type: 'dense'    },
  { id: 'norm1',    label: 'Norm',      sublabel: 'Add + LayerNorm', color: '#fb923c', neurons: 4,  type: 'norm'     },
  { id: 'ffn1',     label: 'FFN①',     sublabel: 'GELU(xW₁)',       color: '#f472b6', neurons: 10, type: 'dense'    },
  { id: 'ffn2',     label: 'FFN②',     sublabel: 'xW₂ + b₂',        color: '#ec4899', neurons: 7,  type: 'dense'    },
  { id: 'norm2',    label: 'Norm',      sublabel: 'Add + LayerNorm', color: '#fb923c', neurons: 4,  type: 'norm'     },
  { id: 'output',   label: 'Output',    sublabel: 'Logits',          color: '#fbbf24', neurons: 6,  type: 'output'   },
];

const LAYER_KNOWLEDGE = {
  input:    KNOWLEDGE.tokenization,
  embed:    KNOWLEDGE.embeddingDim,
  q:        KNOWLEDGE.attention,
  k:        KNOWLEDGE.attention,
  v:        KNOWLEDGE.attention,
  attn_out: KNOWLEDGE.attention,
  norm1:    KNOWLEDGE.layerNorm,
  ffn1:     KNOWLEDGE.ffn,
  ffn2:     KNOWLEDGE.ffn,
  norm2:    KNOWLEDGE.layerNorm,
  output:   KNOWLEDGE.lmHead,
};

// ── Canvas-based animated neural network ─────────────────────────────────────
function NeuralNetCanvas({ tokens, activeLayer, onLayerClick, isGenerating }) {
  const canvasRef = useRef();
  const stateRef = useRef({
    pulses: [],
    neurons: [],
    connections: [],
    time: 0,
    currentLayer: 0
  });

  const buildLayout = useCallback((W, H) => {
    const padX = 60, padY = 40;
    const innerW = W - padX * 2;
    const innerH = H - padY * 2;
    const layerSpacing = innerW / (LAYERS.length - 1);
    const neurons = [];
    const connections = [];

    LAYERS.forEach((layer, li) => {
      const x = padX + li * layerSpacing;
      const spacing = innerH / (layer.neurons + 1);
      for (let ni = 0; ni < layer.neurons; ni++) {
        const y = padY + (ni + 1) * spacing;
        neurons.push({
          x, y,
          layerIdx: li, neuronIdx: ni,
          activation: Math.random() * 0.4 + 0.1,
          targetActivation: Math.random() * 0.4 + 0.1,
          color: layer.color,
          label: layer.id,
          r: layer.type === 'input' ? 9 : layer.type === 'output' ? 9 : 7,
        });
      }
    });

    for (let li = 0; li < LAYERS.length - 1; li++) {
      const layerA = neurons.filter(n => n.layerIdx === li);
      const layerB = neurons.filter(n => n.layerIdx === li + 1);
      layerA.forEach(a => {
        const maxConn = Math.min(layerB.length, 4);
        const step = Math.max(1, Math.floor(layerB.length / maxConn));
        for (let i = 0; i < layerB.length; i += step) {
          connections.push({
            x1: a.x, y1: a.y,
            x2: layerB[i].x, y2: layerB[i].y,
            color: LAYERS[li].color,
            weight: Math.random() * 0.3 + 0.05,
          });
        }
      });
    }

    stateRef.current.neurons = neurons;
    stateRef.current.connections = connections;
  }, []);

  const spawnPulse = useCallback(() => {
    const { neurons } = stateRef.current;
    const layerIdx = stateRef.current.currentLayer ?? 0;
    const nextLayerIdx = (layerIdx + 1) % LAYERS.length;

    const sourceNeurons = neurons.filter(n => n.layerIdx === layerIdx);
    const targetNeurons = neurons.filter(n => n.layerIdx === nextLayerIdx);
    if (sourceNeurons.length === 0 || targetNeurons.length === 0) return;

    const src = sourceNeurons[Math.floor(Math.random() * sourceNeurons.length)];
    const tgt = targetNeurons[Math.floor(Math.random() * targetNeurons.length)];

    stateRef.current.pulses.push({
      x: src.x, y: src.y,
      sx: src.x, sy: src.y,
      tx: tgt.x, ty: tgt.y,
      progress: 0,
      speed: 0.02 + Math.random() * 0.015,
      color: LAYERS[layerIdx].color,
      layerIdx,
      size: 2.5 + Math.random() * 1.5,
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = canvas.parentElement.clientWidth;
    let H = canvas.parentElement.clientHeight || 480;
    canvas.width = W;
    canvas.height = H;
    buildLayout(W, H);

    let frame = 0;
    let currentLayerIdx = 0;
    let layerTimer = 0;
    let animId;

    const draw = () => {
      const s = stateRef.current;
      s.time += 0.016;
      layerTimer++;

      if (layerTimer > (isGenerating ? 20 : 60)) {
        layerTimer = 0;
        currentLayerIdx = (currentLayerIdx + 1) % LAYERS.length;
        s.currentLayer = currentLayerIdx;
        s.neurons.forEach(n => {
          if (n.layerIdx === currentLayerIdx) n.targetActivation = 0.7 + Math.random() * 0.3;
          else if (n.layerIdx < currentLayerIdx) n.targetActivation = 0.3 + Math.random() * 0.2;
          else n.targetActivation = 0.05 + Math.random() * 0.1;
        });
      }

      if (frame % (isGenerating ? 2 : 4) === 0 && currentLayerIdx > 0) {
        spawnPulse();
      }

      s.neurons.forEach(n => {
        n.activation += (n.targetActivation - n.activation) * 0.1;
      });

      ctx.clearRect(0, 0, W, H);

      s.connections.forEach(c => {
        const srcLayer = s.neurons.find(n => n.x === c.x1 && n.y === c.y1);
        const isActive = srcLayer && srcLayer.layerIdx <= currentLayerIdx;
        ctx.beginPath();
        ctx.moveTo(c.x1, c.y1);
        ctx.lineTo(c.x2, c.y2);
        ctx.strokeStyle = isActive ? `${c.color}${Math.floor(c.weight * 100).toString(16).padStart(2, '0')}` : 'rgba(100,120,200,0.05)';
        ctx.lineWidth = isActive ? 1.5 : 1;
        ctx.stroke();
      });

      for (let i = s.pulses.length - 1; i >= 0; i--) {
        const p = s.pulses[i];
        p.progress += p.speed;
        if (p.progress >= 1) {
          s.pulses.splice(i, 1);
          continue;
        }
        const dx = p.tx - p.sx;
        const dy = p.ty - p.sy;
        p.x = p.sx + dx * p.progress;
        p.y = p.sy + dy * p.progress;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      s.neurons.forEach(n => {
        const isHovered = false; // hover logic simplified for brevity
        const isSelected = activeLayer === n.layerIdx;
        const activeColor = n.color;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + (isSelected ? 3 : 0), 0, Math.PI * 2);
        
        ctx.fillStyle = `rgba(15, 23, 42, 0.9)`;
        ctx.fill();

        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.strokeStyle = `${activeColor}${Math.floor(n.activation * 255).toString(16).padStart(2, '0')}`;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `${activeColor}${Math.floor(n.activation * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();

        if (n.neuronIdx === 0) {
          ctx.font = `600 10px Inter, sans-serif`;
          ctx.fillStyle = isSelected ? activeColor : 'var(--text-muted)';
          ctx.textAlign = 'center';
          ctx.fillText(LAYERS[n.layerIdx].label, n.x, n.y - 18);
        }
      });

      frame++;
      animId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      W = canvas.parentElement.clientWidth;
      H = canvas.parentElement.clientHeight || 480;
      canvas.width = W;
      canvas.height = H;
      buildLayout(W, H);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [buildLayout, spawnPulse, activeLayer, isGenerating]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ width: '100%', height: '100%', cursor: 'pointer' }} 
      onClick={(e) => {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const padX = 60;
        const innerW = rect.width - padX * 2;
        const layerSpacing = innerW / (LAYERS.length - 1);
        const idx = Math.round((x - padX) / layerSpacing);
        if (idx >= 0 && idx < LAYERS.length && onLayerClick) {
          onLayerClick(idx);
        }
      }}
    />
  );
}


// ── Detailed Decoding Visualizer ──────────────────────────────────────────────
function DecodingVisualizer({ genState, params }) {
  const { currentLogits, currentProbs, candidates } = genState;
  
  if (!candidates || candidates.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
        Waiting for logits...
      </div>
    );
  }

  // Calculate cumulative probabilities for Top-P
  let cumulativeP = 0;
  const vizCandidates = candidates.map((c, i) => {
    const includedInTopK = i < params.topK;
    cumulativeP += c.prob;
    const includedInTopP = cumulativeP - c.prob <= params.topP; // Was it included before adding this one?
    const isSampled = i === 0; // In this mock view, we'll just say the top one was sampled if we don't have the exact sampled one yet
    return { ...c, cumulativeP, includedInTopK, includedInTopP, isSampled };
  });

  return (
    <div style={{ padding: '16px 20px', height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <h3 style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)' }}>Decoding Strategy Analysis</h3>
        <InfoIcon knowledge={KNOWLEDGE.decodingStrategy} />
      </div>

      {/* 1. Logits */}
      <div className="glass-card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-purple)' }}>1. Raw Logits</div>
          <InfoIcon knowledge={KNOWLEDGE.logits} size={10} />
        </div>
        <div style={{ display: 'flex', gap: 4, height: 40, alignItems: 'flex-end' }}>
          {vizCandidates.slice(0, 10).map((c, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', background: 'rgba(139, 92, 246, 0.2)', borderRadius: 2, height: `${Math.max(10, c.logit * 20)}%` }} />
              <div style={{ fontSize: 9, color: 'var(--text-muted)', transform: 'rotate(-45deg)', transformOrigin: 'top left', whiteSpace: 'nowrap' }}>{c.word}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Temperature */}
      <div className="glass-card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#f472b6' }}>2. Temperature Scaling (T={params.temperature.toFixed(2)})</div>
          <InfoIcon knowledge={KNOWLEDGE.temperature} size={10} />
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 8 }}>
          {params.temperature < 1 ? 'Logits sharpened (more deterministic)' : params.temperature > 1 ? 'Logits flattened (more random)' : 'No scaling applied'}
        </div>
        <div style={{ display: 'flex', gap: 4, height: 40, alignItems: 'flex-end', marginTop: 15 }}>
          {vizCandidates.slice(0, 10).map((c, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', background: 'rgba(244, 114, 182, 0.4)', borderRadius: 2, height: `${c.prob * 100}%` }} />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Top-K & Top-P */}
      <div className="glass-card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#00f5ff' }}>3. Filtering (Top-K={params.topK}, Top-P={params.topP.toFixed(2)})</div>
          <div style={{ display: 'flex', gap: 5 }}>
             <InfoIcon knowledge={KNOWLEDGE.topK} size={10} />
             <InfoIcon knowledge={KNOWLEDGE.topP} size={10} />
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {vizCandidates.slice(0, 8).map((c, i) => {
            const isKept = c.includedInTopK && c.includedInTopP;
            return (
              <div key={i} style={{ 
                display: 'flex', alignItems: 'center', gap: 10, 
                opacity: isKept ? 1 : 0.3,
                textDecoration: isKept ? 'none' : 'line-through'
              }}>
                <div style={{ width: 60, fontSize: 11, color: isKept ? 'var(--text-primary)' : 'var(--text-muted)' }}>{c.word}</div>
                <div style={{ flex: 1, height: 6, background: 'rgba(0, 245, 255, 0.1)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${c.prob * 100}%`, height: '100%', background: 'var(--accent-cyan)' }} />
                </div>
                <div style={{ width: 40, fontSize: 10, textAlign: 'right', color: 'var(--accent-cyan)' }}>
                  {(c.prob * 100).toFixed(1)}%
                </div>
                <div style={{ width: 60, fontSize: 9, textAlign: 'right', color: 'var(--text-muted)' }}>
                  Σ {(c.cumulativeP * 100).toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}


// ── Main TransformerFlow Component ────────────────────────────────────────────
export default function TransformerFlow({ tokens, params, genState, controls }) {
  const [activeStage, setActiveStage] = useState(2); // attention by default
  const { status, step, prompt, tokens: genTokens } = genState || {};
  const isGenerating = status === 'generating' || status === 'paused';

  // If generating, automatically jump to output layer to show decoding
  useEffect(() => {
    if (isGenerating && activeStage !== LAYERS.length - 1) {
       setActiveStage(LAYERS.length - 1); // Output layer
    }
  }, [isGenerating, activeStage]);

  const layerInfo = LAYERS[activeStage];

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.8px' }}>
            NEURAL NETWORK — LIVE DATA FLOW
          </span>
          <InfoIcon knowledge={KNOWLEDGE.transformerArch} placement="bottom" size={11} />
        </div>
        
        {/* Playback Controls (if generating) */}
        {genState && genState.status !== 'idle' && controls && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0, 245, 255, 0.1)', padding: '4px 8px', borderRadius: 20 }}>
            <span style={{ fontSize: 10, color: 'var(--accent-cyan)', fontWeight: 600, marginRight: 8 }}>
              Token {step+1}
            </span>
            <button className="btn btn-sm btn-cyan" onClick={genState.status === 'paused' ? controls.resumeGeneration : controls.pauseGeneration}>
              {genState.status === 'paused' ? '▶ Play' : '⏸ Pause'}
            </button>
            <button className="btn btn-sm" style={{ border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)' }} onClick={controls.stepGeneration} disabled={genState.status !== 'paused'}>
              ⏭ Step
            </button>
          </div>
        )}
      </div>

      {/* Main area: Canvas + Stage info */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, gap: 0 }}>

        {/* Neural network canvas */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0, height: '100%' }}>
          <NeuralNetCanvas
            tokens={tokens}
            activeLayer={activeStage}
            onLayerClick={setActiveStage}
            isGenerating={isGenerating}
          />

          {/* Legend */}
          <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { color: '#00f5ff', label: 'Input / Output' },
              { color: '#8b5cf6', label: 'Q / K / V heads' },
              { color: '#f472b6', label: 'FFN layers' },
              { color: '#fb923c', label: 'Norm layers' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Decoding Viz OR Stage Info */}
        <div style={{ width: 340, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'rgba(5, 8, 16, 0.5)' }}>
          {isGenerating && activeStage === LAYERS.length - 1 ? (
            <DecodingVisualizer genState={genState} params={params} />
          ) : (
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 15 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: layerInfo.color, boxShadow: `0 0 10px ${layerInfo.color}` }} />
                <h2 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>{layerInfo.label} Layer</h2>
                <InfoIcon knowledge={LAYER_KNOWLEDGE[layerInfo.id]} />
              </div>
              
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Click on the <strong>Output</strong> layer while generating text in the Playground to see the detailed decoding analysis!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
