import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { generateAttentionMatrix } from '../utils/embeddings';
import { InfoIcon, Term } from './Tooltip';
import KNOWLEDGE from '../utils/knowledge';

const HEAD_COLORS = ['#00f5ff','#8b5cf6','#f472b6','#34d399','#fb923c','#fbbf24','#a78bfa','#6ee7b7'];

const HEAD_PATTERNS = [
  { name: 'Local', desc: 'Attends to nearby tokens (positional)' },
  { name: 'Positional bias', desc: 'Attends toward earlier tokens (BOS bias)' },
  { name: 'Syntactic', desc: 'Groups same-type tokens together' },
  { name: 'Semantic', desc: 'Long-range semantic connections' },
  { name: 'Mixed', desc: 'Combined local + semantic patterns' },
  { name: 'Mixed', desc: 'Combined local + semantic patterns' },
  { name: 'Mixed', desc: 'Combined local + semantic patterns' },
  { name: 'Mixed', desc: 'Combined local + semantic patterns' },
];

export default function AttentionHeatmap({ tokens, numHeads = 4 }) {
  const svgRef = useRef();
  const containerRef = useRef();
  const [activeHead, setActiveHead] = useState(0);
  const [matrices, setMatrices] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (tokens && tokens.length > 0) {
      setMatrices(generateAttentionMatrix(tokens, numHeads));
    } else {
      const demoTokens = [{ text:'the'},{text:'cat'},{text:'sat'},{text:'on'},{text:'mat'},{text:'.'}];
      setMatrices(generateAttentionMatrix(demoTokens, numHeads));
    }
  }, [tokens, numHeads]);

  useEffect(() => {
    if (!matrices || !svgRef.current || !containerRef.current) return;
    const matrix = matrices[activeHead];
    const displayTokens = tokens?.length > 0
      ? tokens.slice(0, matrix.length).map(t => t.text)
      : ['the','cat','sat','on','mat','.'];
    const n = matrix.length;
    const containerW = containerRef.current.clientWidth;
    const maxCellSize = Math.min(Math.floor((containerW - 60) / n), 40);
    const cellSize = Math.max(maxCellSize, 16);
    const margin = { top: 60, right: 20, bottom: 20, left: 60 };
    const W = margin.left + n * cellSize + margin.right;
    const H = margin.top + n * cellSize + margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', W).attr('height', H);
    const headColor = HEAD_COLORS[activeHead % HEAD_COLORS.length];
    const colorScale = d3.scaleSequential().domain([0,1]).interpolator(d3.interpolate('#050810', headColor));
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    matrix.forEach((row, i) => {
      row.forEach((val, j) => {
        g.append('rect')
          .attr('x', j * cellSize).attr('y', i * cellSize)
          .attr('width', cellSize - 1).attr('height', cellSize - 1).attr('rx', 3)
          .attr('fill', colorScale(val))
          .attr('stroke', val > 0.5 ? `${headColor}60` : 'rgba(100,120,200,0.1)').attr('stroke-width', 0.5)
          .style('cursor', 'pointer')
          .on('mouseover', function(event) {
            d3.select(this).attr('stroke', headColor).attr('stroke-width', 1.5);
            const bbox = containerRef.current.getBoundingClientRect();
            setTooltip({
              x: event.clientX - bbox.left + 8,
              y: event.clientY - bbox.top - 60,
              q: displayTokens[i], k: displayTokens[j],
              val: val.toFixed(4), color: headColor,
              rowSum: row.reduce((s,v)=>s+v,0).toFixed(3),
            });
          })
          .on('mouseout', function() {
            d3.select(this).attr('stroke', val > 0.5 ? `${headColor}60` : 'rgba(100,120,200,0.1)').attr('stroke-width', 0.5);
            setTooltip(null);
          });
        if (cellSize >= 26) {
          g.append('text')
            .attr('x', j * cellSize + cellSize/2 - 0.5).attr('y', i * cellSize + cellSize/2 + 3.5)
            .attr('text-anchor','middle').attr('font-size','7px').attr('font-family','JetBrains Mono,monospace')
            .attr('fill', val > 0.4 ? 'rgba(255,255,255,0.9)' : 'rgba(100,120,200,0.5)')
            .text(val.toFixed(2));
        }
      });
    });

    displayTokens.forEach((tok, j) => {
      g.append('text').attr('x', j * cellSize + cellSize/2).attr('y', -8)
        .attr('text-anchor','middle').attr('font-size', Math.min(cellSize*0.35,10)+'px')
        .attr('font-family','JetBrains Mono,monospace').attr('fill','#94a3b8').text(tok.slice(0,4));
    });
    displayTokens.forEach((tok, i) => {
      g.append('text').attr('x', -8).attr('y', i * cellSize + cellSize/2 + 3)
        .attr('text-anchor','end').attr('font-size', Math.min(cellSize*0.35,10)+'px')
        .attr('font-family','JetBrains Mono,monospace').attr('fill','#94a3b8').text(tok.slice(0,4));
    });

    svg.append('text').attr('x', margin.left + n*cellSize/2).attr('y', margin.top - 48)
      .attr('text-anchor','middle').attr('font-size','9px').attr('font-family','Inter,sans-serif')
      .attr('fill','#475569').text('Key (K) — attends to →');
    svg.append('text').attr('transform','rotate(-90)').attr('x',-(margin.top + n*cellSize/2)).attr('y',12)
      .attr('text-anchor','middle').attr('font-size','9px').attr('font-family','Inter,sans-serif')
      .attr('fill','#475569').text('Query (Q) — from →');

    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id',`scale-bar-${activeHead}`).attr('x1','0%').attr('x2','100%');
    grad.append('stop').attr('offset','0%').attr('stop-color','#050810');
    grad.append('stop').attr('offset','100%').attr('stop-color',headColor);
    const barW = n*cellSize;
    const scaleG = svg.append('g').attr('transform',`translate(${margin.left},${margin.top-32})`);
    scaleG.append('rect').attr('width',barW).attr('height',6).attr('rx',3).attr('fill',`url(#scale-bar-${activeHead})`);
    scaleG.append('text').attr('x',0).attr('y',18).attr('font-size','8px').attr('font-family','JetBrains Mono').attr('fill','#475569').text('0.0');
    scaleG.append('text').attr('x',barW).attr('y',18).attr('text-anchor','end').attr('font-size','8px').attr('font-family','JetBrains Mono').attr('fill',headColor).text('1.0');
    scaleG.append('text').attr('x',barW/2).attr('y',18).attr('text-anchor','middle').attr('font-size','8px').attr('font-family','JetBrains Mono').attr('fill','#94a3b8').text('attention weight');

  }, [matrices, activeHead, tokens]);

  const headColor = HEAD_COLORS[activeHead % HEAD_COLORS.length];

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:'10px',padding:'16px',height:'100%',overflow:'auto' }}>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
          <div style={{ fontSize:'11px',fontWeight:700,color:'var(--text-muted)',letterSpacing:'0.8px' }}>
            ATTENTION HEATMAP
          </div>
          <InfoIcon knowledge={KNOWLEDGE.attention} size={11} placement="bottom" />
        </div>
        <span className="badge" style={{ background:`${headColor}20`,color:headColor,border:`1px solid ${headColor}40` }}>
          Head {activeHead+1} / {numHeads}
        </span>
      </div>

      {/* Q/K/V explanation */}
      <div style={{ fontSize:'10px',color:'var(--text-muted)',lineHeight:1.6,background:'rgba(5,8,16,0.5)',borderRadius:6,padding:'8px 10px',border:'1px solid var(--border)' }}>
        Each cell [i,j] = attention from <Term knowledge={{ title:'Query Token', color:'#8b5cf6', sections:[{ heading:'Query (Q)', text:'The current token asking "what should I attend to?" Q = xWᵠ — linear projection of input.' }]}}>Q[i]</Term> to <Term knowledge={{ title:'Key Token', color:'#00f5ff', sections:[{ heading:'Key (K)', text:'The candidate token saying "here\'s what I have." K = xWᴷ — linear projection of input.' }]}}>K[j]</Term>.
        Score = <Term knowledge={KNOWLEDGE.softmax}>softmax</Term>(Q·Kᵀ / √dₖ)
      </div>

      {/* Head selector */}
      <div>
        <div style={{ display:'flex',alignItems:'center',gap:5,marginBottom:6 }}>
          <div style={{ fontSize:'10px',color:'var(--text-muted)' }}>SELECT HEAD</div>
          <InfoIcon knowledge={KNOWLEDGE.numHeads} size={10} placement="right" />
        </div>
        <div className="head-tabs">
          {Array.from({ length: numHeads }).map((_,i) => (
            <button key={i} className={`head-tab ${activeHead===i?'active':''}`}
              style={activeHead===i ? { background:`${HEAD_COLORS[i%HEAD_COLORS.length]}20`, borderColor:`${HEAD_COLORS[i%HEAD_COLORS.length]}50`, color:HEAD_COLORS[i%HEAD_COLORS.length] } : {}}
              onClick={() => setActiveHead(i)}
              title={HEAD_PATTERNS[i]?.desc || 'Mixed attention pattern'}
            >
              H{i+1}
            </button>
          ))}
        </div>
        <div style={{ fontSize:'10px',color:'var(--text-muted)',marginTop:4,fontStyle:'italic' }}>
          {activeHead === 0 && '📍 Local attention — exp(-|i-j|·0.5) decay from current position'}
          {activeHead === 1 && '🎯 Positional bias — attends toward beginning of sequence (BOS token)'}
          {activeHead === 2 && '🔗 Syntactic — groups same token.type (noun-noun, verb-verb)'}
          {activeHead === 3 && '🌐 Semantic — diagonal + long-range connections across context'}
          {activeHead > 3 && '🔀 Mixed — combined local + semantic patterns'}
        </div>
      </div>

      {/* Heatmap SVG */}
      <div ref={containerRef} style={{ position:'relative',overflow:'auto' }}>
        <svg ref={svgRef} style={{ display:'block' }} />

        {tooltip && (
          <div style={{
            position:'absolute',left:tooltip.x,top:tooltip.y,
            background:'rgba(5,8,16,0.97)',border:`1px solid ${tooltip.color}60`,
            borderRadius:8,padding:'10px 14px',zIndex:1000,
            backdropFilter:'blur(10px)',boxShadow:`0 0 20px ${tooltip.color}25`,
            pointerEvents:'none',minWidth:200,
          }}>
            <div style={{ fontSize:11,fontWeight:700,color:tooltip.color,marginBottom:6 }}>
              Attention Score
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:3,fontSize:10,fontFamily:'JetBrains Mono,monospace' }}>
              <div><span style={{ color:'#8b5cf6' }}>Q:</span> <span style={{ color:'#94a3b8' }}>"{tooltip.q}"</span> → <span style={{ color:'#00f5ff' }}>K:</span> <span style={{ color:'#94a3b8' }}>"{tooltip.k}"</span></div>
              <div><span style={{ color:'var(--text-muted)' }}>weight: </span><span style={{ color:'white',fontSize:14,fontWeight:700 }}>{tooltip.val}</span></div>
              <div style={{ color:'#475569',marginTop:4,fontSize:9,lineHeight:1.5 }}>
                Softmax(Q·Kᵀ/√dₖ) — how much token "{tooltip.q}" attends to "{tooltip.k}"
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {matrices && (
        <div style={{ display:'flex',gap:'8px',flexWrap:'wrap' }}>
          {[
            { label:'Max weight', info:null, val: Math.max(...matrices[activeHead].flat()).toFixed(3), color: headColor },
            { label:'Min weight', info:null, val: Math.min(...matrices[activeHead].flat()).toFixed(3), color: '#475569' },
            { label:'Entropy', info:KNOWLEDGE.entropy, val: (-matrices[activeHead].flat().reduce((s,p)=>s+(p>0?p*Math.log(p):0),0)).toFixed(3), color: '#34d399' },
          ].map(stat => (
            <div key={stat.label} className="glass-card" style={{ padding:'6px 10px',flex:1 }}>
              <div style={{ display:'flex',alignItems:'center',gap:4 }}>
                <div style={{ fontSize:'9px',color:'var(--text-muted)' }}>{stat.label}</div>
                {stat.info && <InfoIcon knowledge={stat.info} size={9} placement="top" />}
              </div>
              <div style={{ fontSize:'13px',fontFamily:'var(--font-mono)',color:stat.color,fontWeight:600 }}>{stat.val}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
