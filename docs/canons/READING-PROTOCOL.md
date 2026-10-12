# Reading a canon by hand: the protocol (K2)

A canon is read into `data/canons/readings.json`, one entry per piece, one row per canonic section. Like the FUGUE
session's subject readings (`data/wtc/subject-readings/PROTOCOL.md` on its branch), a reading is kept with its reasons,
reviewed, and corrected by a new entry, not overwritten.

1. **Sections.** A section is a stretch in which one leader and one follower keep a fixed relation. A new section starts
   where the relation changes: the roles exchange (Goldberg 12, 24 and 27 at the double bar), the music is restated in
   invertible counterpoint (the Art of Fugue canons alla decima and alla duodecima), or a new pair enters (the canons of
   BWV 1087 a 4 to a 6).
2. **For each section:** bars; leader and follower (the voice ids of `data/canons/corpus.json`; where the follower moves
   between staves, the voice it is mostly in, and say so); motion (rectus, inversus, augmentation, diminution,
   retrograde, combinations); the interval (diatonic, between corresponding notes; for contrary motion, between the first
   two corresponding notes, and the axis); the lag (in the notated beat and in bars).
3. **What is free.** The voices outside the canon (the Goldberg bass; the ground in BWV 1087), and inside the canon the
   bars where the imitation lapses, with the reason when it is visible (cadence, a free ending, an accidental adapted
   to the key, a tied note split).
4. **The check.** Every row is checked against (a) the title (the interval and motion it names) and (b) the
   detector's candidates (`docs/canons/CANDIDATES.md`, `tools/canons/detect.py`), and the check is recorded. A row on
   which they disagree is read in the engraving (the Mutopia PDF, or the Bach-Gesellschaft page) and marked "seen".
5. **Uncertain** points are written as such ("TO READ BY HAND", "~" before an approximate bar), never filled in.
