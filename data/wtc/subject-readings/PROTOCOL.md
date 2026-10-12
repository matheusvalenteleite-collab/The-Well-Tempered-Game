# Protocol: settling the subject of each fugue from the score

Input: one text file per fugue in /tmp/claude-0/sp/openings/<id>.txt. Each lists the voices in order of
entry; every note is `index|bar:beat PITCH value` (values: w h q e s t, "." dotted, or a number of
quarters for tied values; beats are the metre's denominator, so in 2/2 a beat is a half note; C4 = middle C).
The last line is the machine's current (often wrong) reading.

For each fugue decide, by reading the notes (do not rely on memory of the literature unless you are
certain, and never invent a citation):

1. subject_end: the index (in entry 1's list) of the subject's last note. Criteria, in order:
   - the subject's identity is what the answer (entry 2) imitates: it cannot end later than the point
     where entry 2 stops imitating it (allowing a tonal adjustment at the head and a bent last note);
   - it ends on a cadential arrival (a note on a strong or relatively strong beat that closes a
     melodic-harmonic gesture: typically ^1, ^3 or ^5 of the tonic, or ^5/^1 of the dominant key in a
     modulating subject) at or shortly before entry 2;
   - what follows in voice 1 once entry 2 has begun is the countersubject (or free counterpoint),
     not subject. Where entry 2 overlaps the subject's last note, the subject ends on the note under
     which entry 2 begins.
   - double/triple fugues: give the first subject (the one in the exposition).
2. answer: "real" or "tonal"; answer_end: index in entry 2's list of the answer's last note; the
   indices of entry 2's notes that are tonally mutated (not an exact transposition of the subject note).
3. codetta: whether a link (codetta) separates the end of the answer from entry 3 (true/false, and how
   many beats), and between subject and answer.
4. confidence: "sure" or "unsure", with a one-sentence reason in musical terms (e.g. "ends on Eb4 ^3 at
   3:1 where the answer has just entered; the sixteenths after are the countersubject").
5. note: anything striking about the exposition (a stretto exposition, an entry out of the usual
   order, a subject in two halves, the answer at the fourth below, etc.).

Write a JSON array, one object per fugue:
{"id":"wtc1f02","subject_end":19,"subject_end_at":"3:1","subject_last_pitch":"Eb4","answer":"tonal",
 "answer_end":19,"mutated":[3],"codetta_before_answer_beats":0,"codetta_before_third_beats":4,
 "confidence":"sure","reason":"...","note":"..."}
