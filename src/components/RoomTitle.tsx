import { useEffect, useRef, useState } from "react";

export default function RoomTitle({
  name,
  onRename,
}: {
  name: string;
  onRename: (newName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(name);
  }, [name]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    } else {
      setDraft(name);
    }
  };

  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-[80vw]">
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-900 outline-none focus:border-slate-500 min-w-[12rem] max-w-full"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          title="Click to rename"
          className="px-3 py-1.5 rounded-md bg-white/80 hover:bg-white text-sm font-medium text-slate-700 shadow-sm border border-slate-200 max-w-full truncate"
        >
          {name || "Untitled drawing"}
        </button>
      )}
    </div>
  );
}
