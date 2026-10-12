# Groocock's analyses of the 48, as data

Joseph Groocock, *Fugal Composition: A Guide to the Study of Bach's '48'*, ed. Yo Tomita (Contributions to the Study
of Music and Dance 65; Westport, CT: Greenwood, 2003; ISBN 0-313-32323-2). Read from the owner's scanned copy
(12 October 2026): the scans were converted to text by OCR and each fugue's table of entries, episodes, codettas,
cadences (the key diagram's perfect cadences) and countersubjects transcribed as facts, checked against the page
images where the OCR was doubtful. Claims are paraphrased with their page numbers; no text of the book is
reproduced beyond a few words. The book's text and scans are not in the repository.

One file per fugue (`wtc1f01.json` …; `wtc2f17-part2.json` holds the end of II/17's discussion; fugal preludes
`wtc1p07`, `wtc1p14`, `wtc1p19`, `wtc2p03`), and `general*.json` for the general chapters' lists (answers,
countersubjects, orders of entry, four-part proportions, the eight groups, stretto intervals). Bars as Groocock
numbers them (an upbeat bar is bar 0); voices as he names them. Inconsistencies inside the book are recorded in
the files' notes, not corrected.

`appendix-a.json`: Appendix A (pp. 185-192), the 215 episodes of the 48 and four fugal preludes, by bars and material; `appendix-b.json`: Appendix B (pp. 193-194), the share of bars with the subject, entries and episodes per fugue, with the misprints noted.

`notes.json`: the 394 endnotes (pp. 195-220, mostly the editor's), each with its chapter, fugue, kind (disagreement 246,
correction 31, source 24, reference 47, other 46) and a paraphrase naming the scholars and their readings; the
assignment of notes to fugues was made from page ranges and content (a few boundaries noted in the file).
`bibliography.json`: the annotated bibliography (49 entries).

Used by `tools/wtc/groocock-check.ts` (docs/wtc/GROOCOCK.md).
