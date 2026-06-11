import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Pencil } from "lucide-react";

const schema = z.object({
  username: z.string().min(1, "Name required").max(20, "Max 20 characters"),
});

const ACCENT = '#C4FF47';
const BG = '#0C0C0C';
const CREAM = '#F2EDE4';

export default function UsernameForm({
  open,
  onSubmit,
}: {
  open: boolean;
  onSubmit: (username: string) => void;
}) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: "" },
  });

  if (!open) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Syne:wght@400;500;600;700;800&display=swap');

        .yc-username-input {
          width: 100%; padding: 12px 16px;
          background: #1A1A1A;
          border: 1px solid rgba(242,237,228,0.12);
          border-radius: 10px;
          color: ${CREAM};
          font-family: 'Syne', sans-serif;
          font-size: 0.95rem;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .yc-username-input:focus { border-color: rgba(196,255,71,0.45); }
        .yc-username-input::placeholder { color: rgba(242,237,228,0.25); }

        .yc-submit-btn {
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 13px 20px;
          background: ${ACCENT}; color: ${BG};
          border: none; border-radius: 100px;
          font-family: 'Syne', sans-serif;
          font-size: 0.9rem; font-weight: 700;
          cursor: pointer; margin-top: 10px;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .yc-submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(196,255,71,0.3);
        }
        .yc-submit-btn:active { transform: translateY(0); }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Syne', sans-serif",
      }}>
        <div style={{
          background: '#111',
          border: '1px solid rgba(242,237,228,0.1)',
          borderRadius: 20,
          padding: '2.5rem',
          width: '100%', maxWidth: 380,
          boxSizing: 'border-box',
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1.5rem',
          }}>
            <Pencil size={18} color={BG} strokeWidth={2.5} />
          </div>

          <h2 style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: '1.9rem', fontWeight: 400,
            color: CREAM, margin: 0, marginBottom: '0.4rem',
            lineHeight: 1.1, letterSpacing: '-0.02em',
          }}>
            What's your name?
          </h2>
          <p style={{
            fontSize: '0.83rem',
            color: 'rgba(242,237,228,0.4)',
            margin: '0 0 1.8rem',
            lineHeight: 1.5,
          }}>
            Visible to collaborators on this board.
          </p>

          <form onSubmit={form.handleSubmit((v) => onSubmit(v.username))}>
            <input
              {...form.register('username')}
              placeholder="eg. WiseyXD"
              autoFocus
              className="yc-username-input"
            />
            {form.formState.errors.username && (
              <p style={{
                color: '#ff6b6b', fontSize: '0.75rem',
                margin: '6px 0 0', fontFamily: "'Syne', sans-serif",
              }}>
                {form.formState.errors.username.message}
              </p>
            )}
            <button type="submit" className="yc-submit-btn">
              Enter Board
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
