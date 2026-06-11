import type { ConnectionStatus } from "../hooks/useWebsocket";

const STATUS_CONFIG: Record<ConnectionStatus, { dot: string; label: string; pulse: boolean }> = {
  connected:    { dot: '#C4FF47', label: 'Live',          pulse: false },
  reconnecting: { dot: '#F59E0B', label: 'Reconnecting',  pulse: true  },
  offline:      { dot: '#ef4444', label: 'Offline',       pulse: false },
};

export default function StatusPill({ status }: { status: ConnectionStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px',
        background: 'rgba(242,237,228,0.05)',
        border: '1px solid rgba(242,237,228,0.1)',
        borderRadius: 100,
        fontSize: '0.72rem', fontWeight: 600,
        letterSpacing: '0.02em',
        color: 'rgba(242,237,228,0.55)',
        fontFamily: "'Syne', sans-serif",
        userSelect: 'none',
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: cfg.dot,
        boxShadow: `0 0 6px ${cfg.dot}`,
        flexShrink: 0,
        ...(cfg.pulse ? { animation: 'yc-status-pulse 1.5s ease-in-out infinite' } : {}),
      }} />
      {cfg.label}
    </div>
  );
}
