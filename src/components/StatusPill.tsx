import type { ConnectionStatus } from "../hooks/useWebsocket";

const LABELS: Record<ConnectionStatus, string> = {
  connected: "Live",
  reconnecting: "Reconnecting…",
  offline: "Offline",
};

const DOT_CLASSES: Record<ConnectionStatus, string> = {
  connected: "bg-green-500",
  reconnecting: "bg-amber-500 animate-pulse",
  offline: "bg-red-500",
};

export default function StatusPill({ status }: { status: ConnectionStatus }) {
  return (
    <div
      className="absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm border border-slate-200 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <span className={`h-2 w-2 rounded-full ${DOT_CLASSES[status]}`} />
      {LABELS[status]}
    </div>
  );
}
