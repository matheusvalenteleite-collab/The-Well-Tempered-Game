# Ornaments: what the game plays and shows (P8)

The owner's ruling: Bach's own *Explication* is the default, with C. P. E. Bach's treatise beside
it; more research may refine it.

## The data

- The Humdrum encodings (`data/sources/bach-wtc`, `data/sources/bach-inventions`) mark ornaments
  in their note tokens (humdrum.org/rep/kern):
  - **T / t** trill, from a whole or half step above;
  - **M / m** mordent, to a whole or half step below;
  - **W / w** the short wavy sign;
  - **S** turn; **$** inverted turn;
  - **R** a trill's closing turn;
  - **O** an ornament of unspecified kind;
  - **q / Q** grace notes, short or long.
- `node tools/wtc/ornaments.ts` gathers them into `data/wtc/ornaments.json`. Each ornamented note is
  stored as [voice, onset, pitch, signs, grace notes], keyed to the notes of
  `data/wtc/{fugues,preludes,inventions}.json`, which are left unchanged.
- Totals over 86 pieces:

  | sign | count |
  |---|---|
  | M | 184 |
  | T | 179 |
  | W | 106 (almost all in the Inventions) |
  | t | 92 |
  | grace notes | 97 (70 before P23) |
  | S | 48 |
  | m | 43 |
  | O | 26 |
  | w | 6 |

- In the WTC study, 409 ornaments were attached to their notes before P23's appoggiaturas.
- The lab (the build of `vite.lab.config.ts`; its WTC tab has the Inventions and Sinfonias) plays them too since P23 (`src/lab/keyboard.ts`).
- Known gaps:
  - The WTC encodings leave 27 appoggiaturas inside local comments (e.g. `wtc2p23.krn`, lines
    418–422: `! (16eeP/` before `8dd#p`; kern P marks an appoggiatura, p its main note), in eight
    preludes (Book I nos. 4, 8, 10; Book II nos. 4, 9, 18, 23, 24). Since P23 `appoggiaturas()` in
    `tools/wtc/ornaments.ts` reads each as a long grace (Q) on the next note of its spine, so it is
    heard and drawn: half the main note, two thirds of a dotted one. Grace notes: 70 → 97.
  - Some tokens in `sinfo05.krn` (`wSSS`, `sSS`, `qq`) are not in the kern reference; they are
    read as the signs they contain.

## How each sign is played (`src/music/ornaments.ts`)

Every ornament starts on the beat and takes its time from the main note. The step is the one the
sign gives (T/M/W whole, t/m/w half); otherwise it is the key's step.

| sign | played | source |
|---|---|---|
| T t (O) | **Trillo**: from the note above, alternating for the whole note (D319), the main note settling only for about the last 15% of a long note (eight trill notes or more); a shorter note trills to its end, its last note the main note; a note with room for fewer than four trill notes: U N U N in its length (before D319: 70% of a crotchet, 80% of longer notes, then the main note held) | Explication no. 1; upper-note start: C. P. E. Bach, *Versuch* I (1753), ch. 2, sect. 3 (Triller), §5, p. 72; the length: §21 (below) |
| TR tR | **Trillo und Mordant**: the trill closing below and back (… U N L N) | Explication no. 3 |
| M m | **Mordant**: the note, the step below, the note held | Explication no. 2; C. P. E. Bach I.2.5 §§1–4 |
| W w after a falling step | **Pralltriller**: the note, the step above, the note, snapped | C. P. E. Bach I.2.3 §§30–34 (§34: it occurs only before a falling second); Türk, *Klavierschule* (1789), ch. 4, §55, pp. 271–272 |
| W w elsewhere | Bach's short **Trillo**: above, note, above, note, then the note | Explication no. 1; P. Aldrich, *Ornamentation in J. S. Bach's Organ Works* (1950), pp. 28–29 |
| S | **Cadence**: above, note, below, note (four equal notes on a short note) | Explication no. 4 |
| $ | below, note, above, note | a mirror convention; no Bach or C. P. E. Bach source |
| q | a short grace on the beat, very short, taken from the main note | C. P. E. Bach I.2.2 §13 |
| Q | a long appoggiatura: half the main note, two thirds of a dotted one | C. P. E. Bach I.2.2 §11 (1753, p. 65); Quantz VIII §§7–8 (p. 79) |

**The trill's length (D319)**: the owner found the trills short ("only lasting for a short while instead of whole notes duration", II/24). The Explication writes the Trillo as an alternation followed by the main note, without saying how much of a long note each takes; C. P. E. Bach (§21, below) has every trill but the Pralltriller beaten for the note's whole value. The game now follows §21 in substance for all trills, keeping from the Explication only a brief settle on the main note at the end of a long note (about 15%, the lab's "Trill settle"); a written closing turn (R) ends … U N L N. The C. P. E. Bach option has no settle and its Nachschlag, as before.

**The trill's speed (D319)**: about ten notes a second (the lab's "Trill speed"), taken to the nearest subdivision of the beat (a quarter by 2, 3, 4, 6, 8, 12, 16, 24 or 32), so that the alternation falls on the beat's grid: II/24 at 77 a quarter in 32nds (10.3 a second), I/6 at 57 in sextuplet 16ths (11.4), II/13 at 124 in 16ths (8.3). Quantz's "not much more than four alternations to a pulse" (below) at his pulse of about 80 is about eleven notes a second.

**Speed of the other ornaments**: about eleven ornament notes a second. Quantz IX §6 (pp. 84–85) allows "nicht viel mehr
als vier Bewegungen" (not much more than four alternations, eight notes) to a pulse; his pulse is
about 80 a minute (XVII.vii §55, p. 267). The speed is kept between a 32nd and a 16th of the written
tempo.

**C. P. E. Bach's practice, as an option (P24)**: a menu beside "tr Ornaments" in the WTC study chooses "Bach's Explication" (the default) or "C. P. E. Bach". Checked against the *Versuch* I, ch. 2, sect. 3 (1759 text, paragraph numbers as in 1753):
- §21: every kind of trill except the Pralltriller "so lange geschlagen werden müssen, als die Geltung der Note, worüber er steht, dauret" (must be beaten as long as the note's value lasts). The alternation runs to the end of the note.
- §13: "Der Triller über einer Note, welche etwas lang ist, … hat allezeit einen Nachschlag" (a trill on a somewhat long note always has a suffix): the step below, then the note. "Somewhat long" is taken as a crotchet or longer (*design*).
- The written closing turn (R) now ends … U N L N, the main note struck once. Before P24 it was struck twice.

**Corrected**: the earlier list had "Quantz's slower trills in low registers". Quantz IX §§2–6 (pp. 83–85) ties the trill's speed to the room (slower in a resonant place) and to the piece (slower in sad pieces, faster in merry ones), not to register. Nothing is implemented for it.

**Not yet followed**: Neumann's case for main-note trills and pre-beat graces in some contexts (not read).

These are refinements for the owner to decide. The Explication shows the main note held after the
alternation.

**Shown**:
- In the Score and Page views: the standard sign over the note (tr, mordent, short trill, turn,
  inverted turn) and grace notes as small notes before it.
- On the roll: tr, ∿ (mordents and the short wavy sign), ∽ (turns), ♪ (grace notes).
- A "tr Ornaments" switch in the WTC study turns them off for both hearing and seeing.

## References (checked by the research agent)

**Read**:
- Humdrum kern reference, humdrum.org/rep/kern.
- C. P. E. Bach, *Versuch über die wahre Art das Clavier zu spielen* I (Berlin, 1753), ch. 2, in the
  KölnKlavier edition by W. Lempfrid, with the 1753 page numbers.
- J. J. Quantz, *Versuch einer Anweisung die Flöte traversiere zu spielen* (Berlin, 1752), Deutsches
  Textarchiv.
- D. G. Türk, *Klavierschule* (Leipzig and Halle, 1789), ch. 4, KölnKlavier.
- P. Aldrich, *Ornamentation in J. S. Bach's Organ Works* (New York: Coleman-Ross, 1950),
  archive.org full text.
- The *Explication*: manuscript image in J.-P. Lecaudey, "L'Explication : table des ornements de
  J. S. Bach" (2024), and a modern transcription.

**Not read**:
- R. Kirkpatrick, ed., *Clavier-Büchlein vor Wilhelm Friedemann Bach*, facsimile (Yale University
  Press, 1959): bibliographic record only.
- F. Neumann, *Ornamentation in Baroque and Post-Baroque Music, with Special Emphasis on J. S. Bach*
  (Princeton University Press, 1978): his position known only from secondary statements.
- Grove Music Online, "Ornaments": the site refused access.
