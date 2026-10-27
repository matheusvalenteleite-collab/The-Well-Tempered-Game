/**
 * D322, REGISTRATION's buttons (registration.ts): small toggles in the music box's title bar, beside
 * ❚❚ and ✕, for the player's voice; a long press on any of them is TUTTI (every voice takes the
 * player's stops), shown by a small mark. Where the title bar has no room (a phone upright, the organ's
 * five stops in a narrow box) they fold into one STOPS button that opens them under the bar. Kept per
 * piece on the device; a change sounds from the next note. Instrument by instrument (STOPS): the
 * harpsichord and the organ now; the piano's UNA CORDA, the voices' SYLLABLE, the chips' WAVE later
 * (a stop id, its label below, and its sound in registration.ts).
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Patch } from "./sound.ts";
import { tr } from "../i18n/index.ts";
import { DEFAULT_REG, loadRegistration, saveRegistration, setLiveRegistration, setTutti, stopsOf, stopsShown, toggle, type Registration, type StopId } from "./registration.ts";

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

/** How long a press is TUTTI (ms). */
export const TUTTI_HOLD_MS = 550;
/** The title bar's room kept for the title, the key, ❚❚ and ✕ (px): the buttons fold into STOPS below it. */
const KEEP_PX = 300;
/** Under this title bar width (px) not even STOPS fits beside the title. */
const HIDE_BELOW_PX = 360;
/** A button's width at 7 px Press Start 2P (px a character, padding and gap). */
const chipPx = (label: string) => [...label].length * 7 + 16;

export function RegistrationStops({ presetId, patch, piece }: { presetId: string; patch: Patch | null | undefined; piece: string }) {
  const [reg, setReg] = useState<Registration>(() => loadRegistration(piece, presetId));
  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState(1000);
  const wrap = useRef<HTMLSpanElement>(null);
  const held = useRef<{ timer: number; fired: boolean } | null>(null);
  const shown = stopsShown(presetId, patch);

  // The piece's kept registration, in force while the buttons are there (the default once they go).
  useEffect(() => {
    const r = loadRegistration(piece, presetId);
    setReg(r);
    setLiveRegistration(presetId, r);
    return () => setLiveRegistration(presetId, DEFAULT_REG);
  }, [piece, presetId]);

  // The title bar's width: inline buttons where they fit beside the rest, else STOPS.
  useLayoutEffect(() => {
    const hud = wrap.current?.closest(".tg-hud") as HTMLElement | null;
    if (!hud) return;
    const measure = () => setRoom(hud.clientWidth);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(hud);
    return () => ro?.disconnect();
  }, []);

  // The folded stops close at a touch anywhere else (the bars' touches included: the music goes on under them).
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  }, [open]);

  // A phone upright (the game asks for it sideways): no room even for STOPS beside the title; none shown (what is drawn still sounds).
  if (!shown.length || room < HIDE_BELOW_PX) return null;
  const on = new Set(stopsOf(presetId, reg, patch));
  const need = shown.reduce((a, s) => a + chipPx(stopLabel(s)), 0);
  const folded = room - KEEP_PX < need;

  const change = (next: Registration) => {
    setReg(next);
    setLiveRegistration(presetId, next);
    saveRegistration(piece, presetId, next);
  };
  const down = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const h = { timer: 0, fired: false };
    h.timer = window.setTimeout(() => {
      h.fired = true;
      change(setTutti(presetId, reg, patch, !reg.tutti));
    }, TUTTI_HOLD_MS);
    held.current = h;
  };
  const cancel = () => {
    if (held.current) clearTimeout(held.current.timer);
  };
  const press = (s: StopId) => {
    const h = held.current;
    held.current = null;
    if (h) clearTimeout(h.timer);
    if (h?.fired) return;
    change(toggle(presetId, reg, patch, s));
  };

  const chips = shown.map((s) => (
    <button
      key={s}
      type="button"
      id={`stop-${s}`}
      className={`tg-stop${on.has(s) ? " on" : ""}`}
      aria-pressed={on.has(s)}
      title={tr("HOLD: EVERY VOICE")}
      onPointerDown={down}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => press(s)}
    >
      {stopLabel(s)}
    </button>
  ));
  const tutti = reg.tutti && (
    <span className="tg-stop-tutti" id="stops-tutti" title={tr("HOLD: EVERY VOICE")}>
      TUTTI
    </span>
  );

  return (
    <span className={`tg-reg${reg.tutti ? " tg-reg-tutti" : ""}${folded ? " tg-reg-folded" : ""}`} ref={wrap} role="group" aria-label={tr("STOPS")}>
      {folded ? (
        <>
          <button type="button" id="stops" className={`tg-stop tg-stops-open${open ? " on" : ""}`} aria-expanded={open} onClick={() => setOpen(!open)}>
            {tr("STOPS")}
            {reg.tutti ? "·T" : ""}
          </button>
          {open && (
            <span className="tg-reg-pop" id="stops-pop">
              <span className="tg-reg-row">
                {tutti}
                {chips}
              </span>
              <span className="tg-reg-hint">{tr("HOLD: EVERY VOICE")}</span>
            </span>
          )}
        </>
      ) : (
        // TUTTI inline: no word (the bar has no room for it), a line under the stops (CSS .tg-reg-tutti).
        chips
      )}
    </span>
  );
}
