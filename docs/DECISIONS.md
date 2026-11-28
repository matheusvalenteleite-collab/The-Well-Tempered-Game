# Design decisions (pedagogy and musical content)

Decisions taken by the project owner; code must follow them.

**This page is the index.** The log (about 1.8 MB, 970 rows) is split by number into the files below, in `docs/decisions/`, so that each one displays on GitHub. Every `D123`-style reference in the code is found by its number: open the file whose range contains it, or search the folder:

```bash
grep -n "^| D123 " docs/decisions/*.md
```

Rows are numbered D0, D1, ... Some carry a letter (D325b, D499b-d, D725b, D726b: a later addition to that decision) and are filed under their number. Rows are in the order they were written, so a number may sit a little out of place within its range. D130–D139 were left free (see the row in `D0100-D0199.md`). The chorale mode has its own series, C1–C37, and the P series (P1–P26: problems and fixes) sits beside it; both are in `C-and-P.md`.

**New rows:** take the next D number from the end of the newest range file (`docs/decisions/D1000-D1099.md`; start `D1100-D1199.md` when it passes D1099), append the row there, and say which number you took. `test/decisions-index.test.ts` checks that each row is in the file of its range and that this index lists every file.

| numbers | file | rows |
|---|---|---|
| D0–D99 | [D0000-D0099.md](decisions/D0000-D0099.md) | 100 |
| D100–D199 | [D0100-D0199.md](decisions/D0100-D0199.md) | 101 |
| D200–D299 | [D0200-D0299.md](decisions/D0200-D0299.md) | 99 |
| D300–D349 | [D0300-D0349.md](decisions/D0300-D0349.md) | 49 |
| D350–D399 | [D0350-D0399.md](decisions/D0350-D0399.md) | 50 |
| D400–D499 | [D0400-D0499.md](decisions/D0400-D0499.md) | 100 |
| D500–D599 | [D0500-D0599.md](decisions/D0500-D0599.md) | 84 |
| D600–D699 | [D0600-D0699.md](decisions/D0600-D0699.md) | 94 |
| D700–D799 | [D0700-D0799.md](decisions/D0700-D0799.md) | 79 |
| D800–D899 | [D0800-D0899.md](decisions/D0800-D0899.md) | 60 |
| D900–D999 | [D0900-D0999.md](decisions/D0900-D0999.md) | 69 |
| D1000–D1099 | [D1000-D1099.md](decisions/D1000-D1099.md) | 49 |
| C1–C37, P1–P26 | [C-and-P.md](decisions/C-and-P.md) | 63 |
