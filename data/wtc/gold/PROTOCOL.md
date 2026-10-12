# Protocol: a complete reading of a fugue by hand (the gold standard, KNOWLEDGE-PLAN A1)

The reading is the reference against which the project's analysis is measured. It must be made from the
notes, independently of the analysis, and every decision must carry its reason in musical terms.

## Material

- The whole fugue as text: `/tmp/claude-0/sp/gold/<id>.txt` (each voice's notes as `bar:beat pitch value`;
  values w h q e s t, "." dotted, a number = quarters; voice 0 = top; beats are the metre's denominator).
  Any range again with `node tools/wtc/dump.ts <id> <from> <to>` (run from /home/user/The-Well-Tempered-Game).
- The settled subject(s): `docs/wtc/SUBJECTS.md` (the row of the fugue), and for fugues on several subjects
  `data/wtc/later-subjects.json` and `data/wtc/subject-readings/later-aof.json`.
- You may write small scripts to search the notes (interval patterns, rhythms), but every entry and cadence
  you report must be confirmed by reading the passage and judged as a musician would. Do not consult the
  project's own analysis of entries or cadences (`src/wtc/library.ts`, `docs/wtc/HABITS.md`,
  `ledbetter-game-check.md`): the point is an independent reading. Do not invent; where unsure, say so.

## What to record

1. **Entries**, every statement of every subject, in time order:
   - `subject` (1, 2, 3), `voice` (0 = top), `bar`, `beat`, `first` (pitch of the first note);
   - `form`: "subject" (the dux form), "answer" (the comes form, tonally adjusted), "inverted",
     "augmented", "diminished", or combinations ("inverted+diminished");
   - `degree`: the transposition, as a Roman numeral from the tonic of the fugue (I, V, IV, vi …) of the
     key the entry implies (an answer in the exposition is V);
   - `complete`: true, or "head" (the first half or more, then abandoned), or "altered" (complete with
     changed notes: which ones);
   - `stretto_with`: the index of an earlier entry it overlaps, if it begins before that one is half over;
   - `reason` only where the call is not obvious.
   Count a statement of the subject's head alone (less than half) only if it is clearly presented as an
   entry (it starts a voice after a rest, or is answered in imitation); otherwise leave it out and mention
   it under `notes`.
2. **Cadences**, every one that closes a phrase: `bar`, `beat` of the arrival, `key` (the local key, e.g.
   "Bb", "g"), `kind`: "PAC" (V-I, bass ^5-^1, the upper voice on ^1, both root position), "IAC" (V-I with
   the upper voice on ^3 or ^5, or an inverted chord), "HC" (arrival on V), "phrygian" (iv6-V in minor),
   "deceptive" (V-vi or V-VI), "evaded" (a cadence prepared and then avoided, e.g. by an entry taking over
   the arrival). With `bass` (the bass's last two degrees in the local key) and `reason`.
3. **Sections**: from bar to bar, with a name: exposition, counter-exposition, episode, middle entries,
   stretto section, final section, coda; for each episode its material (subject head/tail, countersubject,
   free) and whether it modulates (from which key to which).
4. **Countersubject**: whether the fugue keeps one (regular: returns with most entries) and where it first
   appears; at which intervals it is inverted against the subject (octave, tenth, twelfth).
5. **Pedal points**: bar range, voice, degree.
6. **Notes**: anything a listener should know that the fields above do not hold.

## Output

One JSON file `/tmp/claude-0/sp/gold/<id>.json`:

    {"id": "...", "reader_notes": "...", "entries": [...], "cadences": [...], "sections": [...],
     "countersubject": {...}, "pedals": [...], "notes": "..."}

Check that it parses. Reply with a summary: how many entries and cadences, and the calls you were unsure of.
