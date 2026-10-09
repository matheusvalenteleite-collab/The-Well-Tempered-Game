import { useEffect, useRef, useState } from "react";
import type { Piece } from "../game/saved.ts";
import { formatTime, pieceSeconds } from "../game/saved.ts";
import type { ExerciseView } from "../game/exercise-view.ts";
import { heardLines } from "../game/versions.ts";
import { parsePitch } from "../music/pitch.ts";
import { slotLength, slotOffset, sounding } from "../counterpoint/layout.ts";
import { t } from "./i18n.ts";

interface Props {
  pieces: Piece[];
  /** The piece playing and its current slot. */
  playing: { id: string; slot: number } | null;
  viewOf(stepId: string): ExerciseView | null;
  stepName(stepId: string): string;
  onPlay(p: Piece): void;
  onOpen(p: Piece): void;
  onRename(id: string, name: string): void;
  onDelete(id: string): void;
  onClose(): void;
}

const BARS = 140;

/** The saved pieces, lined up as on a streaming page: play/pause, a contour "waveform" with progress, rename, open, delete. */
export function SavedPieces(p: Props) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);
  return (
    <div className="dialog-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && p.onClose()}>
      <section className="dialog saved" role="dialog" aria-modal="true" aria-label={t("ui.saved.title")} onKeyDown={(e) => e.key === "Escape" && p.onClose()}>
        <div className="saved-head">
          <h2>{t("ui.saved.title")}</h2>
          <button ref={close} className="icon quiet" onClick={p.onClose} aria-label={t("ui.saved.close")}>×</button>
        </div>
        {p.pieces.length === 0 && <p className="help">{t("ui.saved.empty")}</p>}
        <ul className="tracks">
          {p.pieces.map((piece) => (
            <Track key={piece.id} {...p} piece={piece} view={p.viewOf(piece.stepId)} label={p.stepName(piece.stepId)} slot={p.playing?.id === piece.id ? p.playing.slot : null} />
          ))}
        </ul>
        <p className="help">{t("ui.saved.help")}</p>
      </section>
    </div>
  );
}

function Track({ piece, view, label, slot, onPlay, onOpen, onRename, onDelete }: Props & { piece: Piece; view: ExerciseView | null; label: string; slot: number | null }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(piece.name);
  if (!view) return null;
  const bars = view.cantus.length;
  const total = pieceSeconds(bars, piece.tempo);
  const firstOffset = slotOffset(view.layout[0]);
  const at = slot !== null && slot >= 0 ? (slotOffset(view.layout[slot]) - firstOffset + slotLength(view.layout[slot])) / bars : slot === null ? 0 : 0;
  const playing = slot !== null;
  // Contour: the highest sounding line at each moment (the player's lines, and Fux's when he plays).
  const lines = heardLines(piece.versions, piece.notes, view.modalFinal).map((l) => l.notes);
  if (piece.mode !== "player" && view.fux) lines.push(view.fux);
  if (piece.mode === "fux" && view.fux) lines.splice(0, lines.length - 1);
  const tops = view.layout.map((_, k) => Math.max(...lines.map((l) => (sounding(l[k] ?? null) ? parsePitch(l[k] as string).midi : -1)), parsePitch(view.cantus[view.layout[k].bar - view.layout[0].bar]).midi));
  const lo = Math.min(...tops) - 4;
  const hi = Math.max(...tops);
  const heightAt = (f: number) => {
    const x = f * bars + firstOffset;
    const k = Math.max(0, view.layout.findIndex((sl) => slotOffset(sl) <= x && x < slotOffset(sl) + slotLength(sl)));
    const wobble = 0.82 + 0.18 * Math.abs(Math.sin(f * 97.3)); // a little texture, as in a recording
    return (0.2 + (0.8 * (tops[k] - lo)) / Math.max(1, hi - lo)) * wobble;
  };
  const date = new Date(piece.savedAt);
  const modeLabel = t(`ui.saved.mode.${piece.mode}`);
  const extras = [
    ...(["inversion", "retrograde", "retroInversion", "canon"] as const).filter((k) => piece.versions[k]).map((k) => t(`ui.versions.short.${k}`)),
    piece.drums ? t("ui.mixer.drums") : null,
    piece.continuo ? t("ui.mixer.continuo") : null,
  ].filter(Boolean);
  return (
    <li className={`track ${playing ? "playing" : ""}`}>
      <button className="track-play" onClick={() => onPlay(piece)} aria-label={t(playing ? "ui.saved.stop" : "ui.saved.play")} title={t(playing ? "ui.saved.stop" : "ui.saved.play")}>
        {playing ? "❚❚" : "▶"}
      </button>
      <div className="track-body">
        <div className="track-meta">
          {editing ? (
            <input
              className="track-name-edit"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                setEditing(false);
                onRename(piece.id, name.trim() || piece.name);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setName(piece.name);
                  setEditing(false);
                }
                e.stopPropagation();
              }}
              aria-label={t("ui.saved.rename")}
            />
          ) : (
            <button className="track-name" onClick={() => setEditing(true)} title={t("ui.saved.rename")}>{piece.name}</button>
          )}
          <span className="track-sub">
            {label} · {modeLabel} · {piece.tempo} ♩/min{extras.length ? ` · ${extras.join(" · ")}` : ""}
          </span>
          <time className="track-date" dateTime={piece.savedAt}>{date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</time>
        </div>
        <div className="wave" aria-hidden="true">
          <svg viewBox={`0 0 ${BARS * 3} 40`} preserveAspectRatio="none">
            {Array.from({ length: BARS }, (_, i) => {
              const f = (i + 0.5) / BARS;
              const h = heightAt(f) * 38;
              return <rect key={i} x={i * 3} y={40 - h} width={2} height={h} className={f <= at ? "played" : ""} />;
            })}
          </svg>
          <span className="wave-time">
            {playing ? `${formatTime(at * total)} / ` : ""}
            {formatTime(total)}
          </span>
        </div>
      </div>
      <div className="track-actions">
        <button className="chipbtn" onClick={() => onOpen(piece)} title={t("ui.saved.openHelp")}>{t("ui.saved.open")}</button>
        <button
          className="chipbtn"
          onClick={() => {
            if (window.confirm(t("ui.saved.deleteConfirm", { name: piece.name }))) onDelete(piece.id);
          }}
          aria-label={t("ui.saved.delete")}
          title={t("ui.saved.delete")}
        >
          🗑
        </button>
      </div>
    </li>
  );
}
