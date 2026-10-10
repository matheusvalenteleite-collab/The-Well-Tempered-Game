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

Every `gaps-*.md` file lists its half-book's gaps, each with the words just before and after it as
they appear in the converted text (curly apostrophes as printed), so that anyone holding the
full PDF text can find the passage and fill it in.

Known slips in the digest itself: in Book II no. 22 (B flat major) the prelude's form table is on
p. 318, not p. 319; the fragment "Italian Concerto has", filed under the F sharp major fugue (p. 294),
probably belongs to the F sharp minor prelude.

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
`(early version)`) and a `[GAP]` or `[check]` flag. 401 machine claims in all: 97, 79, 106, 119.
Where a pair gives a range for a cadence, or a single bar for a section, the claim stays free-form.
