/**
 * "Fux's habits": the study of docs/fux/habits-study.md (tools/lab/habits-study.ts), shown in the
 * lab. A small reader for the report's own markdown: headings, paragraphs, bold, code and tables.
 */
import type { ReactNode } from "react";
import study from "../../docs/fux/habits-study.md?raw";

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
    part.startsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : part.startsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : part,
  );
}

export function HabitsTab() {
  const blocks: ReactNode[] = [];
  const lines = study.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    if (l.startsWith("# ")) continue; // the page has its own title
    if (l.startsWith("## ")) {
      blocks.push(<h2 key={i}>{l.slice(3)}</h2>);
      continue;
    }
    if (l.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!/^\|[-| ]+\|$/.test(lines[i])) rows.push(lines[i].slice(1, -1).split("|").map((c) => c.trim()));
        i++;
      }
      i--;
      const [head, ...body] = rows;
      blocks.push(
        <div key={i} className="lab-table-wrap">
          <table className="lab-table lab-study">
            <thead>
              <tr>{head.map((c, k) => <th key={k}>{inline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, j) => (
                <tr key={j}>{r.map((c, k) => <td key={k}>{inline(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    const para: string[] = [l];
    while (i + 1 < lines.length && lines[i + 1].trim() && !/^(#|\|)/.test(lines[i + 1])) para.push(lines[++i]);
    blocks.push(<p key={i} className="lab-prose">{inline(para.join(" "))}</p>);
  }
  return <section className="lab-habits">{blocks}</section>;
}
