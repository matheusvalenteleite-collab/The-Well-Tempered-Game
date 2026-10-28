# Sound principles (D358)

What D349's organ rebuild taught, written down so the other presets, and new ones, can use it. The
owner on D349's A/B: "every single example is DRAMATICALLY better. please try to get some general
knowledge from what you did there, because it may improve lots of presets, or, even more promisingly,
form the basis of new ones."

D349's diagnosis was not one bad stop. Every voice of PIPE ORGAN had been made a separate instrument:
its own stop, its own envelope, its own release, its own reverb send, its own place in the stereo
field, its own slowly drifting tuning, its own timing scatter, and the player's voice louder and
brighter than the rest. Each choice was reasonable on its own ("keep the lines apart"). Together they
made "four different instruments instead of a single organ". The fix was to make one instrument and let
the music, the register and the player's articulation tell the lines apart.

The principles below are that fix in general form. Each gives the rule, the reason, how the engine
expresses it (`src/touch/sound.ts`, `src/touch/chip.ts`), and how to check it with the offline render
harness (each voice rendered alone through the game's `Chip`, as D339, D349 and D358 did).

## 0. First decide what the preset claims to be

Every other rule depends on this. A preset is one of three things:

- **One instrument** played by one player: a harpsichord, a piano, a lute, an organ. Every voice is
  the same instrument. The lines differ only by register and by what the player's hands do.
- **One ensemble** of like instruments: a string quartet, a vocal quartet, a recorder consort, a
  concerto's band. The players differ (a violin is not a cello, a soprano is not a bass), but they share
  one room, one family of envelopes, one way of articulating, and a seating plan.
- **A band of unlike instruments on purpose**: the consoles (GAME BOY, SID 64, MEGA FM, TRACKER) and the
  synthesizer records (SWITCHED-ON, TOMITA, BLEEPS AND BLOOPS). Here "each line its own colour" is the
  idiom: Wendy Carlos's one patch per line, a Game Boy's two pulses and a wave channel, a tracker's four
  hard-panned channels. These presets keep their differences. The rules that still apply to them are
  6 (the player's voice), 9 (timing scatter by the number of players) and 10 (the phone).

The name has to match the claim. If the preset says HARPSICHORD, a listener expects one harpsichord, not
four harpsichords in four corners of the room.

## 1. One instrument sounds like one instrument

All voices play the same patch. Brightness, level and envelope are not used to separate the lines. On
one keyboard the player cannot give one hand a different instrument. D349 measured the organ's voices'
spectral centroid following the voice (soprano 603 Hz, alto 1724 Hz, bass 933 Hz in I/2) instead of the
register. After the fix, the same pitch sounds the same whichever voice plays it.

*Engine:* the preset's `slots` and `by` name one patch. A second patch is acceptable only when the
instrument really has a second division with its own pipes or strings: the organ's pedal, a manual's
second registration.

*Check:* render each voice alone. Each voice's spectral centroid in harmonics of its mean pitch should
change smoothly with register, not jump between voices at the same register.

## 2. One room, one send

An ensemble plays in one room. Every voice sends the same share to the same reverb. D349 found the
pedal sending less, and through a reverb high-passed at 250 Hz, so the bass sounded dry, "as if in
another room". Different sends per voice put the voices at different distances from the listener.

*Engine:* one constant per preset (`ORGAN_SEND`, `SALON_SEND`, `VOICE_SEND`, `CONSORT_SEND`). The reverb's
high-pass has to be low enough to take the bass's fundamentals (the church's 110 Hz, the salon's 180 Hz).
A reverb is chosen for its room: a church for the organ, a music room (`salon`) for chamber music.

*Check:* the presets' `send` values per voice (D358's static audit prints them).

## 3. Narrow, physically plausible placement

Real instruments occupy a small part of the stereo field, and they occupy it for a reason.

- **One keyboard instrument: place by key, not by voice.** A harpsichord's or piano's bass strings are
  to the player's left and its treble to the right. An organ's pipes stand in the case on its C and
  C♯ sides. A note's place comes from its key, whoever plays it, within about ±0.15. Before D358 the
  harpsichord and piano spread their voices across ±0.45: the soprano hard right, the bass hard left.
  That is wider than any other preset, and in a fugue with crossing voices the same key jumped from
  one side to the other. *Engine:* `Patch.one.span` (keyboards, lute) and `Patch.pipe.case` (organ), with
  the voice's own place at 0.
- **An ensemble: a seating plan.** Each player has a seat, and the seats are where that ensemble sits:
  a quartet's first violin on the left and its cello on the right; a baroque band's first violins left
  and seconds right (antiphonal), the violas right of centre, and the continuo with the harpsichord in
  the middle; singers standing in a row. The spread stays within about ±0.25. A phone's mono speaker
  sums everything anyway, and headphones should not sound like a ping-pong game. *Engine:* `Preset.by`
  pans, `SEATS` for the concertos.

*Check:* R–L balance per stem. Pan spread across voices: a keyboard about 0 dB from voice to voice
(its keys spread it instead), an ensemble's plan within about 6 dB.

## 4. Consistent envelopes per instrument family

The same kind of instrument speaks and stops the same way. D349 found organ voices with attacks of
10-35 ms and releases of 70-120 ms: four different actions. Within a family (pipes, bowed strings,
singers, plucked strings), use one attack, one release, and one sustain behaviour. The family can
differ from another family; its members do not differ from each other.

*Engine:* one `amp`/`rec` per family (the organ's 60 ms release; the consort's 50 ms attack and 120 ms
release; the singers' 30 ms attack and 150 ms release).

## 5. Timbre follows register, not voice index

Brightness, colour and weight belong to the pitch and to the instrument at that pitch: a low string is
richer, a high pipe is narrower. They do not belong to the voice number. A preset that gives "voice 2"
a darker patch than "voice 1" makes the alto change colour when it crosses the tenor. Where a preset
needs a different instrument low down (an organ's pedal, a continuo cello), choose it by the part's
role and compass, not as decoration.

## 6. The player's voice is the band's instrument

The owner's rule: the player's notes are never louder and never brighter than the band's, and they
are let go in the same way. The player is one of the musicians, not a soloist with a spotlight. The
box's colour and the touch show which voice is the player's. Before D349 the engine lifted every
player's note by 1 dB and 2.5 dB of treble (`MINE_LEVEL`, `MINE_TONE`) and gave it a longer release
(`leadOf`). D349 removed this for the organ. D358 removes it for every preset that is one instrument or
one ensemble (`Patch.one`). The consoles still have the lift. Whether they keep it is an open question
for the owner.

## 7. Articulation is idiomatic to the instrument

Lines are separated by how a player of that instrument separates them.

- **Organ:** by the release, the organist's only control. A joined note's pipe still speaks with its own
  attack and chiff (D349, `Chip.piped`). Its legato is in how the previous note is let go.
- **Harpsichord and plucked strings (lute):** by the release and by over-legato. Broken chords are held
  into the next (the finger pedal), chords are spread from the bass up by a few ms, and the bar's first
  beat is a little late. These are `phrasing.ts` `TOUCH.harpsichord`, now also used by LUTE.
- **Bowed strings:** by bow changes. A joined note is a new stroke with a slight attack and a small dip
  as the bow turns, not the seamless join of a slur. *Engine:* `Patch.bow`: the recording entered 60 ms
  after its onset, so some of the bow's bite is kept, rising over 30 ms. A slur skips 0.25 s and has no
  dip.
- **Voices:** by consonants. A new syllable opens with its consonant, and a melisma glides on the vowel.
  An ensemble of singers sings one text, so every singer sings the same syllable. Before D358 SOLO
  VOICES sang five words at once: "la", "ma", "na", "ra" and "da".

## 8. Fixed per-key micro-tuning, not per-voice drift

A real instrument's imperfect tuning belongs to its pipes or strings. Each key is a fraction of a cent
off in its own fixed way, whoever plays it. A slowly wandering detune per voice (`Patch.drift`) is an
analog synthesizer's idiom. On an organ it made each voice a separate, drifting instrument.

*Engine:* `Patch.pipe.cents` (organ) and `Patch.one.cents` (harpsichord ±0.8, piano ±0.5, lute ±1.5:
uneven frets). `drift` stays on the synthesizers.

## 9. Timing scatter matches the number of players

One player's two hands land together, and one player's chord is spread on purpose, from the bass up.
Several players each land a little apart. The organ's band lost its per-note ±6 ms scatter (D349,
`ORGAN_ENSEMBLE`). The harpsichord, piano and lute use the one-player model (`TOUCH`: chord spread,
small jitter). Ensembles (strings, singers, the consoles' bands) keep the per-note scatter, which is
what makes them sound like several people.

## 10. What a phone's speaker hears

A phone gives almost nothing below about 400 Hz. Boosting a bass's fundamental only feeds the phone's
limiter and leaves the line inaudible. Reinforce the bass with **upper partials** instead, as an
organist draws a 4′ or a 2′ in the pedal: D349's pedal adds a 2′ on a phone (`Patch.pipe.phoneOsc`), and
a cello's bow noise and upper partials carry where a bassoon's fundamental does not. Each preset is
measured through the phone-speaker approximation (mono; two 2-pole high-passes at 380 Hz; +3 dB at
1 kHz; nothing above 10 kHz): the bass voice should land within about ±3 dB of the top voice there.

## Checklist for a new preset

1. What does it claim to be: one instrument, one ensemble, or a band on purpose? Name it accordingly.
2. One patch per instrument. A second patch only for a real second division or instrument.
3. One room. One send for every voice. The reverb's high-pass below the bass's fundamentals.
4. Placement: by key (one instrument) or by seating plan (ensemble), within ±0.25.
5. One envelope per family. Timbre by register, never by voice index.
6. The player's notes identical to the band's (`Patch.one`, or `Patch.pipe`).
7. Articulation in the instrument's own way: release, over-legato, bow change, consonant.
8. Per-key fixed micro-tuning for fixed-pitch instruments. Drift only for analog synthesizers.
9. Scatter: none within one player's hands; a little between players.
10. Render each voice alone, computer and phone. Compare loudness (gated), centroid by register, R–L
    balance, and the phone-speaker balance of bass against top. Then the owner listens.
