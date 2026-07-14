import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ── Tooltip Portal (renders at body level to escape overflow:hidden) ──────────
function TooltipPortal({ children }) {
  return createPortal(children, document.body);
}

// ── Rich Knowledge Tooltip ───────────────────────────────────────────────────
export function InfoTooltip({ knowledge, children, placement = 'right', delay = 200 }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const triggerRef = useRef();
  const tooltipRef = useRef();
  const timerRef = useRef();

  const show = useCallback((e) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const W = window.innerWidth;
      const H = window.innerHeight;
      const TW = 340; // tooltip width
      const TH = 400; // estimated tooltip height

      let x, y;

      if (placement === 'right') {
        x = rect.right + 8;
        y = rect.top + rect.height / 2 - TH / 2;
      } else if (placement === 'left') {
        x = rect.left - TW - 8;
        y = rect.top + rect.height / 2 - TH / 2;
      } else if (placement === 'top') {
        x = rect.left + rect.width / 2 - TW / 2;
        y = rect.top - TH - 8;
      } else {
        x = rect.left + rect.width / 2 - TW / 2;
        y = rect.bottom + 8;
      }

      // Clamp to viewport
      x = Math.max(8, Math.min(x, W - TW - 8));
      y = Math.max(8, Math.min(y, H - TH - 8));

      setPos({ x, y });
      setVisible(true);
    }, delay);
  }, [delay, placement]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (!knowledge) return children;

  const { title, color = '#8b5cf6', sections = [] } = knowledge;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        style={{ display: 'inline-flex' }}
      >
        {children}
      </span>

      <TooltipPortal>
        <AnimatePresence>
          {visible && (
            <motion.div
              ref={tooltipRef}
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onMouseEnter={() => clearTimeout(timerRef.current)}
              onMouseLeave={hide}
              style={{
                position: 'fixed',
                left: pos.x,
                top: pos.y,
                width: 340,
                maxHeight: 480,
                overflowY: 'auto',
                background: 'rgba(5, 8, 20, 0.97)',
                border: `1px solid ${color}50`,
                borderRadius: 12,
                padding: '14px 16px',
                boxShadow: `0 0 30px ${color}25, 0 8px 32px rgba(0,0,0,0.6)`,
                backdropFilter: 'blur(20px)',
                zIndex: 99999,
                pointerEvents: 'none',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {/* Title bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 12, paddingBottom: 10,
                borderBottom: `1px solid ${color}30`,
              }}>
                <div style={{
                  width: 3, height: 20, borderRadius: 2,
                  background: color, flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 13, fontWeight: 700, color,
                  lineHeight: 1.2,
                }}>
                  {title}
                </span>
              </div>

              {/* Sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sections.map((section, i) => (
                  <div key={i}>
                    {section.heading && (
                      <div style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.8px',
                        color: `${color}cc`, textTransform: 'uppercase',
                        marginBottom: 4,
                      }}>
                        {section.heading}
                      </div>
                    )}

                    {section.text && (
                      <div style={{
                        fontSize: 11, color: '#94a3b8', lineHeight: 1.65,
                        fontFamily: section.text.includes('\n') || section.text.includes('=')
                          ? 'JetBrains Mono, monospace' : 'Inter, sans-serif',
                        background: section.text.includes('\n') || section.text.includes('=')
                          ? 'rgba(0,0,0,0.3)' : 'transparent',
                        padding: section.text.includes('\n') || section.text.includes('=')
                          ? '6px 8px' : '0',
                        borderRadius: 6,
                        borderLeft: section.text.includes('\n') || section.text.includes('=')
                          ? `2px solid ${color}40` : 'none',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {section.text}
                      </div>
                    )}

                    {section.items && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {section.items.map((item, j) => (
                          <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <span style={{
                              color, fontSize: 8, marginTop: 3, flexShrink: 0,
                              fontWeight: 700,
                            }}>▸</span>
                            <span style={{
                              fontSize: 11, color: '#94a3b8', lineHeight: 1.5,
                            }}>
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer hint */}
              <div style={{
                marginTop: 10, paddingTop: 8,
                borderTop: `1px solid ${color}20`,
                fontSize: 9, color: '#334155',
                fontStyle: 'italic',
              }}>
                Hover to keep open · TransformerViz AI Lab
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </TooltipPortal>
    </>
  );
}

// ── Inline Info Icon (ⓘ button that triggers tooltip) ───────────────────────
export function InfoIcon({ knowledge, size = 13, placement = 'right' }) {
  return (
    <InfoTooltip knowledge={knowledge} placement={placement}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size + 4,
        height: size + 4,
        borderRadius: '50%',
        background: `${knowledge?.color || '#8b5cf6'}18`,
        border: `1px solid ${knowledge?.color || '#8b5cf6'}35`,
        color: knowledge?.color || '#8b5cf6',
        fontSize: size - 1,
        fontWeight: 700,
        cursor: 'help',
        flexShrink: 0,
        userSelect: 'none',
        transition: 'all 0.15s',
        lineHeight: 1,
      }}
        onMouseEnter={e => {
          e.currentTarget.style.background = `${knowledge?.color || '#8b5cf6'}30`;
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = `${knowledge?.color || '#8b5cf6'}18`;
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        ⓘ
      </span>
    </InfoTooltip>
  );
}

// ── Labeled row with built-in info icon ─────────────────────────────────────
export function LabelWithInfo({ label, knowledge, placement = 'right', children, style = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, ...style }}>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
        {label}
      </span>
      {knowledge && <InfoIcon knowledge={knowledge} placement={placement} />}
      {children}
    </div>
  );
}

// ── Term tag (clickable highlighted term with tooltip) ───────────────────────
export function Term({ children, knowledge, color }) {
  const c = color || knowledge?.color || '#8b5cf6';
  return (
    <InfoTooltip knowledge={knowledge} placement="top">
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        color: c,
        borderBottom: `1px dashed ${c}60`,
        cursor: 'help',
        fontWeight: 500,
      }}>
        {children}
      </span>
    </InfoTooltip>
  );
}
