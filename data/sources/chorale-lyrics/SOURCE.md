# Source: the chorales' words

Gertim Alberda and Johannes Hentschel, *A digital edition of the 389 Chorale Settings (Choralgesänge) by J. S. Bach*:
Alberda's MuseScore engraving of the Breitkopf & Härtel edition EB 3765 (1898, "389 Choralgesänge"), notes and words,
checked by him against the Bach-Gesellschaft and the Neue Bach-Ausgabe; published by Hentschel.

- Repository: https://github.com/johentsch/389_chorale_settings, commit `6e2e8a244f9e65b5282d9442b771d04c8cdb97ac`
  (30 September 2025), folder `vocal_parts_only/MS3/` (MuseScore 3 files). DOI 10.5281/zenodo.11358762.
- **Licence: CC BY-NC-SA 4.0** (https://creativecommons.org/licenses/by-nc-sa/4.0/), the same as the chorales' notes
  (Craig Stuart Sapp's edition: data/sources/bach-370-chorales/SOURCE.md), and shipped under the same terms (the
  owner, D728). The repository's own words: the licence "prohibits the use of the scores for any commercial purpose,
  including the training of machine learning models for use in commercial products".
- Credit, on every chorale carrying words (tools/touch/chorales.ts `WORDS_CREDIT`): "WORDS: GERTIM ALBERDA AND JOHANNES
  HENTSCHEL, 389 CHORALE SETTINGS (BREITKOPF 1898) · CC BY-NC-SA 4.0".
- The hymn texts themselves are public domain; the syllables' placing under the notes is the edition's.

## Kept here

`alberda.json`, made by `tools/chorales/alberda_lyrics.py` from a clone of the repository at that commit: for each of our
chorales the setting of the 389 it was matched to, how (below), and each voice's note attacks in order with the
syllables written under them (by line, with MuseScore's begin/middle/end/single marks), for the voices the edition
gives words. The edition's files are not kept (62 MB); the extract is all the game reads.

## Matching

Each of our 370 (data/chorales/bach/chorales/bach_NNN.json) to its setting by the music: the soprano's and the bass's
pitch contours (steps between pitches, a repeated pitch once), their likeness a sequence ratio (difflib):

| match | chorales | rule |
|---|---|---|
| exact | 319 | soprano and bass 95 % alike or more: the same setting |
| tune | 44 | soprano 90 % alike or more: the same tune in another setting or version |
| bwv | 4 | among the settings of the same work (the title naming our BWV number; the 389 number movements otherwise), the likest, from a half likeness: nos. 121 (BWV 244/40, "Bin ich gleich von dir gewichen"), 182 (BWV 14/5), 263 (BWV 227/1), 272 (BWV 348) |
| none | 3 | nos. 82 (BWV 46/6), 337 (BWV 24/6) and 368 (BWV 248/42): no setting of the 389 matched, by the music or by the work's BWV number. No words. |

## Laying the words (tools/touch/chorales.ts `layWords`)

- Each worded voice's attacks matched to our voice's notes in order by pitch (the longest common sequence), at the
  transposition that matches most (the 389's version may stand in another key); a note one edition lacks is passed
  over. Each matched attack's syllable is set on our note and held to the end of the last note before the next
  syllable (its melisma); a hyphen follows where the word goes on.
- Verse lines: each note's first line of words is the sung text (`lyrics`); where the edition writes two lines under
  a note, the second goes to `lyricsSecond`: a repeated section's second pass, or, where the edition prints a second
  text under the same notes ("Text 2"), that text.
- The edition's stanza labels before a line's first word ("1. Ach", "9. So", "Text 2: Ein") are not sung: taken off the
  syllable, the stanza kept (`words.stanzas`).
- Spelling as printed (1898: "Noth", "Muth", "ss" for "ß"); nothing modernised.
- Laid: 367 chorales' sopranos, 15,790 syllables, 88 not laid (their notes differing between the editions: most in nos.
  263 and 182, other versions); the lower voices where the edition gives them words (62 voices in 43 chorales), 613
  laid, 17 not.
