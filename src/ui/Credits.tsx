import { repository } from "../music/fux/load-browser.ts";
import { t } from "./i18n.ts";

/** Source and licence metadata, read from the dataset (not retyped). */
export function Credits({ onClose }: { onClose(): void }) {
  const lic = repository.dataset.license as Record<string, unknown> & { encodings: { statement: string } };
  const prov = repository.dataset.provenance;
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label={t("ui.credits")} onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{t("ui.credits")}</h2>
        <h3>Music</h3>
        <p>{String(lic.music)}</p>
        <p>{String(lic.attribution)}</p>
        <p>{lic.encodings.statement}</p>
        <p>
          Dataset: <a href={prov.repository}>{prov.repository}</a> @ <code>{prov.commit.slice(0, 7)}</code>
        </p>
        <h3>Software and sounds</h3>
        <p>VexFlow (MIT), React (MIT), smplr (MIT). Piano samples: MusyngKite soundfont from gleitz/midi-js-soundfonts (licence as stated by that project). 8-bit sound: synthesized in the browser.</p>
        <button onClick={onClose}>{t("ui.close")}</button>
      </div>
    </div>
  );
}
