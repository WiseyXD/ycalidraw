import { useState, useEffect } from 'react';
import { getAllDrawings, createDrawing, deleteDrawing } from '@/lib/drawingManager';
import type { DrawingMeta } from '@/lib/drawingManager';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Plus, Trash2, GitFork, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

const ACCENT = '#C4FF47';
const BG = '#0C0C0C';
const CREAM = '#F2EDE4';
const CARD_BG = '#121212';
const CARD_HOVER = '#181818';
const BORDER = 'rgba(242,237,228,0.08)';

const PREVIEW_SHAPES: Array<(i: number) => React.ReactNode> = [
  (i) => (
    <path
      d={`M ${15 + (i * 31) % 20} ${35 + (i * 17) % 15} Q ${70} ${15 + (i * 13) % 20} ${130 + (i * 7) % 20} ${35 + (i * 11) % 15} Q ${165 + (i * 5) % 10} ${48 + (i * 9) % 10} 185 ${40 + (i * 7) % 10}`}
      stroke={ACCENT} strokeWidth="1.5" fill="none" strokeLinecap="round"
    />
  ),
  (i) => (
    <>
      <rect x={20 + (i * 11) % 10} y={15 + (i * 7) % 10} width="50" height="38" rx="6"
        stroke="rgba(242,237,228,0.35)" strokeWidth="1" fill="none" />
      <path d={`M ${100} ${25} Q ${140} ${10} ${180} ${30}`}
        stroke={ACCENT} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </>
  ),
  (i) => (
    <>
      <circle cx={155 + (i * 7) % 15} cy={35 + (i * 11) % 15} r="25"
        stroke="rgba(242,237,228,0.35)" strokeWidth="1" fill="none" />
      <path d={`M 20 ${50 + (i * 9) % 10} L ${60} ${20 + (i * 13) % 15} L ${100} ${45 + (i * 7) % 10}`}
        stroke={ACCENT} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
];

const MARQUEE_ITEMS = [
  'Excalidraw Engine', 'Cloudflare Durable Objects', 'React 19',
  'WebSocket Sync', 'Zero Lag', 'Framer Motion', 'TypeScript',
  'Hono Framework', 'Real-time Cursors', 'Cloudflare Workers',
];

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [drawings, setDrawings] = useState<DrawingMeta[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setDrawings(getAllDrawings().sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  const handleNewDrawing = () => {
    const drawing = createDrawing('Untitled Board');
    navigate(`/${drawing.id}`);
  };

  const handleOpenDrawing = (id: string) => navigate(`/${id}`);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    await deleteDrawing(id);
    setDrawings(prev => prev.filter(d => d.id !== id));
    setDeletingId(null);
    toast.success('Board deleted');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Syne:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        .yc-root {
          font-family: 'Syne', sans-serif;
          background: ${BG};
          color: ${CREAM};
          min-height: 100vh;
          overflow-x: hidden;
          position: relative;
        }

        /* Grain overlay */
        .yc-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.035;
          pointer-events: none;
          z-index: 0;
        }

        /* Sketch bg paths */
        @keyframes yc-draw {
          from { stroke-dashoffset: 900; opacity: 0; }
          10% { opacity: 1; }
          to { stroke-dashoffset: 0; opacity: 1; }
        }
        .yc-sketch-a { stroke-dasharray: 900; stroke-dashoffset: 900; animation: yc-draw 3s ease forwards 0.2s; }
        .yc-sketch-b { stroke-dasharray: 500; stroke-dashoffset: 500; animation: yc-draw 2s ease forwards 0.8s; }
        .yc-sketch-c { stroke-dasharray: 350; stroke-dashoffset: 350; animation: yc-draw 1.8s ease forwards 1.4s; }

        /* CTA button */
        .yc-cta {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 15px 28px;
          background: ${ACCENT};
          color: ${BG};
          border: none; border-radius: 100px;
          font-family: 'Syne', sans-serif;
          font-size: 0.9rem; font-weight: 700;
          letter-spacing: -0.01em;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          position: relative; overflow: hidden;
        }
        .yc-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(196,255,71,0.35);
        }
        .yc-cta:active { transform: translateY(0); }

        /* Nav link */
        .yc-nav-link {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px;
          border: 1px solid rgba(242,237,228,0.12);
          border-radius: 100px;
          font-size: 0.82rem; font-weight: 500;
          color: rgba(242,237,228,0.55);
          text-decoration: none;
          transition: color 0.2s, border-color 0.2s;
        }
        .yc-nav-link:hover { color: ${CREAM}; border-color: rgba(242,237,228,0.3); }

        /* Drawing card */
        .yc-card {
          background: ${CARD_BG};
          border: 1px solid ${BORDER};
          border-radius: 16px;
          padding: 0;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, transform 0.15s;
          overflow: hidden;
          position: relative;
        }
        .yc-card:hover {
          background: ${CARD_HOVER};
          border-color: rgba(196,255,71,0.18);
          transform: translateY(-2px);
        }
        .yc-card:hover .yc-card-arrow { color: ${ACCENT}; transform: translate(2px, -2px); }
        .yc-card-arrow { transition: transform 0.2s, color 0.2s; color: rgba(242,237,228,0.2); }

        .yc-delete-btn {
          background: none; border: none; padding: 6px;
          cursor: pointer; border-radius: 8px;
          color: rgba(242,237,228,0.25);
          transition: color 0.2s, background 0.2s;
          display: flex; align-items: center;
        }
        .yc-delete-btn:hover { color: #ff6b6b; background: rgba(255,107,107,0.1); }

        /* Marquee */
        .yc-marquee-wrap { overflow: hidden; }
        .yc-marquee-track {
          display: flex; width: max-content;
          animation: yc-marquee 28s linear infinite;
        }
        @keyframes yc-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .yc-marquee-item {
          display: flex; align-items: center; gap: 1.8rem;
          white-space: nowrap;
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(242,237,228,0.22);
          padding: 0 0.9rem;
        }
        .yc-marquee-dot { color: ${ACCENT}; font-size: 1rem; }

        /* Empty state */
        .yc-empty {
          border: 1px dashed rgba(242,237,228,0.1);
          border-radius: 20px;
          padding: 5rem 2rem;
          text-align: center;
        }

        /* Pulse dot */
        @keyframes yc-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(1.3); } }
        .yc-pulse-dot { animation: yc-pulse 2s ease-in-out infinite; }

        /* Footer links */
        .yc-footer-link { color: rgba(242,237,228,0.3); text-decoration: none; transition: color 0.2s; }
        .yc-footer-link:hover { color: rgba(242,237,228,0.7); }

        /* New drawing small btn */
        .yc-new-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 15px;
          border: 1px solid rgba(242,237,228,0.12);
          border-radius: 100px;
          background: none;
          font-family: 'Syne', sans-serif;
          font-size: 0.8rem; font-weight: 600;
          color: rgba(242,237,228,0.5);
          cursor: pointer;
          transition: color 0.2s, border-color 0.2s;
        }
        .yc-new-btn:hover { color: ${ACCENT}; border-color: rgba(196,255,71,0.35); }
      `}</style>

      <div className="yc-root">

        {/* Decorative background sketch lines */}
        <svg
          aria-hidden="true"
          style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, opacity: 0.07 }}
          viewBox="0 0 1440 900" fill="none" preserveAspectRatio="xMidYMid slice"
        >
          <path className="yc-sketch-a"
            d="M -50 650 Q 200 580 450 620 Q 700 660 950 590 Q 1200 520 1490 570"
            stroke={ACCENT} strokeWidth="1.5" />
          <path className="yc-sketch-b"
            d="M 900 100 Q 1050 60 1200 90 Q 1320 115 1440 80"
            stroke={CREAM} strokeWidth="1" />
          <path className="yc-sketch-c"
            d="M 50 200 Q 100 170 150 190 Q 200 210 250 180 Q 300 150 350 175"
            stroke={CREAM} strokeWidth="0.8" />
          <rect className="yc-sketch-b" x="1100" y="200" width="100" height="75" rx="8"
            stroke={ACCENT} strokeWidth="0.8" fill="none" />
          <circle className="yc-sketch-c" cx="120" cy="750" r="55"
            stroke={CREAM} strokeWidth="0.7" fill="none" />
        </svg>

        {/* ── NAV ── */}
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'relative', zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1.5rem 2.5rem',
            maxWidth: 1200, margin: '0 auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: ACCENT, width: 34, height: 34, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Pencil size={16} color={BG} strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.03em' }}>
              Ycalidraw
            </span>
          </div>

          <a
            href="https://github.com/wiseyxd/ycalidraw"
            target="_blank"
            rel="noopener noreferrer"
            className="yc-nav-link"
          >
            <GitFork size={13} />
            GitHub
          </a>
        </motion.nav>

        {/* ── HERO ── */}
        <section style={{
          position: 'relative', zIndex: 10,
          maxWidth: 1200, margin: '0 auto',
          padding: '5rem 2.5rem 4rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center',
        }}>
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '5px 14px',
              border: `1px solid rgba(196,255,71,0.3)`,
              borderRadius: 100,
              marginBottom: '2.5rem',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: ACCENT,
            }}
          >
            <span className="yc-pulse-dot" style={{
              width: 6, height: 6, borderRadius: '50%',
              background: ACCENT,
              boxShadow: `0 0 8px ${ACCENT}`,
              display: 'inline-block', flexShrink: 0,
            }} />
            Live · Cloudflare Durable Objects
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: 'clamp(3.2rem, 7.5vw, 7rem)',
              lineHeight: 1.0,
              letterSpacing: '-0.025em',
              fontWeight: 400,
              margin: '0 auto',
              marginBottom: '1.8rem',
              textAlign: 'center',
            }}
          >
            Draw together,<br />
            <em style={{ color: ACCENT, fontStyle: 'italic' }}>in real‑time.</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            style={{
              fontSize: '1.05rem',
              color: 'rgba(242,237,228,0.55)',
              maxWidth: 440,
              lineHeight: 1.75,
              margin: '0 auto 2.8rem',
              fontWeight: 400,
            }}
          >
            Multiplayer whiteboarding built on Excalidraw. Share a link, collaborate instantly — zero setup, zero lag.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <button className="yc-cta" onClick={handleNewDrawing}>
              New Board
              <ArrowUpRight size={17} strokeWidth={2.5} />
            </button>
          </motion.div>
        </section>

        {/* ── MARQUEE ── */}
        <div className="yc-marquee-wrap" style={{
          position: 'relative', zIndex: 10,
          borderTop: `1px solid ${BORDER}`,
          borderBottom: `1px solid ${BORDER}`,
          padding: '1rem 0',
        }}>
          <div className="yc-marquee-track">
            {[...Array(2)].map((_, si) =>
              MARQUEE_ITEMS.map((item, i) => (
                <span key={`${si}-${i}`} className="yc-marquee-item">
                  {item}
                  <span className="yc-marquee-dot">·</span>
                </span>
              ))
            )}
          </div>
        </div>

        {/* ── DRAWINGS SECTION ── */}
        <section style={{
          position: 'relative', zIndex: 10,
          maxWidth: 1200, margin: '0 auto',
          padding: '4rem 2.5rem 6rem',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '2rem',
          }}>
            <h2 style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(242,237,228,0.35)',
              margin: 0,
            }}>
              Recent boards
              {drawings.length > 0 && (
                <span style={{
                  marginLeft: 10, padding: '2px 8px',
                  background: 'rgba(242,237,228,0.07)',
                  borderRadius: 100, fontSize: '0.68rem',
                }}>
                  {drawings.length}
                </span>
              )}
            </h2>
            <button className="yc-new-btn" onClick={handleNewDrawing}>
              <Plus size={13} strokeWidth={2.5} />
              New board
            </button>
          </div>

          {drawings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="yc-empty"
            >
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'rgba(196,255,71,0.08)',
                border: `1px solid rgba(196,255,71,0.15)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.2rem',
              }}>
                <Pencil size={20} color={ACCENT} />
              </div>
              <p style={{
                fontSize: '0.9rem',
                color: 'rgba(242,237,228,0.35)',
                margin: 0, marginBottom: '1.5rem',
              }}>
                No boards yet. Start your first one.
              </p>
              <button className="yc-cta" onClick={handleNewDrawing} style={{ fontSize: '0.82rem', padding: '12px 22px' }}>
                Create board
                <ArrowUpRight size={15} />
              </button>
            </motion.div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1rem',
            }}>
              <AnimatePresence mode="popLayout">
                {drawings.map((d, i) => {
                  const ShapeEl = PREVIEW_SHAPES[i % PREVIEW_SHAPES.length];
                  return (
                    <motion.div
                      key={d.id}
                      layout
                      initial={{ opacity: 0, y: 16, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
                      transition={{ delay: i * 0.04, duration: 0.35 }}
                      className="yc-card"
                      onClick={() => handleOpenDrawing(d.id)}
                    >
                      {/* Preview area */}
                      <div style={{
                        height: 110,
                        background: '#0E0E0E',
                        borderBottom: `1px solid ${BORDER}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '1rem',
                        position: 'relative', overflow: 'hidden',
                      }}>
                        <svg width="100%" height="100%" viewBox="0 0 200 80" fill="none"
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                        >
                          <ShapeEl i={i} />
                        </svg>
                      </div>

                      {/* Card footer */}
                      <div style={{
                        padding: '1rem 1.2rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{
                            fontWeight: 600, fontSize: '0.9rem',
                            color: CREAM, margin: 0, marginBottom: 3,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {d.name}
                          </p>
                          <p style={{
                            fontSize: '0.72rem',
                            color: 'rgba(242,237,228,0.35)',
                            margin: 0,
                          }}>
                            Edited {formatDate(d.updatedAt)}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, marginLeft: 8 }}>
                          <motion.button
                            className="yc-delete-btn"
                            onClick={(e) => handleDelete(e, d.id)}
                            animate={deletingId === d.id ? { opacity: 0.4 } : { opacity: 1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Trash2 size={13} />
                          </motion.button>
                          <span className="yc-card-arrow" style={{ display: 'flex', padding: 4 }}>
                            <ArrowUpRight size={15} />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* ── FOOTER ── */}
        <footer style={{
          position: 'relative', zIndex: 10,
          borderTop: `1px solid ${BORDER}`,
          padding: '2rem 2.5rem',
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: '0.78rem',
          color: 'rgba(242,237,228,0.28)',
        }}>
          <span>© {new Date().getFullYear()} Ycalidraw · Aryan Sanjay Nagbanshi</span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="https://x.com/AryanNagbanshi" target="_blank" rel="noopener noreferrer" className="yc-footer-link">
              Twitter
            </a>
            <a href="https://github.com/wiseyxd" target="_blank" rel="noopener noreferrer" className="yc-footer-link">
              GitHub
            </a>
          </div>
        </footer>

      </div>
    </>
  );
}
