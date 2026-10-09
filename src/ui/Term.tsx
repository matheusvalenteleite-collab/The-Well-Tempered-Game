/**
 * A concept with an explanation (D96): underlined with dots, it explains itself in the info bar
 * when pointed at (or, in explain mode, tapped). `gloss` names a glossary entry; `def` gives the
 * text directly.
 */
import { t } from "./i18n.ts";

export function Term({ gloss, def, children }: { gloss?: string; def?: string; children: React.ReactNode }) {
  const text = def ?? (gloss ? t(`gloss.${gloss}`) : "");
  return (
    <span className="term" data-info={text} tabIndex={0}>
      {children}
    </span>
  );
}
