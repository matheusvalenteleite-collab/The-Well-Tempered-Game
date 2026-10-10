/**
 * Keyboard etiquette for the game's shortcuts (D149). The screens listen on the window so that
 * writing needs no focus; but a key meant for a focused control is the control's: Tab moves focus,
 * Enter and Space press the button, the arrows move a slider, a tab or a radio, and a form field
 * keeps every key. The track activators move from F1-F9 (which took F5 reload and F6 address
 * bar) to Alt with a digit.
 */
const OWNS_ARROWS = "[role=tab], [role=slider], [role=radio], [role=menuitem], [role=menuitemcheckbox], [role=menuitemradio], [role=separator]";
const CONTROLS = `button, a[href], summary, ${OWNS_ARROWS}`;
const ARROWS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"];

/** Is this key the focused control's, not the game's? */
export function keyBelongsToControl(e: KeyboardEvent): boolean {
  if (e.key === "Tab") return true;
  const t = e.target as HTMLElement | null;
  if (!t || t === document.body || !t.closest) return false;
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || t.isContentEditable) return true;
  if ((e.key === "Enter" || e.key === " ") && t.closest(CONTROLS)) return true;
  return ARROWS.includes(e.key) && !!t.closest(OWNS_ARROWS);
}

/** Alt (Option) + 1-9: the numbered track activator, or null. */
export function trackKey(e: KeyboardEvent): number | null {
  if (!e.altKey || e.ctrlKey || e.metaKey) return null;
  const m = /^Digit([1-9])$/.exec(e.code);
  return m ? Number(m[1]) : null;
}

/**
 * Arrow keys on a slider (D149): ← ↓ and → ↑ move by a small step, Page Down / Up by a large one,
 * Home and End to the ends. `t` is the position 0..1; returns the new one, or null for other keys.
 */
export function sliderKey(e: React.KeyboardEvent, t: number, step = 0.02): number | null {
  const big = step * 5;
  const next =
    e.key === "ArrowUp" || e.key === "ArrowRight" ? t + step
    : e.key === "ArrowDown" || e.key === "ArrowLeft" ? t - step
    : e.key === "PageUp" ? t + big
    : e.key === "PageDown" ? t - big
    : e.key === "Home" ? 0
    : e.key === "End" ? 1
    : null;
  if (next === null) return null;
  e.preventDefault();
  return Math.max(0, Math.min(1, next));
}
