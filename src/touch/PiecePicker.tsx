/**
 * The piece picker (D169): the book as Bach laid it out, the 24 keys rising by semitones, each major
 * key before its minor, each with its prelude and fugue; a tile a key, in the key's colour (the circle
 * of fifths round the hue wheel), four to a row. Book I, Book II and the Art of Fugue's unfinished fugue
 * on three tabs; the heading is the title page's own wording.
 */
import { useState } from "react";
import { keyTint } from "./MusicBox.tsx";
import { PIECES, type TouchFugue } from "./fugue.ts";

const keyLabel = (k: string) => k[0] + k.slice(1).replace("b", "♭").replace("#", "♯");

export function PiecePicker({ current, pick, close }: { current: TouchFugue; pick: (id: string) => void; close: () => void }) {
  const [book, setBook] = useState<number>(current.book);
  const pairs = Array.from({ length: 24 }, (_, i) => ({
    number: i + 1,
    prelude: PIECES.find((p) => p.book === book && p.kind === "prelude" && p.number === i + 1),
    fugue: PIECES.find((p) => p.book === book && p.kind === "fugue" && p.number === i + 1),
  }));
  const aof = PIECES.filter((p) => p.book === 0);
  const Piece = ({ p, label }: { p?: TouchFugue; label: string }) =>
    p ? (
      <button type="button" id={`pick-${p.id}`} className={p.id === current.id ? "on" : ""} onClick={() => pick(p.id)}>
        {label}
      </button>
    ) : null;
  return (
    <div className="tg-picker" role="dialog" aria-label="Choose a piece">
      <header>
        <div>
          <h1>DAS WOHLTEMPERIRTE CLAVIER</h1>
          <p>oder Præludia und Fugen durch alle Tone und Semitonia</p>
        </div>
        <button type="button" id="picker-close" className="tg-x" aria-label="Close" onClick={close}>
          ✕
        </button>
      </header>
      <nav className="tg-tabs">
        {[
          [1, "BOOK I · 1722"],
          [2, "BOOK II · 1742"],
          [0, "ART OF FUGUE"],
        ].map(([b, label]) => (
          <button key={b} type="button" id={`book-${b}`} className={book === b ? "on" : ""} onClick={() => setBook(b as number)}>
            {label}
          </button>
        ))}
      </nav>
      {book === 0 ? (
        <div className="tg-tiles tg-tiles-one">
          {aof.map((p) => (
            <div key={p.id} className="tg-tile" style={{ background: keyTint(p.key, 8) }}>
              <span className="tg-tile-key">{keyLabel(p.key)}</span>
              <span className="tg-tile-no">CONTRAPUNCTUS XIV · FUGA A 3 SOGGETTI · UNFINISHED</span>
              <div className="tg-tile-pair">
                <Piece p={p} label="FUGA" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="tg-tiles">
          {pairs.map(({ number, prelude, fugue }) => {
            const k = fugue?.key ?? prelude?.key ?? "C";
            const both = prelude && fugue && prelude.key !== fugue.key ? `${keyLabel(prelude.key)}/${keyLabel(fugue.key)}` : keyLabel(k);
            const here = current.book === book && current.number === number;
            return (
              <div key={number} className={`tg-tile${here ? " tg-tile-here" : ""}`} style={{ background: keyTint(k, 8) }}>
                <span className="tg-tile-no">{number}</span>
                <span className={both.includes("/") ? "tg-tile-key tg-tile-key-two" : "tg-tile-key"}>{both}</span>
                <div className="tg-tile-pair">
                  <Piece p={prelude} label="P" />
                  <Piece p={fugue} label="F" />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="tg-picker-foot">Lower case is minor. P prelude, F fugue.</p>
    </div>
  );
}
