import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DataIngestion from './components/DataIngestion';
import VectorSpace3D from './components/VectorSpace3D';
import TransformerFlow from './components/TransformerFlow';
import AttentionHeatmap from './components/AttentionHeatmap';
import ParameterPanel from './components/ParameterPanel';
import TokenPlayground from './components/TokenPlayground';
import { vectorDB } from './utils/vectorDB';
import { buildDynamicVocab, retrieveContext, scoreLogits } from './utils/generation';
import { sampleNextToken } from './utils/embeddings';

const DEFAULT_PARAMS = {
  temperature: 0.8,
  topK: 40,
  topP: 0.9,
  repetitionPenalty: 1.1,
  numHeads: 4,
  maxTokens: 30,
  embedDim: 768,
  layers: 12,
};

const CENTER_VIEWS = [
  { id: '3d', label: '3D Vector Space', icon: '🌐' },
  { id: 'flow', label: 'Transformer Flow', icon: '🔄' },
];

const RIGHT_VIEWS = [
  { id: 'attention', label: 'Attention', icon: '👁️' },
  { id: 'playground', label: 'Playground', icon: '✍️' },
];

export default function App() {
  const [vectors, setVectors] = useState([]);
  const [selectedVector, setSelectedVector] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [centerView, setCenterView] = useState('3d');
  const [rightView, setRightView] = useState('attention');

  // ── Generation State ────────────────────────────────────────────────────────
  const [genState, setGenState] = useState({
    status: 'idle', // 'idle' | 'generating' | 'paused'
    step: 0,
    prompt: '',
    tokens: [], // { text, prob, isNew, isCtxToken, idx }
    candidates: [], // top candidates for the *next* token
    retrieved: null,
    facts: {},
    currentLogits: [],
    currentProbs: [],
    vocab: [],
  });
  
  const genRef = useRef({ running: false, paused: false });
  const stepResolveRef = useRef(null);

  const handleVectorDBUpdate = useCallback(() => {
    setVectors([...vectorDB.getAll()]);
  }, []);

  const handleParamChange = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSelectVector = useCallback((entry) => {
    setSelectedVector(entry);
    if (entry?.text) {
      import('./utils/embeddings').then(m => {
        setTokens(m.simpleTokenize(entry.text));
      });
    }
  }, []);

  // ── Generation Loop ─────────────────────────────────────────────────────────
  
  const stopGeneration = useCallback(() => {
    genRef.current.running = false;
    if (stepResolveRef.current) {
      stepResolveRef.current(); // unblock if paused
      stepResolveRef.current = null;
    }
    setGenState(prev => ({ ...prev, status: 'idle' }));
  }, []);

  const pauseGeneration = useCallback(() => {
    genRef.current.paused = true;
    setGenState(prev => ({ ...prev, status: 'paused' }));
  }, []);

  const resumeGeneration = useCallback(() => {
    genRef.current.paused = false;
    if (stepResolveRef.current) {
      stepResolveRef.current();
      stepResolveRef.current = null;
    }
    setGenState(prev => ({ ...prev, status: 'generating' }));
  }, []);

  const stepGeneration = useCallback(() => {
    if (stepResolveRef.current) {
      stepResolveRef.current();
      stepResolveRef.current = null;
    }
  }, []);

  const clearGeneration = useCallback(() => {
    setGenState({
      status: 'idle', step: 0, prompt: '', tokens: [], 
      candidates: [], retrieved: null, facts: {}, 
      currentLogits: [], currentProbs: [], vocab: []
    });
  }, []);

  const startGeneration = useCallback(async (initialPrompt) => {
    if (genRef.current.running || !initialPrompt.trim()) return;

    // Automatically switch to flow view for visualization
    setCenterView('flow');

    const vocab = buildDynamicVocab();
    const ctx = retrieveContext(initialPrompt);
    
    setGenState(prev => ({
      ...prev,
      prompt: initialPrompt,
      status: 'generating',
      step: 0,
      tokens: [],
      candidates: [],
      retrieved: ctx.context ? ctx : null,
      facts: ctx.facts || {},
      vocab
    }));
    
    genRef.current.running = true;
    genRef.current.paused = false;

    let currentText = initialPrompt;
    const used = new Set();
    const p = params; // snapshot params

    for (let i = 0; i < p.maxTokens; i++) {
      if (!genRef.current.running) break;

      // Handle pausing / step-by-step
      if (genRef.current.paused) {
        setGenState(prev => ({ ...prev, status: 'paused' }));
        await new Promise(resolve => { stepResolveRef.current = resolve; });
        if (!genRef.current.running) break;
      }

      // 1. Re-retrieve facts periodically
      let currentFacts = ctx.facts || {};
      if (i > 0 && i % 6 === 0) {
        const fresh = retrieveContext(currentText);
        if (fresh.context) currentFacts = fresh.facts;
      }

      // 2. Score Logits
      let logits = scoreLogits(currentText, vocab, currentFacts);
      
      // 3. Repetition Penalty
      logits = logits.map((l, idx) => used.has(idx) ? l / p.repetitionPenalty : l);

      // 4. Softmax (Temperature)
      const scaled = logits.map(l => l / Math.max(p.temperature, 0.01));
      const maxL   = Math.max(...scaled);
      const exp    = scaled.map(l => Math.exp(l - maxL));
      const sum    = exp.reduce((a, b) => a + b, 0);
      const probs  = exp.map(e => e / sum);

      // 5. Candidates for visualization
      const candidates = vocab.map((w, idx) => ({ word: w, prob: probs[idx], idx, logit: logits[idx] }))
        .sort((a, b) => b.prob - a.prob).slice(0, 15); // keep top 15 for visualization

      setGenState(prev => ({
        ...prev,
        currentLogits: logits,
        currentProbs: probs,
        candidates
      }));

      // If we are stepping, pause here so the user can see the Output Layer decoding state
      if (genRef.current.paused) {
         await new Promise(resolve => { stepResolveRef.current = resolve; });
         if (!genRef.current.running) break;
      }

      // 6. Sample
      const chosen = sampleNextToken(logits, p.temperature, p.topK, p.topP);
      const token  = vocab[chosen];
      used.add(chosen);
      currentText += ' ' + token;

      const isCtxToken = currentFacts?.keywords?.includes(token) || false;
      
      setGenState(prev => ({
        ...prev,
        tokens: [...prev.tokens, { text: token, isNew: true, prob: probs[chosen], isCtxToken, idx: i }],
        step: i + 1,
        facts: currentFacts // update facts if they changed
      }));

      // Remove "isNew" flag after a delay for UI polish
      setTimeout(() => {
        setGenState(prev => ({
          ...prev,
          tokens: prev.tokens.map((t, ti) => ti === i ? { ...t, isNew: false } : t)
        }));
      }, 450);

      // Wait a bit before next token if not manually stepping
      if (!genRef.current.paused) {
        await new Promise(r => setTimeout(r, 600)); // slow down slightly for visual flow
      }
    }

    genRef.current.running = false;
    setGenState(prev => ({ ...prev, status: 'idle' }));
  }, [params]);


  return (
    <div className="app">
      <header className="app-header">
        <div className="header-logo">
          <div className="header-logo-icon">🤖</div>
          <h1>TransformerViz — AI Visual Lab</h1>
        </div>

        <div className="header-tabs">
          {CENTER_VIEWS.map(v => (
            <button
              key={v.id}
              className={`header-tab ${centerView === v.id ? 'active' : ''}`}
              onClick={() => setCenterView(v.id)}
            >
              {v.icon} {v.label}
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
          {RIGHT_VIEWS.map(v => (
            <button
              key={v.id}
              className={`header-tab ${rightView === v.id ? 'active' : ''}`}
              onClick={() => setRightView(v.id)}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        <div className="header-status">
          <div className="status-dot" />
          <span>In-browser · No server</span>
          <span style={{ color: 'var(--border)', margin: '0 4px' }}>|</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
            {vectors.length} vectors
          </span>
          <span style={{ color: 'var(--border)', margin: '0 4px' }}>|</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)' }}>
            T={params.temperature.toFixed(1)} K={params.topK} P={params.topP.toFixed(1)}
          </span>
        </div>
      </header>

      <aside className="sidebar">
        <DataIngestion
          onUpdate={handleVectorDBUpdate}
          onTokensChange={setTokens}
        />
        <ParameterPanel
          params={params}
          onChange={handleParamChange}
        />
      </aside>

      <main className="center-area">
        <div className="canvas-container">
          <AnimatePresence mode="wait">
            {centerView === '3d' ? (
              <motion.div
                key="3d"
                style={{ width: '100%', height: '100%' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <VectorSpace3D
                  vectors={vectors}
                  onSelectVector={handleSelectVector}
                  selectedVector={selectedVector}
                />
              </motion.div>
            ) : (
              <motion.div
                key="flow"
                style={{ width: '100%', height: '100%', overflow: 'auto' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <TransformerFlow 
                  tokens={tokens} 
                  params={params}
                  genState={genState}
                  controls={{ pauseGeneration, resumeGeneration, stepGeneration, stopGeneration }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <aside className="sidebar sidebar-right">
        <AnimatePresence mode="wait">
          {rightView === 'attention' ? (
            <motion.div
              key="attention"
              style={{ width: '100%', height: '100%' }}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25 }}
            >
              <AttentionHeatmap tokens={tokens} numHeads={params.numHeads} />
            </motion.div>
          ) : (
            <motion.div
              key="playground"
              style={{ width: '100%', height: '100%' }}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25 }}
            >
              <TokenPlayground 
                params={params} 
                genState={genState}
                controls={{ startGeneration, pauseGeneration, resumeGeneration, stopGeneration, clearGeneration }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </aside>
    </div>
  );
}
