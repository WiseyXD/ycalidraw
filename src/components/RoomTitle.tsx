export default function RoomTitle({ name }: { name: string }) {
  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 max-w-[60vw] pointer-events-none">
      <div className="px-3 py-1.5 rounded-md bg-white/80 text-sm font-medium text-slate-700 shadow-sm border border-slate-200 truncate">
        {name || "Untitled drawing"}
      </div>
    </div>
  );
}
