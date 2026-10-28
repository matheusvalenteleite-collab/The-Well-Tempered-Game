/**
 * D322, REGISTRATION's buttons (registration.ts) for the player's voice. D357 (the owner: "the instrument
 * stops should not be folded on a box, they should be readily available upon a single touch. this is the
 * only way one can, amidst play, change stops"): one row of one-touch buttons in the music box's title
 * bar, always there while the harpsichord or the organ plays (for the friends too), between the thumbs'
 * bars (never on them), each a thumb's target, drawn or pushed in at a glance (a lit knob or an empty
 * one). TUTTI a button of its own (every voice takes the player's stops; was a long press); on the organ
 * ROOM besides (room.ts: DRY · CHURCH · CATHEDRAL, cycling, kept on the device). Where the bar is narrow
 * (a phone sideways) the labels shorten and the piece's title gives way; a phone upright (the game asks
 * for it sideways) shows none. Kept per piece on the device; a change sounds from the next note. Each
 * change made while playing is kept for the run (registration.ts recordStopChange: the bar, the stop):
 * the special challenges to come ("draw X at bar N").
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Patch } from "./sound.ts";
import { tr } from "../i18n/index.ts";
import { loadRegistration, onLiveRegistration, recordStopChange, saveRegistration, setLiveRegistration, setTutti, stopsOf, stopsShown, toggle, DEFAULT_REG, type Registration, type StopId, type StopKnob } from "./registration.ts";
import { hasRoom, liveRoom, nextRoom, ROOM_ORDER, setRoom, type RoomId } from "./room.ts";

/** A stop's label: the footages as organists write them (no translation), the names translated. */
export function stopLabel(s: StopId): string {
  switch (s) {
    case "unison":
      return "8′+8′";
    case "four":
      return "4′";
    case "sub16":
      return "16′";
    case "lute":
      return tr("LUTE");
    case "flute":
      return tr("FLUTE");
    case "principal":
      return tr("PRINCIPAL");
    case "reed":
      return tr("REED");
    case "mixture":
      return tr("MIXTURE");
    case "trem":
      return tr("TREM");
  }
}
/** D357: a stop's label where the bar is narrow (a phone sideways). */
export function shortLabel(s: StopId): string {
  return s === "principal" ? tr("PRINC.") : s === "mixture" ? tr("MIXT.") : stopLabel(s);
}
/** D357: a room's name on its button. */
export const roomLabel = (r: RoomId) => tr(r === "dry" ? "DRY" : r === "church" ? "CHURCH" : "CATHEDRAL");

/** D357: the title bar's room kept for the key, ❚❚ and ✕ (px; the title gives way). */
const KEEP_PX = 160;
/** D357: how long the room's name shows after a press (ms). */
const ROOM_NAME_MS = 1600;
/** Under this title bar width (px) the row has no room (a phone upright). */
const HIDE_BELOW_PX = 360;
/** A button's width (px): 7 px Press Start 2P a character, its padding and border, the gap. */
const chipPx = (label: string) => [...label].length * 7 + 16;

export function RegistrationStops({ presetId, patch, piece, barNow }: { presetId: string; patch: Patch | null | undefined; piece: string; barNow?: () => number | null }) {
  const [reg, setReg] = useState<Registration>(() => loadRegistration(piece, presetId));
  const [room, setRoomNow] = useState<RoomId>(() => liveRoom());
  const [width, setWidth] = useState(1000);
  /** D357: the room's name shown a moment under its button after a press (narrow: the button shows its level only). */
  const [named, setNamed] = useState(0);
  useEffect(() => {
    if (!named) return;
    const id = window.setTimeout(() => setNamed(0), ROOM_NAME_MS);
    return () => clearTimeout(id);
  }, [named]);
  const wrap = useRef<HTMLSpanElement>(null);
  const shown = stopsShown(presetId, patch);

  // The piece's kept registration, in force while the buttons are there (the default once they go);
  // a change made elsewhere (the piece's own plan) shown as it comes.
  useEffect(() => {
    const r = loadRegistration(piece, presetId);
    setReg(r);
    setLiveRegistration(presetId, r);
    const off = onLiveRegistration((id, next) => {
      if (id === presetId) setReg(next);
    });
    return () => {
      off();
      setLiveRegistration(presetId, DEFAULT_REG);
    };
  }, [piece, presetId]);

  // The title bar's width: the full labels where they fit beside the key, ❚❚ and ✕, else the short ones.
  useLayoutEffect(() => {
    const hud = wrap.current?.closest(".tg-hud") as HTMLElement | null;
    if (!hud) return;
    const measure = () => setWidth(hud.clientWidth);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(hud);
    return () => ro?.disconnect();
  }, []);

  if (!shown.length || width < HIDE_BELOW_PX) return <span ref={wrap} hidden />;
  const on = new Set(stopsOf(presetId, reg, patch));
  const roomed = hasRoom(presetId);
  const extra = chipPx("TUTTI") + (roomed ? chipPx(roomLabel("cathedral")) : 0);
  const compact = width - KEEP_PX < shown.reduce((a, s) => a + chipPx(stopLabel(s)), 0) + extra;
  const label = compact ? shortLabel : stopLabel;

  const change = (next: Registration, knob: StopKnob) => {
    const before = knob === "tutti" ? reg.tutti : on.has(knob);
    const after = knob === "tutti" ? next.tutti : stopsOf(presetId, next, patch).includes(knob);
    setReg(next);
    setLiveRegistration(presetId, next);
    saveRegistration(piece, presetId, next);
    if (before !== after) recordStopChange({ bar: barNow?.() ?? null, stop: knob, drawn: after, reg: next });
  };

  return (
    <span className={`tg-reg tg-reg-row-inline${compact ? " tg-reg-compact" : ""}${reg.tutti ? " tg-reg-tutti" : ""}`} ref={wrap} role="group" aria-label={tr("STOPS")}>
      {shown.map((s) => (
        <button
          key={s}
          type="button"
          id={`stop-${s}`}
          className={`tg-stop${on.has(s) ? " on" : ""}`}
          aria-pressed={on.has(s)}
          aria-label={stopLabel(s)}
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => change(toggle(presetId, reg, patch, s), s)}
        >
          {label(s)}
        </button>
      ))}
      <button
        type="button"
        id="stop-tutti"
        className={`tg-stop tg-stop-tuttib${reg.tutti ? " on" : ""}`}
        aria-pressed={reg.tutti}
        title={tr("EVERY VOICE TAKES YOUR STOPS")}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => change(setTutti(presetId, reg, patch, !reg.tutti), "tutti")}
      >
        TUTTI
      </button>
      {roomed && (
        <button
          type="button"
          id="stop-room"
          className={`tg-stop tg-stop-room tg-room-${room}`}
          aria-label={`${tr("ROOM")}: ${roomLabel(room)}`}
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => {
            const r = nextRoom(room);
            setRoom(r);
            setRoomNow(r);
            setNamed(Date.now());
          }}
        >
          <span className="tg-stop-sub">{tr("ROOM")}</span>
          {compact ? (
            // Narrow: the room's level as three pips (DRY one, CHURCH two, CATHEDRAL three); its name a moment below after a press.
            <span className="tg-room-pips" aria-hidden="true">
              {ROOM_ORDER.map((r, i) => (
                <i key={r} className={i <= ROOM_ORDER.indexOf(room) ? "on" : ""} />
              ))}
            </span>
          ) : (
            roomLabel(room)
          )}
          {compact && named > 0 && (
            <span className="tg-room-name" role="status">
              {roomLabel(room)}
            </span>
          )}
        </button>
      )}
    </span>
  );
}
