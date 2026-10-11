/** Where the music is, in words ("bar 12, beat 3"), kept up to date while it plays (D147). */
import { useEffect, useRef } from "react";
import { onFrames, playhead } from "./playhead.ts";

export function LivePos({ idle, format, title, className = "wtc-pos" }: { idle: string; format(q: number): string; title?: string; className?: string }) {
  const el = useRef<HTMLSpanElement>(null);
  const fmt = useRef(format);
  fmt.current = format;
  const idleRef = useRef(idle);
  idleRef.current = idle;
  useEffect(() => {
    let last = "";
    return onFrames((pos) => {
      const text = pos === null ? idleRef.current : fmt.current(pos);
      if (text !== last && el.current) el.current.textContent = last = text;
    });
  }, []);
  // The text is the span's own (React leaves it alone): the idle words when nothing plays.
  useEffect(() => {
    if (el.current && !playhead.active) el.current.textContent = idle;
  }, [idle]);
  return <span className={className} ref={el} data-info={title} />;
}
