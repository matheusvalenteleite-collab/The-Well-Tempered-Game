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
 *
 * D369 (the owner: "The boxes for instrument modifications … should not be within music box. instead, … at
 * the bottom of both buttons [divided between them] … The top of the screen can be reserved for something
 * else"): on the two bars (`sides`) the buttons leave the title bar for the lowest strip of each thumb's
 * bar, beside the music box's legend and below its rows (no note is judged there): the knobs shared out
 * by count, the first half on the left, the rest (TUTTI, ROOM last) on the right, each at least 44 px.
 * They lie over the play area, outside it in the page (siblings of its section, above it): a touch on
 * them is the button's and never reaches the bars.
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

/** D369: the knobs on the two bars: the first half (rounded up) on the left, the rest on the right. */
export function splitKnobs<T>(knobs: T[]): [T[], T[]] {
  const k = Math.ceil(knobs.length / 2);
  return [knobs.slice(0, k), knobs.slice(k)];
}
/** D369: a bar's foot holds three 44 px targets side by side (a phone's bar is about 150 px); more go in rows of two. */
export const sideCols = (n: number) => (n <= 3 ? Math.max(1, n) : Math.ceil(n / 2));
export const sideRows = (n: number) => Math.ceil(n / sideCols(n));

export function RegistrationStops({ presetId, patch, piece, barNow, sides = false }: { presetId: string; patch: Patch | null | undefined; piece: string; barNow?: () => number | null; sides?: boolean }) {
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

  if (!shown.length || (!sides && width < HIDE_BELOW_PX)) return <span ref={wrap} hidden />;
  const on = new Set(stopsOf(presetId, reg, patch));
  const roomed = hasRoom(presetId);
  const extra = chipPx("TUTTI") + (roomed ? chipPx(roomLabel("cathedral")) : 0);
  const compact = sides || width - KEEP_PX < shown.reduce((a, s) => a + chipPx(stopLabel(s)), 0) + extra;
  const label = compact ? shortLabel : stopLabel;

  const change = (next: Registration, knob: StopKnob) => {
    const before = knob === "tutti" ? reg.tutti : on.has(knob);
    const after = knob === "tutti" ? next.tutti : stopsOf(presetId, next, patch).includes(knob);
    setReg(next);
    setLiveRegistration(presetId, next);
    saveRegistration(piece, presetId, next);
    if (before !== after) recordStopChange({ bar: barNow?.() ?? null, stop: knob, drawn: after, reg: next });
  };

  const knobs = (
    <>
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
    </>
  );
  const cls = `tg-reg${compact ? " tg-reg-compact" : ""}${reg.tutti ? " tg-reg-tutti" : ""}`;
  if (sides) {
    // D369: the elements in order (the stops, TUTTI, ROOM), shared out between the two bars' feet.
    const all = (knobs.props.children as React.ReactNode[]).flat().filter(Boolean);
    const [l, r] = splitKnobs(all);
    // The music box's legend as tall as the taller foot (bench.css): its rows end above the buttons.
    const rows = Math.max(sideRows(l.length), sideRows(r.length));
    const side = (id: string, k: React.ReactNode[]) => (
      <span className={`${cls} tb-stops-side tb-stops-${id}`} id={`stops-${id}`} role="group" aria-label={tr("STOPS")} style={{ gridTemplateColumns: `repeat(${sideCols(k.length)}, minmax(0, 1fr))` }}>
        {k}
      </span>
    );
    return (
      <>
        <span ref={wrap} hidden data-rows={rows} />
        <style>{`.tb-has-side-stops { --tb-stop-rows: ${rows}; }`}</style>
        {side("left", l)}
        {side("right", r)}
      </>
    );
  }
  return (
    <span className={`${cls} tg-reg-row-inline`} ref={wrap} role="group" aria-label={tr("STOPS")}>
      {knobs}
    </span>
  );
}
