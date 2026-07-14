import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { vectorDB } from '../utils/vectorDB';
import { generateEmbedding, simpleTokenize } from '../utils/embeddings';
import { InfoIcon, Term } from './Tooltip';
import KNOWLEDGE from '../utils/knowledge';
import { DEFAULT_DATA_CHUNKS } from '../utils/defaultData';

export default function DataIngestion({ onUpdate, onTokensChange }) {
  const [text, setText] = useState('');
  const [label, setLabel] = useState('');
  const [tokens, setTokens] = useState([]);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const fileRef = useRef();

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    if (val.trim()) {
      const toks = simpleTokenize(val);
      setTokens(toks);
      onTokensChange?.(toks);
    } else {
      setTokens([]);
      onTokensChange?.([]);
    }
  };

  const handleEmbed = useCallback(async () => {
    if (!text.trim()) return;
    setIsEmbedding(true);
    await new Promise(r => setTimeout(r, 300));
    const embedding = generateEmbedding(text);
    const entry = vectorDB.add(text.trim(), embedding, { label: label || `Doc ${vectorDB.size + 1}` });
    setLastAdded(entry);
    setText('');
    setLabel('');
    setTokens([]);
    onTokensChange?.([]);
    onUpdate?.();
    setIsEmbedding(false);
  }, [text, label, onUpdate, onTokensChange]);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    const qEmbed = generateEmbedding(searchQuery);
    const results = vectorDB.search(qEmbed, 5);
    setSearchResults(results);
  }, [searchQuery]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target.result;
      const chunks = content.match(/.{1,200}(\s|$)/g) || [content];
      chunks.forEach((chunk, i) => {
        const emb = generateEmbedding(chunk.trim());
        vectorDB.add(chunk.trim(), emb, { label: `${file.name} §${i + 1}` });
      });
      onUpdate?.();
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    vectorDB.clear();
    setSearchResults([]);
    setLastAdded(null);
    onUpdate?.();
  };

  const handleLoadDefaults = () => {
    DEFAULT_DATA_CHUNKS.forEach((chunk, i) => {
      const emb = generateEmbedding(chunk);
      vectorDB.add(chunk, emb, { label: `Default §${i + 1}` });
    });
    onUpdate?.();
  };

  const samples = [
    { label: 'AI Text', text: 'Transformer neural networks use self-attention mechanisms to process sequential data in parallel, enabling efficient language modeling and generation.' },
    { label: 'Nature', text: 'The deep ocean harbors bioluminescent creatures that produce their own light through chemical reactions, creating ethereal glow in the darkness.' },
    { label: 'Science', text: 'Quantum entanglement allows two particles to share quantum states instantaneously across any distance, a phenomenon Einstein called spooky action at a distance.' },
    { label: 'Story', text: 'She walked through the abandoned library, her footsteps echoing on marble floors, dust motes dancing in shafts of golden afternoon light.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      {/* ── Input Section ── */}
      <div className="panel-section">
        <div className="panel-header">
          <div className="panel-header-icon" style={{ background: 'rgba(139,92,246,0.2)' }}>📝</div>
          <span className="panel-header-title">Data Input</span>
          <span className="badge badge-cyan">{vectorDB.size} stored</span>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="text" placeholder="Label (optional)..." value={label} onChange={e => setLabel(e.target.value)} />

          <textarea
            placeholder="Paste text to embed and store in the vector DB..."
            value={text}
            onChange={handleTextChange}
            rows={5}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
          />

          {/* Tokenization preview */}
          <AnimatePresence>
            {tokens.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>TOKENS ({tokens.length})</div>
                  <InfoIcon knowledge={KNOWLEDGE.tokenization} placement="right" size={10} />
                  <InfoIcon knowledge={KNOWLEDGE.bpe} placement="right" size={10} />
                </div>
                <div className="token-chips">
                  {tokens.map((tok, i) => (
                    <Term key={i} knowledge={{
                      title: `Token: "${tok.text}"`,
                      color: tok.type === 'word' ? '#c4b5fd' : tok.type === 'prefix' ? '#00f5ff' : tok.type === 'suffix' ? '#f472b6' : tok.type === 'stem' ? '#34d399' : '#fbbf24',
                      sections: [
                        { heading: 'Token Type', text: tok.type.toUpperCase() },
                        {
                          heading: 'What this type means',
                          text: tok.type === 'word' ? 'Standalone word — maps directly to vocabulary entry' :
                            tok.type === 'prefix' ? 'Subword prefix — morphological beginning (un-, re-, pre-)' :
                            tok.type === 'suffix' ? 'Subword suffix — morphological ending (-ing, -tion, -ness)' :
                            tok.type === 'stem' ? 'Root stem — the core meaning after affixes removed' :
                            'Punctuation token — treated as separate token from adjacent words',
                        },
                        { heading: 'Word index', text: `Word #${tok.wordIdx} in input` },
                        ...KNOWLEDGE.tokenization.sections.slice(0, 2),
                      ],
                    }}>
                      <span className={`token-chip ${tok.type}`}>{tok.text}</span>
                    </Term>
                  ))}
                </div>
                {/* Token legend */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {[['word','#c4b5fd'], ['prefix','#00f5ff'], ['stem','#34d399'], ['suffix','#f472b6'], ['punct','#fbbf24']].map(([type, color]) => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: '9px', color: '#475569' }}>{type}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleEmbed} disabled={!text.trim() || isEmbedding}>
              {isEmbedding
                ? <><div className="spinner" style={{ width: 12, height: 12 }} /> Embedding…</>
                : <><span>⚡</span> Embed &amp; Store</>
              }
            </button>
            <button className="btn btn-cyan btn-sm" onClick={() => fileRef.current?.click()} title="Upload text file — auto-chunked into 200-char pieces">
              📁
            </button>
            <input ref={fileRef} type="file" accept=".txt,.md,.csv" style={{ display: 'none' }} onChange={handleFileUpload} />
          </div>

          {/* Samples */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>QUICK SAMPLES</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {samples.map(s => (
                <button key={s.label} className="btn btn-sm"
                  style={{ background: 'rgba(30,40,80,0.6)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  onClick={() => { setText(s.text); setLabel(s.label); handleTextChange({ target: { value: s.text } }); }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {lastAdded && (
              <motion.div className="glass-card"
                style={{ padding: '8px 12px', borderColor: 'rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.05)' }}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              >
                <div style={{ fontSize: '10px', color: 'var(--accent-green)' }}>✓ Stored → {lastAdded.metadata.label}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>
                  dim: 128 · id: #{lastAdded.id}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Vector DB Stats ── */}
      <div className="panel-section">
        <div className="panel-header">
          <div className="panel-header-icon" style={{ background: 'rgba(0,245,255,0.1)' }}>🗄️</div>
          <span className="panel-header-title">Vector DB</span>
          <InfoIcon knowledge={KNOWLEDGE.vectorDB} placement="left" size={11} />
        </div>
        <div className="panel-body">
          {[
            { label: 'Vectors Stored', value: vectorDB.size, info: null },
            { label: 'Dimensions', value: 128, info: KNOWLEDGE.embeddingDim },
            { label: 'Similarity Metric', value: 'Cosine', info: KNOWLEDGE.cosineSimilarity },
            { label: 'Embedding Model', value: 'Math (128d)', info: KNOWLEDGE.embeddingModel },
            { label: '3D Projection', value: 'Random Proj.', info: KNOWLEDGE.projection3D },
            { label: 'Chunking', value: '200 chars', info: KNOWLEDGE.chunking },
          ].map(row => (
            <div key={row.label} className="stat-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="stat-label">{row.label}</span>
                {row.info && <InfoIcon knowledge={row.info} size={10} placement="right" />}
              </div>
              <span className="stat-value">{row.value}</span>
            </div>
          ))}
          {vectorDB.size > 0 && (
            <button className="btn btn-danger btn-sm btn-full" style={{ marginTop: '10px' }} onClick={handleClear}>
              🗑️ Clear DB
            </button>
          )}
          {vectorDB.size === 0 && (
            <button className="btn btn-cyan btn-sm btn-full" style={{ marginTop: '10px' }} onClick={handleLoadDefaults}>
              📚 Load 50 Sample Chunks
            </button>
          )}
        </div>
      </div>

      {/* ── Similarity Search ── */}
      <div className="panel-section">
        <div className="panel-header">
          <div className="panel-header-icon" style={{ background: 'rgba(244,114,182,0.1)' }}>🔍</div>
          <span className="panel-header-title">Similarity Search</span>
          <InfoIcon knowledge={KNOWLEDGE.rag} placement="left" size={11} />
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Uses <Term knowledge={KNOWLEDGE.cosineSimilarity}>cosine similarity</Term> to find the most semantically related stored vectors.
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input type="text" placeholder="Search query..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button className="btn btn-cyan btn-sm" onClick={handleSearch}>→</button>
          </div>

          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {searchResults.map((r) => (
                  <div key={r.id} className="search-result">
                    <div className="search-result-text">{r.text}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{r.metadata?.label}</span>
                      <span className="search-result-sim">{(r.similarity * 100).toFixed(1)}% match</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${r.similarity * 100}%` }} />
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {vectorDB.size === 0 && (
            <div className="empty-state" style={{ padding: '12px' }}>
              <div className="empty-state-icon">🔮</div>
              <div className="empty-state-text">Add vectors first to enable semantic search</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
