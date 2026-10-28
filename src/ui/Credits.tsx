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
        <p>
          The touch game's MORE BACH tab (D340): scores from the Mutopia Project (mutopiaproject.org). The Art of Fugue and the Musical
          Offering's ricercars typeset by Arnaud Gossart (Contrapunctus 1 by Pierre-Luc Gauthier) from Breitkopf &amp; Härtel 1885; the
          Sinfonias by Olivier Vermersch; Inventions 2-5, 7, 8, 10, 11, 13-15 by Allen Garvin; the Concerto for Two Violins by David
          Chan: public domain. Inventions 1, 6, 9 and 12 typeset by Jeff Covey from the Bach-Gesellschaft edition, CC BY-SA 3.0; the
          game's note data for them is shared under the same licence. The CHORALES tab: Craig Stuart Sapp, bach-370-chorales
          (github.com/craigsapp/bach-370-chorales), CC BY-NC-SA 4.0; the game's note data for them under the same licence. The motet
          BWV 228: Fritz Brodersen's WIMA edition (IMSLP), CC BY-NC 3.0. The cantata BWV 54: Ramon Casadesus-Masanell's edition
          (IMSLP, 2021), CC BY-NC-SA 4.0, the game's note data for it under the same licence. These three for non-commercial use only.
        </p>
        <p>
          The HARPSICHORD CONCERTOS, BWV 1052-1058 and 1060-1065 (D348): scores from musescore.com dedicated to the public domain
          (CC0 1.0), as kept in the PDMX dataset (Long, Novack, Berg-Kirkpatrick and McAuley, 2024): verits99's (all but BWV 1056)
          and Andrey Ronzhin's (BWV 1056). Credited though CC0 asks for nothing.
        </p>
        <h3>Software and sounds</h3>
        <p>VexFlow (MIT), React (MIT), smplr (MIT). MP3 export: lamejs (@breezystack/lamejs, LGPL-3.0; source at github.com/breezystack/lamejs), a JavaScript port of LAME. Other sounds are synthesized in the browser.</p>
        <p>
          Recordings (D128): Kimiko Ishizaka, The Open Well-Tempered Clavier, Book 1 (2015; welltemperedclavier.org), dedicated to the
          public domain (CC0 1.0); re-encoded, its bars timed by the game.
        </p>
        <p>
          Grand piano: Salamander Grand Piano V3 by Alexander Holm (Yamaha C5), CC BY 3.0, via the sfzinstruments edition
          (github.com/sfzinstruments/SalamanderGrandPiano); two velocity layers, re-encoded.
        </p>
        <p>
          Pipe organ, sackbut (trombone) and cello: from nbrosowsky/tonejs-instruments (samples CC BY 3.0); organ and trombone from the
          Versilian Studios Orchestra 2 Community Edition, cello from Freesound (12408, flcellogrl); trimmed and re-encoded.
        </p>
        <p>
          Violin, flute, bassoon, French horn, trumpet, harp, double bass, xylophone (Versilian Studios Orchestra 2 Community Edition),
          harmonium (Freesound 330410, donyaquick), classical guitar (Freesound 11573, quartertone), electric guitar, electric bass and
          saxophone (Karoryfer Samples): all via nbrosowsky/tonejs-instruments (CC BY 3.0); thinned, trimmed and re-encoded.
        </p>
        <p>
          The continuo's ensembles (D109): viola, string staccato (spiccato) and pizzicato, oboe, clarinet and timpani from the
          Versilian Studios Orchestra 2 Community Edition (VSCO 2 CE, github.com/sgossner/VSCO-2-CE; CC0); a picked electric bass
          ("babyblue", Black And Blue Basses) and a Gretsch guitar (Black And Green Guitars) by Karoryfer Samples (CC0), via the
          sfzinstruments editions; trimmed, levelled and re-encoded.
        </p>
        <p>
          Recorded drum kits (sfzinstruments editions, mixed to mono one-shots in two velocities): Virtuosity Drums (Versilian Studios
          and Karoryfer Samples, drummer Austin McMahon; CC0), Big Rusty Drums and Unruly Drums (Karoryfer Samples; CC0), Naked Drums
          (Wilkinson Audio; CC BY 4.0), DRSKit (Lars Muldjord, Bent Bisballe Nyeng, Jes Eiler and the DrumGizmo team; CC BY 4.0), Retro
          Drum Sample Set 1 (Seven Graylands / The Tic Tok Men, after S. Christian Collins; Sequential Drumtraks, Casio RZ-1, Roland
          CR-8000; offered for free use). SFZ ports by kinwie and the sfzinstruments project.
        </p>
        <button onClick={onClose}>{t("ui.close")}</button>
      </div>
    </div>
  );
}
