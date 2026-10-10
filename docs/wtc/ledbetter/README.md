# Ledbetter's commentaries on the 48: a per-piece digest

David Ledbetter, *Bach's Well-tempered Clavier: the 48 preludes and fugues* (New Haven and London:
Yale University Press, 2002), Part Two, "Commentaries", printed pp. 143–332, with the endnotes to
Chapters Seven and Eight.

These are notes, not the text. They paraphrase Ledbetter's commentary, piece by piece, quote him
only in short phrases, and cite the printed page for every point. The book itself is not in the
repository and must not be added (copyright).

## Source of the digest and its limits

Made from a Markdown conversion of the PDF supplied by the owner (PDF page = printed page + 16).
The conversion lost every music example, most time signatures, ornament signs and many accidentals,
and it cut text: in many commentaries the opening paragraphs of the prelude or fugue discussion are
missing, and in some, sentences break off. Consequently:

- **[GAP]** marks a point where the conversion lost text that the claim depends on;
- **[check]** marks a reading of the converted text that looks wrong (a lost accidental, an
  inconsistency in Ledbetter or in the conversion), with a reason;
- endnote numbers were stripped from the body text, so notes are attached to pieces by content and
  by their "Notes to pages" running heads; uncertain attachments are flagged;
- missing outright: Chapter Eight endnotes 12–22 and 60–72.

Every `gaps-*.md` file lists its half-book's gaps, each with the words just before and after it
as they appear in the converted text, so that the passage can be found in the full text.

**Gaps filled.** The Choices lab session, which holds a complete text extraction of the PDF, filled
them (branch claude/beautiful-mccarthy-7li5nv, `docs/wtc/ledbetter-fills/gap-fills.md`). The fills
are merged into the digests, marked `[filled]`, `[filled; corrects …]` or `[displaced, restored]`;
of 197 gaps, 158 are filled, 22 were only displaced, and 17 are lost music glyphs (mostly time
signatures and accidentals, missing in the PDF text too), tagged `[GAP: not recoverable …]`. Each
gap list gives every item's status. The fills corrected several readings of the digest (e.g. the
"14th note" analyst in Book I no. 1 is Smend; the "author" who takes bb.1–3 as the subject of Book I
no. 22 is Bach himself, with Czaczkes dissenting in n.107).

## Files

| file | pieces | printed pages |
|---|---|---|
| `book1-01-12.md`, `gaps-book1-01-12.md` | Book I nos. 1–12, BWV 846–857 | 143–194 |
| `book1-13-24.md`, `gaps-book1-13-24.md` | Book I nos. 13–24, BWV 858–869 | 194–234 |
| `book2-01-12.md`, `gaps-book2-01-12.md` | Book II nos. 1–12, BWV 870–881 | 235–290 |
| `book2-13-24.md`, `gaps-book2-13-24.md` | Book II nos. 13–24, BWV 882–893 | 290–332 |

Each pair has a Prelude and a Fugue section with labelled bullets (type and models; form, sections,
cadences; versions and revisions; performance; for fugues also voices, subject, answer,
countersubjects, exposition, later entries, episodes, stretto, form reading and Ledbetter's verdicts
on other analysts), then two lists:

- **Checkable claims**: every concrete bar-number claim, free-form;
- **Machine claims**: the subset that fits the grammar below, in a fenced `text` block, for an
  automatic check against the fugue and prelude analysis.

```text
<id> entry   b.<bar> <voice>[ <key>]
<id> cadence b.<bar> <key or degree>
<id> stretto b.<bar> <voices or voices?>[ at <interval>]
<id> pedal   b.<from>-<to> <degree>
<id> section b.<from>-<to>[ <label>]
```

`<id>` is `wtc<book><p|f><nn>` (`wtc1f02` = Book I, fugue no. 2). Voices are soprano/alto/tenor/bass
(`voice?` where Ledbetter does not say; in three-voice pieces the middle voice is written alto). Keys
are letter names, lowercase for minor, or Roman degrees where he gives only a function. Bars are
as he gives them (`28½`, `(ff)`). A claim may end with a short parenthesis (`(variant)`,
`(early version)`), `(score; L.: …)` where the score corrected his reading, and a `[check]` flag.
491 machine claims in all. 401 came from the converted text; 95 were added from the fills and 6
lines refined. Every claim has now been checked against the encoded score (data/wtc/fugues.json,
preludes.json): 229 hold in the game's analysis, and the other 262 were read in the notes (see
`claims-score-check.md`, with the evidence for each verdict). Of those, 35 were corrected to what the
score shows, keeping Ledbetter's reading in the note `(score; …; L.: …)`, and 10 that concern early
versions not in the encoding are flagged `[check]`. Where Ledbetter names a key, the key field gives
the level at which the entry sits; his functional or harmonic reading goes in the parenthesis.
Where a pair gives a range for a cadence, or a single bar for a section, the claim stays free-form.
