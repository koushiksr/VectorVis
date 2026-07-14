import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { vectorDB } from '../utils/vectorDB';
import { InfoIcon, Term } from './Tooltip';
import KNOWLEDGE from '../utils/knowledge';

// ── Context Badge ─────────────────────────────────────────────────────────────
function ContextBadge({ retrieved }) {
  if (!retrieved) {
    return (
      <div style={{ fontSize:10, color:'var(--text-muted)', padding:'8px 10px', background:'rgba(100,120,200,0.04)', borderRadius:6, border:'1px dashed var(--border)', lineHeight:1.5 }}>
        📭 <strong>No stored context.</strong> Add text about yourself in the left panel first — e.g. <em>"My name is Koushik and I am a software engineer"</em>
      </div>
    );
  }
  return (
    <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
      style={{ padding:'8px 10px', background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.3)', borderRadius:6 }}>
      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
        <span>🔍</span>
        <span style={{ fontSize:10, fontWeight:700, color:'#34d399' }}>Context Retrieved (RAG)</span>
        <span style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
          {(retrieved.similarity * 100).toFixed(0)}% match
        </span>
        <InfoIcon knowledge={KNOWLEDGE.rag} size={9} placement="top" />
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
        {retrieved.allResults.slice(0, 3).map((r, i) => (
          <div key={i} style={{ display:'flex', gap:5, alignItems:'flex-start' }}>
            <span style={{ fontSize:9, color:'#34d399', minWidth:28, fontFamily:'var(--font-mono)' }}>
              #{i+1} {(r.similarity*100).toFixed(0)}%
            </span>
            <span style={{ fontSize:9, color:'var(--text-muted)', fontStyle:'italic', overflow:'hidden',
              display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical' }}>
              "{r.text.slice(0,80)}{r.text.length>80?'…':''}"
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Facts display ─────────────────────────────────────────────────────────────
function FactsPanel({ facts }) {
  const entries = Object.entries(facts).filter(([k]) => k !== 'keywords' && k !== '_texts');
  if (!entries.length) return null;
  return (
    <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
      exit={{ opacity:0, height:0 }} style={{ overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
        <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.5px' }}>🧠 EXTRACTED FACTS</span>
        <InfoIcon knowledge={{ title:'🧠 Fact Extraction', color:'#34d399', sections:[
          { heading:'How it works', text:'Pattern matching on your stored text extracts structured facts that directly bias token generation.' },
          { heading:'Patterns', items:['my name is X → name=X','I am a/an X → role=X','works at X → company=X','from/lives in X → location=X','like/love X → likes=X'] },
          { heading:'Effect', text:'These facts get huge logit boosts (8-10×) during generation, making answers contextually correct.' },
        ]}} size={9} />
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
        {entries.map(([k, v]) => {
          const colors = { name:'#00f5ff', role:'#8b5cf6', company:'#34d399', location:'#fbbf24', likes:'#f472b6' };
          const c = colors[k] || '#94a3b8';
          return (
            <span key={k} style={{ fontSize:10, padding:'2px 8px', borderRadius:20,
              background:`${c}12`, color:c, border:`1px solid ${c}30`, fontFamily:'var(--font-mono)' }}>
              <span style={{ opacity:0.6 }}>{k}: </span>{String(v).slice(0,30)}
            </span>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Main playground ───────────────────────────────────────────────────────────
export default function TokenPlayground({ params, genState, controls }) {
  const [localPrompt, setLocalPrompt] = useState('');
  const [dbSize, setDbSize] = useState(vectorDB.size);
  const outputRef = useRef();

  const { status, step, prompt, tokens, candidates, retrieved, facts, vocab } = genState;
  const { startGeneration, pauseGeneration, resumeGeneration, stopGeneration, clearGeneration } = controls;
  const isGenerating = status !== 'idle';
  const isPaused = status === 'paused';

  useEffect(() => {
    const id = setInterval(() => setDbSize(vectorDB.size), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [tokens]);

  const probColor = (p) => p > 0.25 ? '#34d399' : p > 0.1 ? '#fbbf24' : p > 0.05 ? '#f472b6' : '#8b5cf6';

  const knownName = facts?.name || (retrieved?.facts?.name);
  const QUICK_PROMPTS = knownName ? [
    `Who is ${knownName}?`,
    `Tell me about ${knownName}.`,
    `What does ${knownName} do?`,
    `Describe ${knownName}.`,
  ] : [
    'Who is the user?',
    'Tell me about the developer.',
    'What does this system do?',
  ];

  const handleGenerate = () => {
    startGeneration(localPrompt);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10, padding:'14px', height:'100%', overflow:'auto' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.8px' }}>PLAYGROUND</span>
          <InfoIcon knowledge={KNOWLEDGE.decodingStrategy} size={11} placement="bottom" />
        </div>
        <span className={`badge ${dbSize > 0 ? 'badge-green' : 'badge-purple'}`}>
          {dbSize > 0 ? `📚 ${dbSize} docs in DB` : '📭 empty DB'}
        </span>
      </div>

      {/* ── Workflow hint ── */}
      {dbSize === 0 && (
        <div style={{ padding:'10px 12px', background:'rgba(244,114,182,0.06)', border:'1px solid rgba(244,114,182,0.2)', borderRadius:8, fontSize:11, lineHeight:1.6, color:'var(--text-secondary)' }}>
          <div style={{ fontWeight:700, color:'#f472b6', marginBottom:4 }}>👋 Quick Start</div>
          <div>1. Go to the <strong>left panel → Data Input</strong></div>
          <div>2. Paste text like: <em style={{ color:'#00f5ff' }}>"My name is Koushik and I am a software engineer"</em></div>
          <div>3. Click <strong>⚡ Embed &amp; Store</strong></div>
          <div>4. Come back here and ask: <em style={{ color:'#34d399' }}>"Who is Koushik?"</em></div>
        </div>
      )}

      {/* ── Context display ── */}
      {(retrieved || isGenerating) && <ContextBadge retrieved={retrieved} />}

      {/* ── Extracted facts ── */}
      <AnimatePresence>
        {Object.keys(facts || {}).filter(k => k !== 'keywords').length > 0 && (
          <FactsPanel facts={facts} />
        )}
      </AnimatePresence>

      {/* ── Prompt ── */}
      <div>
        <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>YOUR PROMPT</div>
        <textarea 
          value={isGenerating ? prompt : localPrompt} 
          onChange={e => setLocalPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleGenerate(); }}
          rows={3} 
          disabled={isGenerating}
          style={{ fontFamily:'var(--font-mono)', resize:'none', fontSize:12 }}
          placeholder={dbSize > 0
            ? 'Ask something about stored context, or write any prompt…'
            : 'Add text to the left panel first, then ask questions here…'} />

        {/* Quick prompts */}
        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:5 }}>
          {QUICK_PROMPTS.map(qp => (
            <button key={qp} className="btn btn-sm"
              style={{ background:'rgba(30,40,80,0.5)', color:'var(--text-secondary)', border:'1px solid var(--border)', fontSize:10 }}
              onClick={() => setLocalPrompt(qp)}
              disabled={isGenerating}
            >
              {qp}
            </button>
          ))}
        </div>
      </div>

      {/* ── Controls ── */}
      <div style={{ display:'flex', gap:6 }}>
        {!isGenerating ? (
          <button className="btn btn-primary" style={{ flex:1 }} onClick={handleGenerate} disabled={!localPrompt.trim()}>
            ▶ Generate (View in Flow)
            <span style={{ fontSize:9, opacity:0.6, marginLeft:4 }}>Ctrl+↵</span>
          </button>
        ) : (
          <>
            <button className="btn btn-cyan" style={{ flex:1 }} onClick={isPaused ? resumeGeneration : pauseGeneration}>
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button className="btn btn-danger" onClick={stopGeneration}>⏹</button>
          </>
        )}
        <button className="btn" style={{ background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-muted)' }}
          onClick={() => { setLocalPrompt(''); clearGeneration(); }} disabled={isGenerating}>↺</button>
      </div>

      {/* ── Live params ── */}
      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
        {[
          { id:'T',   val:params.temperature.toFixed(2), c:'#f472b6', k:KNOWLEDGE.temperature },
          { id:'K',   val:params.topK,                   c:'#8b5cf6', k:KNOWLEDGE.topK },
          { id:'P',   val:params.topP.toFixed(2),         c:'#00f5ff', k:KNOWLEDGE.topP },
          { id:'rep', val:params.repetitionPenalty.toFixed(2),   c:'#34d399', k:KNOWLEDGE.repetitionPenalty },
        ].map(item => (
          <div key={item.id} className="glass-card" style={{ padding:'3px 7px', display:'flex', gap:3, alignItems:'center' }}>
            <InfoIcon knowledge={item.k} size={8} placement="top" />
            <span style={{ fontSize:9, color:'var(--text-muted)' }}>{item.id}=</span>
            <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:item.c, fontWeight:700 }}>{item.val}</span>
          </div>
        ))}
        <div className="glass-card" style={{ padding:'3px 7px', display:'flex', gap:3, alignItems:'center' }}>
          <span style={{ fontSize:9, color:'var(--text-muted)' }}>vocab=</span>
          <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'#fbbf24', fontWeight:700 }}>{vocab.length || vectorDB.size > 0 ? 'Dynamic' : 'Base'}</span>
        </div>
      </div>

      {/* ── Generated output ── */}
      <div style={{ flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
          <span style={{ fontSize:10, color:'var(--text-muted)' }}>OUTPUT ({tokens.length} tokens)</span>
          {tokens.some(t => t.isCtxToken) && (
            <span style={{ fontSize:9, color:'#34d399', background:'rgba(52,211,153,0.1)', padding:'1px 6px', borderRadius:3, border:'1px solid rgba(52,211,153,0.2)' }}>
              🟢 context tokens
            </span>
          )}
        </div>
        <div ref={outputRef} className="generated-output">
          <span style={{ color:'var(--text-secondary)' }}>{isGenerating ? prompt : localPrompt}</span>
          {tokens.map((tok, i) => (
            <span key={i}
              className={`gen-token ${tok.isNew ? 'new' : ''}`}
              style={{
                color: tok.isNew ? 'var(--accent-cyan)'
                     : tok.isCtxToken ? '#34d399'
                     : `${probColor(tok.prob)}cc`,
                background: tok.isNew ? 'rgba(0,245,255,0.15)'
                          : tok.isCtxToken && !tok.isNew ? 'rgba(52,211,153,0.1)'
                          : 'transparent',
                borderRadius: tok.isCtxToken ? 3 : 0,
                padding: tok.isCtxToken ? '0 2px' : '0',
              }}
              title={`"${tok.text}" — prob: ${(tok.prob*100).toFixed(1)}% · ${tok.isCtxToken ? '🟢 from context' : 'language model'}`}
            >
              {' '}{tok.text}
            </span>
          ))}
          {isGenerating && !isPaused && (
            <span style={{ display:'inline-block', width:8, height:14, background:'var(--accent-cyan)', borderRadius:2, marginLeft:4, animation:'pulse 0.8s infinite', verticalAlign:'middle' }} />
          )}
        </div>
      </div>

      {/* ── Candidate probability bars ── */}
      <AnimatePresence>
        {candidates.length > 0 && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}>TOP NEXT-TOKEN CANDIDATES</span>
              <InfoIcon knowledge={{ title:'🎲 Next-Token Candidates', color:'#fbbf24', sections:[
                { heading:'What you see', text:'Top tokens by probability. View the Transformer Flow to see exactly how these are computed!' }
              ]}} size={9} placement="top" />
            </div>
            <div className="prob-bar-container">
              {candidates.slice(0, 8).map((c, i) => {
                const bc = probColor(c.prob);
                const isCtx = facts?.keywords?.includes(c.word);
                return (
                  <motion.div key={`${c.word}-${i}`} className="prob-bar-row"
                    initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.02 }}
                    style={{ outline: isCtx ? '1px solid rgba(52,211,153,0.35)' : 'none', borderRadius:4, padding:'0 2px' }}
                  >
                    <span className="prob-bar-token" style={{ color: isCtx ? '#34d399' : 'var(--text-secondary)' }}>
                      {isCtx ? '🟢 ' : ''}&quot;{c.word}&quot;
                    </span>
                    <div className="prob-bar-track">
                      <div className="prob-bar-fill" style={{
                        width:`${c.prob*100}%`,
                        background:`linear-gradient(90deg, ${isCtx?'#34d399':bc}60, ${isCtx?'#34d399':bc})`,
                        minWidth: c.prob > 0.001 ? 20 : 0,
                      }}>
                        {c.prob > 0.05 && `${(c.prob*100).toFixed(1)}%`}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ── Visual Flow Hint ── */}
      {isGenerating && (
        <div style={{ marginTop: 10, padding: 10, background: 'rgba(0, 245, 255, 0.05)', borderRadius: 6, border: '1px solid rgba(0, 245, 255, 0.2)', color: 'var(--accent-cyan)', fontSize: 11, textAlign: 'center' }}>
          Check the <strong>Transformer Flow</strong> panel to see step-by-step decoding!
        </div>
      )}
    </div>
  );
}
