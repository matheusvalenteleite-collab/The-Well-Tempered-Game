# Pieces for the test bench (P30)

The composer sessions put their pieces on the owner's test bench (`test.html`) by committing one JSON
file here per piece: `data/playback/bench/<id>.json`. The bench loads every file in this folder when it is
built, so a new piece reaches it through `claude/continuo-integration`.

```json
{
  "id": "gen-…",
  "title": "…",
  "kind": "chorale",
  "by": "chorale-generation",
  "tonic": "G",
  "mode": "major",
  "sig": 1,
  "meter": "4/4",
  "pickup": 8,
  "voices": [[[0, 8, "D4"], [8, 8, "G4"], [56, 8, "A4", 1]], [], [], []],
  "text": ["line 1", "line 2"],
  "lyrics": ["The", "night", "has", null],
  "plan": ["1-2 subject (alto)"],
  "compare": 1,
  "note": "what changed in this version"
}
```

**Fields:**
- `kind`: `"chorale"` or `"fugue"`.
- `by`: the session that wrote the piece.
- `voices`: top to bottom.
  - Each note is `[onset, length, pitch, fermata?]`. Onset and length are in 32nds of a whole note, as in `data/chorales/study.json`. The fourth element, if present, marks a fermata.
  - A chorale has four voices; a fugue has three or four.
- `text`: optional; the words, one line per entry.
- `lyrics`: optional; one syllable per soprano note, `null` where none is sung.
- `plan`: optional, for a fugue; its sections.
- `compare`: optional; the Bach piece to play blind against this one.
  - For a chorale whose melody Bach set, the number of that chorale in the game's study data (1–371).
  - For a fugue, a WTC id such as `"wtc1f02"`.
- `note`: optional; what this version changes.
- `part`: optional; what the piece is when it is not a whole piece. The default is `"whole"`.
  - Fugue parts: `"subject"`, `"answer"`, `"countersubject"`, `"exposition"`, `"episode"`, `"middle-entry"`, `"stretto"`, `"close"`.
  - Chorale parts: `"bass"`, `"inner"`, `"diminution"`, `"cadences"`.
  - A subject is one voice: `"voices": [[...]]`.
- `given`: optional; the indexes of the voices that are not the composer's (Bach's, around a generated part). They are drawn in grey, and the blind test says they are given.
- `batch`: optional; a name shared by several files (several subjects, three settings of one melody). The bench groups them so the owner can compare and rank them.
- `compare` may also be an excerpt of Bach: `{ "n": 216, "from": 0, "to": 128 }` for a chorale, or `{ "id": "wtc1f02", "from": 0, "to": 64 }` for a fugue. `from` and `to` are in 32nds, as the voices are.
- Lyrics for a chorale that sets a Bach melody: when `compare` names that chorale and the sopranos have the same number of notes, the bench takes Bach's syllables.

**Blind comparison:** the bench plays the piece and its `compare` in random order, without titles or score, and records the owner's ratings and guesses.
