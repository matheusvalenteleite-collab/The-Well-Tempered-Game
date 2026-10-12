# Protocol: reading an Invention or Sinfonia by hand (I1)

The reading says what a piece is made of and how it is laid out, in terms that can be counted across the 30
pieces. Its unit is Dreyfus's (*Bach and the Patterns of Invention*, 1996, ch. 1), not the fugue's.

- An **invention** is a complete contrapuntal segment, all voices together, built from the opening material.
  It is not a subject alone.
- A piece is a few such segments. Each comes back transformed by operations that can be named.
- They are laid out in an order of keys (*dispositio*), joined by connecting passages (*elaboratio*), and
  closed by cadences.

Fugal terms (subject, answer, countersubject, episode) are used only where a piece earns them
(`docs/inventions/LITERATURE-REVIEW.md` section 3).

## Material

- **The notes.** `node tools/inventions/dump.ts <id> <from> <to>` prints each voice as `bar:beat pitch value`.
  - Voice 0 is the top voice.
  - Values: w h q e s t; "." means dotted; a number is a length in quarters.
  - Beats are the metre's denominator.
  - A pickup is bar 0.
  - Run it from the repository root.
- **The opening, as found by machine.** `node tools/inventions/openings.ts` gives the leader, the first
  imitation (interval, distance, how long it stays strict), and whether the voices exchange their lines.
  - It is a starting point, not a reading.
  - It finds imitations whose first notes agree exactly (or, failing that, from the second note on). It
    misses tonal answers and varied heads; it reads a head-only imitation as the first one.
- **Keys.** Use the P 610 key, not the `key` field of `data/wtc/inventions.json`, which is wrong for
  Sinfonias 3, 4, 5 and 14.
- **Do not consult the external reading until the reading is written.**
  - The external reading is Schulenberg's tables (`data/inventions/schulenberg.json`), and also Dreyfus's
    map of BWV 772, Väisälä, and the rest.
  - The comparison is made afterwards (`docs/inventions/SCHULENBERG-CHECK.md`), so that agreement means
    something.
- Do not invent. Where unsure, say so and give the alternative.

## What to record

1. **The opening.**
   - Which voice leads, and with what (its first statement: bar:beat to bar:beat).
   - The first imitation: voice, bar:beat, interval, distance in beats.
     - Interval: "8 below", "8 above", "5 below", "5 above", or other. A fourth counts as the fifth
       inverted: "4 below" is recorded as "5 above / 4 below".
     - Is it exact? If not, which notes change (tonal, or varied)?
   - What the leader does meanwhile:
     - **canon**: new material, while the follower keeps copying beyond the first statement;
     - **exchange**: the leader takes over the follower's own previous line, i.e. double counterpoint,
       Dreyfus's ROTATE;
     - **free counterpoint**.
   - For a canon, give the bar where it stops being strict.
   - For three voices: the order of entries (S, M, B) and each interval; and whether the bass begins as a
     non-thematic bass (a continuo line) before its own entry.
2. **The inventions (paradigms).** Name each α, β, γ… in order of first appearance. For each paradigm:
   - the **prime**: bars, and what each voice carries. The material is named x (the opening motive),
     x-INV (its melodic inversion), y (a second line or countermotive), free, or a held note;
   - the **members**: every later appearance, with bars, the local key (tonic letter, capital for major),
     and the operations that relate it to the prime, from this list:
     - TRANSPOSE: to the key given;
     - EXCHANGE n: the voices exchange their lines in invertible counterpoint at the interval n (8, 10, 12,
       15). For three voices, the new order of the lines: e.g. "S:y M:x B:z";
     - INVERT: melodic inversion of one or more lines. Say whether it keeps the intervals (real) or the
       scale steps (tonal);
     - MODESWITCH: major to minor or the reverse;
     - VARY: changed notes; say which, and why if apparent (a forbidden interval avoided, a cadence
       reached);
     - ABORT: the transformation is carried only part of the way. Give where it stops and what replaces
       it;
     - AUGMENT, DIMINISH, STRETTO: rare here. Say so when they occur.

   A segment counts as a member only if it reproduces the prime in all its voices, allowing the listed
   operations. A single line restated against new counterpoint is a **statement** of that line (record it
   under 4), not a member of the paradigm.
3. **Elaboration.** Every stretch that is not a member of a paradigm:
   - bars;
   - function: a link from one key or segment to another, the approach to a cadence, or a coda;
   - material: x's head, x-INV, y's figure, or free;
   - whether it is a sequence. If so, give the type and the unit (beats) and how many times it is
     repeated. Types:
     - down or up by step;
     - descending fifths;
     - ascending 5-6;
     - down or up by third;
     - other: describe.

     Also give whether the sequence is imitative between the voices.
4. **Statements.** Every statement of x (or of y, if the piece has two subjects) that is not inside a
   paradigm member already listed. Give voice, bar:beat, key, form (prime, INV, varied) and whether it is
   complete or the head only.
5. **Cadences.** Every one that closes a segment or a section. Give bar:beat of the arrival, key, kind, the
   bass's last two degrees, and a reason.
   - The kinds are as in the fugue gold standard (`data/wtc/gold/PROTOCOL.md`): PAC, IAC, HC, phrygian,
     deceptive, evaded. This keeps the two repertories comparable for the ANALYSIS CORE.
   - Arrivals that are not cadences (an inverted tonic, a key reached without V-I) are not cadences;
     mention them under 6 if they matter.
   - An IAC's "inverted chord" is an inverted dominant (V6 or V4/3, bass 7-1 or 2-1) resolving to a
     root-position tonic. A dominant resolving to an inverted tonic (bass 7-3, 2-3) is an arrival, not a
     cadence (settled in review, 12 October).
6. **The layout (dispositio) and the form.**
   - The piece as an ordered list of its segments (paradigm members and elaborations) with their keys.
   - The main sections, divided by the main cadences.
   - **The returns**, located:
     - the first restatement of the opening (prime α) in another key, as bar;
     - a return in the tonic of the opening or of another segment, as bar, and of what.
   - The form, in Schulenberg's terms, defined so that the reading can be checked:
     - **bipartite:** two sections divided by a central cadence (usually V or III);
     - **rounded bipartite:** the same, with a return of the opening in the tonic in the second section;
     - **tripartite:** three sections of comparable length; the second begins with the opening material in
       a new key;
     - **sonata:** bipartite, with repeat signs, and a tonic return of the opening after a move away in
       the second half;
     - **double bipartite:** two bipartite halves, the second restating the first's material in another
       order or key;
     - **through-composed:** no return of the opening material in the tonic before the final cadence;
     - **multipartite:** more than three sections that none of the above describes.
7. **Kind.** One primary label, and others if they apply:
   - **canonic:** the opening imitation stays strict well beyond the first statement, for at least a third
     of the piece;
   - **double (invertible pair):** two lines stated together and exchanged (EXCHANGE) as the piece's main
     resource. Schulenberg's "two subjects in invertible counterpoint" and "double fugue";
   - **fugal:** entries of a subject in every voice at tonic and dominant at the opening, then entries in
     other keys separated by elaborations;
   - **motivic-sequential:** a short motive (half a bar or less), developed by imitation, inversion and
     sequence, with no fixed countermotive;
   - **trio (Sinfonias):** two upper voices in imitation over a bass that begins as continuo and takes
     the material later.
8. **Notes and confidence.** "sure" or "unsure" for the reading as a whole, and per call where needed. Also
   anything a listener should know that the fields do not hold.

## Output

One JSON file per piece, `data/inventions/readings/<id>.json`:

    {"id", "key", "meter", "bars", "reader_notes",
     "opening": {...}, "paradigms": [{"name", "prime": {...}, "members": [...]}],
     "elaborations": [...], "statements": [...], "cadences": [...],
     "layout": {"order": [...], "sections": [...], "returns": [...], "form"},
     "kind": {"primary", "also": [...]}, "confidence", "notes"}

Check that it parses. Then, and only then, set it beside Schulenberg's row and Dreyfus's or another
author's reading where one exists, and record agreements and disagreements in
`docs/inventions/SCHULENBERG-CHECK.md`. Corrections after review are recorded in the file's `review`
field, never silently overwritten.
