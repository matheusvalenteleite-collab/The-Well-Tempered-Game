import { freeRows } from "../../../src/bench/lab/free.ts";
import { createRequire } from "node:module";
const req = createRequire(import.meta.url);
(globalThis as any).window = globalThis;
req("../touchgest.js");
const G = (globalThis as any).TouchGest;
let bad = 0, n = 0;
for (const key of ["C","D","Eb","F#","Bb","c","d","g","f#","b"]) for (const mid of [55, 62, 67]) for (const oct of [1,2,3]) {
  // a fake piece whose one voice spans mid-1..mid+1 (its middle = mid)
  const f: any = { key, voices: [[[0,1,mid-1],[1,1,mid+1]]] };
  const a = freeRows(f, 0, "key", oct);
  const pcs: any = { c:0,d:2,e:4,f:5,g:7,a:9,b:11 }; let pc = pcs[key[0].toLowerCase()]; if (key[1]==="#") pc++; if (key[1]==="b") pc--;
  const b = G.freeRows((pc+12)%12, key[0]===key[0].toLowerCase(), mid, oct);
  n++; if (JSON.stringify(a)!==JSON.stringify(b)) { bad++; console.log(key, mid, oct, a, b); }
}
console.log(`freeRows port: ${n - bad}/${n} identical to src/bench/lab/free.ts`);

// D330 keyboard: rows and hit test against the game's own Keyboard
import { Keyboard as TsKeyboard, KB_DEFAULT as TS_KB, PIANO_WHITES as TS_W } from "../../../src/bench/lab/free.ts";
let kbad = 0, kn = 0;
for (const mid of [55, 62, 67, 71]) for (const oct of [1, 2, 3]) {
  const f: any = { key: "C", voices: [[[0, 1, mid - 1], [1, 1, mid + 1]]] };
  const a = freeRows(f, 0, "keyboard", oct), b = G.keyboardRows(mid, oct);
  if (JSON.stringify(a) !== JSON.stringify(b)) { kbad++; console.log("rows", mid, oct, a, b); }
  for (const [bw, h] of [[280, 342], [200, 287]]) {
    const ts = new TsKeyboard(a, TS_W, TS_KB, bw, h), js = new G.Keyboard(b, G.PIANO_WHITES, G.KB_DEFAULT, bw, h);
    for (let u = 0; u <= bw; u += 7) for (let y = 0; y <= h; y += 3) { kn++; if (ts.hit(u, y).row !== js.hit(u, y).row) kbad++; }
  }
}
console.log(`keyboard port: rows and ${kn} hit-test points, ${kbad} differences from src/bench/lab/free.ts`);
