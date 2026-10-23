/**
 * D228: ⚙ INTERFACE, folded like TUNING (D219): one button showing the choice ("INTERFACE · CLASSIC");
 * it opens a panel listing every interface offered (ui/index.ts), each with a small picture of the
 * box drawn that way and one line; a choice applies at once and closes the panel.
 */
import { useEffect, useRef, useState } from "react";
import { paintClassic, type Frame } from "../touch/MusicBox.tsx";
import { paintTemplate, setUi, TEMPLATES, thumbFrame, uiLabel, uiNow, uiOptions } from "../touch/ui/index.ts";

/** The thumbnails are drawn at this size and shown smaller (crisp on a phone's screen). */
const TW = 336;
const TH = 150;

function Thumb({ id, frame }: { id: string; frame: Frame }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    try {
      const fr = thumbFrame(frame);
      if (id === "classic") paintClassic(c, TW, TH, fr);
      else paintTemplate(c, TEMPLATES[id], TW, TH, fr);
    } catch {
      /* a picture that cannot be drawn is left blank */
    }
    c.style.width = "";
    c.style.height = "";
  }, [id, frame]);
  return <canvas ref={ref} className="tb-ui-thumb" aria-hidden="true" />;
}

export function InterfaceFold({ frame }: { frame: Frame }) {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState(uiNow);
  const choose = (id: string) => {
    setUi(id);
    setCur(uiNow());
    setOpen(false);
  };
  const opts = uiOptions();
  return (
    <>
      <button type="button" id="ui-open" className="tb-fold" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{uiLabel(cur)}</span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="tb-fold-panel tb-ui-panel" role="group" aria-label="Interface">
          {opts.map((o, i) => (
            <div key={o.id} className="tb-ui-group">
              {o.family !== o.name && o.family !== opts[i - 1]?.family && <p className="tb-fold-head">{o.family}</p>}
              <button type="button" id={`ui-${o.id}`} className={`tb-ui-opt${o.id === cur ? " on" : ""}`} aria-pressed={o.id === cur} onClick={() => choose(o.id)}>
                <Thumb id={o.id} frame={frame} />
                <span className="tb-ui-text">
                  <span className="tb-ui-name">{o.name}</span>
                  <span className="tb-ui-desc">{o.desc}</span>
                </span>
              </button>
            </div>
          ))}
          <button type="button" id="ui-done" className="tb-fold-done" onClick={() => setOpen(false)}>
            ✕ CLOSE
          </button>
        </div>
      )}
    </>
  );
}
