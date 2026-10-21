# gerubach: visual design research (for a "gerubach-inspired" Contrapunctus XIV practice page)

## Method and caveat
The gerubach YouTube channel **no longer exists**. Fetching `youtube.com/channel/UCNAckPiDYxRWengUlRujs6Q` on 2026-10-21 returns "This channel does not exist", and every video ID I tried returns "Video unavailable" or an oEmbed 404. gerubach.com is now a parked "domain may be for sale" page. The Wayback Machine is blocked from this environment.

The main primary source is therefore the Internet Archive mirror **"The Scrolling Bach Project"**: https://archive.org/details/gerubach. It holds 239 videos "archived from YT as of 26 March 2023", with the note "Uploaded in loving memory of gerubach, the sole creator of these videos". I downloaded five of these videos and inspected frames with ffmpeg:
- Contrapunctus XIX (the unfinished fugue)
- "Little" Fugue BWV 578
- Chaconne BWV 1004
- 14 Canons BWV 1087
- the farewell clip "Please enjoy these videos while they last."

Unless a statement is marked *impression*, it describes what I saw in those frames.

## Who runs it
- **Verified:** The handle is gerubach. The project's name is "Scrolling Bach Project", and the end card of BWV 578 says "help support my Scrolling Bach Project … www.gerubach.com". The title cards read "Favorite Selections from Geru's Music Library". The archive.org uploader calls gerubach "the sole creator" and writes "in loving memory", which implies the creator has died. Source: https://archive.org/details/gerubach
- **Partly verified:** A puzzle-canon blog calls him 'Gerardo "Gerubach"' (https://www.puzzlecanon.com/single-post/2015/03/10/Bachs-14-Canons-on-the-Goldberg-Ground).
- **Unverified:** A search-result snippet says a fan video is "dedicated to Gerardo Martinez (Gerubach)". I could not open that page (YouTube video YRGlUGu9KLQ), so treat the surname as unverified.
- **Not found:** I found no interview, Reddit thread or article that describes his method.
- **Other facts:**
  - Third parties described the stated aim as a "free online library of Bach's entire collection … in a scrolling format".
  - A PLAYBOARD snapshot reportedly showed about 112k subscribers and 266 videos. I only have this second-hand from a search summary.
  - Classic FM shared one of his videos on Facebook ("Chromatic Fantasia and Fugue … score by gerubach").

## What is on screen (verified from frames)
**Format:** 16:9 frame at about 596–634×360 in the archived copies. The score is **one continuous horizontal strip** that scrolls right-to-left under a **fixed vertical playhead**, so there are no page turns. Each printed system is cut out and the systems are butted end-to-end into one endless line. You can see the joins: stave lengths, bar widths and scan density change abruptly at system boundaries.

**Playhead:** It sits at roughly **48 % of the frame width**, just left of centre, and never moves; the music slides under it. Its style varies by video:
- **Contrapunctus XIX:** a thin, opaque, pure-red 1–2 px line running the full frame height.
- **BWV 578 and the Canons:** a wider, semi-transparent red/pink band, about 2 % of the width.
- **Chaconne:** the band changes width and turns **blue** in the major-key middle section. *Impression:* the colour marks the section.
- The playhead does **not** pick out individual notes. It only marks "now".

**Score sources:** These are **scanned public-domain engravings or manuscripts, not newly typeset scores**.
- **Contrapunctus XIX:** a 19th-century-looking engraving in four-stave open score with soprano, alto, tenor and bass C-clefs. It is headed "Contrapunctus XIX" with a footnote mark and section labels "XIX a" and "XIX b". *Impression:* this matches old collected-edition numbering such as the Bach-Gesellschaft, but the video does not name the edition.
- **Chaconne:** Bach's autograph manuscript.
- **BWV 578:** an engraved organ score labelled "Manual." / "Pedal."
- **14 Canons:** mixes the 1974 manuscript with neat re-typeset incipits.

**Background:**
- **Contrapunctus XIX:** the scan's white paper fills the frame edge to edge, with almost no margin.
- **BWV 578 and Chaconne:** the strip floats on **black**, with black above and below it. The BWV 578 strip is tinted light grey.
- **Canons:** a cream/ivory "paper" ground.

**Watermark:** "YOUTUBE.COM/GERUBACH" or "www.youtube.com/gerubach" appears small. It is faint grey inside the score in BWV 578 and red at the bottom right in the Chaconne.

## Annotations: subjects and voices
- **Contrapunctus XIX** is the most annotated video. It opens with an explanatory card in red serif text on white:
  > This quadruple fugue was Bach's last work. Bach was only able to finish 3 of the 4 fugues before his death on July 28th, 1750. During the presentation, the fugue subjects will be labeled: 1st Fugue Subject = 1, 2nd Fugue Subject = 2. The 3rd fugue subject will have the 4 letters of the composer's last name… B A C H
- During playback, each subject entry gets a **small filled red circle with a white numeral ("1" or "2")** at the first note of the entry, on the staff of the voice that has it. Some entries of subject 1 use a **blue circle**. *Impression:* blue marks the inverted form, but this is not stated on screen.
- The BACH subject is marked with **small red serif letters B, A, C, H**, one above each of its four notes.
- **No voice is coloured.** The noteheads stay black, and nothing is drawn along a subject apart from the badge at its start.
- In the **14 Canons**, gerubach goes further. He adds red captions ("retrograde", "part 2", "The other part will enter at this point. (A distance of a 16th note!)"), red circles and boxes, and black serif titles for each canon ("2. all' roverscio (upside down)", "14. Canon in 4 parts. by Augmentation and Diminution").
- **Plain repertoire** (Chaconne, BWV 578) has no analytic marks at all.

## Titles, credits, recording info
**Opening title card:** black background, centred white text.
- First, a serif line: "Favorite Selections from Geru's Music Library".
- Then, smaller: "today's selection is…" and "Johann Sebastian Bach's".
- Then the work in wide-tracked, geometric sans-serif capitals. For Contrapunctus XIX: "CONTRAPUNCTUS XIX / (ORIGINAL UNFINSIHED VERSION) / FROM / DIE KUNST DER FUGE / BWV 1080". The typo is in the original.
- The lines fade in one after another.
- **BWV 578 differs:** the title sits top-left beside the score in a **magenta** serif with small caps ("FUGUE in G minor").

**Recording credit:** shown only as **the album cover at the end**, centred on black.
- Contrapunctus XIX: *Canadian Brass – Bach: Art of the Fugue* (CBS Masterworks).
- BWV 578: Michel Chapuis on Valois.
- No performer name is overlaid during playback.

**Video descriptions:** These follow the pattern "Performer & Album Info – [time]" followed by movement timestamps, plus "Please donate to Gerubach's Scrolling BACH Project…". This is visible in the YouTube Studio footage in the farewell clip.

**Closing card (BWV 578):** grey centred serif text: "If you enjoyed this video, please help support my Scrolling Bach Project with a financial contribution by visiting: www.gerubach.com".

## Audio alignment
- Commercial recordings are used unaltered.
- The scroll keeps the playhead on the sounding beat, and wide or crowded bars pass at different on-screen speeds. Since the bars are uneven scans, the alignment must have been keyframed by hand (*inference*).
- No metronome, tempo or bar numbers are shown beyond what is printed in the scan.

## Deliberately absent
- No on-screen controls.
- No piano roll or falling notes.
- No narration or spoken commentary.
- No highlighting of individual noteheads.
- No performer video.
- No colour coding of voices.
- No background imagery during the music.

Text is limited to the title card, optional analytical badges, a small watermark and the end card.

## gerubach and the Art of Fugue / Contrapunctus 14
- **Dedicated unfinished-fugue video, verified:** "BWV 1080 - Contrapuntus 19 (Scolling Score)" [cF-dGt7xPxo], 7 min 50 s, now only on archive.org. "Contrapunctus XIX" is an older numbering of what is now usually called Contrapunctus XIV / Fuga a 3 soggetti.
- **Distinctive choices in that video:**
  1. The red explanatory preface, which calls it a *quadruple* fugue with 3 of 4 subjects finished.
  2. Numbered red and blue subject badges, plus the B-A-C-H letters.
  3. The famous ending. The score scrolls to the last bar, where the voices simply stop, and blank white follows.
  4. A crossfade to a zoomed detail of **Bach's autograph at the break-off point**.
  5. The full autograph page with C. P. E. Bach's handwritten note at the bottom.
  6. The Canadian Brass cover on black.
- **Full Art of Fugue videos (seen only in the farewell clip):**
  - "BWV 1080 – Art of the Fugue (Full Score)" (1:26:50, published 22 Jun 2013, about 1.35 M views).
  - "BWV 1080 – Art of the Fugue (Keyboard Reduction)" (1:36:03, 221,883 views). It was "Blocked in all territories" by a UMG/Decca claim on a Zoltán Kocsis / Ferenc Rados recording, and the clip shows it being deleted.
  - Thumbnails of both show open-score scans with a centred translucent red playhead.
  - Neither video is in the archive, so I could not examine them further.

## Takeaways for a gerubach-inspired page
These are recommendations based on the findings above:
- One horizontal strip of real scanned score scrolling under a fixed red line at about 48 % of the width.
- A black or white full-bleed field with nothing else on it.
- A serif title card ("today's selection is…").
- Small red circled subject numbers and red B-A-C-H letters as the only analysis.
- Recording credit shown only at the end.
- For Contrapunctus XIV, end where the music breaks off, on silence and blank paper, optionally followed by the autograph.

## Sources
- https://archive.org/details/gerubach (metadata via https://archive.org/metadata/gerubach)
- https://www.puzzlecanon.com/single-post/2015/03/10/Bachs-14-Canons-on-the-Goldberg-Ground
- https://cs.nyu.edu/~davise/FavoriteVideos/FavoriteVideos.html (credits a "scrolling score by gerubach")
- https://www.facebook.com/ClassicFM/videos/chromatic-fantasia-and-fugue-by-js-bach-score-by-gerubach/10156473616939260/
- https://soundsrite.westernsydney.edu.au/soundsRiteContent/volume11/morris-B4ch1007.html (cites gerubach's Scrolling Bach Project; returned 403 to me)
- https://www.youtube.com/channel/UCNAckPiDYxRWengUlRujs6Q ("This channel does not exist", checked 2026-10-21)
