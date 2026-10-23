/**
 * Design study (`?ui=ocarina`, `?ui=tunnel`): two from the arcade, for the computer's arrows.
 *
 * OCARINA: the ocarina staff of a 1998 adventure game: a dark band of five lines over a night field,
 * each of the player's notes drawn AS THE KEY TO PRESS (yellow buttons with the arrows, a blue one for
 * SPACE, the same note), at its pitch, its length a tail behind; the other voices faint motes, an entry's
 * glowing in its voice's colour inside tall brackets; when an entry sounds, the game's dialogue box names it
 * with the words in colour; hearts for the crowd, a gem counter for the score, the button cluster in the
 * corner as the legend.
 *
 * TUNNEL: a wireframe tunnel flown through: time is depth, a ring at every bar; each voice a rail
 * (its line of notes in 3D, side by side across the tunnel, pitch up and down), the player's rail white
 * with its notes as cubes carrying their keys; an entry a gate the music flies through where it begins
 * and another where it ends, named; the lock-on reticle on the note at hand.
 */
import { pixText } from "../box-fx.ts";
import { stepRange } from "../voice-mode.ts";
import { entryWord, fullGeo, gridLines, hash, keyLong, rect, type Template, type UEntry, type UNote } from "./core.ts";

const VOICE_GLOW = ["#7fd4ff", "#ff9a5a", "#c89bff", "#7ff09a", "#ffe07a"];
function glowOf(v: number, count: number): string {
  const order = count === 2 ? [0, 3] : count === 3 ? [0, 1, 3] : count === 5 ? [0, 4, 1, 2, 3] : [0, 1, 2, 3];
  return VOICE_GLOW[order[v] ?? 0];
}

/** The key a note asks for: the computer's arrows if given, else told from the step before. */
function keyOf(n: UNote, prev: UNote | undefined): string {
  if (n.arrow) return n.arrow;
  if (!prev) return "free";
  const d = n.step - prev.step;
  return d === 0 ? "same" : Math.abs(d) >= 3 ? (d > 0 ? "up" : "down") : d === 2 ? "rise" : d === -2 ? "fall" : d > 0 ? "right" : "left";
}
/** A button: yellow with an arrow (the keys' arrows), blue for SPACE, white for any key. */
function button(g: CanvasRenderingContext2D, key: string, x: number, y: number, r: number, alpha = 1) {
  g.globalAlpha = alpha;
  const blue = key === "same";
  const free = key === "free";
  g.fillStyle = "rgba(0,0,0,0.45)";
  g.beginPath();
  g.arc(x + 1.5, y + 2, r, 0, Math.PI * 2);
  g.fill();
  const grad = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  grad.addColorStop(0, blue ? "#9cc0ff" : free ? "#ffffff" : "#fff2a0");
  grad.addColorStop(1, blue ? "#2a56e0" : free ? "#b8b8c8" : "#e8b810");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = blue ? "#0c1e6a" : "#5a4200";
  g.lineWidth = Math.max(1, r * 0.12);
  g.stroke();
  g.fillStyle = blue ? "#ffffff" : "#4a3600";
  const tri = (ang: number, s = 0.55) => {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.beginPath();
    g.moveTo(0, -r * s);
    g.lineTo(r * s * 0.85, r * s * 0.5);
    g.lineTo(-r * s * 0.85, r * s * 0.5);
    g.closePath();
    g.fill();
    g.restore();
  };
  const A: Record<string, number> = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2, rise: Math.PI / 4, fall: (3 * Math.PI) / 4 };
  if (key in A) {
    tri(A[key]);
    if (key === "up" || key === "down") {
      g.fillStyle = "#4a3600";
      g.fillRect(x - r * 0.12, key === "up" ? y + r * 0.1 : y - r * 0.6, r * 0.24, r * 0.5);
    }
  } else if (blue) {
    g.font = `bold ${Math.round(r * 1.1)}px "DejaVu Sans", sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("␣", x, y - r * 0.1);
  } else if (key === "right2" || key === "left2") {
    tri(key === "right2" ? Math.PI / 2 : -Math.PI / 2, 0.42);
  }
  g.globalAlpha = 1;
}

export const OCARINA: Template = {
  name: "OCARINA",
  pixel: 0,
  chrome: true,
  bars: 2.5,
  playhead: 0.2,
  css: ".ui-ocarina .tg-box { background: #0a1030 !important; }",
  geo: (L) => fullGeo(L, 3, Infinity, -Infinity, 34, 30),
  paint(c) {
    const { g, W, H } = c;
    // The night field.
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#070b24");
    sky.addColorStop(0.7, "#1d2c5a");
    sky.addColorStop(1, "#2d4a4a");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(c.secs * (0.5 + hash(i, 3)) + i));
      rect(g, hash(i, 1) * W, hash(i, 2) * H * 0.75, 1.4, 1.4, "#ffffff", tw * 0.7);
    }
    g.fillStyle = "#f4f0d0";
    g.beginPath();
    g.arc(W * 0.86, H * 0.2, 16, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#0c2418";
    g.beginPath();
    g.moveTo(0, H);
    const drift = (c.now / c.span) * 40;
    for (let x = 0; x <= W; x += 10) g.lineTo(x, H - 40 - Math.sin((x + drift) / 90) * 14 - Math.sin((x + drift) / 37) * 6);
    g.lineTo(W, H);
    g.fill();
    // The ocarina staff: a dark band over the player's range, five lines.
    const me = c.fr.voice;
    const steps = c.notes.filter((n) => n.mine).map((n) => n.step);
    const lo = Math.min(c.fr.lo, ...steps);
    const hi = Math.max(c.fr.hi, ...steps);
    const yTop = c.y(hi, me) - c.A(me) * 2;
    const yBot = c.y(lo, me) + c.A(me) * 2;
    g.fillStyle = "rgba(0,0,0,0.55)";
    g.beginPath();
    g.roundRect(6, yTop, W - 12, yBot - yTop, 10);
    g.fill();
    for (let k = 0; k < 5; k++) rect(g, 14, yTop + ((k + 0.5) / 5) * (yBot - yTop), W - 28, 1.2, "#d04040", 0.75);
    for (const l of gridLines(c)) if (l.bar) rect(g, c.xOf(l.t), yTop + 4, 1, yBot - yTop - 8, "#ffffff", 0.18);
    // The other voices: faint motes; an entry's glowing in its voice's colour.
    for (const n of c.notes) {
      if (n.mine) continue;
      const x1 = c.xOf(n.on);
      const x2 = c.xOf(n.on + n.dur) - 2;
      const y = c.y(n.step, n.voice);
      if (n.entry?.live) {
        g.shadowColor = glowOf(n.voice, c.count);
        g.shadowBlur = 8;
        rect(g, x1, y - 2, Math.max(3, x2 - x1), 4, glowOf(n.voice, c.count), 0.95);
        g.shadowBlur = 0;
      } else rect(g, x1, y - 1, Math.max(2, x2 - x1), 2, "#c8d8ff", 0.22);
    }
    // Tall brackets round the entries, a note sign at each end.
    for (const e of c.entries.filter((e) => e.live)) {
      const ys = e.path.map((n) => c.y(n.step, e.voice));
      const t = Math.min(...ys) - 12;
      const b = Math.max(...ys) + 10;
      const x1 = c.xOf(e.on) - 8;
      const x2 = c.xOf(e.end) + 2;
      const col = e.mine ? "#ffe060" : glowOf(e.voice, c.count);
      g.strokeStyle = col;
      g.lineWidth = 2;
      g.shadowColor = col;
      g.shadowBlur = 6;
      g.beginPath();
      g.moveTo(x1 + 6, t);
      g.lineTo(x1, t);
      g.lineTo(x1, b);
      g.lineTo(x1 + 6, b);
      g.moveTo(x2 - 6, t);
      g.lineTo(x2, t);
      g.lineTo(x2, b);
      g.lineTo(x2 - 6, b);
      g.stroke();
      g.shadowBlur = 0;
      g.fillStyle = col;
      g.font = `bold 12px "DejaVu Sans", sans-serif`;
      g.textAlign = "left";
      g.textBaseline = "bottom";
      g.fillText(`♪ ${entryWord(e)} · ${c.names[e.voice]}${e.stretto ? " · STRETTO" : ""}`, x1, t - 2);
    }
    // The player's notes: the keys themselves, at their pitch, a tail for their length.
    const mine = c.notes.filter((n) => n.mine);
    const r = Math.max(7, Math.min(15, c.A(me) * 1.5));
    mine.forEach((n, i) => {
      const x1 = c.xOf(n.on);
      const x2 = c.xOf(n.on + n.dur);
      const y = c.y(n.step, me);
      if (x2 < -20 || x1 > W + 20 || n.ride) return;
      const done = n.state === "hit" && c.since(n) > 0.3;
      rect(g, x1, y - r * 0.28, Math.max(0, x2 - x1 - 3), r * 0.56, n.entry?.live ? "#ffe060" : "#fff1b0", done ? 0.15 : 0.35);
      if (n.state === "miss") {
        button(g, "free", x1 + r, y, r * 0.8, 0.35);
        g.strokeStyle = "#ff4040";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x1 + r * 0.5, y - r * 0.5);
        g.lineTo(x1 + r * 1.5, y + r * 0.5);
        g.stroke();
        return;
      }
      if (i > 0 && mine[i - 1].on === n.on) return;
      const flash = n.state === "hit" ? c.since(n) : Infinity;
      const lift = flash < 0.4 ? flash * 30 : 0;
      button(g, keyOf(n, mine[i - 1]), x1 + r, y - lift, r, done ? 0.35 : 1);
      if (flash < 0.25) {
        g.strokeStyle = `rgba(255,255,255,${1 - flash * 4})`;
        g.lineWidth = 3;
        g.beginPath();
        g.arc(x1 + r, y - lift, r + flash * 40, 0, Math.PI * 2);
        g.stroke();
      }
    });
    // The now.
    rect(g, c.playX, yTop - 6, 2, yBot - yTop + 12, "#ffffff", 0.55);
    // The dialogue box for the entry sounding.
    const cur = c.entries.filter((e) => e.sounding).sort((a, b) => Number(b.mine) - Number(a.mine) || b.on - a.on)[0];
    if (cur) {
      const bw = Math.min(W - 40, 520);
      const bx = (W - bw) / 2;
      const by = H - 30;
      g.fillStyle = "rgba(0,0,0,0.78)";
      g.beginPath();
      g.roundRect(bx, by - 2, bw, 28, 8);
      g.fill();
      g.font = `bold 13px "DejaVu Sans", sans-serif`;
      g.textBaseline = "middle";
      g.textAlign = "left";
      const parts: [string, string][] = cur.mine
        ? [["You are playing ", "#fff"], [entryWord(cur).toLowerCase(), "#ff5a5a"], [" in ", "#fff"], [keyLong(cur.key), "#7fb8ff"], ["!", "#fff"]]
        : [["The ", "#fff"], [(c.names[cur.voice] ?? "").toLowerCase(), "#ff5a5a"], [" sings ", "#fff"], [entryWord(cur).toLowerCase(), "#ff5a5a"], [" in ", "#fff"], [keyLong(cur.key), "#7fb8ff"], [cur.stretto ? " — a stretto!" : ".", "#fff"]];
      let x = bx + 14;
      for (const [t, col] of parts) {
        g.fillStyle = col;
        g.fillText(t, x, by + 12);
        x += g.measureText(t).width;
      }
    }
    // Hearts (the crowd) and gems (the score); the buttons' legend.
    const hearts = Math.round((c.game?.crowd ?? 0.6) * 10);
    for (let i = 0; i < 10; i++) {
      g.fillStyle = i < hearts ? "#ff3048" : "rgba(255,255,255,0.25)";
      g.font = `14px "DejaVu Sans", sans-serif`;
      g.textAlign = "left";
      g.textBaseline = "top";
      g.fillText("♥", 10 + i * 13, 6);
    }
    g.fillStyle = "#38e070";
    g.fillText("◆", 10, 22);
    g.fillStyle = "#fff";
    g.font = `bold 12px "DejaVu Sans Mono", monospace`;
    g.fillText(String(Math.round(c.game?.score ?? 0)).padStart(5, "0"), 26, 23);
    const lx = W - 70;
    button(g, "up", lx + 30, 14, 8);
    button(g, "left", lx + 16, 28, 8);
    button(g, "right", lx + 44, 28, 8);
    button(g, "down", lx + 30, 42, 8);
    button(g, "same", lx - 4, 32, 10);
  },
};

// ---------------------------------------------------------------------------------------------------

export const TUNNEL: Template = {
  name: "TUNNEL",
  pixel: 0,
  chrome: true,
  css: ".ui-tunnel .tg-box { background: #000 !important; }",
  geo: (L) => fullGeo(L, 1),
  paint(c) {
    const { g, W, H } = c;
    rect(g, 0, 0, W, H, "#02030a");
    const cx = W / 2;
    const cy = H * 0.5;
    const beat = c.beat;
    const zOf = (t: number) => (t - c.now) / beat;
    const sOf = (z: number) => 1 / (1 + Math.max(-0.7, z) * 0.2);
    const r = stepRange(c.f);
    const mid = (r.lo + r.hi) / 2;
    const rowH = (H * 1.5) / (r.hi - r.lo + 2);
    const lane = W * 0.26;
    const laneX = (v: number) => (v - (c.count - 1) / 2) * lane;
    const P = (v: number, step: number, t: number) => {
      const s = sOf(zOf(t));
      return { x: cx + laneX(v) * s, y: cy + (mid - step) * rowH * s, s };
    };
    const far = 14;
    // The rings: one per bar (bright), per beat (faint).
    const first = c.f.bars[0]?.on ?? 0;
    for (let t = first + Math.ceil((c.now - first) / beat) * beat; zOf(t) < far; t += beat) {
      const z = zOf(t);
      const s = sOf(z);
      const isBar = c.f.bars.some((b) => b.on === t);
      const fade = Math.max(0, 1 - z / far);
      g.strokeStyle = isBar ? `rgba(60,220,255,${0.7 * fade})` : `rgba(60,120,255,${0.22 * fade})`;
      g.lineWidth = isBar ? 1.5 : 1;
      g.beginPath();
      g.roundRect(cx - W * 0.48 * s, cy - H * 0.44 * s, W * 0.96 * s, H * 0.88 * s, 18 * s);
      g.stroke();
      if (isBar && s > 0.25) {
        const b = c.f.bars.find((x) => x.on === t);
        pixText(g, String(b?.n ?? ""), cx - W * 0.48 * s + 6, cy - H * 0.44 * s + 5, `rgba(60,220,255,${0.8 * fade})`);
      }
    }
    // The tunnel's long edges.
    g.strokeStyle = "rgba(60,160,255,0.25)";
    g.lineWidth = 1;
    for (const [dx, dy] of [[-0.48, -0.44], [0.48, -0.44], [-0.48, 0.44], [0.48, 0.44]]) {
      g.beginPath();
      g.moveTo(cx + W * dx * sOf(-0.7), cy + H * dy * sOf(-0.7));
      g.lineTo(cx + W * dx * sOf(far), cy + H * dy * sOf(far));
      g.stroke();
    }
    // The rails: each voice's line of notes, in depth; an entry's stretch bright; the player's white.
    const byVoice = new Map<number, UNote[]>();
    for (const n of c.notes) if (zOf(n.on + n.dur) > -0.7 && zOf(n.on) < far) byVoice.set(n.voice, [...(byVoice.get(n.voice) ?? []), n]);
    const sorted = [...byVoice.entries()].sort((a, b) => Number(a[0] === c.fr.voice) - Number(b[0] === c.fr.voice));
    for (const [v, ns] of sorted) {
      const mineV = v === c.fr.voice;
      const col = mineV ? "#ffffff" : glowOf(v, c.count);
      for (const n of ns) {
        const a = P(v, n.step, Math.max(n.on, c.now - beat * 0.7));
        const b = P(v, n.step, n.on + n.dur);
        const lit = mineV || n.entry?.live;
        const fade = Math.max(0.1, 1 - zOf(n.on) / far);
        g.strokeStyle = col;
        g.globalAlpha = (lit ? 0.95 : 0.22) * fade;
        g.lineWidth = Math.max(1, (lit ? 3 : 1.5) * a.s);
        if (lit) {
          g.shadowColor = col;
          g.shadowBlur = 10;
        }
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
        g.shadowBlur = 0;
        // The player's notes: wireframe cubes with their key on them.
        if (mineV && n.on >= c.now - beat && !n.ride) {
          const p = P(v, n.step, n.on);
          const sz = 13 * p.s;
          const hit = n.state === "hit";
          g.globalAlpha = (hit ? 0.35 : 1) * fade;
          g.strokeStyle = n.state === "miss" ? "#ff3050" : n.entry?.live ? "#ffe060" : "#ffffff";
          g.lineWidth = 1.5;
          g.strokeRect(p.x - sz, p.y - sz, 2 * sz, 2 * sz);
          g.strokeRect(p.x - sz * 0.6, p.y - sz * 1.3, 2 * sz, 2 * sz);
          if (n.arrow && sz > 6) {
            g.fillStyle = g.strokeStyle;
            g.font = `bold ${Math.round(sz * 1.3)}px "DejaVu Sans", sans-serif`;
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillText(({ up: "↑", down: "↓", left: "←", right: "→", rise: "↗", fall: "↘", same: "␣", free: "•" } as Record<string, string>)[n.arrow] ?? "•", p.x, p.y);
          }
        }
        g.globalAlpha = 1;
      }
    }
    // The gates: where each entry begins (solid, named) and ends (dashed).
    const gate = (e: UEntry, t: number, start: boolean) => {
      const z = zOf(t);
      if (z < -0.6 || z > far) return;
      const ys = e.path.map((n) => n.step);
      const a = P(e.voice, Math.max(...ys) + 2, t);
      const b = P(e.voice, Math.min(...ys) - 2, t);
      const half = lane * 0.42 * a.s;
      const col = e.mine ? "#ffe060" : glowOf(e.voice, c.count);
      g.strokeStyle = col;
      g.globalAlpha = Math.max(0.2, 1 - z / far);
      g.lineWidth = start ? 2.5 : 1.5;
      g.setLineDash(start ? [] : [6, 5]);
      g.shadowColor = col;
      g.shadowBlur = start ? 14 : 4;
      g.strokeRect(a.x - half, a.y, half * 2, b.y - a.y);
      g.shadowBlur = 0;
      g.setLineDash([]);
      if (start && a.s > 0.22) {
        g.fillStyle = col;
        g.font = `bold ${Math.round(Math.max(9, 15 * a.s))}px "DejaVu Sans Mono", monospace`;
        g.textAlign = "center";
        g.textBaseline = "bottom";
        g.fillText(`${entryWord(e)} · ${c.names[e.voice]}${e.stretto ? " · STRETTO" : ""}`, a.x, a.y - 3);
      }
      g.globalAlpha = 1;
    };
    for (const e of c.entries) {
      gate(e, e.on, true);
      gate(e, e.end, false);
    }
    // The reticle on the note at hand.
    const next = c.notes.find((n) => n.mine && n.state === "pending" && n.on + n.dur > c.now);
    if (next) {
      const p = P(c.fr.voice, next.step, Math.max(next.on, c.now));
      const k = 18 * p.s + 4 + Math.sin(c.secs * 8) * 2;
      g.strokeStyle = "#ff40a0";
      g.lineWidth = 2;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        g.beginPath();
        g.moveTo(p.x + sx * k, p.y + sy * k * 0.5);
        g.lineTo(p.x + sx * k, p.y + sy * k);
        g.lineTo(p.x + sx * k * 0.5, p.y + sy * k);
        g.stroke();
      }
    }
    // The readouts.
    g.fillStyle = "#3cdcff";
    g.font = `bold 13px "DejaVu Sans Mono", monospace`;
    g.textAlign = "left";
    g.textBaseline = "top";
    const bar = c.f.bars.filter((b) => b.on <= c.now).at(-1)?.n ?? 1;
    g.fillText(`LAYER ${String(bar).padStart(2, "0")}   ${keyLong(c.fr.key)}`, 12, 10);
    g.textAlign = "right";
    g.fillText(`SCORE ${String(Math.round(c.game?.score ?? 0)).padStart(6, "0")}`, W - 12, 10);
    g.textAlign = "left";
    g.textBaseline = "bottom";
    g.fillStyle = "rgba(60,220,255,0.7)";
    g.fillText(`AREA ${c.f.book === 2 ? "II" : "I"}·${c.f.number} · FUGUE ${c.count} VOICES`, 12, H - 8);
    void gridLines;
  },
};
