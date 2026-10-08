# The *Gradus ad Parnassum* and what this project covers

## The book

Fux's *Gradus ad Parnassum, sive manuductio ad compositionem musicae regularem* (Vienna: Johann
Peter van Ghelen, 1725) is in two books. Book I is speculative: the mathematical theory of
intervals and proportions. Book II is practical and is written as a dialogue between a master,
Aloysius (Fux's homage to Palestrina), and a pupil, Josephus. The practical book proceeds
by *Exercitia* divided into *Lectiones*.

The strict-counterpoint section, which is all this project uses so far:

| 1725 | Content | 1725 pages | Mann (1965) pages |
|---|---|---|---|
| Exercitium I | Two voices (*bicinium*), Lectiones I–V = species 1–5 | 45–81 | 27–70 |
| Exercitium II | Three voices (*tricinium*), Lectiones I–V | 81–114 | 71–106 |
| Exercitium III | Four voices, Lectiones I–V | about 114–139 | 109–139 |

Lesson openings in 1725 (verified in the scans): I.1 p. 45; I.2 p. 56; I.3 p. 63; I.4 p. 69;
I.5 p. 76; II.1 p. 81. The later openings are given by Mann's table of contents and by the
pages of the first figure of each lesson in the dataset (see catalogue.md).

After Exercitium III the *Gradus* goes on to imitation, fugue (in two, three and four voices),
double counterpoint and, at the end, the styles (church style *a cappella*, the mixed style,
recitative). This part is outside our dataset and outside Mann's *Study of Counterpoint*; Mann
translated the fugue chapters separately in *The Study of Fugue* (New Brunswick: Rutgers
University Press, 1958). **The order, titles and number of exercises of that part have not been
checked against the 1725 print yet** (open-questions.md).

## Counts of strict exercises (figures that carry a cantus firmus exercise)

Counted from the upstream dataset metadata; illustrative fragments (e.g. Figs. 7-10, 16-20,
24-32, 34) are not exercises.

| Voices | Species 1 | 2 | 3 | 4 | 5 | Total |
|---|---|---|---|---|---|---|
| 2 (Exercitium I) | 10 (Figs. 5-23) | 12 (33-45) | 6 (55-60) | 6 (73-78) | 12 (82-88b) | 46 |
| 3 (Exercitium II) | 16 (101-119) | 9 (121-129) | 5 (130-134) | 9 (141-151) | 6 (154-159) | 45 |
| 4 (Exercitium III) | 11 (160-172) | 4 (173-176) | 8 (177-186) | 4 (193-197) | 5 (200-204) | 32 |

123 in all. In addition Aloysius assigns modes he does not work out: in two voices, C in first
species (p. 55), G, A and C in third species (p. 69) and in fourth species (pp. 75-76); in three
and four voices he regularly leaves "the remaining modes" to the pupil.

## The six modes and their cantus firmi

Fux uses the six modes with finals D, E, F, G, A, C, in that "natural order" (B is excluded: its
fifth is diminished, 1725 p. 50; Mann p. 33-34). Transposed modes are mentioned and deferred.
Each final has one cantus firmus, reused in every species and number of voices, with two
exceptions in the dataset: the A-mode cantus of Fig. 42 (`fux_cf_a_02`) and the C-mode cantus
of Figs. 88a/b (`fux_cf_c_02`).

## What the game implements (October 2026)

Fux mode follows the book in order (decision D5): two voices, first species (10 of Fux's
exercises plus the C cantus he assigns) and second species (Figs. 33-45). The selector already
shows three and four voices and species 3-5 (disabled).
