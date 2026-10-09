/** Note-value icons for the input buttons (D95), drawn rather than taken from a font. `slots`: quavers (1 = quaver ... 8 = semibreve). */
export function NoteIcon({ slots }: { slots: number }) {
  const hollow = slots >= 4;
  const stem = slots < 8;
  const dot = slots === 3 || slots === 6;
  const flag = slots === 1;
  return (
    <svg viewBox="0 0 22 24" width="18" height="20" aria-hidden="true" className="note-icon">
      <ellipse cx="8" cy="18" rx="5" ry="3.6" transform="rotate(-22 8 18)" fill={hollow ? "none" : "currentColor"} stroke="currentColor" strokeWidth={hollow ? 1.6 : 1} />
      {stem && <line x1="12.4" y1="17" x2="12.4" y2="2" stroke="currentColor" strokeWidth="1.5" />}
      {flag && <path d="M12.4 2 C 15 6, 19 7, 17 12" fill="none" stroke="currentColor" strokeWidth="1.6" />}
      {dot && <circle cx="17.5" cy="18" r="1.6" fill="currentColor" />}
    </svg>
  );
}
