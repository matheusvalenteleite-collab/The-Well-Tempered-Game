/** D725: MY FUGUE's video: the kind chosen (MP4 first, as WhatsApp prefers; else WebM; none: no button), and its file's name. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { filmFile, filmType, FILM_TYPES, FILM_VIDEO_BPS, FILM_AUDIO_BPS } from "../src/bench/takes/film.ts";

test("D725: MP4 where the browser records it, else WebM; nothing where it records no video", () => {
  const g = globalThis as { MediaRecorder?: unknown };
  const before = g.MediaRecorder;
  try {
    delete g.MediaRecorder;
    assert.equal(filmType(), null);
    g.MediaRecorder = { isTypeSupported: (t: string) => t === "video/mp4" || t.startsWith("video/webm") };
    assert.equal(filmType(), "video/mp4");
    g.MediaRecorder = { isTypeSupported: (t: string) => t.startsWith("video/webm") };
    assert.equal(filmType(), "video/webm;codecs=vp9,opus");
  } finally {
    g.MediaRecorder = before;
  }
  assert.ok(FILM_TYPES[0].startsWith("video/mp4"));
  assert.deepEqual(filmFile("video/mp4;codecs=avc1,mp4a"), { ext: "mp4", mime: "video/mp4" });
  assert.deepEqual(filmFile("video/webm;codecs=vp9,opus"), { ext: "webm", mime: "video/webm" });
  // A four-minute fugue stays under the share sheet's 50 MB and WhatsApp's 100 MB.
  assert.ok(((FILM_VIDEO_BPS + FILM_AUDIO_BPS) * 240) / 8 / 1e6 < 45);
});
