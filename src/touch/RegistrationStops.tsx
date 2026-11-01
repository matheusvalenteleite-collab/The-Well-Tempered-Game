/**
 * D322, REGISTRATION's buttons (registration.ts) for the player's voice. D357 (the owner: "the instrument
 * stops should not be folded on a box, they should be readily available upon a single touch. this is the
 * only way one can, amidst play, change stops"): one touch, always there while the harpsichord or the
 * organ plays (for the friends too). D369 (the owner: "The boxes for instrument modifications … should
 * not be within music box. instead, … at the bottom of both buttons"): on the two bars (`sides`) they
 * sit at the foot of each thumb's bar, beside the music box's legend and below its rows (no note is
 * judged there), over the play area but outside it in the page (a touch on them is the button's).
 *
 * D420, THUMB PISTONS (the owner: "Pistons good idea as well"): the row of single stops gives way to
 * three combination pistons, as an organ has under its manual, each recalling a whole registration at
 * one touch (registration.ts DEFAULT_PISTONS: the organ's flutes, principals and plenum; the
 * harpsichord's buff, 8′ and 8′+8′+4′). On the two bars all three at each bar's foot (whichever thumb
 * is free reaches them), large; elsewhere (a title bar) three large targets in the bar. Each acts at
 * touch-down (a browser fires no click for a tap while another finger is down: the other thumb holds a
 * note), the lit one the registration in force, a brief glow on the press. What each holds, TUTTI, ROOM
 * and the pedal's 16′ are set before the run (PistonSettings, in the piece's pop-up). A phone upright
 * shows none. The run starts on the piston matching the piece's colour plan at bar 1 for the player's
 * voice, else II. Each press is kept for the run (recordStopChange: the piston and each stop it moved).
 */
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from "react";
import type { Patch } from "./sound.ts";
import { tr } from "../i18n/index.ts";
import {
  actsOn,
  defaultPistons,
  hasPistons,
  HOME_PISTON,
  liveRegistration,
  loadPistons,
  loadRegistration,
  onLiveRegistration,
  pistonChanges,
  pistonFor,
  pistonRegistration,
  PISTON_NAMES,
  recordStopChange,
  saveRegistration,
  savePistons,
  setLiveRegistration,
  STOPS,
  togglePiston,
  DEFAULT_PISTONS,
  DEFAULT_REG,
  type Pistons,
  type Registration,
  type StopId,
} from "./registration.ts";
import { hasRoom, liveRoom, nextRoom, setRoom, type RoomId } from "./room.ts";
import { coloursLoaded, loadColours, planOf } from "./colour.ts";

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
/** D357: a stop's label where the room is narrow. */
export function shortLabel(s: StopId): string {
  return s === "principal" ? tr("PRINC.") : s === "mixture" ? tr("MIXT.") : stopLabel(s);
}
/** D357: a room's name on its button. */
export const roomLabel = (r: RoomId) => tr(r === "dry" ? "DRY" : r === "church" ? "CHURCH" : "CATHEDRAL");

/** Under this title bar width (px) there is no room for the pistons (a phone upright). */
const HIDE_BELOW_PX = 360;
/** D420: how long a piston glows after its press (ms). */
const GLOW_MS = 450;

/** D420: the defaults' names (the organ's flutes, principals, plenum; the harpsichord's buff, 8′, full). */
const DEFAULT_NAMES: Readonly<Record<string, readonly string[]>> = {
  chamberOrgan: ["FLUTES", "PRINCIPALS", "PLENUM"],
  harpsichordSampled: ["LUTE", "8′", "8′+8′+4′"],
};
/** D420: a piston's name under its numeral: a default's name where it holds one, else its stops (short). */
export function pistonLabel(presetId: string, contents: readonly StopId[], short = false): string {
  const def = DEFAULT_PISTONS[presetId];
  const i = def ? pistonFor(presetId, def, contents, true) : -1;
  // The pedal's 16′ and the tremulant do not change the name unless the ranks are a default's exactly.
  const same = i >= 0 && def[i].length === contents.length && def[i].every((s) => contents.includes(s));
  if (same) return short && DEFAULT_NAMES[presetId][i] === "PRINCIPALS" ? tr("PRINC.") : tr(DEFAULT_NAMES[presetId][i]);
  const shown = contents.filter((s) => s !== "sub16");
  return shown.length ? shown.map(shortLabel).join("+") : presetId === "harpsichordSampled" ? "8′" : tr("PRINC.");
}

/** D420: the piston the run starts on: the colour plan's registration at bar 1 for the player's voice (pistonFor), else II. */
export function startPiston(piece: string, presetId: string, voice: number, pistons: Pistons): number {
  const plan = planOf(piece, presetId);
  if (!plan) return HOME_PISTON;
  let reg: StopId[] | undefined;
  for (const [bar, c] of plan) if (bar <= 1 && (!c.voices || c.voices.includes(voice)) && c.reg) reg = c.reg;
  return reg ? pistonFor(presetId, pistons, reg) : HOME_PISTON;
}

export function RegistrationStops({ presetId, patch, piece, voice = 0, barNow, sides = false }: { presetId: string; patch: Patch | null | undefined; piece: string; voice?: number; barNow?: () => number | null; sides?: boolean }) {
  const [lit, setLit] = useState(HOME_PISTON);
  const [glow, setGlow] = useState(-1);
  const [width, setWidth] = useState(1000);
  const wrap = useRef<HTMLSpanElement>(null);
  /** The registration this component set last (a change made elsewhere is told apart from it). */
  const mine = useRef<Registration | null>(null);
  const pressed = useRef(false);
  const pistons = useRef<Pistons>(loadPistons(piece, presetId));
  const tutti = useRef(false);

  // The piece's pistons and TUTTI; the run starts on the plan's piston (II while the plans load), and a change made elsewhere lights the piston it matches.
  useEffect(() => {
    if (!hasPistons(presetId)) return;
    pistons.current = loadPistons(piece, presetId);
    tutti.current = loadRegistration(piece, presetId).tutti;
    pressed.current = false;
    const draw = (i: number) => {
      const r = pistonRegistration(presetId, pistons.current[i], patch, tutti.current);
      mine.current = r;
      setLit(i);
      setLiveRegistration(presetId, r);
    };
    draw(coloursLoaded() ? startPiston(piece, presetId, voice, pistons.current) : HOME_PISTON);
    let gone = false;
    if (!coloursLoaded())
      void loadColours().then(
        () => !gone && !pressed.current && draw(startPiston(piece, presetId, voice, pistons.current)),
        () => {},
      );
    const off = onLiveRegistration((id, next) => {
      if (id !== presetId || next === mine.current) return;
      setLit(pistonFor(presetId, pistons.current, next.stops, true));
    });
    return () => {
      gone = true;
      off();
      setLiveRegistration(presetId, DEFAULT_REG);
    };
  }, [piece, presetId, patch, voice]);

  useEffect(() => {
    if (glow < 0) return;
    const id = window.setTimeout(() => setGlow(-1), GLOW_MS);
    return () => clearTimeout(id);
  }, [glow]);

  // The title bar's width (a phone upright shows none).
  useLayoutEffect(() => {
    const hud = wrap.current?.closest(".tg-hud") as HTMLElement | null;
    if (!hud) return;
    const measure = () => setWidth(hud.clientWidth);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(hud);
    return () => ro?.disconnect();
  }, []);

  if (!hasPistons(presetId) || (!sides && width < HIDE_BELOW_PX)) return <span ref={wrap} hidden />;

  const press = (i: number) => {
    pressed.current = true;
    const before = liveRegistration(presetId);
    const after = pistonRegistration(presetId, pistons.current[i], patch, tutti.current);
    mine.current = after;
    setLit(i);
    setGlow(i);
    setLiveRegistration(presetId, after);
    for (const c of pistonChanges(barNow?.() ?? null, i, before, after)) recordStopChange(c);
  };

  const row = (side: string) =>
    PISTON_NAMES.map((n, i) => (
      <button
        key={n}
        type="button"
        id={side ? `piston-${side}-${n}` : `piston-${n}`}
        className={`tg-piston${lit === i ? " on" : ""}${glow === i ? " glow" : ""}`}
        aria-pressed={lit === i}
        aria-label={`${tr("PISTON")} ${n}: ${pistonLabel(presetId, pistons.current[i])}`}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e: ReactPointerEvent) => {
          if (!actsOn("pointerdown", 0, e.button)) return;
          e.preventDefault();
          press(i);
        }}
        onClick={(e: ReactMouseEvent) => actsOn("click", e.detail) && press(i)}
      >
        <b className="tg-piston-n">{n}</b>
        <span className="tg-piston-name">{pistonLabel(presetId, pistons.current[i], true)}</span>
      </button>
    ));
  const cls = `tg-reg tg-pistons${tutti.current ? " tg-reg-tutti" : ""}`;
  if (sides)
    // D420: all three at each bar's foot: whichever thumb is free reaches them.
    return (
      <>
        <span ref={wrap} hidden />
        {(["left", "right"] as const).map((s) => (
          <span key={s} className={`${cls} tb-stops-side tb-stops-${s}`} id={`stops-${s}`} role="group" aria-label={tr("PISTONS")}>
            {row(s)}
          </span>
        ))}
      </>
    );
  return (
    <span className={`${cls} tg-reg-row-inline`} ref={wrap} role="group" aria-label={tr("PISTONS")}>
      {row("")}
    </span>
  );
}

/**
 * D420: what each piston holds, set before the run (the piece's pop-up, folded): each piston's stops
 * (the old one-touch toggles: on the organ FLUTE, PRINCIPAL, REED, MIXTURE, TREM and the pedal's 16′;
 * on the harpsichord 8′+8′, 4′, LUTE), TUTTI (every voice takes the piston) and, on the organ, ROOM.
 * Kept per piece and sound (registration.ts savePistons; ROOM on the device).
 */
export function PistonSettings({ presetId, piece }: { presetId: string; piece: string }) {
  const [ps, setPs] = useState<Pistons>(() => loadPistons(piece, presetId));
  const [reg, setReg] = useState<Registration>(() => loadRegistration(piece, presetId));
  const [room, setRoomNow] = useState<RoomId>(() => liveRoom());
  useEffect(() => {
    setPs(loadPistons(piece, presetId));
    setReg(loadRegistration(piece, presetId));
  }, [piece, presetId]);
  if (!hasPistons(presetId)) return null;
  const stops = STOPS[presetId] ?? [];
  const keep = (next: Pistons) => {
    setPs(next);
    savePistons(piece, presetId, next);
  };
  const isDefault = ps.every((p, i) => {
    const d = defaultPistons(presetId)[i];
    return p.length === d.length && p.every((s) => d.includes(s));
  });
  return (
    <details className="tb-pop-pistons" id="pop-pistons">
      <summary>
        {tr("PISTONS")} · {PISTON_NAMES.map((n, i) => `${n} ${pistonLabel(presetId, ps[i])}`).join(" · ")}
      </summary>
      <p className="tb-pop-lock">{tr("EACH PISTON DRAWS ITS STOPS AT ONE TOUCH, EVEN WHILE YOU HOLD A NOTE")}</p>
      {PISTON_NAMES.map((n, i) => (
        <div key={n} className="tb-pop-piston" role="group" aria-label={`${tr("PISTON")} ${n}`}>
          <b className="tb-pop-piston-n">{n}</b>
          {stops.map((s) => (
            <button
              key={s}
              type="button"
              id={`pop-piston-${n}-${s}`}
              className={`tg-stop${ps[i].includes(s) ? " on" : ""}`}
              aria-pressed={ps[i].includes(s)}
              onClick={() => keep(ps.map((p, j) => (j === i ? togglePiston(presetId, p, s) : p)) as unknown as Pistons)}
            >
              {shortLabel(s)}
            </button>
          ))}
        </div>
      ))}
      <div className="tb-pop-piston tb-pop-piston-more">
        <button
          type="button"
          id="pop-piston-tutti"
          className={`tg-stop tg-stop-tuttib${reg.tutti ? " on" : ""}`}
          aria-pressed={reg.tutti}
          title={tr("EVERY VOICE TAKES YOUR STOPS")}
          onClick={() => {
            const next = { ...reg, tutti: !reg.tutti };
            setReg(next);
            saveRegistration(piece, presetId, next);
          }}
        >
          TUTTI
        </button>
        {hasRoom(presetId) && (
          <button
            type="button"
            id="pop-piston-room"
            className={`tg-stop tg-stop-room tg-room-${room}`}
            aria-label={`${tr("ROOM")}: ${roomLabel(room)}`}
            onClick={() => {
              const r = nextRoom(room);
              setRoom(r);
              setRoomNow(r);
            }}
          >
            <span className="tg-stop-sub">{tr("ROOM")}</span>
            {roomLabel(room)}
          </button>
        )}
        {!isDefault && (
          <button type="button" id="pop-piston-reset" className="tg-link" onClick={() => keep(defaultPistons(presetId))}>
            {tr("DEFAULTS")}
          </button>
        )}
      </div>
    </details>
  );
}
