/** The top right of the top bar (D94): file icons, settings icons, then TUTORIAL (D98) and HOW TO PLAY, which stand out. */
import { t } from "./i18n.ts";
import { tt } from "../tutorial/text.ts";

const Disk = () => (
  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
    <path d="M2 1.5h9.5L14.5 4.5v10h-12.5z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <rect x="4.5" y="1.5" width="6" height="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <rect x="4" y="9" width="8" height="5" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export function HeaderTools(p: {
  onSave?: () => void;
  onExport?: () => void;
  exporting?: boolean;
  onSaved?: () => void;
  saved?: number;
  advanced?: boolean;
  onAdvanced?: () => void;
  look: "retro" | "classic";
  onLook(): void;
  theme: "auto" | "light" | "dark";
  onTheme(): void;
  onCredits?: () => void;
  onHelp(): void;
  onTutorial?: () => void;
}) {
  return (
    <div className="header-tools">
      {p.onSave && (
        <button className="icon tool" onClick={p.onSave} aria-label={t("ui.saved.save")} title={t("ui.saved.saveHelp")}>
          <Disk />
        </button>
      )}
      {p.onExport && (
        <button className="icon tool" aria-pressed={p.exporting} onClick={p.onExport} aria-label={t("ui.export")} title={t("ui.export.help")}>
          ⤓
        </button>
      )}
      {p.onSaved && (
        <button className="icon tool" onClick={p.onSaved} aria-label={t("ui.saved.title")} title={t("ui.saved.title")}>
          ♫{(p.saved ?? 0) > 0 && <span className="count">{p.saved}</span>}
        </button>
      )}
      <span className="tool-gap" />
      {p.onAdvanced && (
        <button className="icon tool" aria-pressed={p.advanced} onClick={p.onAdvanced} aria-label={t("ui.advanced")} title={t("ui.advanced.help")}>
          ⚙
        </button>
      )}
      <button className="icon tool look-tool" onClick={p.onLook} aria-label={t("ui.look")} title={`${t("ui.look")}: ${t(`ui.look.${p.look}`)} — ${t("ui.look.help")}`}>
        {p.look === "retro" ? "▦" : "Aa"}
      </button>
      <button className="icon tool" onClick={p.onTheme} aria-label={t("ui.theme.label")} title={t(`ui.theme.${p.theme}`)}>
        {p.theme === "dark" ? "☾" : p.theme === "light" ? "☀" : "◐"}
      </button>
      {p.onCredits && (
        <button className="icon tool credits-tool" onClick={p.onCredits} aria-label={t("ui.credits")} title={t("ui.credits")}>
          ©
        </button>
      )}
      {p.onTutorial && (
        <button className="howto tutorial-btn" onClick={p.onTutorial} title={tt("ui.buttonHelp")}>
          {tt("ui.button")}
        </button>
      )}
      <button className="howto" onClick={p.onHelp} title={t("ui.help.title")}>
        {t("ui.howto")}
      </button>
    </div>
  );
}
