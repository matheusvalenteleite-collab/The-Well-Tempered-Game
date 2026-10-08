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
        <p>VexFlow (MIT), React (MIT), smplr (MIT). Other sounds are synthesized in the browser.</p>
        <p>
          Grand piano: Salamander Grand Piano V3 by Alexander Holm (Yamaha C5), CC BY 3.0, via the sfzinstruments edition
          (github.com/sfzinstruments/SalamanderGrandPiano); two velocity layers, re-encoded.
        </p>
        <p>
          Pipe organ, sackbut (trombone) and cello: from nbrosowsky/tonejs-instruments (samples CC BY 3.0); organ and trombone from the
          Versilian Studios Orchestra 2 Community Edition, cello from Freesound (12408, flcellogrl); trimmed and re-encoded.
        </p>
        <button onClick={onClose}>{t("ui.close")}</button>
      </div>
    </div>
  );
}
