# Interpretations as unlocks: research (24 October 2026)

The owner: unlocks include other tempos for a piece: "say that the default tempos track Kimiko
Ishizaka's. Then, there may be an unlock which allows one to play the piece in another famous
musician's famous choice of tempo for that piece ... to give the player the impression of playing
through someone else's interpretation, trying to match the relevant constraints."

## What the repo already has

- `data/tempi/recordings.csv`: 3,147 keyboard recordings of the 48 fugues and Contrapunctus XIV
  (performer, instrument, year, duration, MusicBrainz release), from MusicBrainz track lengths
  (`tools/tempi/musicbrainz.py`, `curate.py`). No preludes. The `year` is often a release or reissue year.
- `data/tempi/tempi.json` (`tools/tempi/compute.ts`): each fugue's NORMAL tempo = **the median of the
  recordings, not Ishizaka's** (to change: the owner wants Ishizaka's as the default).
- `src/touch/tempi.ts`: Book I preludes from Ishizaka (bar lines aligned to her CC0 recording,
  `data/recordings/ishizaka-book1.json`); Book II preludes from Loesser 1964; `ishizaka-ticks.json`:
  beat- and note-level timings of the 24 Book I fugues (the material for a tempo shape or rubato).
- In the CSV: Gould 49 rows, Tureck 84, Richter 60, Feinberg 48, Schiff 48, Hewitt 74, Walcha 48, Fischer
  61, Gulda 47, Jarrett 38, Kirkpatrick 48 (clavichord), Suzuki 48, Hantaï 24, Barenboim 48, Landowska 23
  (Book II only). Missing: Leonhardt, Martins, Nikolayeva's WTC.

## Tempo factors against Ishizaka (Book I fugues; duration ratio; above 1 = quicker)

Median (range): Gould 1.10 (0.64–2.10); Jarrett 1.08; Schiff 1.06; Fischer 1.03; Kirkpatrick 1.00; Feinberg
0.99; Suzuki 0.97; Hewitt 0.96; Richter 0.95 (0.42–1.38); Gulda 0.93; Walcha 0.92; Hantaï 0.91; Barenboim
0.89; Tureck 0.84 (0.52–1.23, two recordings).

| Book I fugue | Ishizaka | Gould | Tureck | Richter | Schiff | Walcha |
|---|---|---|---|---|---|---|
| 1 C | 1:56 | 1:59 | 2:35 / 2:16 | 2:34 / 2:29 | 1:54 | 2:09 |
| 2 c | 1:56 | 1:38 | 1:53 / 1:34 | 1:43 / 1:37 | 1:35 | 1:53 |
| 5 D | 1:48 | 1:44 | 2:21 / 2:02 | 1:56 / 1:52 | 1:42 | 1:57 |
| 8 d♯ | 3:55 | 5:16 | 6:06 / 7:17 | 6:32 | 4:33 | 4:45 |
| 22 b♭ | 3:18 | 5:10 | 3:30 / 3:48 | 4:24 | 2:52 | 2:52 |

Signature extremes: Gould's B minor fugue (Largo) ×2.10, E minor ×1.41, B♭ minor ×0.64, D♯ minor ×0.74;
Richter's C♯ minor ×0.42 (very broad), nos. 9, 10, 21 quick (×1.17–1.38); Tureck's C♯ minor ×0.52–0.54,
A major ×0.56–0.63. An independent tap-tempo survey of all Book I (B. Carpiuc, "Tempo in the
Well-Tempered Clavier: A Brief Statistical Analysis", *Cadence Corner*, 1 January 2026; informal method):
mean BPM Gould (1962–65) 80.4, the fastest set; Fischer 78.2; Richter (1970) 76.1; Schiff (1986) 75.6;
Hewitt (2008) 75.1; Leonhardt (1972–73) 67.9; Tureck (1952–53) 62.9, the slowest.

## Performers: approach, and what the game could impose

- **Gould** (Book I 1962–65): detached articulation, extreme tempos both ways (K. Bazzana, *Glenn Gould:
  The Performer in the Work*, Clarendon, 1997). Game: his factors; detached notes rewarded instead of the
  legato chain; terraced dynamics.
- **Tureck**: slow architectural tempos, articulation patterns voice by voice (*An Introduction to the
  Performance of Bach*, OUP, 1960). Game: her factors; a narrow rubato window; an articulation pattern per voice.
- **Richter** (1970–73): long-breathed legato, very broad slow fugues. Game: his factors; the legato chain
  worth double; gradual dynamics.
- **Landowska** (Book I 1949, Book II 1952): a Pleyel harpsichord with 16′ registrations and stop changes.
  Game: harpsichord; registration changes at cadences; terraced dynamics only.
- **Walcha** (harpsichord 1959–61), **Leonhardt** (1972–73): steady pulse, agogic accents, no dynamics.
  Game: dynamics off; timing nuance rewarded.
- **Kirkpatrick** (clavichord): soft range, Bebung on long notes.
- **Fischer** (1933–36, the first complete WTC): moderate tempos, factor 1.03.
- **Nikolayeva** (Book I, 1984, Japan, per bach-cantatas.com): durations to source.
- **Martins** (Book I 1994, Labor): "rapid-fire tempi", heavy pedal, pianissimo preludes, near-fortissimo
  fugues (Audiophile Audition review); his 1964 Book II: "each episode bears its own tempo" (Classics Today).
- **Feinberg** (Melodiya): factor 0.99, varying much piece to piece.
- **Ólafsson** (DG 2018): Book I nos. 2, 5, 10 only. **Schiff** (1984–86; ECM 2011): no pedal. **Hewitt**
  (1997–99; 2008): clean, dance-like. (Living artists.)
- **Mozart's arrangements**: K. 405, five Book II fugues for string quartet (1782, van Swieten); K. 404a, a
  string trio set (Book I no. 8; Book II nos. 13, 14), its authorship doubted (Kirkendale 1964; Tomita).
  Mapping: 853→404a/1, 871→405/1, 874→405/5, 876→405/2, 877→405/4, 878→405/3, 882→404a/3, 883→404a/2.
- **Czerny's edition** (1837): metronome marks, articulations, phrasing, dynamics, octave amplifications
  (Classics Today); the marks to be transcribed from the IMSLP scans.
- **Busoni's edition** (Book I 1894): expression, pedalling, octave doublings (to verify per piece on IMSLP).
- **Carlos** (*Switched-On Bach*, 1968: Book I nos. 2 and 7); **Loussier**, **the Swingle Singers**:
  swung quavers, walking bass (which WTC pieces: unverified).

## Proposed unlocks

1. After Gould (1962–71): his factors per piece; detached rewarded; terraced dynamics.
2. After Tureck: her factors; strict time; an articulation pattern per voice.
3. After Richter (1970–73): his factors; legato chain doubled; gradual dynamics.
4. After Landowska (Book II): harpsichord; registrations changing at cadences; no dynamics.
5. Harpsichord classic (after Walcha / Leonhardt): factor about 0.92; dynamics off; timing accents.
6. Clavichord (after Kirkpatrick): soft dynamics; Bebung on long notes.
7. The first complete set (after Fischer): factor 1.03; a moderate rubato window.
8. Virtuoso (after Martins): quick factors; a tempo per episode; the fugue entering loud.
9. A contemporary pianist (Schiff / Hewitt / Ólafsson's three): their factors.
10. Van Swieten's string quartet (Mozart K. 405 / 404a): strings; the eight fugues mapped; the player a
    string part.
11. Czerny 1837: his metronome marks, hairpins, slurs.
12. Busoni 1894: the bass doubled in octaves.
13. Moog (after Carlos): Book I nos. 2 and 7.
14. Swing (after Loussier / the Swingles): quavers swung about 60:40 (a design choice); a walking bass.

Sourcing: tempo = the score's length in quarters ÷ the track's duration (MusicBrainz), factor = Ishizaka's
duration ÷ theirs; the preludes need their own durations (repeats checked). Rubato or a tempo shape only
from free recordings (Ishizaka, Loesser; Fischer perhaps). Copyright: durations and descriptions are facts;
no audio, no liner text. Naming: the dead "after" their recordings (an estate check for Gould advisable);
the living by style ("a contemporary pianist, no pedal"), the data credited; the album titles described,
not used as names. Unverified: CSV years, Busoni's doublings, Czerny's marks, Nikolayeva's and Martins'
durations, the JNMR study's table, the Loussier/Swingle repertoire.
