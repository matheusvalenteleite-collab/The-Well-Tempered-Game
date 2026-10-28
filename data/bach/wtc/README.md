# The Well-Tempered Clavier: fugue expositions

`fugues.json` holds, for 29 fugues of J. S. Bach's *Das wohltemperirte Clavier* (Book I: 14,
Book II: 15; 21 of the 24 keys), the subject (dux), the answer (comes) with the notes where it
leaves the real transposition (the tonal answer's mutations), and what the dux sings against the
answer (the countersubject, or Bach's free counterpoint), with the metre.

Source (D366): the game's corpus, `data/wtc/fugues.json` and `data/wtc/preludes.json`, read from
licence-clean editions (docs/wtc/SOURCES.md): the fugues from Kyle Rother's open-score edition
after the Bach-Gesellschaft edition (University of Cape Town, 2015), **CC BY 4.0**; the preludes
from The Open Well-Tempered Clavier (MuseScore edition, 2015) and verits99's musescore.com scores
(both CC0 1.0, as kept in the PDMX dataset) and the Mutopia Project (public domain). Until D366
these files were made from the ASAP dataset's scores (CC BY-NC-SA 4.0); nothing here derives
from them now. The same 29 fugues and preludes as before (D119's choice: the keys ASAP covered).

Made by `tools/wtc-extract.py --corpus data/wtc/fugues.json data/bach/wtc/fugues.json` (D119): the
notes alone decide the lines; written-out trills beside their main note are dropped; the subject
lasts as long as the answer repeats it at a fixed transposition, mutations at the head aside.
Missing keys: C minor, D sharp / E flat minor, E minor. `fugues-full.json`: every note of the 29
fugues, as [MIDI, onset, length] in 96ths of a quarter.

`preludes-full.json` (D125) holds every note of the 29 preludes that go with these fugues, made by
`tools/wtc-preludes.py data/wtc/preludes.json data/bach/wtc/preludes-full.json`: for each, the time
signature, the bar in quarters and the notes as [MIDI, onset, length] in 96ths of a quarter from
the first full bar.
