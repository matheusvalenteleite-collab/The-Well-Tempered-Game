// P1: writing in three and four voices seemed blocked. Two causes, both tested here: the arrows
// were taken from the game by any focused tab, voice chip, value button or menu item (none of which
// moves with the arrows), and a tap on a staff shared by two of the player's voices always wrote
// the first of them once the other staff had been tapped.
import { test } from "node:test";
import assert from "node:assert/strict";
import { keyBelongsToControl } from "../src/ui/keys.ts";
import { tapVoice } from "../src/ui/notation/tap-voice.ts";

const body = {};
(globalThis as { document?: unknown }).document ??= { body };

/** A focused element whose ancestors carry the given selectors. */
const focused = (tag: string, matches: string[] = []) => ({
  tagName: tag,
  isContentEditable: false,
  closest: (sel: string) => (sel.split(",").some((s) => matches.includes(s.trim())) ? {} : null),
});
const key = (k: string, target: unknown) => ({ key: k, target }) as unknown as KeyboardEvent;

test("the arrows stay the game's on a focused tab, voice chip, value button or menu item", () => {
  for (const role of ["[role=tab]", "[role=radio]", "[role=menuitemradio]", "[role=menuitemcheckbox]", "[role=separator]"]) {
    const chip = focused("BUTTON", ["button", role]);
    for (const k of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) assert.equal(keyBelongsToControl(key(k, chip)), false, `${k} on ${role}`);
    // Enter and Space still press the focused button.
    assert.equal(keyBelongsToControl(key(" ", chip)), true);
    assert.equal(keyBelongsToControl(key("Enter", chip)), true);
  }
});

test("a slider, a form field and Tab keep their keys", () => {
  assert.equal(keyBelongsToControl(key("ArrowUp", focused("DIV", ["[role=slider]"]))), true);
  assert.equal(keyBelongsToControl(key("ArrowUp", focused("DIV", ["[data-arrows]"]))), true);
  assert.equal(keyBelongsToControl(key("d", focused("SELECT"))), true);
  assert.equal(keyBelongsToControl(key("Tab", focused("BUTTON", ["button"]))), true);
  assert.equal(keyBelongsToControl(key("d", focused("BUTTON", ["button", "[role=radio]"]))), false);
});

test("a tap on a shared staff goes back to the voice last used there", () => {
  // Four voices: cantus (0) and Contra I (1) on the upper staff, Contra II (2) and III (3) below.
  const voices = [
    { staff: 0, editable: false },
    { staff: 0, editable: true },
    { staff: 1, editable: true },
    { staff: 1, editable: true },
  ];
  const last = new Map<number, number>();
  assert.equal(tapVoice(voices, 1, 3, last), 3); // the active voice lives there
  last.set(1, 3);
  // The player taps the upper staff (Contra I becomes active), then the lower staff again: the
  // bass, not the tenor above it.
  assert.equal(tapVoice(voices, 0, 3, last), 1);
  last.set(0, 1);
  assert.equal(tapVoice(voices, 1, 1, last), 3);
  // Nothing used there yet: the staff's first voice of the player's.
  assert.equal(tapVoice(voices, 1, 1, new Map()), 2);
  // A staff with the cantus alone takes no note.
  assert.equal(tapVoice([{ staff: 0, editable: false }, { staff: 1, editable: true }], 0, 1, new Map()), null);
});
