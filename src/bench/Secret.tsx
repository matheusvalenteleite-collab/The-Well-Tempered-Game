/**
 * D343: the owner's way back to everything on play.html. The version label (in ⚙ SETTINGS, and the
 * MOBILE ONLY screen's title) looks like plain text; tapped seven times within three seconds it opens a
 * small passphrase field. The right passphrase (unlock.ts: only its hash is kept) unlocks the device and
 * reloads; the lock phrase (D369) locks the device again and reloads; anything else closes the field
 * without a word.
 */
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { secretAction, setUnlocked, tapCounter } from "./unlock.ts";

export function VersionTap({ children, className, id = "version-tap" }: { children: ReactNode; className?: string; id?: string }) {
  const tap = useRef(tapCounter());
  const [asking, setAsking] = useState(false);
  const [text, setText] = useState("");
  const close = () => (setAsking(false), setText(""));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    // D369: the unlock phrase unlocks; the lock phrase (LOCK_HASH) locks again; anything else, nothing.
    const act = await secretAction(text);
    close();
    if (!act) return;
    setUnlocked(act === "unlock");
    window.location.reload();
  };
  return (
    <>
      <span className={className} id={id} onClick={() => tap.current(performance.now()) && setAsking(true)}>
        {children}
      </span>
      {asking && (
        <form className="tb-secret" id="secret-form" onSubmit={submit}>
          <input id="secret-input" type="password" autoFocus autoComplete="off" autoCapitalize="none" spellCheck={false} aria-label="…" value={text} onChange={(e) => setText(e.target.value)} onBlur={close} onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), close())} />
        </form>
      )}
    </>
  );
}
