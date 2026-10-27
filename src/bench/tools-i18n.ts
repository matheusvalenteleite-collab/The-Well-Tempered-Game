/**
 * D326: TOOLS' words in Portuguese and Spanish, kept beside the panel (not in pt.ts / es.ts, which other
 * work changes at the same time); `tt` is `tr` for them (English the key, `{n}` blanks filled).
 */
import { lang, tr } from "../i18n/index.ts";

export const TOOLS_PT: Record<string, string> = {
  TOOLS: "FERRAMENTAS",
  PRACTICE: "PRÁTICA",
  REHEARSAL: "ENSAIO",
  PIECE: "PEÇA",
  "YOUR VOICE": "SUA VOZ",
  "YOU PLAY THE {voice}": "VOCÊ TOCA O {voice}",
  BARS: "COMPASSOS",
  TO: "A",
  "TEMPO {n}%": "ANDAMENTO {n}%",
  LOOP: "REPETIR",
  "WAIT FOR ME": "ESPERE POR MIM",
  "Unscored: no crowd, no grade, no best score. A missed note still drops out.": "Sem pontuação: sem plateia, sem nota final, sem recorde. Uma nota perdida continua a se calar.",
  "WAIT FOR ME: the band waits for your next right note.": "ESPERE POR MIM: o conjunto espera a sua próxima nota certa.",
  "HEAR THE OTHERS": "OUVIR OS OUTROS",
  "The chosen bars without your voice. Solo and mute: here and in practice.": "Os compassos escolhidos sem a sua voz. Solo e mudo: aqui e na prática.",
  YOU: "VOCÊ",
  "SOLO {voice}": "SOLO {voice}",
  "MUTE {voice}": "MUDO {voice}",
  "YOUR VOICE IN THE BALANCE {db} DB": "SUA VOZ NO EQUILÍBRIO {db} DB",
  "Every run, scored ones too: one level for the whole run, never louder or softer for right or wrong notes.": "Em toda partida, também nas pontuadas: um só nível a partida toda, nunca mais forte nem mais fraco por notas certas ou erradas.",
  "LAST PRACTICE: {n} OF {m} RIGHT": "ÚLTIMA PRÁTICA: {n} DE {m} CERTAS",
  "PRACTICE · BARS {bars}": "PRÁTICA · COMPASSOS {bars}",
  "THE OTHERS · BARS {bars}": "OS OUTROS · COMPASSOS {bars}",
};

export const TOOLS_ES: Record<string, string> = {
  TOOLS: "HERRAMIENTAS",
  PRACTICE: "PRÁCTICA",
  REHEARSAL: "ENSAYO",
  PIECE: "PIEZA",
  "YOUR VOICE": "TU VOZ",
  "YOU PLAY THE {voice}": "TOCAS EL {voice}",
  BARS: "COMPASES",
  TO: "A",
  "TEMPO {n}%": "TEMPO {n}%",
  LOOP: "REPETIR",
  "WAIT FOR ME": "ESPÉRAME",
  "Unscored: no crowd, no grade, no best score. A missed note still drops out.": "Sin puntuación: sin público, sin nota final, sin récord. Una nota perdida sigue callándose.",
  "WAIT FOR ME: the band waits for your next right note.": "ESPÉRAME: el conjunto espera tu próxima nota correcta.",
  "HEAR THE OTHERS": "OÍR A LOS OTROS",
  "The chosen bars without your voice. Solo and mute: here and in practice.": "Los compases elegidos sin tu voz. Solo y silencio: aquí y en la práctica.",
  YOU: "TÚ",
  "SOLO {voice}": "SOLO {voice}",
  "MUTE {voice}": "SILENCIAR {voice}",
  "YOUR VOICE IN THE BALANCE {db} DB": "TU VOZ EN EL BALANCE {db} DB",
  "Every run, scored ones too: one level for the whole run, never louder or softer for right or wrong notes.": "En cada partida, también las puntuadas: un solo nivel toda la partida, nunca más fuerte ni más suave por notas correctas o erróneas.",
  "LAST PRACTICE: {n} OF {m} RIGHT": "ÚLTIMA PRÁCTICA: {n} DE {m} CORRECTAS",
  "PRACTICE · BARS {bars}": "PRÁCTICA · COMPASES {bars}",
  "THE OTHERS · BARS {bars}": "LOS OTROS · COMPASES {bars}",
};

/** TOOLS' text in the language in force (the English if none). */
export function tt(text: string, vars?: Record<string, string | number>): string {
  const l = lang();
  const d = l === "pt" ? TOOLS_PT : l === "es" ? TOOLS_ES : null;
  const s = d?.[text] ?? text;
  // Through `tr` for the blanks (its dictionaries do not hold these keys: the text comes back filled).
  return tr(s, vars);
}
