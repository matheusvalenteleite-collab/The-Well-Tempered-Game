\version "2.24.0"

\header {
  title = "Fantasia and Fugue in C minor, BWV 906: Fantasia"
  composer = "Johann Sebastian Bach"
  opus = "BWV 906/1"
  source = "Bach-Gesellschaft Ausgabe, Band 36 (1890), pp. 145-147"
  typesetter = "Transcribed note by note from the BGA print (Band 36, Nr. XXV, ed. Ernst Naumann) by Claude"
  copyright = "Public Domain"
}

%{
Transcription notes
-------------------
* Pitches are ABSOLUTE (no \relative). c' = middle C (C4).
* The print's accidental convention: an accidental holds to the end of the bar at
  that octave. Every pitch here is spelled as it sounds under that rule; courtesy
  accidentals of the print need no mark here.
* Ornaments are given as printed signs on the written note, never written out:
    \downprall = the BGA "hooked" trill (curl from above + zigzag);
    \prall     = short zigzag; \trill = long zigzag; \mordent = zigzag with stroke;
    \turn      = turn sign.  Editorial accidentals printed under/over a sign
    (in brackets) are recorded in comments.
* Streams (LilyPond Voice names, which the game's reader reports as "voice"):
    upper    - the right hand's line (Voice "upper", staff "upper")
    upperTwo - a second right-hand line, only where the upper staff prints two
               voices at once (bars 1, 2, 8, 17, 18, 34, 35, 37)
    lower    - the left hand's line (Voice "lower", staff "lower")
    lowerTwo - a second left-hand line, only where the lower staff prints two
               voices at once (bars 37, 38, 39)
  Hand crossings are written with \change Staff inside the hand's own stream, so
  the reader's "part" is the hand and its "staff" is where the note is printed.
* Triplet sixteenths: the print marks "3" only on some groups; groups of three
  beamed sixteenths are triplets throughout (the bars only add up that way).
* Slurs are not transcribed; ties are.
* "% ?" marks a reading that is uncertain.
%}

upper = {
  \clef treble
  \key c \minor
  \time 4/4
  \repeat volta 2 {
    % bar 1
    \voiceOne
    \tuplet 3/2 { c'''16 g'' ees'' } \tuplet 3/2 { c'' g' ees' } c'8 <g'' c'''>8
    <g'' c'''>8 b''8 \oneVoice f''8.\downprall e''32 f''32 |
    % bar 2
    \voiceOne
    \tuplet 3/2 { bes''16 g'' e'' } \tuplet 3/2 { c'' g' e' } c'8 <g'' bes''>8
    <g'' bes''>8 <f'' a''>8 \oneVoice c''8.\downprall b'32 c''32 |
    % bar 3
    \tuplet 3/2 { aes''16 f'' d'' } \tuplet 3/2 { b' f' d' } b8 <b' d'' f'' aes''>8
    <b' d'' f'' aes''>8 <c'' ees'' g''>8 r4 |
    % bar 4
    \tuplet 3/2 { r16 c'' d'' } \tuplet 3/2 { ees'' f'' g'' } \tuplet 3/2 { aes'' g'' f'' } \tuplet 3/2 { ees'' d'' c'' }
    \tuplet 3/2 { b' d'' c'' } \tuplet 3/2 { b' a' g' } \tuplet 3/2 { f' aes' g' } \tuplet 3/2 { f' ees' d' } |
    % bar 5
    ees'8\mordent c'8 \tuplet 3/2 { r16 d'' ees'' } \tuplet 3/2 { e'' f'' fis'' }
    \tuplet 3/2 { g'' fis'' a'' } \tuplet 3/2 { ees'' d'' g'' } \tuplet 3/2 { c'' b' d'' } \tuplet 3/2 { aes' g' f'' } |
    % bar 6
    \tuplet 3/2 { e''16 des'' bes' } g'8~ \tuplet 3/2 { g'16 c'' des'' } \tuplet 3/2 { d'' ees'' e'' }
    \tuplet 3/2 { f'' e'' g'' } \tuplet 3/2 { d'' c'' f'' } \tuplet 3/2 { bes' a' c'' } \tuplet 3/2 { ges' f' ees'' } |
    % bar 7
    \tuplet 3/2 { d''16 b' aes' } f'8 \tuplet 3/2 { r16 f'' ees'' } \tuplet 3/2 { d'' c'' b' }
    \tuplet 3/2 { b' c'' g' } ees'8 \tuplet 3/2 { r16 ees'' d'' } \tuplet 3/2 { c'' b' c'' } |
    % bar 8  (upper staff in two voices; the (natural) printed above the trill)
    \voiceOne
    ees'4\trill~ ees'8. d'32 ees'32 ees'8 d'8 r4 \oneVoice |
    % bar 9  (from here to bar 12 the left hand crosses over the right hand to
    %         play the upper-staff chords; the right hand's sixteenths are
    %         printed stems down in the upper staff)
    \tuplet 3/2 { r16 bes' g' } \tuplet 3/2 { des' bes' g' } \tuplet 3/2 { des' bes' g' } \tuplet 3/2 { des' bes' g' }
    \tuplet 3/2 { c' aes' f' } \tuplet 3/2 { c' aes' f' } \tuplet 3/2 { c' aes' f' } \tuplet 3/2 { c' aes' f' } |
    % bar 10
    \tuplet 3/2 { ces'16 aes' f' } \tuplet 3/2 { ces' aes' f' } \tuplet 3/2 { ces' aes' f' } \tuplet 3/2 { ces' aes' f' }
    \tuplet 3/2 { bes g' ees' } \tuplet 3/2 { bes g' ees' } \tuplet 3/2 { bes g' ees' } \tuplet 3/2 { bes g' ees' } |
    % bar 11
    \tuplet 3/2 { c'16 d' ees' } \tuplet 3/2 { f' g' aes' } \tuplet 3/2 { bes aes' g' } \tuplet 3/2 { f' ees' d' }
    \tuplet 3/2 { ees' f' g' } \tuplet 3/2 { aes' bes' c'' } \tuplet 3/2 { d' c'' bes' } \tuplet 3/2 { aes' g' f' } |
    % bar 12
    \tuplet 3/2 { g'16 ees'' d'' } \tuplet 3/2 { c'' bes' aes' } \tuplet 3/2 { g' bes' ees'' } \tuplet 3/2 { f' aes' d'' }
    \tuplet 3/2 { ees'' bes' g' } \tuplet 3/2 { c'' aes' ees' } \tuplet 3/2 { bes' g' ees' } \tuplet 3/2 { aes' f' d' } |
    % bar 13  (beats 2.5-3: the right-hand line dips into the lower staff;
    %          beats 1.5-2: the left hand crosses over for two Eb5s)
    \tuplet 3/2 { g'16 ees' bes } \tuplet 3/2 { aes' ees' c' } \tuplet 3/2 { g' ees' bes }
    \tuplet 3/2 { f' d' \change Staff = "lower" aes }
    % ? beat 3: the lower-staff dyad Eb3+G3 has a stem up (to the RH beam) and a stem
    %   down (to the LH beam); read as RH G3 and LH Eb3
    \tuplet 3/2 { g16 bes \change Staff = "upper" ees' } \tuplet 3/2 { c' ees' aes' }
    ees'8 d'16.\prall ees'32 |
    % bar 14
    ees'8 ees''8~ \tuplet 3/2 { ees''16 bes' a' } \tuplet 3/2 { aes' g' fis' }
    g'8 d''8~ \tuplet 3/2 { d''16 ees'' e'' } \tuplet 3/2 { f'' fis'' g'' } |
    % bar 15
    bes'4\prall~ \tuplet 3/2 { bes'16 a' g' } \tuplet 3/2 { fis' g' e' }
    \tuplet 3/2 { fis' d' fis' } \tuplet 3/2 { a' c'' ees'' } \tuplet 3/2 { a'' ees'' d'' } \tuplet 3/2 { c'' bes' a' } |
    % bar 16
    \tuplet 3/2 { bes'16 d'' g'' } \tuplet 3/2 { ees'' d'' c'' } \tuplet 3/2 { bes' a' g' } \tuplet 3/2 { a' g' fis' }
    \tuplet 3/2 { g'16 d' b } g8 r4 |  % second reading: a triplet and a quaver (one beam to G3)
  }
  \repeat volta 2 {
    % bar 17
    \voiceOne
    \tuplet 3/2 { g''16 d'' bes' } \tuplet 3/2 { g' d' bes } g8 <g'' bes''>8
    <g'' bes''>8 <fis'' a''>8 \oneVoice d''8.\downprall cis''32 d''32 |
    % bar 18
    \voiceOne
    \tuplet 3/2 { c'''16 a'' fis'' } \tuplet 3/2 { d'' a' fis' } d'8 <fis'' a'' c'''>8
    <fis'' a'' c'''>8 <g'' bes''>8 \oneVoice d''8.\downprall cis''32 d''32 |
    % bar 19
    \tuplet 3/2 { f''16 d'' b' } \tuplet 3/2 { aes' f' d' } b8 f''8~
    \tuplet 3/2 { f''16 g'' ees'' } \tuplet 3/2 { c'' g' ees' } c'8 ees''8~ |
    % bar 20
    \tuplet 3/2 { ees''16 c'' a' } \tuplet 3/2 { ges' ees' c' } a8 ees''8~
    \tuplet 3/2 { ees''16 f'' d'' } \tuplet 3/2 { bes' f' d' } bes8 d''8~ |
    % bar 21
    \tuplet 3/2 { d''16 g' aes' } \tuplet 3/2 { a' bes' b' } c''32 b' c''8.~
    \tuplet 3/2 { c''16 d'' c'' } \tuplet 3/2 { b' bes' a' } bes'8 g''8~ |
    % bar 22
    \tuplet 3/2 { g''16 c'' des'' } \tuplet 3/2 { d'' ees'' e'' } f''32 e'' f''8.~
    \tuplet 3/2 { f''16 g'' f'' } \tuplet 3/2 { e'' ees'' d'' } ees''8 c'''8~ |
    % bar 23
    \tuplet 3/2 { c'''16 f'' ges'' } \tuplet 3/2 { g'' aes'' a'' } bes''32 a'' bes''8.~
    \tuplet 3/2 { bes''16 c''' bes'' } \tuplet 3/2 { a'' aes'' g'' } aes''4~ |
    % bar 24
    \tuplet 3/2 { aes''16 f'' e'' } \tuplet 3/2 { f'' g'' aes'' } \tuplet 3/2 { bes'' ges'' f'' } \tuplet 3/2 { ges'' aes'' bes'' }
    \tuplet 3/2 { e'' bes'' g'' } \tuplet 3/2 { e'' c'' b' } c''8 r8 |
    % bar 25  (bars 25-27: the right hand's sixteenths are printed in the lower
    %          staff, stems up; the left hand crosses over for the upper-staff chords)
    \change Staff = "lower"
    \tuplet 3/2 { ges16 ees' c' } \tuplet 3/2 { ges ees' c' } \tuplet 3/2 { ges ees' c' } \tuplet 3/2 { ges ees' c' }
    \tuplet 3/2 { f des' bes } \tuplet 3/2 { f des' bes } \tuplet 3/2 { f des' bes } \tuplet 3/2 { f des' bes } |
    % bar 26
    \tuplet 3/2 { fes16 des' bes } \tuplet 3/2 { fes des' bes } \tuplet 3/2 { fes des' bes } \tuplet 3/2 { fes des' bes }
    \tuplet 3/2 { ees c' aes } \tuplet 3/2 { ees c' aes } \tuplet 3/2 { ees c' aes } \tuplet 3/2 { ees c' aes } |
    % bar 27  (beat 1: the lower-staff dyad Db3+F3 is LH Db3 (stem down) + RH F3 (stem up))
    \tuplet 3/2 { f16 g aes } \tuplet 3/2 { bes c' des' } \tuplet 3/2 { ees des' c' } \tuplet 3/2 { bes aes g }
    % beat 3: the lower-staff dyad F3+Ab3 is LH F3 (stem down) + RH Ab3 (stem up)
    \tuplet 3/2 { aes bes c' }
    \change Staff = "upper"   % the right hand's line returns to the upper staff
    \tuplet 3/2 { des' ees' f' } \tuplet 3/2 { g f' ees' } \tuplet 3/2 { des' c' bes } |
    % bar 28  (beat 3.5: the print gives C5 to the stems-down voice, beamed with the
    %          preceding sixteenths, and a sixteenth rest to the stems-up voice that
    %          then plays G4 Ab4; read as one triplet C5 G4 Ab4. A dashed line leads
    %          from this C5 to the left hand's C4 on beat 4)
    \tuplet 3/2 { c'16 aes' g' } \tuplet 3/2 { f' ees' des' } \tuplet 3/2 { c' ees' aes' } \tuplet 3/2 { bes des' g' }
    \tuplet 3/2 { c' ees' aes' } \tuplet 3/2 { c'' g' aes' } \tuplet 3/2 { ees'' g' aes' } \tuplet 3/2 { ees'' g' aes' } |
    % bar 29
    f''8 \tuplet 3/2 { r16 g' aes' } \tuplet 3/2 { f'' g' aes' } \tuplet 3/2 { f'' g' aes' }
    f''8 \tuplet 3/2 { r16 g' aes' } \tuplet 3/2 { f'' g' aes' } \tuplet 3/2 { f'' g' aes' } |
    % bar 30
    f''8 \tuplet 3/2 { r16 g' aes' } \tuplet 3/2 { f'' g' aes' } \tuplet 3/2 { f'' g' aes' }
    f''8 \tuplet 3/2 { r16 g' aes' } \tuplet 3/2 { f'' g' aes' } \tuplet 3/2 { f'' g' aes' } |
    % bar 31
    ees''8 \tuplet 3/2 { bes'16 aes' g' } \tuplet 3/2 { f'16 aes' c'' } f''8
    d''8 \tuplet 3/2 { aes'16 g' f' } \tuplet 3/2 { ees'16 g' bes' } ees''8 |  % second reading: beats 2 and 4 a triplet and a quaver
    % bar 32
    \tuplet 3/2 { c''16 r f' } \tuplet 3/2 { bes' r e' } \tuplet 3/2 { aes' r d' } \tuplet 3/2 { g' r c' }
    \tuplet 3/2 { fis' r c'' } \tuplet 3/2 { fis' r c' } \tuplet 3/2 { fis' r c'' } \tuplet 3/2 { fis' r d' } |
    % bar 33
    \tuplet 3/2 { ees'16 g' aes' } \tuplet 3/2 { a' bes' b' } \tuplet 3/2 { c'' d'' ees'' } \tuplet 3/2 { e'' f'' fis'' }
    \tuplet 3/2 { g'' d'' b' } \tuplet 3/2 { g' d' b } g8 r8 |
    % bar 34  (= bar 1; the left hand's mordent printed in brackets, with (♯))
    \voiceOne
    \tuplet 3/2 { c'''16 g'' ees'' } \tuplet 3/2 { c'' g' ees' } c'8 <g'' c'''>8
    <g'' c'''>8 b''8 \oneVoice f''8.\downprall e''32 f''32 |
    % bar 35  (= bar 2)
    \voiceOne
    \tuplet 3/2 { bes''16 g'' e'' } \tuplet 3/2 { c'' g' e' } c'8 <g'' bes''>8
    <g'' bes''>8 <f'' a''>8 \oneVoice c''8.\downprall b'32 c''32 |
    % bar 36
    \tuplet 3/2 { aes''16 f'' d'' } \tuplet 3/2 { b' f' d' } \tuplet 3/2 { b d' f' } \tuplet 3/2 { aes' b' d'' }
    \tuplet 3/2 { f'' d'' b' } \tuplet 3/2 { g' d' b } g8 g''8 |
    % bar 37  (beat 1: mordent over C5 and a turn sign after it, each with a
    %          bracketed natural below, i.e. B natural; the turn is attached to C5)
    \voiceOne
    c''8.\mordent\turn d''16 d''8.\downprall c''16 \oneVoice
    \tuplet 3/2 { c''16 b' d'' } \tuplet 3/2 { aes' g' b' } \tuplet 3/2 { f' e' g' } \tuplet 3/2 { des' c' bes' } |  % second reading: B♭4 (printed flat, on the B4 line)
    % bar 38
    \tuplet 3/2 { bes'16 a' c'' } \tuplet 3/2 { ges' f' a' } \tuplet 3/2 { ees' d' f' } \tuplet 3/2 { ces' bes aes' }
    \tuplet 3/2 { aes' g' bes' } \tuplet 3/2 { fes' ees' g' } \tuplet 3/2 { des' c' ees' } \tuplet 3/2 { bes a fis' } |
    % bar 39
    fis'8 g'8~ \tuplet 3/2 { g'16 a' b' } \tuplet 3/2 { c'' d'' ees'' }
    \tuplet 3/2 { f' ees'' d'' } \tuplet 3/2 { f'' ees'' d'' } \tuplet 3/2 { ees'' d'' c'' } \tuplet 3/2 { d'' c'' b' } |
    % bar 40
    \tuplet 3/2 { c''16 d'' ees'' } \tuplet 3/2 { f' ees'' d'' } \tuplet 3/2 { ees' d'' c'' } \tuplet 3/2 { d' c'' b' }
    \tuplet 3/2 { c''16 g' ees' } c'8 r4 |  % second reading: a triplet and a quaver (one beam to C4)
  }
}

upperTwo = {
  \voiceTwo
  \repeat volta 2 {
    % bar 1
    s4 s8 ees''8 ees''8 d''8 s4 |
    % bar 2
    s4 s8 c''8 c''4 s4 |
    % bar 3
    s1 |
    % bar 4
    s1 |
    % bar 5
    s1 |
    % bar 6
    s1 |
    % bar 7
    s1 |
    % bar 8  (repeated C4s under the held Eb4)
    r16 c'16 c' c' c' c' c' c' c'8 b8 r4 |
    % bar 9
    s1 |
    % bar 10
    s1 |
    % bar 11
    s1 |
    % bar 12
    s1 |
    % bar 13
    s1 |
    % bar 14
    s1 |
    % bar 15
    s1 |
    % bar 16
    s1 |
  }
  \repeat volta 2 {
    % bar 17
    s4 s8 d''8 d''4 s4 |
    % bar 18
    s4 s8 d''8 d''4 s4 |
    % bar 19
    s1 |
    % bar 20
    s1 |
    % bar 21
    s1 |
    % bar 22
    s1 |
    % bar 23
    s1 |
    % bar 24
    s1 |
    % bar 25
    s1 |
    % bar 26
    s1 |
    % bar 27
    s1 |
    % bar 28
    s1 |
    % bar 29
    s1 |
    % bar 30
    s1 |
    % bar 31
    s1 |
    % bar 32
    s1 |
    % bar 33
    s1 |
    % bar 34
    s4 s8 ees''8 ees''8 d''8 s4 |
    % bar 35
    s4 s8 c''8 c''4 s4 |
    % bar 36
    s1 |
    % bar 37
    s4 b'4 s2 |
    % bar 38
    s1 |
    % bar 39
    s1 |
    % bar 40
    s1 |
  }
}

lower = {
  \clef bass
  \key c \minor
  \time 4/4
  \repeat volta 2 {
    % bar 1  (mordent printed with a bracketed sharp: lower note F#)
    c,8 c8 \tuplet 3/2 { r16 g f } \tuplet 3/2 { ees d c } g8\mordent g,8 r4 |
    % bar 2  (mordent with bracketed natural: lower note E natural)
    e,8 e8 \tuplet 3/2 { r16 g f } \tuplet 3/2 { e d c } f8\mordent f,8 r4 |
    % bar 3
    d,8 d8 \tuplet 3/2 { r16 f ees } \tuplet 3/2 { d c b, }
    \tuplet 3/2 { ees g, a, } \tuplet 3/2 { b, c d } \tuplet 3/2 { ees c d } \tuplet 3/2 { ees f g } |
    % bar 4  (mordent with bracketed sharp)
    aes8 g8 f8 fis8 g8\mordent g,8 r4 |
    % bar 5
    \tuplet 3/2 { c,16 ees, g, } \tuplet 3/2 { c ees g } c'8 c8 c8\prall b,8 r4 |
    % bar 6
    \tuplet 3/2 { c,16 e, g, } \tuplet 3/2 { c e g } bes8 bes,8 bes,8\prall a,8 r4 |
    % bar 7
    \tuplet 3/2 { aes,16 b, d } \tuplet 3/2 { f aes b } d'8 aes,8
    \tuplet 3/2 { g,16 c ees } \tuplet 3/2 { g b c' } ees'8 g,8 |
    % bar 8
    fis,16 fis fis fis fis fis fis fis g8~ \tuplet 3/2 { g16 g fis }
    \tuplet 3/2 { g d b, } \tuplet 3/2 { g, d f } |
    % bar 9  (hand crossing: the left hand alternates bass notes and upper-staff chords)
    e8 \change Staff = "upper" \voiceOne <e'' g'' bes''>8 <e'' g'' bes''>8 \change Staff = "lower" \oneVoice e8
    f8 \change Staff = "upper" \voiceOne <f'' aes''>8 <f'' aes''>8 \change Staff = "lower" \oneVoice ees8 |
    % bar 10
    d8 \change Staff = "upper" \voiceOne <d'' f'' aes''>8 <d'' f'' aes''>8 \change Staff = "lower" \oneVoice d8
    ees8 \change Staff = "upper" \voiceOne <ees'' g''>8 <ees'' g''>8 \change Staff = "lower" \oneVoice ees8 |
    % bar 11
    aes,8 \change Staff = "upper" \voiceOne c''8 d''8 \change Staff = "lower" \oneVoice bes,8
    c8 \change Staff = "upper" \voiceOne ees''8 f''8 \change Staff = "lower" \oneVoice d8 |
    % bar 12  (crossing on beats 3.5-4 only)
    ees8 aes8 bes8 bes,8
    ees8 \change Staff = "upper" \voiceOne ees''8 ees''8 \change Staff = "lower" \oneVoice ees8 |
    % bar 13  (crossing on beats 1.5-2)
    ees8 \change Staff = "upper" \voiceOne ees''8 ees''8 \change Staff = "lower" \oneVoice ees8
    ees8 aes8 bes8 bes,8 |
    % bar 14
    \tuplet 3/2 { ees16 f g } \tuplet 3/2 { a bes b } c'8 ees8
    \tuplet 3/2 { d16 e fis } \tuplet 3/2 { g aes a } bes8 d8 |
    % bar 15
    \tuplet 3/2 { cis16 d e } \tuplet 3/2 { fis g gis } a8 cis8
    \tuplet 3/2 { c16 c' a } \tuplet 3/2 { fis d a, } fis,8 d,8 |
    % bar 16
    g,8 c8 d8 d,8 g,8~ \tuplet 3/2 { g,16 b, d } g8 r8 |
  }
  \repeat volta 2 {
    % bar 17
    g,8 g8 \tuplet 3/2 { r16 d c } \tuplet 3/2 { bes, a, g, } d8 d,8 r4 |
    % bar 18
    fis,8 fis8 \tuplet 3/2 { r16 a g } \tuplet 3/2 { fis e d } g8 g,8 r4 |
    % bar 19
    b8 r8 \tuplet 3/2 { g,16 b, d } \tuplet 3/2 { g b d' }
    c'8 c8~ \tuplet 3/2 { c16 ees g } \tuplet 3/2 { c' ees' g' } |
    % bar 20
    a8 r8 \tuplet 3/2 { f,16 a, c } \tuplet 3/2 { f a c' }
    bes8 bes,8~ \tuplet 3/2 { bes,16 d f } \tuplet 3/2 { bes d' f' } |
    % bar 21
    ees'8 ees8~ \tuplet 3/2 { ees16 d ees } \tuplet 3/2 { e f fis }
    g32 fis g8.~ \tuplet 3/2 { g16 aes g } \tuplet 3/2 { fis f e } |
    % bar 22
    aes8 aes,8~ \tuplet 3/2 { aes,16 g, aes, } \tuplet 3/2 { a, bes, b, }
    c32 b, c8.~ \tuplet 3/2 { c16 des c } \tuplet 3/2 { b, bes, a, } |
    % bar 23
    des8 des'8~ \tuplet 3/2 { des'16 c' des' } \tuplet 3/2 { d' ees' e' }
    f'32 e' f'8.~ \tuplet 3/2 { f'16 f e } \tuplet 3/2 { f g aes } |
    % bar 24
    \tuplet 3/2 { bes16 aes g } \tuplet 3/2 { aes bes c' } des'8 bes8
    c'8 c8~ \tuplet 3/2 { c16 e g } \tuplet 3/2 { bes a g } |
    % bar 25  (hand crossing: chords in the upper staff, bass notes in the lower staff)
    \change Staff = "upper" \voiceOne <a' c'' ees''>8 \change Staff = "lower" \voiceTwo a,8 a,8
    \change Staff = "upper" \voiceOne <a' c'' ees''>8 <bes' des''>8 \change Staff = "lower" \voiceTwo bes,8 bes,8
    \change Staff = "upper" \voiceOne <aes' bes' des''>8 \change Staff = "lower" \voiceTwo |
    % bar 26
    \change Staff = "upper" \voiceOne <g' bes' des''>8 \change Staff = "lower" \voiceTwo g,8 g,8
    \change Staff = "upper" \voiceOne <g' bes' des''>8 <aes' c''>8 \change Staff = "lower" \voiceTwo aes,8 aes,8
    c8 |
    % bar 27
    des8 \change Staff = "upper" \voiceOne f'8 g'8 \change Staff = "lower" \voiceTwo ees8
    f8 \change Staff = "upper" \voiceOne aes'8 bes'8 \change Staff = "lower" \voiceTwo g8 |
    % bar 28  (crossing on beats 1.5-2; beat 3.5: nothing printed in the lower staff)
    aes8 \change Staff = "upper" \voiceOne \tuplet 3/2 { des''16 c'' bes' } ees''8 \change Staff = "lower" \voiceTwo
    ees8 aes,8 \oneVoice s8 \clef treble c'8 c''8 |
    % bar 29  (lower staff in the treble clef, bars 28-32)
    \tuplet 3/2 { des'16 f' aes' } c''8 des'8 c''8 \tuplet 3/2 { d'16 f' aes' } b'8 d'8 b'8 |
    % bar 30
    \tuplet 3/2 { c'16 f' aes' } c''8 c'8 c''8 \tuplet 3/2 { b16 f' aes' } d''8 b8 d''8 |
    % bar 31
    \tuplet 3/2 { c'16 ees' g' } c''8 aes''8 \tuplet 3/2 { ees'16 d' c' }
    \tuplet 3/2 { bes16 d' f' } bes'8 g''8 \tuplet 3/2 { des'16 c' bes } |  % second reading: beat 3 a triplet and a quaver
    % bar 32
    \tuplet 3/2 { aes16 aes' r } \tuplet 3/2 { aes g' r } \tuplet 3/2 { aes f' r } \tuplet 3/2 { aes ees' r }
    \tuplet 3/2 { a ees' r } \tuplet 3/2 { a ees' r } \tuplet 3/2 { a d' r } \tuplet 3/2 { a c' r } \clef bass |
    % bar 33
    \tuplet 3/2 { g16 c' b } \tuplet 3/2 { c' des' d' } \tuplet 3/2 { ees' c' b } \tuplet 3/2 { bes a aes }
    g8 r8 \tuplet 3/2 { r16 aes, g, } \tuplet 3/2 { f, ees, d, } |
    % bar 34  (= bar 1; the mordent is printed in brackets, with bracketed sharp)
    c,8 c8 \tuplet 3/2 { r16 g f } \tuplet 3/2 { ees d c } g8\mordent g,8 r4 |
    % bar 35  (= bar 2; the mordent is printed in brackets, with bracketed natural)
    e,8 e8 \tuplet 3/2 { r16 g f } \tuplet 3/2 { e d c } f8\mordent f,8 r4 |
    % bar 36
    d,8 d8 r8 c8 b,8 d8 \tuplet 3/2 { f16 g, a, } \tuplet 3/2 { b, c d } |
    % bar 37  (from beat 2 the lower staff has two voices; this is the stems-down one.
    %          Beat 2.5: one G3 notehead serves both voices, written once, here)
    % ? beats 2.5-3: a curve runs from that shared G3 to the beat-3 dyad G3/Ab3; read as a
    %   tie G3~G3 (stems-down voice); it could instead be a slur G3-Ab3 in the stems-up voice
    \voiceTwo
    \tuplet 3/2 { ees16 c bes, } \tuplet 3/2 { aes, g, f, } g,8 g8~ g8 f8 g8 e8 |
    % bar 38  (beats 1 and 3: F3 and Eb3 are single noteheads shared by both voices)
    f8 ees8 f8 d8 ees8 des8 ees8 c8~ |
    % bar 39
    \tuplet 3/2 { c16 b, a, } \tuplet 3/2 { b, c d } \tuplet 3/2 { ees c d } \tuplet 3/2 { ees f g }
    \oneVoice
    \tuplet 3/2 { aes c' bes } \tuplet 3/2 { aes g f } \tuplet 3/2 { g f ees } \tuplet 3/2 { f ees d } |
    % bar 40
    \tuplet 3/2 { ees16 d c } \tuplet 3/2 { aes g f } g8 g,8 c,8~ \tuplet 3/2 { c,16 ees, g, } c8 r8 |
  }
}

lowerTwo = {
  \voiceOne
  \repeat volta 2 {
    % bar 1
    s1 |
    % bar 2
    s1 |
    % bar 3
    s1 |
    % bar 4
    s1 |
    % bar 5
    s1 |
    % bar 6
    s1 |
    % bar 7
    s1 |
    % bar 8
    s1 |
    % bar 9
    s1 |
    % bar 10
    s1 |
    % bar 11
    s1 |
    % bar 12
    s1 |
    % bar 13
    s1 |
    % bar 14
    s1 |
    % bar 15
    s1 |
    % bar 16
    s1 |
  }
  \repeat volta 2 {
    % bar 17
    s1 |
    % bar 18
    s1 |
    % bar 19
    s1 |
    % bar 20
    s1 |
    % bar 21
    s1 |
    % bar 22
    s1 |
    % bar 23
    s1 |
    % bar 24
    s1 |
    % bar 25
    s1 |
    % bar 26
    s1 |
    % bar 27
    s1 |
    % bar 28
    s1 |
    % bar 29
    s1 |
    % bar 30
    s1 |
    % bar 31
    s1 |
    % bar 32
    s1 |
    % bar 33
    s1 |
    % bar 34
    s1 |
    % bar 35
    s1 |
    % bar 36
    s1 |
    % bar 37  (stems-up voice of the lower staff; G3 on beat 2.5 is in "lower")
    s4 r8 s8 aes8 d'8 bes8 g8 |
    % bar 38  (beats 1 and 3 shared with "lower")
    s8 c'8 aes8 f8 s8 bes8 g8 ees8 |
    % bar 39  (D natural 3, stem up, no flag: a quarter under the triplets)
    d4 s2. |
    % bar 40
    s1 |
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
