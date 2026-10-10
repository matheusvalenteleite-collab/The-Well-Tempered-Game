# The Well-Tempered Clavier: fugue expositions

`fugues.json` holds, for 29 fugues of J. S. Bach's *Das wohltemperirte Clavier* (Book I: 14,
Book II: 15; 21 of the 24 keys), the subject (dux), the answer (comes) with the notes where it
leaves the real transposition (the tonal answer's mutations), and what the dux sings against the
answer (the countersubject, or Bach's free counterpoint), with the metre.

Source: the scores of the ASAP dataset (Aligned Scores and Performances): F. Foscarin, A. McLeod,
P. Rigaux, F. Jacquemard, M. Sakai, "ASAP: a dataset of aligned scores and performances for
piano transcription", *Proceedings of ISMIR 2020*, pp. 534-541; https://github.com/fosfrancesco/asap-dataset.
ASAP is licensed CC BY-NC-SA 4.0; this file is derived from it and is shared under the same
licence (non-commercial, with attribution, share-alike). Bach's music itself is in the public domain.

Made by `tools/wtc-extract.py` (D119): the notes alone decide the lines (the encodings' voice
numbers are not reliable); written-out trills beside their main note are dropped; the subject
lasts as long as the answer repeats it at a fixed transposition, mutations at the head aside.
Missing keys (ASAP has no fugue in them): C minor, D sharp / E flat minor, E minor.

`preludes-full.json` (D125) holds every note of the 29 preludes that go with these fugues, from the
same ASAP scores under the same licence, made by `tools/wtc-preludes.py` (the same pooling of the
notes, ties merged, ornaments beside their main note dropped): for each, the time signature, the
bar in quarters and the notes as [MIDI, onset, length] in 96ths of a quarter from the first full bar.
