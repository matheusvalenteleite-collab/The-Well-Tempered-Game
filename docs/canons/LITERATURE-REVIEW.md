# Bach's canons: the literature review (K0)

**Provenance.** Compiled on 12 October 2026 by a research agent of the CANON session, which checked each item against a
bibliographic record it opened (Bach Bibliography, Crossref, publisher or archive pages). The session then spot-checked
eight DOIs against Crossref itself (Gosman 2012, Haakenson 2017, Wolff 1976, Kirkendale 1980, Gran 2024, Butler 1983,
Collins & Schloss 2001, Ânkus 2020): all resolve, with authors, venue, volume and pages as given. Two discrepancies to
settle at the library: Crossref gives Kirkendale's subtitle as "The Musical Offering of Quintilian" (the Bach Bibliography
and the article's citation tradition: "The *Institutio oratoria* of Quintilian"), and spells Collins's first name "Dennis"
in the *Music Perception* record. The one-line descriptions rest on abstracts, contents pages or Bach Bibliography
annotations; where only a title was seen, the entry says "per title". **Nothing here has been read yet**: the owner
chooses what is read (status "proposed" for every item).

**For the next steps (PLAN.md).** The items most directly about *how* Bach builds a canon over a harmonic plan, the
question the first measurements point to (HABITS-1, section 4): Gosman 2012 ("canonic threads": fitting dux and comes
to a given harmony and phrase, with the Goldberg canons as examples), Haakenson 2017 and Hall 2021 (the eight-note
ground and BWV 1087), Ânkus 2020 (the vertical in the Goldberg canons), Collins 1999 and 2002 (period methods; "stacked"
canons), Marpurg 1753-54 vol. II ch. 6 (open, in English), Kirnberger II (open; and the source of the Bach-Gesellschaft's
resolutions of the Musical Offering canons). A lead for K1b: a Humdrum file of the Musical Offering's augmentation canon,
and about 80 other canons in kern, in the repository `shanahdt/corpus-studies-class` (origin undocumented; to be checked
against the Bach-Gesellschaft before use).

---


## How the items were verified, and how far to trust each kind of check

- **BB** means the Bach Bibliography / Bach Printed Music Database (Yo Tomita; hosted by the Riemenschneider Bach Institute). Each record is at `https://bachbib.bw.edu/script/bach2.pl?23=<ID>`. I read the records with curl and HTML parsing.
  - An item marked "BB list" comes from the database's title search (POST to `bach1.pl`, keywords "canon", "Kanon", "canonic", "Goldberg", "Musical Offering", "Art of Fugue", "counterpoint"). I saw the line for that item in the results, with its record ID.
- **CR** means Crossref DOI metadata (`api.crossref.org`). The citation details come from the registered metadata.
- **Fetched** means I opened the publisher, journal, arXiv or archive page, or the PDF itself.
- **Warning about one tool.** The WebFetch summariser invented volume and issue numbers for two JAMS articles (Kirkendale and the Wolff Handexemplar article). I caught this and corrected both against the raw BachBib listing and Crossref. Citations in this document come from raw-text or Crossref checks, not from the summariser's wording.
- **Scope of verification.** "Verified" means the bibliographic record exists and matches. The one-sentence descriptions of content rely on an abstract, a table of contents or BB annotations where I saw one. Where I only had the title, the description says "per title".

---

## Tier 1: read now (directly about how Bach builds canons, or how to build canons)

| # | Citation | Verified at | Access | Question it answers |
|---|---|---|---|---|
| 1 | Gosman, Alan. "Canonic Threads and Large-Scale Structure in Canons." *Gamut: Online Journal of the Music Theory Society of the Mid-Atlantic* 5/1 (2012), art. 6, pp. 133–184 (pages per BB). DOI 10.7290/gamutuxkr | CR; BB 53470; dissertation abstract at mtosmt.org/docs/diss-index.php?id=44 | Open (online journal; the landing page blocked my fetcher) | How a canon is fitted to a given harmonic and phrase plan by threading dux and comes notes at the time interval. The worked examples are the Goldberg canons. This is the closest thing to an algorithmic recipe. |
| 2 | Gosman, Alan R. *Compositional Approaches to Canons from Ockeghem to Brahms.* PhD diss., Harvard University, 2000. Part II is "Canonic Threads", ch. 5–9: repeated-note, stepwise, larger-interval and arpeggiated threads. | Fetched: SMT dissertation index (mtosmt.org/docs/diss-index.php?id=44) | Library (dissertation) | The full taxonomy of thread types behind item 1. |
| 3 | Haakenson, Matthew A. "Probing the Properties of the First Eight Notes of Bach's Goldberg Ground Further: Revelations for Replicating the Soggetto and Opening Four Canons of BWV 1087." *Music Theory Spectrum* 39/2 (Fall 2017): 247–260. DOI 10.1093/mts/mtx019 | CR; OUP issue page academic.oup.com/mts/issue/39/2; BB 60207 | Paywalled | Why the eight-note ground supports canons in so many forms, and how to replicate BWV 1087/1–4. |
| 4 | Collins, Denis. "Bach and Approaches to Canonic Composition in Early Eighteenth-Century Theoretical and Chamber Music Sources." *BACH* 30/2 (1999): 27–48. | BB 15578 | Library (JSTOR) | The step-by-step composing methods for canon taught in Bach's time, set against Bach's own canons. |
| 5 | Collins, Denis. "Bach's Occasional Canon BWV 1073 and 'Stacked' Canonic Procedure in the Eighteenth Century." *BACH* 33/2 (2002): 15–34. | BB list (ID 18806) | Library | How canons for many voices are built by stacking two-voice canonic relations. |
| 6 | Collins, Denis. "'So you want to write a canon?' An historically-informed new approach for the modern theory class." *College Music Symposium* 48 (2008): 108–123. | BB 55490 | Online / library | A teachable, historically grounded procedure for composing canons. |
| 7 | Collins, Denis. "Canon and Music Pedagogy 1500–1800." *Theoria* (Univ. of North Texas) 8 (1994): 53–72. | BB list (22521) | Library | How canon was taught from 1500 to 1800, i.e. which rules period composers actually used. |
| 8 | Cohen, Vered. "Interrelationships among the Canons of J. S. Bach's Goldberg Variations." *Israel Studies in Musicology* 6 (1996): 115–132. | BB 14522 | Library | How the nine Goldberg canons relate to one another in technique and design. |
| 9 | Chabora, Robert Joseph. *Canonic Techniques of the 'Goldberg Variations', the 'Canonic Variations' and the 'Fourteen Canons' of Johann Sebastian Bach.* DMA diss., University of Kentucky, 1988. iv, [iii], 202 pp. (DA 8822102) | BB 11775 | Library (ProQuest) | A survey of the canonic techniques across BWV 988, 769 and 1087 (per title). |
| 10 | Ânkus (Yankus), A. I. "Vertikal' v kanonah iz Gol'dberg-variacij I. S. Baha (BWV 988; BWV 1087): Nekotorye aspekty" [The vertical construction in canons from Bach's Goldberg Variations]. *Opera Musicologica* 12/5 (2020): 120–140. DOI 10.26156/om.2020.12.5.008 | CR; BB 61458 | Probably open (Russian journal); not checked | The harmonic (vertical) side of the Goldberg canons over the ground, which is exactly the harmony-over-ground question. |
| 11 | Gran, Jacob. "A General Method for Composing a Canon Against a Cantus Firmus Using Sergei Taneev's Double-Shifting Counterpoint." *Music Theory Online* 30/2 (June 2024). DOI 10.30535/mto.30.2.4 | Fetched: mtosmt.org/issues/mto.24.30.2/mto.24.30.2.gran.html (abstract read) | Open | A systematic method for canons against a fixed voice, including contrary motion, augmentation and retrograde. The abstract says it applies to Bach's canonic chorale preludes and ground-bass works. |
| 12 | Guez, Jonathan. "Three Exercises Involving Goldberg Canons." *Journal of Music Theory Pedagogy* 33 (2019), art. 18. DOI 10.71156/2994-7073.1380 | Fetched: digitalcollections.lipscomb.edu/jmtp/vol33/iss1/18; CR | Open | Improvisation, analysis and composition exercises built on the Goldberg canons, usable as test cases. |
| 13 | Hall, Rachel. "Variations of the Goldberg Ground and Other Canonic Adventures." *Proceedings of Bridges 2021*, pp. 261–264. | Fetched: archive.bridgesmathart.org/2021/bridges2021-261.html | Open | A mathematical notation for two-part canons, applied to BWV 1087/1–4 and directly usable for formalisation. |
| 14 | O'Dorney, Evan M. "Renaissance Canons with Asymmetric Schemes." *Journal of Mathematics and Music* 18/2 (2024; online 26 Dec 2023): 228–254. DOI 10.1080/17459737.2023.2290275 | CR; arXiv 2302.14160 (abstract read) | Open preprint | An algorithm that measures how flexible a given time/pitch entry scheme is under a first-species model, i.e. which canon schemes are easy to fill. Renaissance repertoire, but directly reusable for a generator. |
| 15 | Prout, Ebenezer. *Double Counterpoint and Canon.* London: Augener, [1891]. Canon chapters, with start pages from the contents page of the scan: ch. X Imitation (p. 133); XI The Round (145); XII Two-Part Canons (160); XIII Canons with Free Parts / Accompanied Canons (179); XIV The Canon on a Canto Fermo (191); XV Canons on One Subject in More than Two Parts (206); XVI Canons with More than One Subject; XVII Curiosities of Canon (235). | Fetched: full text archive.org/details/doublecounterpoi00prouuoft; also imslp.org/wiki/Double_Counterpoint_and_Canon_(Prout,_Ebenezer) | Open | A step-by-step canon-writing method. The text analyses Bach's "Thirty Variations", the Canonic Variations and the Art of Fugue canon at the tenth. (OCR garbled ch. XVI's page, so it is omitted.) |
| 16 | Marpurg, Friedrich Wilhelm. *Abhandlung von der Fuge.* 2 vols. Berlin, 1753–54. English: *Treatise on Fugue*, trans. Jane Hines, ed. and intro. Derek Remeš. Warsaw: Fryderyk Chopin Institute, 2022. DOI 10.56693/mt.2022.01.03. Vol. II ch. 6 "On canon" starts p. 267 of the translation PDF; ch. 7 "On the vocal fugue and the vocal canon" p. 312. Vol. II ch. 1–5 (pp. 237–263) cover triple, quadruple, double inverted and retrograde counterpoint. | Fetched PDF: musictreatises.nifc.pl/cms/web/uploads/F.W. Marpurg, Abhandlung von der Fuge - English translation_en.pdf | Open | The fullest period account of canon types and how to construct them, from a theorist close to Bach. |
| 17 | Edwards, Timothy Dwight. "Kirnberger's Enigmatic Canons." In Immanuel Ott and Birger Petersen (eds.), *"... weit schärfer und gründlicher nachgedacht ...": Zur Musiktheorie Johann Philipp Kirnbergers* (Schriften der Hochschule für Musik Mainz 1). Mainz, 2023. DOI 10.25358/openscience-8740 | Fetched PDF: openscience.ub.uni-mainz.de/handle/20.500.12030/8756 | Open (CC BY 4.0) | How Bach's pupil Kirnberger built and taught enigmatic perpetual canons, and how this bears on Bach's dissonance treatment. |
| 18 | Wolff, Christoph, ed. *Kanons, Musikalisches Opfer.* NBA VIII/1. Leipzig: VEB DVfM; Kassel: Bärenreiter, 1974 (2nd ed. 1987). xiv, 85 pp. Covers BWV 1072–1078, BWV deest and 1079. Kritischer Bericht: same series, 1976, 169 pp. | BB 3444; BB 5530 | Library | The authoritative texts and resolutions of the small canons and the Musical Offering canons, with sources and variant solutions. |
| 19 | Emery, Walter and Christoph Wolff. NBA V/2 Kritischer Bericht (Clavier-Übung II and IV, Vierzehn Kanons BWV 1087). Kassel: Bärenreiter, 1981. 156 pp. Also Wolff, ed., *Vierzehn Kanons … BWV 1087*, first edition (preprint from NBA V/2). Kassel: Bärenreiter, 1976 (rev. 2000), 20 pp. | BB 4403; BB 8992 | Library | The authoritative text and solutions of BWV 1087 and the Goldberg print. |
| 20 | Wolff, Christoph. "Bach's 'Handexemplar' of the Goldberg Variations: A New Source." *JAMS* 29/2 (Summer 1976): 224–241. DOI 10.2307/831018. Reprinted in Wolff, *Bach: Essays on His Life and Music* (Harvard UP, 1991), pp. 162–177, according to a BachBib entry in search results whose record page I did not open. | CR; raw BB JAMS listing | Library (JSTOR) | Discovery, source and nature of the 14 canons on the Goldberg ground. |
| 21 | Op de Coul, Thomas. "The Augmentation Canon in J. S. Bach's *Musicalisches Opfer*." *BACH* 37/1 (2006): 50–77. | BB list (22855) | Library | How the augmentation-plus-inversion canon is constructed and solved. |
| 22 | Crean, Elise. "G. H. Stölzel's *Practischer Beweiss*: A Hitherto Unconsidered Source for J. S. Bach's Fourteen Canons." *BACH* 40/2 (2009): 1–21. A correction was printed in *BACH* 41/1 (2010): 103 (CR). | BB 36183; CR | Library | A contemporary treatise model for the canon types in BWV 1087. |

## Tier 2: consult for a named question

| # | Citation | Verified at | Access | Question it answers |
|---|---|---|---|---|
| 23 | Kirkendale, Ursula. "The Source for Bach's *Musical Offering*: The *Institutio oratoria* of Quintilian." *JAMS* 33/1 (Spring 1980): 88–141. DOI 10.2307/831204 | CR; raw BB JAMS listing | Library. A third-party PDF scan exists at examenapium.it/cs/biblio/Kirkendale1980.pdf (unofficial). | The rhetorical ordering of the Musical Offering canons. This is about ordering, not construction. |
| 24 | David, Hans T. *J. S. Bach's Musical Offering: History, Interpretation, and Analysis.* New York, 1945. xi, 190 pp. Reprinted Dover, 1972. | BB 12151 (BB gives "Dover, 1945", probably an error for Schirmer); Internet Archive record `jsbachsmusicalof0000davi` (1972) | Library / borrowable on archive.org | Analysis and solutions of each Musical Offering canon. |
| 25 | Wolff, Christoph. "New Research on Bach's *Musical Offering*." *Musical Quarterly* 57/3 (1971): 379–408. DOI 10.1093/mq/lvii.3.379 | CR; BB MQ listing | Library | The sources and printing of the Musical Offering, and the ordering of the canons. |
| 26 | Butler, Gregory G. "Ordering Problems in J. S. Bach's *Art of Fugue* Resolved." *Musical Quarterly* 69/1 (Winter 1983): 44–61. DOI 10.1093/mq/lxix.1.44 | CR; BB 4622 | Library | Where the four Art of Fugue canons belong in the print. |
| 27 | Butler, Gregory. "The Printing History of J. S. Bach's *Musical Offering*: New Interpretations." *Journal of Musicology* 19/2 (2002): 306–331. DOI 10.1525/jm.2002.19.2.306 | CR | Library | How the canons were engraved and grouped. |
| 28 | Williams, Peter. *Bach: The Goldberg Variations.* Cambridge Music Handbooks. Cambridge: CUP, 2001. 120 pp. DOI 10.1017/CBO9780511606007. Chapter 3, "The movements", pp. 54–92; chapter 2, "Overall shape", pp. 35–53. | Fetched: cambridge.org/core/books/bach-the-goldberg-variations/FCA596FE7B7BCA8AEC4D85599FBADF0A | Library | A movement-by-movement account of the canons. The publisher's blurb asks "What is the canonic vocabulary?" |
| 29 | Schulenberg, David. *The Keyboard Music of J. S. Bach.* 2nd ed. New York: Routledge, 2006 (© 2007). 544 pp. DOI 10.4324/9780203036167. | Fetched: Routledge page (table of contents) | Library | Analysis of the Goldberg canons. The contents list ch. 17 "The Clavierübung Continued" and ch. 18 "The Musical Offering and the Art of Fugue". **That ch. 17 covers BWV 988 is my inference from the title.** |
| 30 | Yearsley, David. *Bach and the Meanings of Counterpoint.* Cambridge: CUP, 2002 (BB: xvi, 257 pp.). **Ch. 2, "The alchemy of Bach's canons"**. Ch. 4, "The autocratic regimes of *A Musical Offering*", also bears on canon. | BB list (18713); chapter titles from Schubert's review, *MTO* 12/1 (2006), mtosmt.org/issues/mto.06.12.1/mto.06.12.1.schubert.html | Library | What canon *meant* in Bach's culture (cultural meaning, not technique). I saw no chapter page ranges. |
| 31 | Yearsley, David. "Alchemy and Counterpoint in an Age of Reason." *JAMS* 51/2 (1998): 201–243. DOI 10.2307/831977 | CR; BB 16163 | Library | The article-length precursor of item 30, ch. 2. |
| 32 | Walker, Paul. "Counterpoint, Canons and the Late Works." Ch. 15 in *The Routledge Research Companion to Johann Sebastian Bach* (2017), pp. 377–397. Sections include "Music Theory and Compositional Process", "Bach and Canon", "Goldberg Variations", "Musical Offering", "Canonic Variations" and "Art of Fugue". | BB 59370 | Library | An up-to-date survey of Bach's late canonic practice and its theory. |
| 33 | Sprondel, Friedrich. "Das rätselhafte Spätwerk: Musikalisches Opfer; Kunst der Fuge; Kanons." In *Bach-Handbuch* (1999), pp. 937–975. Includes a section on the 14 canons. | BB 15850 | Library | A German handbook overview of the late canons. |
| 34 | Collins, Denis. "Spiegel-Kontrapunkt in Theorie und Praxis: Vorläufer für Contrapunctus 12 und 13 aus Bachs *Kunst der Fuge*." *Bach-Jahrbuch* 82 (1996): 77–92. | BB list (14052) | Probably open: the Bach-Jahrbuch backfile is open on bjb.publia.org (I did not check this issue) | Mirror and inversion technique in the Art of Fugue. |
| 35 | Dirksen, Pieter. *Studien zur 'Kunst der Fuge' von J. S. Bach.* Veröffentlichungen zur Musikforschung 12. Wilhelmshaven: Noetzel, 1994. 234 pp. | BB 12397 | Library | The genesis and structure of the Art of Fugue, including its canons. |
| 36 | Collins, Denis. "Historical Precedents for Bach's Evolutio Canon BWV 1087/10." *BACH* 24/1 (1993): 5–14. | BB list (14011) | Library | How an "evolutio" (voice-exchange) canon works. |
| 37 | Collins, Denis. "From Bull to Bach: In Search of Precedents for the 'Complete' Version of the Canon by Augmentation and Contrary Motion in J. S. Bach's *Musical Offering*." *BACH* 38/2 (2007): 39–63. | BB list (24743) | Library | Models for augmentation-plus-inversion canons. |
| 38 | Edwards, Timothy D. "The Royal Theme's Hidden Symmetry: In Defense of the Concise Solution to the Augmentation Canon in J. S. Bach's *Musical Offering*." *BACH* 41/1 (2010): 1–31. DOI 10.1353/bach.2010.a820314 | CR | Library | How to choose between competing solutions of a puzzle canon. |
| 39 | Collins, Denis and W. Andrew Schloss. "An Unusual Effect in the *Canon per Tonos* from J. S. Bach's *Musical Offering*." *Music Perception* 19/2 (2001): 141–153. DOI 10.1525/mp.2001.19.2.141 | CR | Library | How the modulating canon is built and how it is heard. |
| 40 | Brügge, Joachim. "Johann Sebastian Bach, Musikalisches Opfer (BWV 1079): Bemerkungen zum 'Canon a 2 per Tonos'." *Bach-Jahrbuch* 78 (1992): 91–100. DOI 10.13141/bjb.v19921124 | CR; fetched bjb.publia.org/bjb/article/view/1916 | **Open PDF:** bjb.publia.org/bjb/article/view/1916/1842 | The construction of the modulating canon. |
| 41 | Schulze, Hans-Joachim. "Johann Sebastian Bachs Kanonwidmungen." *Bach-Jahrbuch* 53 (1967): 82–92. Covers BWV 1073–1075, 1077 and 1078. DOI 10.13141/bjb.v19672465 | CR; fetched bjb.publia.org/bjb/article/view/1526 | **Open PDF:** bjb.publia.org/bjb/article/view/1526/1452 | The sources, contexts and solutions of the small dedicatory canons. |
| 42 | Böß, Reinhard. *Die Kunst des Rätselkanons im Musikalischen Opfer.* 2 vols. (text 142 pp.; music 192 pp.). Wilhelmshaven: Noetzel, 1991. Critiqued in Brügge, "Zum Problem der 'Mehrfachlösungen' …", *Neues Musikwissenschaftliches Jahrbuch* 3 (1994): 81–101 (BB 16273). | BB 9919 | Library | All the possible solutions of each riddle canon. This is useful as a search space. |
| 43 | Chafe, Eric T. "Allegorical Music: The 'Symbolism' of Tonal Language in the Bach Canons." *Journal of Musicology* 3/4 (1984): 340–362. Treats BWV 1078 (= 1087/11) and 1087/8. DOI 10.2307/763586 | CR; BB 4233 | Library | The tonal and hexachordal logic in specific canons. |
| 44 | Crean, Elise. "The Fourteen Canons (BWV 1087): Foundation or Culmination?" *Understanding Bach* 5 (2010): 67–75. | Fetched PDF (title page read) | **Open PDF:** bachnetwork.org/ub5/crean.pdf | Where BWV 1087 sits in Bach's late canon work. |
| 45 | Logemann, George D. "The Canons in the Musical Offering: An Example of Computational Musicology." In *Elektronische Datenverarbeitung in der Musikwissenschaft* (1967), pp. 63–87. | BB 8000 | Library | The earliest computational analysis of Bach's canons, a precedent for this project. |
| 46 | Mattheson, Johann. *Der vollkommene Capellmeister.* Hamburg: Herold, 1739. **Part III, ch. 21: "Von Circkel-Gesängen oder Kreis-Fugen, sonst Canones genannt"**; fugue chapters precede it. | Fetched OCR: archive.org/details/10212373bsb (BSB copy); IMSLP full scan | Open | Mattheson's definition of canon and his critical view of it. |
| 47 | Albrechtsberger, Johann Georg. *Gründliche Anweisung zur Composition.* Leipzig: Breitkopf, 1790. **Ch. 35, "Vom Canon"** (from the OCR running heads). | Fetched OCR: archive.org/details/10990010bsb; IMSLP page | Open | The standard late-18th-century method for writing canons. |
| 48 | Kirnberger, Johann Philipp. *Die Kunst des reinen Satzes in der Musik*, Theil II. Berlin and Königsberg: Decker and Hartung, 1776–. Section "Anwendung des doppelten Contrapuncts in der Octave, auf Canons", within the chapter on double counterpoint. | Fetched OCR: archive.org/details/diekunstdesreine02kirn | Open | How invertible counterpoint generates canons, in the Bach-school method. |
| 49 | Kitson, C. H. *Invertible Counterpoint and Canon.* London: Oxford University Press, 1927. 96 pp. | BB 1432 | Library | A concise English canon-writing method. |
| 50 | Kennan, Kent Wheeler. *Counterpoint Based on Eighteenth-Century Practice.* Englewood Cliffs: Prentice-Hall, 1959 (2nd ed. 1972; 4th ed. 1999). | BB 5285 | Library | A standard textbook. **I did not see the canon chapter or its pages.** |
| 51 | Anders, Torsten and Eduardo R. Miranda. "Constraint Programming Systems for Modeling Music Theories and Composition." *ACM Computing Surveys* 43/4 (2011): 1–38. DOI 10.1145/1978802.1978809 | CR | Library | The constraint-programming tool landscape for encoding counterpoint and canon rules. |
| 52 | Marissen, Michael. "The Theological Character of J. S. Bach's Musical Offering." *Bach Studies* 2 (1995): 85–106. Revised as ch. 7 of *Bach & God* (OUP, 2016), pp. 191–226, DOI 10.1093/acprof:oso/9780190606954.003.0008. | BB 3931; CR | Library | The meaning of the canon inscriptions. Not about technique. |
| 53 | Gauldin, Robert. "The Composition of Late Renaissance Stretto Canons." *Theory and Practice* 21 (1996): 29–54. Also Gauldin, "The Analysis and Composition of Polymorphic Canons," *JMTP* 33 (2019), DOI 10.71156/2994-7073.1200. | BB list; CR | Library / JMTP open | Stretto canons and canons with several solutions, as composition method. |

## Tier 3: known, judged peripheral

| Citation | Verified at | Why it is peripheral |
|---|---|---|
| Andreatta, Moreno. "Constructing and Formalizing Tiling Rhythmic Canons: A Historical Survey of a 'Mathemusical' Problem." *Perspectives of New Music* 49/2 (2011): 33–64. DOI 10.1353/pnm.2011.0012 | CR | Rhythmic tiling (Vuza) canons, not tonal imitation. Useful only for the rhythm layer. |
| Auricchio, G., L. Ferrarini, S. Gualandi, G. Lanzarotto and L. Pernazza. "A SAT Encoding to Compute Aperiodic Tiling Rhythmic Canons." arXiv 2112.05249 (2021). | Fetched (arXiv API) | Same reason. Note it as a SAT-encoding example. |
| Johnson, Tom and Franck Jedrzejewski. *Looking at Numbers.* Basel: Springer/Birkhäuser, 2014. DOI 10.1007/978-3-0348-0554-4 | CR | Combinatorial, minimalist canons, not Bach's style. |
| Callender, Clifton. "Infinite Canons: Maximally Self-Similar Melodic Lines and Canons with Infinite Solutions." arXiv 2607.23210 (2026). | Fetched (arXiv API) | Mensuration and tempo canons, not Baroque practice. |
| Savery, R., et al. "Learning from History: Recreating and Repurposing Sister Harriet Padberg's Computer Composed Canon and Free Fugue." arXiv 1907.04470 (2019). | Fetched (arXiv API) | Historical algorithmic canon from 1964; a curiosity. |
| Moreno Cañadas, A., et al. "Interactions Between Brauer Configuration Algebras and Classical Cryptanalysis to Analyze Bach's Canons." arXiv 2404.07240 (2024). | Fetched (arXiv API) | Abstract algebra; little bearing on composition. |
| Fernández, J. D. and F. Vico. "AI Methods in Algorithmic Composition: A Comprehensive Survey." *JAIR* 48 (2013): 513–582. DOI 10.1613/jair.3908 | CR | A general survey, not about canon. |
| Nichols, E. P., S. Kalonaris, G. Micchi and A. Aljanaki. "Modeling Baroque Two-Part Counterpoint with Neural Machine Translation." arXiv 2006.14221 (ICMC 2021). | Fetched (arXiv API) | Two-part Baroque counterpoint, but not canonic. |
| Kastine, J. and M. Montiel. "The S-canon and the multi-S-canon: an introduction." *Journal of Mathematics and Music* 10/3 (2016): 211–225. DOI 10.1080/17459737.2016.1168492 | CR | A mathematical construct; marginal. |
| Greer, Mary. "Masonic Allusions in the Dedications of Two Canons by J. S. Bach: BWV 1078 and 1075." *BACH* 43/2 (2012): 1–45. | CR | Symbolism, not technique. |
| Blankenburg, Walter. "Die Bedeutung des Kanons in Bachs Werk." Bach-Tagung Leipzig 1950 report (1951), 250–258. | BB 69 | Older and interpretive. |
| Further BACH/Bach-Jahrbuch puzzle-solution articles: Currie, *BACH* 8/2–4 (1977); Harrow, *College Music Symposium* 30/2 (1990): 90–99 (BWV 1087/10); Bitsch, *Revue de musicologie* 62/2 (1976): 281–288; White, *BACH* 15/4 (1984): 4–15; Maul, *BACH* 46/1 (2015): 49–73 (BWV 1073). | BB list (Bitsch also CR 10.2307/928798) | Source studies and puzzle solutions. Consult for a specific canon only. |

---

## Could not verify, or only partly verified

| Requested item | What I tried | Status |
|---|---|---|
| Schubert, Peter and Christoph Neidhöfer, *Baroque Counterpoint* (2006): the canon chapter | SUNY Press page (revised edition, 2023, ISBN 9781438493251, 502 pp., fetched, but it has no contents list); search snippets from retailers only | **The book exists. The 2006 publisher and the canon chapter number and pages are not verified.** Retailer snippets mention headings such as "Composing a Canon", but I did not see a primary contents page. |
| Schoenberg, *Preliminary Exercises in Counterpoint* | Internet Archive metadata: London, Faber and Faber, 1963, xv + 231 pp. (verified). The OCR text is not public. | **The canon chapter is not verified.** A secondary source says the later "Composition Application" chapters include canons. |
| Alfred Mann, *The Study of Fugue* (1958) | Internet Archive records: 1958 record; Dover 1987 reprint of Norton 1965 (verified). Catalogue records were unreachable (503/403). | **The book is verified, but I did not see whether it contains the Albrechtsberger canon excerpt.** |
| Paul Mark Walker, *Theories of Fugue from the Age of Josquin to the Age of Bach* (2000) | Crossref review records: Music & Letters 82/4 (2001); Notes 58/2 (2001), reviewed by Yearsley. Boydell & Brewer page returned 403. | **The book is verified. The Univ. of Rochester Press / Eastman Studies 13 imprint and the chapters on canon come only from search snippets.** |
| "Peter Williams's Cambridge handbook on the Art of Fugue" | Crossref and web searches | **Not found.** Probably a misremembering; the only Williams handbook found is the Goldberg one (item 28). |
| Kennan: canon chapter pages | BB record only | Book verified; chapter not seen. |
| J. G. Walther (*Musicalisches Lexicon* 1732, "Canon" entry; *Praecepta*) and Padre Martini (*Esemplare*) | Not searched, for lack of time | Not verified. |
| Jeremy Day-O'Connell on canon | Not searched | Not verified. |
| A canon chapter in Huddersfield University Press, *Maths & Music* | The download returned HTML, not a PDF | Not verified. |
| Kirkendale 1980 PDF at examenapium.it | Downloaded; it is a scanned image without readable text | The citation is verified through Crossref, but this copy is unofficial. |

---

## Open-access full texts found

- Marpurg, *Treatise on Fugue* (English, 2022): https://musictreatises.nifc.pl/cms/web/uploads/F.W.%20Marpurg,%20Abhandlung%20von%20der%20Fuge%20-%20English%20translation_en.pdf
- Edwards, "Kirnberger's Enigmatic Canons" (2023): https://openscience.ub.uni-mainz.de/bitstream/20.500.12030/8756/1/kirnbergers_enigmatic_canons-20230428083917187.pdf
- Prout, *Double Counterpoint and Canon*: https://archive.org/details/doublecounterpoi00prouuoft (also archive.org/download/doublecounterpoi00prou/doublecounterpoi00prou.pdf; IMSLP)
- Mattheson 1739: https://archive.org/details/10212373bsb
- Albrechtsberger 1790: https://archive.org/details/10990010bsb
- Kirnberger, *Kunst des reinen Satzes* II: https://archive.org/details/diekunstdesreine02kirn
- Schulze 1967 (Bach-Jahrbuch): https://bjb.publia.org/bjb/article/view/1526/1452
- Brügge 1992 (Bach-Jahrbuch): https://bjb.publia.org/bjb/article/view/1916/1842. The whole Bach-Jahrbuch backfile is open at bjb.publia.org, so check there for Collins 1996 and Essel 2014 (BWV 769 augmentation canon, BJ 100: 27–43).
- Crean 2010: https://www.bachnetwork.org/ub5/crean.pdf; Crean 2008 (*Understanding Bach* 3): https://www.bachnetwork.org/ub3/CREAN%20-%20YSF.pdf
- Gran 2024 (MTO): https://mtosmt.org/issues/mto.24.30.2/mto.24.30.2.gran.html
- Guez 2019: https://digitalcollections.lipscomb.edu/jmtp/vol33/iss1/18
- Hall 2021 (Bridges): https://archive.bridgesmathart.org/2021/bridges2021-261.html
- O'Dorney (preprint): https://arxiv.org/pdf/2302.14160
- Gosman 2012 (Gamut): https://trace.tennessee.edu/gamut/vol5/iss1/6 (open, but it blocked my fetcher)

## Symbolic score editions of the Musical Offering canons

None of these is a complete, scholarly-edited set of the canons in kern, MEI or MusicXML. **Check each file against NBA VIII/1 before use.**

1. **Kern: augmentation canon only.** `bwv1079.krn`, titled "Per augmentationem, contrario motu (Canon 4)". It has 4 spines: guida, CF, conseq, CF-background. Found at `shanahdt/corpus-studies-class`, path `data/humdrum_scores/Canons/bwv1079.krn`; the raw file is at raw.githubusercontent.com/shanahdt/corpus-studies-class/master/data/humdrum_scores/Canons/bwv1079.krn. I opened it. The same folder (about 80 files) also has kern for BWV 769a/b/d/e and BWV 608, plus many Renaissance and Baroque canons (Zarlino, Nanino, Berardi, Bull, Sweelinck, Walther and others). That makes it a ready-made canon corpus, though its origin is undocumented.
2. **Kern: no canons.** `craigsapp/bach-musical-offering` (encoded by Craig Stuart Sapp) has only the two ricercars and the trio sonata, files offering-001/002/013a–d.
3. **LilyPond: one canon.** `ykarikos/sheet-music`, `Bach_J.S./Musikalisches_Opfer/canon_1_a_2.ly`: "Canon 1 a 2, super thema regium", CC BY 4.0, which I opened. Note that the file's own comment calls it the "Crab Canon", which conflicts with its subtitle, so check what it actually contains. The Mutopia Project and `madrisan/open-scores` have only the ricercars.
4. **IMSLP, BWV 1079 page.** Per the WebFetch summary, not opened file by file:
   - Jürgen Knuth's arrangement for flute, strings and continuo has Capella and MusicXML engraving files (#221151, CC BY-NC-SA 3.0) that include several canons, plus MIDI for every canon.
   - Alberto Gómez Gómez has Finale files of the canons (#188978) and MIDI for 10 canons (CC BY-NC-SA 3.0).
   - These are arrangements, and MIDI loses the spelling, but they are usable after checking.

## Main gaps

- I found no peer-reviewed paper that **generates Bach-style canons by computer**. The nearest are Logemann 1967 (analysis), O'Dorney 2024 (feasibility of entry schemes) and Anders & Miranda 2011 (tools).
- The best technical sources on *how* Bach fits canons to the Goldberg ground are Gosman 2012, Haakenson 2017, Ânkus 2020, Cohen 1996 and Chabora 1988.
- The best period "how to" sources are Marpurg vol. II ch. 6, Kirnberger II, Albrechtsberger ch. 35 and Prout ch. XII–XVII.
