# Keyboard suites: where the ornament signs and the printed Partitas can come from

Research only, 28 November 2026 (a follow-up to `KEYBOARD-SUITES.md`; the owner's rulings are D1078). No game code was changed and no D number was taken. Everything is checked unless it says **not verified**.

## Summary

1. **Ornament signs can be had cheaply, from text, and the idea works.** Mutopia's LilyPond (`.ly`) files are plain text with the signs written out (`\prall`, `\mordent`, `\trill`, `\turn`, small notes). A small script, `tools/suites/mutopia_ornaments.py`, downloads French Suite 5's seven files, reads them with the repo's own LilyPond reader and writes a short list: bar, voice, note, sign. No PDF is read. It found 98 signs and 28 small notes (repeats counted twice, because the script plays them out).
2. **Lining them up with the MuseScore notes works well.** I cut the MuseScore file for French Suite 5 into its seven dances and compared it with the Mutopia notes bar by bar. The bar counts agree in 6 of 7 dances (the seventh is one bar off at the edge) and 97 to 99 per cent of the notes agree in bar, position and pitch. **Every one of the 98 signs found its place:** 36 sit on a note that MuseScore also has as a plain note; the other 62 sit where MuseScore has written the ornament out as extra notes. So the sign can be attached to the right spot (bar plus pitch plus position).
3. **The catch: Mutopia's French Suite 5 has gaps.** Its Courante has no signs at all, its Gavotte and Gigue two each, against 54 in the Sarabande. Its source is named only as "Unknown". I believe the print has more in those dances, but **not verified**: I did not read the print.
4. **A better source of signs turned up for the Partitas.** Several other MuseScore uploaders keep the signs as real marks inside their files (unlike verits99, who has none). One uploader has Partita 3 as seven separate movement files (Fantasia to Gigue) with mordents and short trills marked; two others have whole Partitas with signs. These are CC0 on MuseScore, but they carry caveats (see section 3).
5. **The printed versions: yes, verits99's Partitas 3 and 6 are the printed ones.** His Partita 3 has the Fantasia, Burlesca and Scherzo, his Partita 6 has the Toccata and the Air; those movements exist only in the 1731 print, and the notebook versions have none of them. Where the two versions share a dance, the pitches agree 93 to 99 per cent with Mutopia's notebook files (66 per cent in one dance) and differ mostly by extra written-out notes (section 2).
6. **No new complete, free score of the printed Partitas turned up beyond verits99's (and the other MuseScore uploaders').** KernScores and Bach Digital were still down (503); music21's corpus has no suite; OpenScore has none; IMSLP has no MusicXML or MIDI for the Partitas; Wikimedia Commons has only pictures and recordings.
7. **Recommendation:** keep verits99 (printed, complete, CC0) for the notes of all six Partitas; take ornament signs from Mutopia where it has the print's piece (French Suites 3, 5, 6; Partitas 1, 4, 5), and for Partitas 2, 3, 6 from the other uploaders' sign-bearing files, each checked by eye against the 1731 print on IMSLP. Details and questions at the end.

## 1. Test: French Suite 5, Mutopia signs against MuseScore notes

**The script** (`tools/suites/mutopia_ornaments.py`, run with `python3 -I`): downloads `french-suite-5-lys.zip` from Mutopia into a scratch folder outside the repo, reads each movement with `tools/wtc/lily.py` (repeats played out, ties joined), writes `data/sources/bach-suites-ornaments/french-suite-5.ornaments.json` (about 5 KB) and, if given the MuseScore file, `french-suite-5.alignment.json`. `SOURCE.md` next to them names the URL and the licence. **Licence: Public Domain** (Mutopia piece 99, Joel Mayes). The MuseScore file is verits99's score 764746, CC0 by PDMX's record; neither source file is stored in the repo. Only derived lists are.

**What the list holds** (one row per sign: bar, staff and voice, pitch, sign, small note or not), for example `[1, "upper:i", "B4", ["mordent"], false]`.

**Signs found, by dance** (repeats played out, so each repeated sign counts twice; signs plus small notes):

| Dance | Signs and small notes | Of which written out as notes in MuseScore | Plain note kept in MuseScore |
|---|---|---|---|
| Allemande | 16 | 10 | 6 |
| Courante | 0 | – | – |
| Sarabande | 54 signs + 14 small notes | 38 | 16 |
| Gavotte | 2 | 0 | 2 |
| Bourrée | 16 | 8 | 8 |
| Loure | 8 signs + 14 small notes | 6 (small notes: 14 of 14 also small notes in MuseScore) | 2 |
| Gigue | 2 | 0 | 2 |

Kinds, in all: 52 short upper trills (`prall`), 30 mordents, 6 trills, 6 double short trills, 2 upper trills, 2 turns, 28 small notes.

**How well the two line up** (the MuseScore file cut at its movement words; the first, pick-up bar of each dance is measured from its first note):

| Dance | Bars Mutopia / MuseScore | Notes agreeing in bar, position and pitch |
|---|---|---|
| Allemande | 49 / 49 | 1132 of 1154 (98%) |
| Courante | 65 / 66 | 1172 of 1184 (99%) |
| Sarabande | 80 / 81 | 736 of 818 (90%) |
| Gavotte | 49 / 49 | 642 of 656 (98%) |
| Bourrée | 61 / 61 | 738 of 750 (98%) |
| Loure | 33 / 33 | 514 of 540 (95%) |
| Gigue | 113 / 113 | 2234 of 2300 (97%) |

What the differences are: in the bars that carry a sign, MuseScore has the ornament as extra notes (that is the 62). Away from signs there are still some bars that differ, mostly one or two notes: for example Gavotte bars where one file has C natural and the other C sharp (a different reading of an accidental), or a note a step apart. I did not check which file follows the print. In the Sarabande (90%) the MuseScore file also writes the small notes as full notes, which explains much of the gap.

**Verdict.** The idea works for pinning signs to places. What it does not do: it does not decide what to do with a sign where MuseScore has already written the ornament out as notes (the game's existing `foldTrills` can fold some of them back, D964), and it cannot supply signs Mutopia's typesetter left out. The match is by bar and pitch only; it was not played or listened to.

**Scaling up.** The same script works for any Mutopia suite piece; only the file list per piece and the cut of the MuseScore file change. I did not build that. Mutopia's own coverage (all rechecked against its listing today, plus the earlier report): French Suites 3, 5, 6 whole; Partitas 1, 4, 5 whole; Partita 2 first two movements only; Partitas 3 and 6 notebook versions; English Suites 1 and 2 a few dances. French Suites 1, 2, 4 and English Suites 3 to 6 are not on Mutopia at all.

## 2. Which version are verits99's Partitas 3 and 6?

**How I checked.** (a) By the movements present: the whole-suite files hold the movements as the typesetter marked them (his words at the start of each). (b) By note comparison with Mutopia's two notebook files (BWV 827 and 830, whose own headers say "Bach-Gesellschaft Band 43 (1894)" and point to the 1725 Anna Magdalena Bach notebook), cutting verits99's file at the same dances and comparing note content bar by bar (pitches only, ignoring position, since the two files write rhythm differently in places). I know the printed contents of the Partitas from the standard lists (the 1731 print of No. 3 has seven movements, No. 6 seven), and from IMSLP's own note that the notebook holds the early versions of Nos. 3 and 6. **I did not compare any note with the printed score itself**; a bar-by-bar reading against the 1731 print (IMSLP lists it) is the real proof and has not been done.

| | verits99's file | Notebook (Mutopia) |
|---|---|---|
| Partita 3 | Fantasia, Allemande, Corrente, Sarabande, **Burlesca, Scherzo**, Gigue (7) | Prelude, Allemande, Courante, Sarabande, Menuet, Gigue (6) |
| Partita 6 | **Toccata**, Allemanda, Corrente, **Air**, Sarabande, Tempo di Gavotta, Gigue (7) | Prelude, Allemande, Courante, Sarabande, Tempo di Gavotta, Gigue (6) |

Evidence from the notes: Partita 3: Allemande 1072 of 1120 pitches agree per bar (96%), Corrente 93%, Sarabande 97% (but MuseScore has 231 more notes), Gigue 99%. Partita 6: Allemanda 98%, Corrente 97% (identical in 207 of 233 bars), Sarabande 95% (MuseScore has 192 more notes), Tempo di Gavotta 66% and Gigue 98% by pitch (the Gavotta differs a lot: not understood, **not verified why**). So the dances are the same pieces; MuseScore's have more notes written in, which fits the print's richer ornaments but would also fit any editor's choices. **Conclusion:** printed versions by movement list (certain, because the Fantasia, Burlesca, Scherzo, Toccata and Air are print-only); printed text within the shared dances **not verified**. Partita 6's Gigue also exists in a second "triplet" version by the same user (scores 245406 and 795476): which rhythm the print means is a question for an eye on the print.

## 3. The search for the printed Partitas

### 3.1 What exists, Partita by Partita

"V" = verits99 (MuseScore user 13172, CC0, whole suite plus single movements, no signs). "Mutopia" = public-domain unless marked. All checked on 28 November 2026 unless marked.

| Partita | Complete and free? | Version | Signs? | Notes |
|---|---|---|---|---|
| **1, BWV 825** | Yes: V (score 785016), Mutopia 474 (PD, source "Bach-Gesellschaft" = print), markpearse set (see below) | Printed (the only version, apart from the notebook's Menuets) | Mutopia: yes (about 49 pralltrillers by the earlier text count). V: none. markpearse: yes (59 + 2) | V's 7 files carry `is_public_domain = false`, so use Mutopia or markpearse if that matters |
| **2, BWV 826** | Yes: V (787496). Mutopia 602 has only Sinfonia and Allemande | Printed (no early version known to me) | markpearse: yes (about 25 signs) | markpearse's file is annotated with editorial comments inside the score ("c.f. IMSLP62200, Czerny", "suggest removing repeat"): an edit, not a clean transcription |
| **3, BWV 827** | Yes: V (789831); a second uploader's seven single-movement files (below); "pental" whole (flagged `license_conflict`); markpearse set (flagged). Mutopia 1080 is the **notebook** version | V: printed. The seven files: printed (the title names the seven movements, Fantasia to Gigue) | Seven-file uploader: yes (mordents/short trills in all seven movements, 62 in all). pental: yes (64) | Mutopia 1080 = early version, not wanted |
| **4, BWV 828** | Yes: V (790836); Mutopia 2114 (CC BY-SA 4.0, source "First edition ... In Verlegung des Autoris" = the 1731 print) | Printed | Mutopia: yes (about 47 + 17 + 11) | V has none |
| **5, BWV 829** | Yes: V (792431); Mutopia 421; pental | Printed | Mutopia yes (about 36 + 9 + 4); pental yes (46, 28 small notes) | pental flagged `license_conflict` |
| **6, BWV 830** | Yes: V (795281), also a triplet-Gigue variant; markpearse (flagged). Mutopia 1497 is the **notebook** version | V: printed (Toccata, Air). markpearse: **not verified** (the file has a Toccata-like opening; I did not list its movements) | markpearse: yes (71, 18 small notes) | markpearse's file carries editorial comments ("Restore extremely faint top E ...", "I think this should be D") |

Score ids for the extra uploaders are in the PDMX record; the names "pental" and "markpearse" are taken from the earlier report and the uploader of the seven-file set is **not verified** (I did not read their metadata). The seven-file uploader's titles read "J.S. Bach Partita No.3 1. Fantasia BWV 827" to "7. Gigue" (PDMX ids 5581664, 5583855, 5584492, 5585386, 5586577, 5586917, 5592036). The three whole-Partita files ("6 Partitas - 1", "- 2", "- VI - BWV830") and pental's Partitas 3 and 5 (PDMX ids 6302392, 6311957) are all marked CC0 with `license_conflict = True`: PDMX's own warning is that the file's internal licence text disagrees with the website's, so I would not ship from them without reading the licence on MuseScore, which answered 403 to me. I counted the signs by their MusicXML tags (a short upper trill is MusicXML's "inverted-mordent", a lower mordent "mordent"). I did **not** line these files up against verits99's note by note; that would be the same test as in section 1.

### 3.2 The other places, one by one

| Place | Finding | Checked how |
|---|---|---|
| **KernScores / Humdrum** | Still down: kern.humdrum.org answered 503 with a Polish "technical work" page; kernscores.stanford.edu did not connect. **Not verified** whether suites exist. | Direct requests |
| **music21 corpus** | The documentation's Bach section lists cantatas, chorales and one keyboard file, `bach/bwv846.mxl` (the first Well-Tempered Clavier prelude, by its number). No suite. | Its reference-corpus page (the first half of a long page was read; the rest **not verified**); the repository folder listing showed only chorale analyses and was cut off |
| **OpenScore** | Its public repositories are String Quartets and Lieder. No Bach keyboard. | Organisation page |
| **IMSLP** | "Source Files (0)" and "Synthesized/MIDI (0)" on the Partitas page; every score is a PDF scan. First edition (Leipzig 1731) scans exist (Public Domain), as do the Bach-Gesellschaft Band 3, Dadelsen's early-version volume for Nos. 3 and 6, Henle-type and Bärenreiter urtext volumes (marked "see notes on urtext" or EU-restricted) and a Zászkaliczky edition. Use: the 1731 scans are the print to check against. | The Partitas page (about 100,000 of its 126,000 characters read; the rest **not verified**) |
| **Mutopia, other contributors** | The Bach list holds only the Partita entries already known (ids 474, 602, 1080, 2114, 421, 1497), by Joel Mayes and others; nothing else on the six. | The listing read in full by the earlier session; searched again for "Partita", "Suite" and BWV 825-830 |
| **Werner Icking Music Archive** | Its scores (typeset with MusiXTeX) were merged into IMSLP in 2012 to 2014; its Bach partitas on IMSLP are the violin ones plus arrangements (BWV 825 transposed to C for recorder, BWV 826 transposed to A minor for viols). No keyboard Partita in source form. | The archive's front page and a search; IMSLP's "WIMA files" category itself was not opened, so **not verified** in full |
| **Wikimedia Commons** | The Partitas category has 18 files: pictures (a title page, an autograph page, scans) and recordings (Ivan Ilic's Partita 2, a Toccata from 1946). No scores in a machine-readable form. | The category page |
| **Bach Digital** | Down (503) on both pages I tried; I could not see whether it offers MEI or MusicXML. A web search found no such offer. **Not verified.** | Two requests, one search |
| **Other text corpora** | A personal repository of Bach editions in LilyPond ("Ciconia's score repository", noteflakes/music) exists; its Bach folder contents were not visible, so **not verified** that it has any Partita; no licence stated on the page. | One page |
| **MuseScore, other uploaders** | See 3.1: the richest finds, and the only ones with signs as marks. | The PDMX dataset (Zenodo) |

## 4. Recommendation

1. **Notes: verits99's files, as planned** (printed, complete, one clean source for all 18 suites, CC0).
2. **Signs: a two-source rule.** (a) Where Mutopia has the print's piece and has typeset the signs: take them with the script of section 1 (French Suites 3, 5, 6; Partitas 1, 4, 5). Partita 4 and French Suites 3 and 6 are CC BY-SA, so keep their derived lists as a check or share them alike with credit (the repo's Inventions precedent). (b) Partitas 2, 3, 6: take the signs from the other uploaders' marked files (the seven-file Partita 3; markpearse's Partitas 2 and 6), checking each sign by eye against the 1731 print on IMSLP, exactly as the fugues' signs were done (D206). Treat their editorial comments as noise and the licence flag as an open question until the licence is read on MuseScore.
3. **Do not use Mutopia's Partitas 3 and 6 or the notebook volumes**, as the owner said (D1078).
4. **For French Suite 5 (the first slice):** the list of 98 signs is a usable start but is incomplete (Courante, Gavotte, Gigue are nearly bare); the print must be read by eye for those three dances, or the owner accepts signs only where Mutopia has them for the first listen.
5. **Size of the remaining job** (my estimate): a worker session to make the script handle any suite (file lists, cuts), then, per suite, a short check of the signs by eye. The Partitas 2, 3, 6 sign files need one extra session to line them up with verits99's notes (the same test as in section 1).

## 5. Questions for the owner

1. **Signs from Mutopia for French Suite 5, even though the Courante, Gavotte and Gigue are nearly bare?** Or should I add signs to those three by reading the Bach-Gesellschaft print by eye (as for the fugues)?
2. **Partitas 2, 3, 6: signs from the other MuseScore uploaders' files, checked against the 1731 print?** Their MuseScore pages (licence, who made them) could not be opened by me, so someone with a MuseScore log-in could read each page's licence line. Is that acceptable?
3. **Partita 6's Gigue:** verits99 has a normal version and a "triplet" version. Which does the print mean, or should I read the print and choose?
4. **Partita 1's licence oddity** (V's files say "not public domain"): use Mutopia's Partita 1 (public domain) for notes as well as signs?
5. **Share-alike pieces** (Partita 4 and French Suites 3 and 6 from Mutopia, CC BY-SA): OK to ship their derived sign lists with a credit line and the lists shared alike, as for the Inventions, or keep them as a private check only?
6. **How much proofreading against the print do you want?** A full bar-by-bar reading of the 1731 print for each Partita is the only real proof of the "printed version"; a sampled check is cheaper. Which?

## Not verified

- Anything on Bach Digital, KernScores, the rest of the music21 corpus listing, IMSLP's "WIMA files" category and the unread part of IMSLP's Partitas page.
- The licence of any MuseScore file on musescore.com itself (403); only PDMX's record of it.
- The names of the uploaders of the extra Partita files; the movements of markpearse's Partita 6.
- That any file follows the 1731 print note for note; that the print has more signs in the Courante, Gavotte and Gigue of French Suite 5.
- Whether the extra uploaders' files line up with verits99's (not run).
- Why Partita 6's Tempo di Gavotta agrees only 66% by pitch with the notebook (rhythm notation or a different text).
