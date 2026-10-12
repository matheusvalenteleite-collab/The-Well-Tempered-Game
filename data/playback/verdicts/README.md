# Verdicts on the bench pieces (P33)

The owner's ratings and remarks from the test bench, one file per piece: `<piece id>.json`, the id as in
`data/playback/bench/` (for example `gen-chorale-124-v1.json`). The playback session writes them from
the bench's "Copy results" text or from what the owner says, on `claude/playback-interface`; they
reach `claude/continuo-integration` with that branch's merges. A file is never rewritten: a later
hearing is appended to `hearings`.

```json
{
  "piece": "gen-chorale-124-v1",
  "compare": 124,
  "hearings": [
    {
      "date": "2026-10-12",
      "blind": true,
      "rating": 3,
      "bachRating": 4,
      "guessedBach": "correct",
      "remarks": "the owner's words, verbatim"
    }
  ]
}
```

- `rating`, `bachRating`: 1-5, absent if the owner gave none.
- `blind`: whether the pair was heard without knowing which was Bach's.
- `guessedBach`: `"correct"`, `"wrong"`, or absent if not guessed.
- `remarks`: quoted as given, never paraphrased.
