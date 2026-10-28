# Source: the Mutopia Project's editions of the Well-Tempered Clavier (LilyPond)

- Repository: https://github.com/MutopiaProject/MutopiaProject, commit
  2144afd6f52d56c5b6995b8b589ef1268b3139f0 (fetched 9-10 October 2026), folder `ftp/BachJS/`, the
  files of BWV 846-878 (two arrangements left out). `wtk1-prelude1.ly` beside this file is the same
  Prelude 1 file, used by `tools/wtc/prelude1.py`.
- Licences, file by file (in each file's header, with the typesetters' names): public domain, or
  Creative Commons BY-SA 3.0/4.0 (BWV 847 fugue, 850 fugue, 857, 869 prelude, 878 fugue). What is
  derived from a BY-SA file carries the same licence and the attribution.
- Read by `tools/wtc/lily.py`; checked against the Humdrum edition in `docs/wtc/MUTOPIA.md`.
- **D366**: the game's notes for Book I's prelude 4 (BWV849/bwv849a, Davide Castellone) and Book II's
  preludes 1, 2 and 6 (BWV870/wtk2prelude1, Urs Metzger; BWV871/wtk2-prelude2, Jesse Mehrbach;
  BWV875/bwv875a, Gwenaël Joret), all public domain, are read from these files (`tools/wtc/sources.ts`).
  The other files are witnesses for the corrections only (tools/wtc/corrections.ts); none of the
  BY-SA files reaches the game.
