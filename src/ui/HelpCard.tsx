import { useEffect } from "react";
import { t } from "./i18n.ts";

const KEYS: [string, string][] = [
  ["← →", "help.keys.move"],
  ["↑ ↓", "help.keys.step"],
  ["A–G", "help.keys.letter"],
  ["T", "help.keys.tie"],
  ["8 4 3 2 6 1", "help.keys.value"],
  ["#  -  n", "help.keys.accidental"],
  ["Delete", "help.keys.clear"],
  ["F1–F9", "help.keys.tracks"],
  ["Space", "help.keys.hear"],
  ["P", "help.keys.play"],
  ["?", "help.keys.help"],
];

/** How to play, and the keyboard shortcuts (the "?" button or key). */
export function HelpCard({ rest, onClose }: { rest: boolean; onClose(): void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  const keys = rest ? [...KEYS.slice(0, 7), ["R", "help.keys.rest"] as [string, string], ...KEYS.slice(7)] : KEYS;
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label={t("ui.help.title")} onClick={onClose}>
      <div className="dialog help-card" onClick={(e) => e.stopPropagation()}>
        <h2>{t("ui.help.title")}</h2>
        <p>{t("help.howto")}</p>
        <table className="keys">
          <tbody>
            {keys.map(([k, d]) => (
              <tr key={k}>
                <th><kbd>{k}</kbd></th>
                <td>{t(d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="note">{t("help.mouse")}</p>
        <button onClick={onClose}>{t("ui.close")}</button>
      </div>
    </div>
  );
}
