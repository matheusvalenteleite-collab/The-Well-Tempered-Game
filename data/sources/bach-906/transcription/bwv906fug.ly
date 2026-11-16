\version "2.18.2"

\header {
    title = "Fantasia and Fugue in C minor, BWV 906"
    subtitle = "Fugue (unfinished)"
    composer = "Johann Sebastian Bach"
    opus = "BWV 906/2"
    source = "Bach-Gesellschaft Ausgabe, Band 36 (1890), pp. 238-239"
    enteredby = "Transcribed note by note from the BGA print (Band 36, Anhang II Nr. 9) by Claude (Anthropic), 2026"
    copyright = "Public Domain"
}

%{
Source: Bach-Gesellschaft Ausgabe, Band 36 (Clavierwerke IV, ed. Ernst Naumann, 1890),
Anhang II, Nr. 9 "Unvollendete Fuge in C-moll. Zu der Fantasie XXV. Seite 145.",
printed pp. 238-239 (PDF pp. 340-341 of archive.org "BGA Band 36.pdf").
The Fantasia is Nr. XXV "Fantasie, C moll", p. 145.

The print breaks off after the first beat of bar 48 (one chord: c'' / ees' / aes,);
the staves of that system run on empty, with no closing barline. Bar 48 is
therefore transcribed as a fragment of one quarter note per voice. The BGA adds
no editorial completion.

Pitches are absolute (no \relative) and spelled as they sound: the print's
accidentals hold for the rest of the bar at that octave and have been applied.
Voices (one stream each):
  soprano = upper:1  (\voiceOne, upper staff throughout)
  alto    = upper:2  (\voiceTwo; moves to the lower staff in bars 23-25 and 30-33,
                      via \change Staff; silent, with no rests printed, bars 34-45)
  bass    = lower:1  (\voiceTwo, lower staff throughout)
The BGA preface (p. XCVIII) gives variants of Kellner's copy and Peters (bars 7, 8, 13, 14, 15:
c'' for ces'', d'' for des'', f'' for fes'', d'' for des'', g'' for ges'') and notes that in the
autograph the left hand of bars 34-35 was erased and rewritten; this file follows the print's text.
Slurs of the print are not encoded; ties are. No ornaments are printed.
"% ?" marks a reading that is uncertain.
%}

soprano = {
    \clef treble
    \key c \minor
    \time 4/4
    % bar 1
    r8 g'8 f' g' aes' a' g' a' |
    % bar 2
    bes'8 b' a' b' c'' g' d'' f' |
    % bar 3
    ees'4 aes'4~ aes'8 g' bes'4~ |
    % bar 4  (beat 4: the soprano's fis' lies below the alto's a'; voices cross)
    bes'8 a' c''4 bes' fis' |
    % bar 5
    g'4 bes' ees' c'' |
    % bar 6
    f'4 d''4~ d''8 c''4 b'8 |
    % bar 7
    c''4 des'' ces'' bes' |
    % bar 8  (beat 1: one notehead aes' with stems up and down, shared with the alto)
    aes'4 ees'' des'' c'' |
    % bar 9  (beat 1: bes' notehead shared with the alto)
    bes'8 d'' c'' d'' ees'' e'' d'' e'' |
    % bar 10
    f''8 fis'' e'' fis'' g'' d'' a'' c'' |
    % bar 11  (beat 1: bes' notehead shared with the alto)
    bes'8 g'' f'' g'' a'' ees'' b'' d'' |
    % bar 12
    c''4 e'' f'' g'' |
    % bar 13
    aes''4 ges'' fes'' ees'' |
    % bar 14  (beat 1: d'' notehead shared with the alto)
    d''4 fis'' g'' a'' |
    % bar 15
    d''4 aes'' ges'' f'' |
    % bar 16
    ees''8 c'' bes' c'' d'' aes' e'' g' |
    % bar 17
    f'4 des''4~ des''8 c'' ees''4~ |
    % bar 18
    ees''8 d'' f''4~ f''8 ees''16 d'' c''8 b' |
    % bar 19
    c''4 f' bes' g' |
    % bar 20
    c''4 a' d''2 |
    % bar 21
    r8 g' f' g' aes' a' g' a' |
    % bar 22
    bes'8 b' a' b' c'' g' d'' f' |
    % bar 23
    ees'8 g' f' g' aes' ees' bes' des' |
    % bar 24
    c'8 ees' d' e' f' c' g' bes |
    % bar 25
    aes16 c' d' e' f' g' aes' bes' c''2 |
    % bar 26
    d''16 d' ees' f' g' a' b' c'' d''2~ |
    % bar 27
    d''16 g' a' b' c'' d'' ees'' f'' g''2~ |
    % bar 28
    g''4 f''2 ees''4~ |
    % bar 29
    ees''4 d''8 c'' d'' b' g' c'' |
    % bar 30  % ? voice assignment: the upper-staff line of bars 30-33 is taken as the soprano
    r4 ees'4 r8 ees' d' b |
    % bar 31
    r8 b b c' r16 c' b c' d' b c'8 |
    % bar 32
    r16 c' ees' a' c''4~ c''8 bes'16 aes' g' f' ees' d'~ |
    % bar 33
    d'16 f' ees' d' ees' d' c' b c'4 r4 |
    % bar 34  (bars 34-45: two-voice texture; the upper line is taken as the soprano)
    r8 g' c'' ees''~ ees''16 d'' c'' ees'' d'' c'' b' a' |
    % bar 35
    g'8 c'' ees'' g''~ g''16 f'' ees'' g'' f'' ees'' d'' c'' |
    % bar 36
    b'16 d'' c'' d'' ees'' g' f' g' aes' e'' d'' e'' f'' a' g' a' |
    % bar 37
    bes'16 fis'' e'' fis'' g'' b' a' b' c'' ees'' d'' c'' b' a' g' f' |
    % bar 38
    ees'16 g' f' g' aes' g' f' ees' d' f' ees' f' g' f' ees' d' |
    % bar 39
    c'16 ees' d' ees' fis' ees' d' ees' a' ees' d' ees' a' ees' d' c' |
    % bar 40
    bes16 d' g' bes' d'' c'' bes'8 c'4 c''16 bes' a'8 |
    % bar 41  (the upper staff takes the bass clef at the end of this bar)
    bes4 bes'16 a' g'8 a4 a'16 g' fis'8 |
    % bar 42  (hand-crossing figure: d in the bass clef on the upper staff, then treble clef)
    \clef bass d8 \clef treble d'' g' bes' c'' ees'' a' c'' |
    % bar 43
    d''8 f'' bes' d'' ees'' c'' a' fis'' |
    % bar 44  (hand-crossing figure: the low bes / a are on the upper staff, ledger lines)
    g''8 bes bes g'' fis'' a a f'' |
    % bar 45
    f''8 b b d'' g' ees''~ ees''16 d'' c'' b' |
    % bar 46
    c''2~ c''8 c'' bes' c'' |
    % bar 47  (beat 4: the soprano's b' lies below the alto's d''; voices cross)
    des''8 d'' c'' d'' ees''4 b'4 |
    % bar 48  (fragment: the print breaks off here)
    c''4
}

alto = {
    \key c \minor
    \time 4/4
    % bar 1
    r1 |
    % bar 2
    r1 |
    % bar 3
    r8 d' c' d' ees' e' d' e' |
    % bar 4
    f'8 fis' e' fis' g' d' a' c' |
    % bar 5
    bes4 des'4~ des'8 c' ees'4~ |
    % bar 6
    ees'8 d' f'4 ees' f'8 aes' |
    % bar 7
    g'4 e' f' g' |
    % bar 8
    aes'4 fis' g' a' |
    % bar 9
    bes'4 aes'4~ aes'8 g' bes'4~ |
    % bar 10
    bes'8 a' c''4 bes' a' |
    % bar 11
    bes'4 aes' ges' f' |
    % bar 12
    ees'8 c'' bes' c'' d'' aes' e'' g' |
    % bar 13
    f'4 a' bes' c'' |
    % bar 14
    d''4 ees'' des'' c'' |
    % bar 15
    bes'8 g' f' g' a' ees' b' d' |
    % bar 16
    c'4 e' f' g' |
    % bar 17
    c'4 r4 r2 |
    % bar 18
    r1 |
    % bar 19
    r8 d' c' d' ees' e' d' e' |
    % bar 20
    f'8 fis' e' fis' g' d' a' c' |
    % bar 21
    bes8 b a b c'2 |
    % bar 22  (a dashed line leads from this d' down to the lower staff)
    r8 d' c' d' ees'4 d'4 |
    % bar 23  -- alto moves to the LOWER staff (stems up) --
    \change Staff = "lower" \voiceOne
    c'8 ees d ees f4 g4~ |
    % bar 24
    g8 c b, c d4 e4 |
    % bar 25  -- f and the quarter rest on the lower staff; from beat 3 back on the UPPER staff --
    % ? voice assignment: the beat 3-4 sixteenths (r16 bes' ... c') are taken as the alto, the c''2 as the soprano
    f4 r4 \change Staff = "upper" \voiceTwo r16 bes' aes' g' f' ees' d' c' |
    % bar 26
    b16 r16 r8 r4 r16 c'' b' a' g' f' ees' d' |
    % bar 27
    ees'4 r4 r16 f'' ees'' d'' c'' bes' aes' g' |
    % bar 28
    aes'2 g'2 |
    % bar 29
    f'2. ees'4 |
    % bar 30  -- alto on the LOWER staff (stems up) --  % ? voice assignment (see soprano, bar 30)
    \change Staff = "lower" \voiceOne
    r4 c'4 r8 g f d |
    % bar 31
    r8 d d ees r16 ees d ees f d ees8 |
    % bar 32
    r4 r8 d'8 ees'4 b4 |
    % bar 33
    c'16 aes g f g f ees d ees4 r4 |
    % bar 34  -- back to the UPPER staff; bars 34-45: alto silent, no rests printed (spacers) --
    \change Staff = "upper" \voiceTwo
    s1 |
    % bar 35
    s1 |
    % bar 36
    s1 |
    % bar 37
    s1 |
    % bar 38
    s1 |
    % bar 39
    s1 |
    % bar 40
    s1 |
    % bar 41
    s1 |
    % bar 42
    s1 |
    % bar 43
    s1 |
    % bar 44
    s1 |
    % bar 45
    s1 |
    % bar 46  (subject, alto)
    r8 g' f' g' aes' a' g' a' |
    % bar 47
    bes'8 b' a' b' c'' g' d'' f' |
    % bar 48  (fragment)
    ees'4
}

bass = {
    \clef bass
    \key c \minor
    \time 4/4
    % bar 1
    r1 |
    % bar 2
    r1 |
    % bar 3
    r1 |
    % bar 4
    r1 |
    % bar 5
    r8 g f g aes a g a |
    % bar 6
    bes8 b a b c' g d' f |
    % bar 7
    ees8 c' bes c' d' aes e' g |
    % bar 8
    f8 d' c' d' e' bes fis' a |
    % bar 9  (treble clef on the lower staff at the end of this bar)
    g4 b c' cis' \clef treble |
    % bar 10
    d'4 d' e' fis' |
    % bar 11
    g'4 b c' d' |
    % bar 12
    ees'4 des' ces' bes |
    % bar 13
    aes8 f' ees' f' g' des' a' c' |
    % bar 14
    bes8 d' c' d' e' bes fis' a |
    % bar 15  (bass clef again at the end of this bar)
    g4 r4 r2 \clef bass |
    % bar 16
    r4 des' ces' bes |
    % bar 17
    aes8 g f g aes a g a |
    % bar 18
    bes8 b a b c' g d' f |
    % bar 19
    ees4 aes4~ aes8 g bes4~ |
    % bar 20
    bes8 a c'4~ c'8 bes16 a g8 fis |
    % bar 21
    g2~ g8 f ees f |
    % bar 22
    d2~ d8 c4 b,8 |
    % bar 23
    c2. bes,4 |
    % bar 24
    aes,2. g,4 |
    % bar 25
    f,4 r4 r4 aes4~ |
    % bar 26
    aes16 bes aes g f ees d c b,4 b4 |
    % bar 27
    c'4 r16 b c' d' ees' d' c' d' ees' c' d' ees' |
    % bar 28
    f'16 g' f' ees' d' c' b a b g a b c' bes aes g |
    % bar 29
    aes16 bes aes g f ees d c b, g, a, b, c bes, aes, g, |
    % bar 30
    fis,4 r4 g,4 r4 |
    % bar 31
    aes,4 r4 g,4 r4 |
    % bar 32
    fis,4 r8 fis8 g2 |
    % bar 33
    c2~ c16 aes, g, f, g, f, ees, d, |
    % bar 34
    c,4 ees16 d c8 d,4 f16 ees d8 |
    % bar 35
    ees,4 g16 f ees8 f,4 aes16 g f8 |
    % bar 36
    g,8 g c ees f aes d f |
    % bar 37
    g8 bes ees g aes f d b |
    % bar 38  (c' in the bass clef, then treble clef: hand-crossing figure)
    c'8 \clef treble ees'' ees'' c' b d'' d'' bes |
    % bar 39
    a8 c'' c'' g fis c'' c'' fis |
    % bar 40  (g in the treble clef, then bass clef)
    g8 \clef bass d g bes~ bes16 a g bes a g fis e |
    % bar 41
    d8 g bes d'~ d'16 c' bes d' c' bes a g |
    % bar 42
    fis16 a g a bes d c d ees b a b c' e d e |
    % bar 43
    f16 cis' b cis' d' fis e fis g bes a g fis e d c |
    % bar 44
    bes,16 d c d ees d c b, c ees d ees f ees d c |
    % bar 45
    d16 f ees f g f ees d ees c' bes aes g f ees d |
    % bar 46
    ees16 f ees d c bes, aes, g, f,2~ |
    % bar 47
    f,16 f ees f g f ees f ees, ees d ees f ees d ees |
    % bar 48  (fragment)
    aes,4
}

\score {
    \new PianoStaff <<
        \new Staff = "upper" <<
            \new Voice = "1" { \voiceOne \soprano }
            \new Voice = "2" { \voiceTwo \alto }
        >>
        \new Staff = "lower" <<
            \new Voice = "1" { \voiceTwo \bass }
        >>
    >>
    \layout { }
}
