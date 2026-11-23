# Synthesized strings for phone speakers (prototypes; D1042 is a draft)

**Context.** The owner's verdict on the sampled strings was "still too screechy and harsh and abrupt", and he suggested trying a synthesized violin. This study tries synthesized violins and cellos designed around the flute lesson, using the engine's existing synth voice and lanes.

**State.**
- Prototypes only. Nothing ships and no PR was opened.
- Branch: `claude/instruments-synthstrings`, from dev 3.25 (5a3eb23d).
- The candidates are runtime setups (`tools/cands.json`, built by `tools/cands.py`). No engine code changed.

## Plain summary

Both synthesized violins remove almost all of the phone's "screech" region:

| | Share of the violin's phone sound in 2–5 kHz |
|---|---|
| Sampled violin today | 28–33 % |
| PSYCH's flute (the target) | 3.7 % |
| Subtractive synth violin | 3.3 % |
| Additive synth violin | 4.8 % |

- **The tone is far cleaner.** Energy between the partials goes from −17 to −22 dB (samples) down to −42 to −46 dB.
- **Voices are easier to tell apart in BAROQUE BAND.** The closest pair rises from 1.08 to 2.3–3.2 in I/9, and from 0.37 to 2.5–3.3 in II/21.
- **STRING CONSORT's I/4 depends on the onset.**
  - A soft bow-in drops the closest pair from 0.58 to 0.35.
  - A firmer onset (15 ms) lifts it to 0.79.
  - The additive violin is 0.81–0.82 either way.
- **Memory goes down.** STRING CONSORT 22.5 → 10.9 MB, BAROQUE BAND 21.6 → 14.2 MB (decoded).
- **CPU goes up modestly.** The subtractive voice adds about 5 nodes a note, the additive about 17.
- **The bowed-string physical model is cheap** (about 6 ms per voice-second in V8). But my quick prototype does not yet hold a clean pitch, and the engine has no AudioWorklet path for it. Skipped as a candidate.
- **Open: the mix level.** With the strings level-matched on a scale, STRING CONSORT's I/4 still comes out 1.7–2.1 LU quieter on the phone model. The synth violin would need about +1.5 dB in that sound before shipping. In BAROQUE BAND the change is 0.1–1.0 LU.

## The candidates

Each candidate is a violin and a cello. They replace the recordings on STRING CONSORT's `consViolin`/`consCello` and BAROQUE BAND's `bandViolin`/`bandCello`: the sample is removed and the synth patch plays. The violas, spiccato and pizzicato stay sampled. The levels are matched to today's recordings on the phone model, over a scale: the violin within 0.2 dB; the cello +1.4 dB for the subtractive (helping the phone bass), −0.4 dB for the additive.

**1. Subtractive (`sub`)**
- Violin:
  - two saws detuned ±5 cents (the ensemble detune);
  - a 4-pole lowpass tracking the pitch at 3× f0 (about 2 kHz at E5), opening 1.25× at the attack and closing over 0.25 s;
  - delayed vibrato, 14 cents at 5.3 Hz from 0.28 s;
  - a strings lane: body peaks +3 dB at 280 Hz and 1 kHz (Q 1.4), then a 2.5 kHz lowpass cap.
- Cello:
  - two saws ±4 cents;
  - a fixed 4-pole lowpass at 1.4 kHz, so its low notes keep the upper partials a phone can play;
  - vibrato 10 cents at 4.8 Hz from 0.3 s;
  - lane body +3 dB at 200 Hz and +2.5 dB at 700 Hz, capped at 2 kHz.

**2. Additive (`add`)**
- Violin:
  - eight sine partials, gains 1, .55, .38, .25, .16, .10, .06, .035;
  - each tuned by its cents offset (the engine's `Osc` has no ratio field, only detune in cents);
  - a fixed 4-pole lowpass at 2.2 kHz (the steep fall above about 2 kHz);
  - the same vibrato and body lane, without the top cap.
- Cello:
  - eight partials, gains 1, .7, .45, .3, .2, .12, .07, .04;
  - lowpass at 1.8 kHz;
  - body peaks at 200 and 700 Hz.

**Onsets.** The patch's attack is split by a wrapper around `patchNote`:
- `-soft`: 55 ms for the band's notes (40–70 ms bow-in), 30 ms for the player's notes (firmer, so timing still reads);
- `-firm`: 15 ms for both.

**3. Physical model (`wg`)**
- A bowed-string digital waveguide: two delay lines either side of the bow point and a friction table at the bow, after J. O. Smith's bowed-string model. It was written in plain JS, as an AudioWorklet would run it (`tools/bowed.mjs`).
- **CPU:** 5.8–6.6 ms per voice-second on this server, about 0.6 % of a core per voice. A phone CPU will be slower, by a factor I did not measure. Even if it were several times slower it would plausibly stay cheap, but that is a guess.
- **Tone:** rendered standalone through the same body EQ and top (`tools/bowed-render.mjs`, `bowed-post.py`), it measures 21 % in 2–5 kHz. Its inter-partial energy is about 0 dB: the quick model's period and stick-slip are not clean, so it does not yet hold a pitch.
- **Integration:** the touch engine has no AudioWorklet node. The only worklet is the chorale engine's recorder, in `src/audio/engine.ts`.
- **Verdict:** cheap, but not usable as it stands, and wiring it needs a new engine path. Skipped as a candidate. Its scale clips are included as evidence only.
  - The dropout check flags them, because they have deliberate 0.1 s silences between notes.

## Measurements (phone model first)

**Violin and cello alone.** These are the engine offline in a phone context, from the `diag/*` renders.
- Violin: a scale B3–E6 of 0.5 s notes, measured over 0.05–0.45 s each.
- Cello: a scale C2–E4.
- Roughness is the energy between the partials against the energy at them, 600 Hz–8 kHz.

| Candidate | Violin 2–5 kHz % (SC / BB) | Violin roughness dB (SC / BB) | Cello 2–5 kHz % (SC) | Cello roughness dB (SC) | Phone level vs today (violin / cello, SC) |
|---|---|---|---|---|---|
| today (samples) | 28.2 / 33.3 | −16.7 / −22.2 | 22.2 | −24.2 | 0 / 0 |
| sub-soft | 3.3 / 3.4 | −42.6 / −46.5 | 1.5 | −44.1 | −0.2 / +1.4 |
| sub-firm | 3.3 / 3.4 | −42.6 / −46.4 | 1.5 | −43.6 | −0.2 / +1.4 |
| add-soft | 4.9 / 4.8 | −42.5 / −44.3 | 0.0 | −42.7 | −0.2 / +0.4 |
| add-firm | 4.9 / 4.8 | −42.4 / −44.2 | 0.0 | −42.7 | −0.2 / +0.4 |
| wg (standalone) | 20.8 | 0.4 | 14.2 | 0.4 | levelled offline |

Notes:
- BAROQUE BAND's cello figures include its continuo harpsichord, which doubles the line (cello 2–5 kHz: sub 4.7 %, add 12.0 %), so the table gives STRING CONSORT's.
- The additive cello's 0.0 % is real: eight partials of a note at or under E4 (330 Hz), through a 1.8 kHz lowpass, put nothing above 2 kHz.

**Voice probe, closest pair (D708).** The probe's notes are the band's, so `-soft` means the 55 ms onset.

| Candidate | I/4 (STRING CONSORT) | I/9 (BAROQUE BAND) | II/21 (BAROQUE BAND) |
|---|---|---|---|
| today | 0.58 | 1.08 | 0.37 |
| sub-soft | **0.35** | 2.77 | 2.87 |
| sub-firm | 0.79 | 3.21 | 3.28 |
| add-soft | 0.82 | 2.31 | 2.49 |
| add-firm | 0.81 | 2.38 | 2.50 |

The trade the brief asked for: the subtractive violin's soft bow-in costs I/4's distinctness (0.58 → 0.35). The additive's does not, because its violins stay apart from the sampled viola in brightness rather than in attack.

**The pieces, 30 s, phone context.** The player is on voice 0. Each cell is phone LUFS / 2–5 kHz % (`clipmetrics.json`).

| Candidate | I/4 STRING CONSORT b. 20– | I/9 BAROQUE BAND b. 1– | II/21 BAROQUE BAND b. 9– |
|---|---|---|---|
| today | −20.2 / 30.6 | −24.2 / 17.7 | −27.5 / 45.9 |
| sub-soft | −21.9 / 11.7 | −24.4 / 4.4 | −28.1 / 18.5 |
| sub-firm | −22.1 / 11.7 | −24.5 / 4.2 | −28.0 / 18.5 |
| add-soft | −22.2 / 12.8 | −24.3 / 4.3 | −28.4 / 22.7 |
| add-firm | −22.3 / 13.0 | −24.2 / 4.2 | −28.5 / 22.8 |

- True peaks are −9 to −16 dBTP and crest 11.5–12.9 dB throughout, so nothing limits.
- No clip has a dropout. One render of `sub-firm` I/4 had a single 15 ms hole at 0.17 s; a re-render had none, so it was a harness glitch at the chain's build. The re-render is the clip.

**CPU and nodes per note** (`diag.log`).
- Render time is the whole engine offline, one voice sounding, in ms per second of audio. It is noisy: other jobs shared the machine.

| | Nodes per note | Render time (ms per second of audio) |
|---|---|---|
| Sampled note | about 8 | 56–67 |
| Subtractive | about 13 | 60–86 |
| Additive | about 25 | 90–98 |
| wg (estimated) | one worklet node | about 6 ms of DSP per voice-second |

- The cello in BAROQUE BAND adds about 10 nodes a note for its continuo harpsichord, whichever candidate plays.

**Memory** (budget.ts, decoded / resident, the 48 fugues, the violin and cello recordings no longer loaded):
- STRING CONSORT 22.5 / 25.9 → 10.9 / 14.2 MB.
- BAROQUE BAND 21.6 / 24.9 → 14.2 / 17.5 MB.

## Rules

- No notes are added, no octave moves, and loudness is never tied to the score: only the instruments' patches and lanes change.
- **Bass on a phone:** the subtractive cello is 1.4 dB louder than today's through the phone model, the additive 0.4 dB quieter. D645's full-piece bass gaps were not re-measured for these prototypes; that comes with any choice to ship.

## Recommendation

1. **To hear first: `add-soft` and `sub-firm`.**
   - `add-soft`: the cleanest that keeps I/4's distinctness (0.82), with a soft bow-in for the band. Its cost is about 25 nodes a note.
   - `sub-firm`: the most distinct (3.2–3.3 in BAROQUE BAND, 0.79 in I/4) and the cheapest synth. Its 15 ms onset is the least gentle.
2. **Before shipping either:**
   - raise STRING CONSORT's synth violin about 1.5 dB (I/4 came out 1.7–2.1 LU under on the phone);
   - refit D593, D645, D601 and SOUND_LOUD;
   - regenerate the seats;
   - check the player's onset feel on a device.
3. **The physical model:** a project of its own (a worklet in the touch engine, a tuned model). Its CPU is not the obstacle.

## Draft row (not in DECISIONS.md)

D1042 (draft): Synthesized strings for phone speakers, prototypes. Two violin and cello synths on the engine's own voice, each with a soft (55 ms band, 30 ms player) or firm (15 ms) onset.
- **Subtractive:** detuned saws, a pitch-tracked 4-pole lowpass, a body lane at 280 Hz and 1 kHz, a 2.5 kHz top.
- **Additive:** eight partials, a 2.2 kHz top.
- **Results against today's samples:**
  - the violin's phone-model 2–5 kHz share 28–33 % → 3.3–4.9 % (PSYCH's flute: 3.7 %);
  - the energy between partials −17 / −22 → −42 / −46 dB;
  - the closest pair: I/4 0.58 → 0.35 (sub-soft) / 0.79–0.82; I/9 1.08 → 2.3–3.2; II/21 0.37 → 2.5–3.3;
  - memory: STRING CONSORT −11.6 MB, BAROQUE BAND −7.4 MB;
  - 5–17 more nodes a note;
  - phone LUFS: I/4 −1.7 to −2.1 LU, I/9 −0.0 to −0.3, II/21 −0.5 to −1.0.
- **The bowed waveguide:** about 6 ms per voice-second in V8, but not musically ready, and the touch engine has no worklet path for it. Not pursued.
- **Correction to the strings study (strings2):** its violin-alone renders and its voice probes ran every candidate in one browser page. A candidate's runtime changes therefore carried into the next on the same page. Those per-candidate diag and probe numbers after `pr483` are not independent. Its 30 s clips and their metrics, rendered one page each, stand. The tools here use a fresh page per job.

## Files

- `index.html`: the listening page (not published).
- `<candidate>/<piece>.mp3`: 30 s on the phone context; `base/` is today's.
- `<candidate>/violin-scale.mp3`, `violin-held.mp3`, `cello-scale.mp3`: STRING CONSORT, the engine offline.
- `diag/metrics.json`, `clipmetrics.json`, `diag.log` (node counts and render times).
- `tools/`: `cands.py` (the candidates), `metrics.py`, `clipm.py`, `diag2.cjs` / `probe.cjs` (with `setup` and a fresh page per job), `bowed.mjs`, `bowed-render.mjs`, `bowed-post.py`.
