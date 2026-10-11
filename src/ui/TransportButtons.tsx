/**
 * Play, pause and stop (P2). ▶ plays; while playing it becomes ⏸, which stops where the music is
 * and keeps the place: ▶ then goes on from that bar. ■ stops and forgets the place.
 */
import { t } from "./i18n.ts";

export function TransportButtons({ playing, pausedAt, onPlay, onStop, label }: { playing: boolean; pausedAt: number | null; onPlay(): void; onStop(): void; label?: string }) {
  const title = playing ? t("ui.transport.pause") : pausedAt !== null ? t("ui.transport.resume", { bar: pausedAt + 1 }) : (label ?? t("ui.transport.play"));
  return (
    <>
      <button className="icon play" onClick={onPlay} aria-label={title} title={title}>
        {playing ? "⏸" : "▶"}
      </button>
      <button className="icon stop" onClick={onStop} disabled={!playing && pausedAt === null} aria-label={t("ui.transport.stop")} title={t("ui.transport.stop")}>
        ■
      </button>
    </>
  );
}
