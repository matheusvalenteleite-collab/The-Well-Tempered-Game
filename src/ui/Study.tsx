import type { CurriculumStep } from "../counterpoint/curriculum/index.ts";
import { modeStudy, stepStudy, type Block } from "./study.ts";
import { useState } from "react";
import { t } from "./i18n.ts";
import { PageThumb, PageViewer, scanPage } from "./Scans.tsx";
import { Rich } from "./FuxRef.tsx";

function BlockView({ b, onPage }: { b: Block; onPage?: (p: number) => void }) {
  switch (b.type) {
    case "heading":
      return <h4>{b.text}</h4>;
    case "text":
      return <p><Rich text={b.text} /></p>;
    case "fux": {
      const page = scanPage(b.page);
      return (
        <blockquote className="quote fux-quote">
          {page !== null && onPage && <PageThumb page={page} onOpen={onPage} />}
          <div>
            <p className="latin" lang="la">{b.latin}</p>
            <p className="english">“{b.english}”</p>
            <cite>{t("study.fuxCite", { page: b.page })}</cite>
          </div>
        </blockquote>
      );
    }
    case "mann":
      return (
        <blockquote className="quote mann-quote">
          <p><Rich text={b.text} /></p>
          <cite>{t(b.note ? "study.mannCiteNote" : "study.mannCite", { page: b.page, note: b.note ?? "" })}</cite>
        </blockquote>
      );
    case "dialogue":
      return (
        <div className="dialogue">
          <p className="paraphrase">{t("study.paraphrase")}</p>
          {b.lines.map((l, i) => (
            <p key={i}>
              <span className="speaker">{l.who}.</span> <Rich text={l.text} />
            </p>
          ))}
        </div>
      );
  }
}

/** The study area: the mode, then what Fux teaches at this exercise, with his words and Mann's notes. */
export function Study({ step }: { step: CurriculumStep }) {
  const s = stepStudy(step.id);
  const [viewing, setViewing] = useState<number | null>(null);
  const mode = modeStudy(step.modal_final);
  return (
    <section className="study" aria-label={t("ui.study")}>
      <h2>{t("study.title", { name: s.name })}</h2>
      <p className="note">{t("study.intro")}</p>
      <div className="study-grid">
        <div>
          <h3>{mode.name}</h3>
          {mode.body.map((b, i) => (
            <BlockView key={i} b={b} onPage={setViewing} />
          ))}
        </div>
        <div>
          <h3>{t("study.inTheBook", { page: step.page })}</h3>
          {s.study.map((b, i) => (
            <BlockView key={i} b={b} onPage={setViewing} />
          ))}
        </div>
      </div>
      {viewing !== null && <PageViewer page={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}
