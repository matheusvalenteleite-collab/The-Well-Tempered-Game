\version "2.24.0"

\header {
  title = "Goldberg Variations, BWV 988: Variatio 26. a 2 Clav."
  composer = "Johann Sebastian Bach"
  opus = "BWV 988/26"
  source = "Clavier Ubung (Balthasar Schmid, Nuernberg 1741), Austrian National Library copy SH.J.S.Bach.75, pp. 26-27; Bach-Gesellschaft Ausgabe, Band 3 (1853), pp. 300-301"
  typesetter = "Transcribed note by note from the 1741 print and the BGA print (Band 3, ed. C. F. Becker) by Claude"
  copyright = "Public Domain"
}

%{
Transcription notes
-------------------
* Pitches are ABSOLUTE (no \relative). c' = middle C (C4).
* The print's accidental convention: an accidental holds to the end of the bar at
  that octave. Every pitch here is spelled as it sounds under that rule.
* Meter. The print sets one staff in 18/16 and the other in 3/4 (the signs change
  staff with the material: bars 1-8 and 17-24 upper 18/16 / lower 3/4; bars 9-16
  and 25-27 upper 3/4 / lower 18/16; bars 28-32 both staves 18/16). Here the whole
  piece is in \time 3/4: the 18/16 line is written as sextuplet semiquavers,
  \tuplet 6/4 { six sixteenths } per crotchet; an eighth or dotted quarter printed
  inside an 18/16 bar is written inside the \tuplet too, so it keeps its 18/16
  length (an 18/16 eighth = 1/3 crotchet, an 18/16 dotted quarter = 1 crotchet).
  The 3/4 lines are in plain values.
* Ornaments are given as printed signs on the written note, never written out.
* Streams (LilyPond Voice names, which the game's reader reports as "voice"):
    upper    - the right hand's line (upper staff). Bars 1-8, 17-24: the 18/16
               semiquaver line; bars 9-16, 25-27: the upper voice of the 3/4
               sarabande (bar 25 begins with the E4 that ends the RH run of bar 24);
               bars 28-32: the RH 18/16 semiquaver line again.
    upperTwo - a second right-hand line, only where the upper staff prints two
               voices: the lower sarabande voice (bars 9-16, 25-27) and the single
               eighths printed against the RH semiquavers in bars 28-30.
    lower    - the left hand's line (lower staff). Bars 1-8, 17-24 (beats 1-2):
               the upper voice of the 3/4 sarabande; bar 24 beat 3 to bar 32: the
               18/16 semiquaver line (bars 9-16 too).
    lowerTwo - a second left-hand line: the lower sarabande voice (bars 1-8, 17-24).
  Hands. The print notates the hands by staff: the upper staff is the right hand,
  the lower staff the left hand, and the two kinds of material change staff (hence
  hand) at bars 9, 17, 25 (LH from bar 24 beat 3) and 28 (both hands in
  semiquavers from there). So the 18/16 line is the RH's in bars 1-8 and 17-24 and
  the LH's in bars 9-16 and 24-32 (RH as well in bars 28-32); the 3/4 sarabande is
  the LH's in bars 1-8 and 17-24 and the RH's in bars 9-16 and 25-27. The hands
  cross (the RH's line starts on G3 in the bass clef under the LH's chords on
  G4/B4 in the treble clef, bars 1-2, and again in bar 20; the LH reaches up to
  F5-A5 in bars 17-24), but no line is printed in the other hand's staff, so no
  stream needs a \change Staff: every stream stays on its own staff.
* Slurs are not transcribed; ties are.
* "% ?" marks a reading that is uncertain.
%}

upper = {
  \clef bass
  \key g \major
  \time 3/4
  \repeat volta 2 {
    % bar 1  (RH: 18/16 line, bass clef)
    \oneVoice
    \tuplet 6/4 { g16 a g d e fis } \tuplet 6/4 { g fis g a g a } \tuplet 6/4 { b a b c' b cis' } |
    % bar 2
    \clef treble
    \tuplet 6/4 { d'16 e' d' a b cis' } \tuplet 6/4 { d' cis' d' e' d' e' } \tuplet 6/4 { fis' e' fis' g' e' fis' } |
    % bar 3
    \tuplet 6/4 { g'16 a' g' b e' fis' } \tuplet 6/4 { g' fis' g' a' g' a' } \tuplet 6/4 { b' a' b' cis'' b' cis'' } |
    % bar 4
    \tuplet 6/4 { d''16 e'' d'' a' b' cis'' } \tuplet 6/4 { d'' cis'' d'' e'' d'' e'' } \tuplet 6/4 { fis'' e'' fis'' g'' e'' fis'' } |
    % bar 5
    \tuplet 6/4 { g''16 fis'' g'' d'' c'' d'' } \tuplet 6/4 { b' g' fis' g' b' d'' } \tuplet 6/4 { f'' e'' f'' d'' b' d'' } |
    % bar 6
    \tuplet 6/4 { e''16 d'' e'' c'' b' c'' } \tuplet 6/4 { g' e' d' e' g' c'' } \tuplet 6/4 { e'' d'' e'' c'' a' c'' } |
    % bar 7
    \tuplet 6/4 { d''16 c'' d'' a' g' a' } \tuplet 6/4 { fis' d' cis' d' fis' a' } \tuplet 6/4 { c'' b' c'' a' fis' a' } |
    % bar 8
    \tuplet 6/4 { b'16 a' b' g' fis' g' } \tuplet 6/4 { d' b a b d' g' } \tuplet 6/4 { b' g' fis' g' b' d'' } |
    % bar 9  (RH: upper voice of the 3/4 sarabande)
    \voiceOne
    g''8. fis''32 e''32 d''4 r8 b''8 |
    % bar 10
    a''4 a''4 r8 a''8 |
    % bar 11
    a''4 g''4 r8 g''8 |
    % bar 12
    g''8. e''16 a'4 r8 g''8 |
    % bar 13
    g''8. e''16 fis''4 r8 a''8 |
    % bar 14
    b''8. fis''16 g''4 r8 g''8 |
    % bar 15
    g''4 cis''4 r8 a'8 |
    % bar 16
    a'8. e'16 fis'4 r4 |
  }
  \repeat volta 2 {
    % bar 17  (RH: 18/16 line)
    \oneVoice
    \tuplet 6/4 { a''16 g'' a'' d''' c''' b'' } \tuplet 6/4 { a'' b'' a'' g'' a'' g'' } \tuplet 6/4 { fis'' g'' fis'' e'' fis'' e'' } |
    % bar 18
    \tuplet 6/4 { d''16 c'' d'' g'' fis'' e'' } \tuplet 6/4 { d'' e'' d'' c'' d'' c'' } \tuplet 6/4 { b' c'' b' a' b' a' } |
    % bar 19
    \tuplet 6/4 { g'16 fis' g' b' a' g' } \tuplet 6/4 { fis' g' fis' e' fis' e' } \tuplet 6/4 { dis' e' dis' cis' dis' cis' } |
    % bar 20  (B3 still in the treble clef, then the bass clef; in 1741 the bass
    %          clef stands over the B3, which hangs under a ledger line as a treble
    %          B3, and a stray sharp stands after it at that height: not read as
    %          belonging to any note)
    \tuplet 6/4 { b16 \clef bass ais b e' dis' cis' } \tuplet 6/4 { b c' b a b a } \tuplet 6/4 { g a g fis g fis } |
    % bar 21
    \tuplet 6/4 { e16 dis e b a b } \tuplet 6/4 { g fis g \clef treble b e' fis' } \tuplet 6/4 { g' fis' g' e' dis' e' } |
    % bar 22
    \tuplet 6/4 { c'16 b c' e' d' e' } \tuplet 6/4 { a gis a c' f' a' } \tuplet 6/4 { c'' b' c'' a' f' a' } |
    % bar 23
    \tuplet 6/4 { dis'16 cis' dis' fis' e' fis' } \tuplet 6/4 { b ais b dis' fis' g' } \tuplet 6/4 { a' g' a' fis' dis' fis' } |
    % bar 24
    \tuplet 6/4 { g'16 fis' g' b' a' b' } \tuplet 6/4 { e' dis' e' g' b' dis'' } \tuplet 6/4 { e'' c'' b' a' g' fis' } |
    % bar 25  (the E4 ends the RH run; then the RH has the upper sarabande voice;
    %          1741: E4 eighth, eighth rest, eighth rest, sixteenth rest, G5)
    \voiceOne
    e'8 r8 r8 r16 g''16 fis''8. e''16 |
    % bar 26
    d''4~ d''8. f''16 e''8. d''16 |
    % bar 27
    c''2~ c''8. c''16 |
    % bar 28  (RH: 18/16 line again; the single eighths are in upperTwo)
    \oneVoice
    \tuplet 6/4 { fis'16 g' fis' cis' d' e' } \tuplet 6/4 { fis' e' fis' g' fis' g' } \tuplet 6/4 { a' g' a' b' g' a' } |
    % bar 29
    \tuplet 6/4 { b'16 c'' b' fis' g' a' } \tuplet 6/4 { b' a' b' c'' b' c'' } \tuplet 6/4 { d'' c'' d'' e'' c'' d'' } |
    % bar 30
    \tuplet 6/4 { e''16 f'' e'' b' c'' d'' } \tuplet 6/4 { e'' d'' e'' fis'' e'' fis'' } \tuplet 6/4 { g'' fis'' g'' a'' fis'' g'' } |
    % bar 31
    \tuplet 6/4 { a''16 b'' a'' fis'' g'' a'' } \tuplet 6/4 { b'' a'' b'' d''' c''' b'' } \tuplet 6/4 { a'' g'' fis'' e'' d'' c'' } |
    % bar 32  (fermata over the final bar line)
    \tuplet 6/4 { b'16 a' g' fis' g' d' } \tuplet 6/4 { b8 r8 r8 } \tuplet 6/4 { r4. } |
  }
}

upperTwo = {
  \key g \major
  \time 3/4
  \repeat volta 2 {
    % bar 1
    s2. |
    % bar 2
    s2. |
    % bar 3
    s2. |
    % bar 4
    s2. |
    % bar 5
    s2. |
    % bar 6
    s2. |
    % bar 7
    s2. |
    % bar 8
    s2. |
    % bar 9  (RH: lower voice of the 3/4 sarabande)
    \voiceTwo
    b'4 b'4 r8 g''8 |
    % bar 10
    g''8. e''16 fis''4 r8 c''8 |
    % bar 11
    b'8. dis''16 e''4 r8 e''8 |
    % bar 12
    a'8. cis''16 e'4 r8 cis''8 |
    % bar 13  % ? beat 1: the 1741 print has no sharp on this C5 (BG prints one); read
    %          as C#5, the sharp of the same note just before the bar line (bar 12,
    %          beat 3) carrying over to its immediate repetition, as BG reads it
    cis''4 d''4 r8 d''8 |
    % bar 14  (beat 2: D5 in the 1741 print, the notehead plainly on the D5 line;
    %          BG and Mutopia have E5. Following 1741.)
    d''4 d''4 r8 e''8 |
    % bar 15
    a'8. g'32 fis'32 e'4 r8 a8 |
    % bar 16
    d'4 d'4 r4 |
  }
  \repeat volta 2 {
    % bar 17
    s2. |
    % bar 18
    s2. |
    % bar 19
    s2. |
    % bar 20
    s2. |
    % bar 21
    s2. |
    % bar 22
    s2. |
    % bar 23
    s2. |
    % bar 24
    s2. |
    % bar 25  (RH: lower sarabande voice. The first eighth rest is BG's; 1741 prints
    %          none under the E4, only the sixteenth rest before G#4)
    \voiceTwo
    r8 r16 gis'16 a'8. b'16 c''4~ |
    % bar 26
    c''8. fis'16 g'8. a'16 b'4~ |
    % bar 27
    b'8. e'16 fis'8. g'16 a'8. g'16 |
    % bar 28  (single eighths printed in the 18/16 bar against the RH semiquavers:
    %          C5 stem up on beat 1, F#4 stem down on beat 3; ? an eighth of 18/16
    %          = 1/3 crotchet, as printed)
    \tuplet 6/4 { c''8 s4 } s4 \tuplet 6/4 { fis'8 s4 } |
    % bar 29  (G4 on beat 1, B4 on beat 3, both stems down)
    \tuplet 6/4 { g'8 s4 } s4 \tuplet 6/4 { b'8 s4 } |
    % bar 30  (C5 on beat 1, stem down)
    \tuplet 6/4 { c''8 s4 } s2 |
    % bar 31
    s2. |
    % bar 32
    s2. |
  }
}

lower = {
  \clef treble
  \key g \major
  \time 3/4
  \repeat volta 2 {
    % bar 1  (LH: upper voice of the 3/4 sarabande, treble clef)
    \voiceOne
    b'4 b'4 r8 b'8 |
    % bar 2
    a'4 a'4 r8 d''8 |
    % bar 3  (C#5: a three-hump zigzag without stroke above it in both prints)
    d''4 cis''4\prallprall r8 g'8 |
    % bar 4
    g'8. e'16 fis'4 r8 a'8 |
    % bar 5
    d'8. e'16 f'4 r8 \clef bass g'8 |
    % bar 6
    g'8. e'16 c'4 r8 e'8 |
    % bar 7
    a8. b16 c'4 r8 d'8 |
    % bar 8
    d'8. b16 g4 r4 |
    % bar 9  (LH: 18/16 line)
    \oneVoice
    \tuplet 6/4 { g,16 a, g, d, e, fis, } \tuplet 6/4 { g, fis, g, a, g, a, } \tuplet 6/4 { b, a, b, c b, cis } |
    % bar 10
    \tuplet 6/4 { d16 e d a, b, cis } \tuplet 6/4 { d cis d e d e } \tuplet 6/4 { fis e fis g e fis } |
    % bar 11
    \tuplet 6/4 { g16 a g b, e fis } \tuplet 6/4 { g fis g a g a } \tuplet 6/4 { b a b cis' a b } |
    % bar 12
    \tuplet 6/4 { cis'16 d' cis' e a b } \clef treble \tuplet 6/4 { cis' b cis' d' cis' d' } \tuplet 6/4 { e' d' e' fis' d' e' } |
    % bar 13
    \tuplet 6/4 { fis'16 e' fis' a' g' a' } \tuplet 6/4 { d' cis' d' fis' a' b' } \tuplet 6/4 { c'' b' c'' a' fis' a' } |
    % bar 14
    \tuplet 6/4 { g'16 fis' g' b' a' b' } \tuplet 6/4 { e' dis' e' g' b' cis'' } \tuplet 6/4 { d'' cis'' d'' b' g' b' } |
    % bar 15
    \tuplet 6/4 { cis''16 b' cis'' e'' d'' e'' } \tuplet 6/4 { a' gis' a' cis'' e'' fis'' } \tuplet 6/4 { g'' fis'' g'' e'' cis'' e'' } |
    % bar 16  (D6: BG prints a dotted quarter; the 1741 print a quarter without the
    %          dot, which leaves the 18/16 bar 2/16 short: the dotted value is kept.
    %          % ? the sign: BG a three-hump zigzag with a vertical stroke (long
    %          mordent); in 1741 the same zigzag sits at the end of the downward
    %          stem, and the stroke may be only the stem crossing it)
    \tuplet 6/4 { fis''16 e'' fis'' a'' g'' a'' } \tuplet 6/4 { d'' cis'' d'' fis'' a'' cis''' } \tuplet 6/4 { d'''4.\mordent } |  % second reading: the 1741 print's short mordent (the Bach-Gesellschaft's longer sign not followed)
  }
  \repeat volta 2 {
    % bar 17  (LH: upper voice of the 3/4 sarabande)
    \voiceOne
    fis'8. e'16 fis'4 r8 d'8 |
    % bar 18
    g'8. a'16 b'4 r8 g''8 |
    % bar 19  % ? beat 3, upper note: BG A5; in 1741 the head sits low, in the G5
    %          space, but with a ledger line struck through it (a G5 would need
    %          none): read as A5
    e''8. b''16 a''4 r8 a''8 |
    % bar 20
    a''8. fis''16 dis''4 r8 fis''8 |
    % bar 21
    g''8. fis''16 e''4 r8 g''8 |
    % bar 22
    g''4 f''4 r8 a''8 |
    % bar 23
    a''8. fis''16 dis''4 r8 fis''8 |
    % bar 24  (beat 3: the LH takes the 18/16 line, bass clef)
    fis''8. dis''16 e''4 \oneVoice \clef bass \tuplet 6/4 { r16 e fis g a b } |  % 18/16 sign here
    % bar 25
    \tuplet 6/4 { c'16 b c' f' e' d' } \tuplet 6/4 { c' d' c' b c' b } \tuplet 6/4 { a b a g a fis } |
    % bar 26
    \tuplet 6/4 { b16 a b e' d' c' } \tuplet 6/4 { b c' b a b a } \tuplet 6/4 { g a g fis g e } |
    % bar 27
    \tuplet 6/4 { a16 g a d' c' b } \tuplet 6/4 { a b a g a g } \tuplet 6/4 { fis g fis e fis e } |
    % bar 28
    \tuplet 6/4 { d16 cis d g fis e } \tuplet 6/4 { d e d c d c } \tuplet 6/4 { b, c b, a, b, a, } |
    % bar 29
    \tuplet 6/4 { g,16 fis, g, c b, a, } \tuplet 6/4 { g, a, g, f, g, f, } \tuplet 6/4 { e, f, e, d, e, d, } |
    % bar 30
    \tuplet 6/4 { c,8. g,16 a, b, } \tuplet 6/4 { c16 b, c d c d } \tuplet 6/4 { e d c b, a, g, } |
    % bar 31
    \tuplet 6/4 { fis,16 e, fis, d, e, fis, } \tuplet 6/4 { g, fis, g, a, b, c } \tuplet 6/4 { d cis d e fis d } |
    % bar 32  (fermata under the final bar line)
    \tuplet 6/4 { g8 r8 r8 } \tuplet 6/4 { r16 a g fis g d } \tuplet 6/4 { g,4. } |
  }
}

lowerTwo = {
  \key g \major
  \time 3/4
  \repeat volta 2 {
    % bar 1  (LH: lower voice of the 3/4 sarabande)
    \voiceTwo
    g'4 d'4 r8 g'8 |
    % bar 2
    g'8. e'16 fis'4 r8 a'8 |
    % bar 3
    b'8. g'16 e'4 r8 a8 |
    % bar 4
    d'4 d'4 r8 c'8 |
    % bar 5
    b8. c'16 d'4 r8 g8 |
    % bar 6
    c'4 e4 r8 g8 |
    % bar 7
    fis8. g16 a4 r8 d8 |
    % bar 8
    g4 g,4 r4 |
    % bar 9
    s2. |
    % bar 10
    s2. |
    % bar 11
    s2. |
    % bar 12
    s2. |
    % bar 13
    s2. |
    % bar 14
    s2. |
    % bar 15
    s2. |
    % bar 16
    s2. |
  }
  \repeat volta 2 {
    % bar 17  (LH: lower sarabande voice)
    \voiceTwo
    d'4 c'4 r8 c'8 |
    % bar 18
    b8. d'16 g'4 r8 d''8 |
    % bar 19
    cis''4 dis''4 r8 e''8 |
    % bar 20
    dis''4 fis'4 r8 dis''8 |
    % bar 21
    e''4 b'4 r8 b'8 |
    % bar 22
    a'8. b'16 c''4 r8 c''8 |
    % bar 23
    b'4 a'4 r8 a'8 |
    % bar 24
    a'8. fis'16 g'4 s4 |
    % bar 25
    s2. |
    % bar 26
    s2. |
    % bar 27
    s2. |
    % bar 28
    s2. |
    % bar 29
    s2. |
    % bar 30
    s2. |
    % bar 31
    s2. |
    % bar 32
    s2. |
  }
}

\score {
  \new PianoStaff <<
    \new Staff = "upper" <<
      \new Voice = "upper" { \upper }
      \new Voice = "upperTwo" { \upperTwo }
    >>
    \new Staff = "lower" <<
      \new Voice = "lower" { \lower }
      \new Voice = "lowerTwo" { \lowerTwo }
    >>
  >>
  \layout { }
}
