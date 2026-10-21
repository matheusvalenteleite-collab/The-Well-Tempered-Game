/**
 * The touch game, step 1 (layout): the music box in the upper half of the screen, the play area for
 * the two thumbs in the lower half. No sound yet; the box shows a still frame of the fugue.
 */
import { MusicBox } from "./MusicBox.tsx";
import { PlayArea } from "./PlayArea.tsx";
import { FUGUE } from "./fugue.ts";

export function TouchApp() {
  return (
    <div className="tg-app">
      <MusicBox fugue={FUGUE} />
      <PlayArea />
      <div className="tg-upright" role="alert">
        Turn the phone upright
      </div>
    </div>
  );
}
