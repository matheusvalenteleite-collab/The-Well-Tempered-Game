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
