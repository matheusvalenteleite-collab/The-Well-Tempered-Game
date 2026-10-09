/** A reference to bars in a text (D96): pointing at it (or tapping it) makes those bars pulse on the score. `bars` are 0-based. */
import { setHighlight } from "./highlight.ts";
import { t } from "./i18n.ts";

export function BarRef({ bars, children }: { bars: number[]; children: React.ReactNode }) {
  return (
    <span
      className="bar-ref"
      data-info={t("ui.barRef.help")}
      onMouseEnter={() => setHighlight(bars)}
      onMouseLeave={() => setHighlight(null)}
      onFocus={() => setHighlight(bars)}
      onBlur={() => setHighlight(null)}
      tabIndex={0}
    >
      {children}
    </span>
  );
}
