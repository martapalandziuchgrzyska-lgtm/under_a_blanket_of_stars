// Dane gry: obiekty, sąsiedzi, wydarzenia. Wszystko, co dotyczy balansu, jest tutaj.

export const SEASONS = ['Jesień', 'Zima', 'Wiosna', 'Lato'];
export const NIGHTS_PER_SEASON = 12;
export const BLOCKS = 8;

// typ obiektu -> etykieta i minigierka przy wywoływaniu
export const TYPES = {
  moon: { label: 'Księżyc', game: 'focus' },
  planet: { label: 'planeta', game: 'focus' },
  double: { label: 'gwiazda podwójna', game: 'focus' },
  cluster: { label: 'gromada', game: 'stack' },
  globular: { label: 'gromada kulista', game: 'stack' },
  nebula: { label: 'mgławica', game: 'color' },
  galaxy: { label: 'galaktyka', game: 'rub' },
};

// s: pora roku (0-3), lvl: wymagana ciemność, b: bloki, win: [od, do] bloki (1-8), w których obiekt jest nad dachami
const O = (id, name, short, type, s, lvl, b, note, art, extra = {}) =>
  ({ id, name, short, type, s, lvl, b, note, art, ...extra });

export const OBJECTS = [
  // --- Jesień
  O('moon', 'Księżyc', 'Księżyc', 'moon', 0, 1, 1, 'Zawsze się udaje. Pierwsza naklejka.', { k: 'moon' }),
  O('saturn', 'Saturn', 'Saturn', 'planet', 0, 1, 1, 'Pierścienie!', { k: 'planet', c: '#e8cf8a', r: 8, rings: true, bands: true }),
  O('owl', 'Gromada Sowa (NGC 457)', 'Sowa', 'cluster', 0, 2, 1, 'Wygląda jak ludzik z rozłożonymi rękami.', { k: 'cluster', shape: 'owl' }),
  O('dblcl', 'Podwójna Gromada w Perseuszu', 'Podwójna Gromada', 'cluster', 0, 2, 2, 'Dwie gromady w jednym kadrze.', { k: 'cluster', shape: 'two', n: 46 }),
  O('m15', 'M15 w Pegazie', 'M15', 'globular', 0, 2, 2, 'Ciasna kula gwiazd.', { k: 'cluster', glob: true, n: 90, spread: 6 }),
  O('m31', 'Galaktyka Andromedy (M31)', 'Andromeda', 'galaxy', 0, 3, 3, 'Wieczorem chowa się za dachem, trzeba poczekać.', { k: 'galaxy', g: [[24, 24, 20, 6, -0.5, 1]], lane: true }, { win: [3, 8] }),
  O('n7000', 'Mgławica Ameryka Północna (NGC 7000)', 'Ameryka Płn.', 'nebula', 0, 3, 3, 'Nie lubi Księżyca.', { k: 'nebula', shape: 'cloud', c1: '#e0506a', c2: '#c06aa8' }, { noMoon: true }),
  O('m33', 'Galaktyka Trójkąta (M33)', 'Trójkąt', 'galaxy', 0, 4, 4, 'Blada, wymaga ciemnego nieba.', { k: 'galaxy', g: [[24, 24, 15, 12, 0.4, 0.55]], spiral: true }),
  O('heart', 'Mgławica Serce (IC 1805)', 'Serce', 'nebula', 0, 4, 4, 'Ulubienica pary z końca ulicy.', { k: 'nebula', shape: 'heart', c1: '#e04a5a', c2: '#ff9a8a' }),
  O('helix', 'Mgławica Ślimak (NGC 7293)', 'Ślimak', 'nebula', 0, 4, 3, 'Bardzo nisko nad dachami, krótkie okno.', { k: 'nebula', shape: 'ring', c1: '#e0604a', c2: '#5fc8c0', R: 13 }, { win: [3, 5] }),
  // --- Zima
  O('jupiter', 'Jowisz', 'Jowisz', 'planet', 1, 1, 1, 'Pasy i cztery księżyce.', { k: 'planet', c: '#e6c39a', r: 11, bands: true, moons: true }),
  O('mars', 'Mars', 'Mars', 'planet', 1, 1, 1, 'Mała czerwona tarcza.', { k: 'planet', c: '#e0704a', r: 6, cap: true }),
  O('m45', 'Plejady (M45)', 'Plejady', 'cluster', 1, 2, 1, 'Widać je też gołym okiem.', { k: 'cluster', shape: 'haze' }),
  O('m35', 'M35 w Bliźniętach', 'M35', 'cluster', 1, 2, 2, 'Rozsypany cukier.', { k: 'cluster', n: 50, spread: 13 }),
  O('m37', 'M37 w Woźnicy', 'M37', 'cluster', 1, 2, 2, 'Gęsta, z pomarańczową gwiazdą w środku.', { k: 'cluster', n: 70, spread: 10, orange: true }),
  O('m42', 'Wielka Mgławica w Orionie (M42)', 'M42 Orion', 'nebula', 1, 2, 2, 'Jasna, pierwsza „prawdziwa” mgławica.', { k: 'nebula', shape: 'fan', c1: '#e86a8a', c2: '#7fb8e8' }),
  O('flame', 'Mgławica Płomień (NGC 2024)', 'Płomień', 'nebula', 1, 3, 3, 'Tuż przy jasnej gwieździe Pasa Oriona.', { k: 'nebula', shape: 'flame', c1: '#e8843a', c2: '#ffd070' }),
  O('m1', 'Mgławica Krab (M1)', 'Krab', 'nebula', 1, 3, 3, 'Pozostałość po supernowej.', { k: 'nebula', shape: 'crab', c1: '#e06a4a', c2: '#6fc0d0' }),
  O('rosette', 'Mgławica Rozeta', 'Rozeta', 'nebula', 1, 4, 4, 'Róża z dziurą w środku.', { k: 'nebula', shape: 'ring', c1: '#e04a60', c2: '#ff8a9a', R: 15, thick: 6 }),
  O('horse', 'Mgławica Koński Łeb', 'Koński Łeb', 'nebula', 1, 4, 4, 'Najtrudniejszy obiekt zimy.', { k: 'nebula', shape: 'horse', c1: '#d8405a', c2: '#6f9ae0' }),
  // --- Wiosna
  O('venus', 'Wenus', 'Wenus', 'planet', 2, 1, 1, 'Tylko w pierwszych godzinach, potem zachodzi.', { k: 'planet', c: '#fff6e0', r: 9, crescent: true }, { win: [1, 2] }),
  O('mizar', 'Mizar i Alkor', 'Mizar i Alkor', 'double', 2, 1, 1, 'W dyszlu Wielkiego Wozu.', { k: 'double', c1: '#ffffff', c2: '#dfe8ff', sep: 5 }),
  O('m44', 'Żłóbek (M44)', 'Żłóbek', 'cluster', 2, 2, 1, 'Rój pszczół.', { k: 'cluster', n: 40, spread: 14 }),
  O('m3', 'M3', 'M3', 'globular', 2, 2, 2, 'Pół miliona gwiazd w jednej kuli.', { k: 'cluster', glob: true, n: 110, spread: 7 }),
  O('m81', 'Galaktyki Bodego i Cygaro (M81 i M82)', 'M81 i M82', 'galaxy', 2, 3, 3, 'Dwie w jednym kadrze.', { k: 'galaxy', g: [[17, 28, 10, 7, 0.5, 0.9], [34, 13, 8, 2.2, -0.4, 0.9]] }),
  O('m51', 'Galaktyka Wir (M51)', 'Wir', 'galaxy', 2, 3, 3, 'Spirala z towarzyszką.', { k: 'galaxy', g: [[21, 27, 12, 11, 0, 0.8], [35, 11, 4, 3.5, 0, 0.9]], spiral: true }),
  O('m104', 'Galaktyka Sombrero (M104)', 'Sombrero', 'galaxy', 2, 3, 3, 'Dość nisko nad dachami.', { k: 'galaxy', g: [[24, 24, 17, 4, 0.1, 1]], lane: true, bulge: true }, { win: [3, 6] }),
  O('leo3', 'Tryplet Lwa', 'Tryplet Lwa', 'galaxy', 2, 4, 4, 'Trzy galaktyki naraz.', { k: 'galaxy', g: [[13, 32, 8, 4, 0.3, 0.8], [33, 34, 8, 3.5, -0.2, 0.8], [26, 11, 10, 2, 1.3, 0.7]] }),
  O('m101', 'Galaktyka Wiatraczek (M101)', 'Wiatraczek', 'galaxy', 2, 4, 4, 'Duża, ale blada.', { k: 'galaxy', g: [[24, 24, 16, 15, 0, 0.5]], spiral: true }),
  O('markarian', 'Łańcuch Markariana', 'Ł. Markariana', 'galaxy', 2, 4, 4, 'Sznur galaktyk w Pannie.', { k: 'galaxy', chain: true }),
  // --- Lato
  O('albireo', 'Albireo', 'Albireo', 'double', 3, 1, 1, 'Złota i niebieska.', { k: 'double', c1: '#ffc860', c2: '#7fb0ff', sep: 4 }),
  O('hanger', 'Gromada Wieszak', 'Wieszak', 'cluster', 3, 1, 1, 'Gwiazdy układają się w wieszak.', { k: 'cluster', shape: 'hanger' }),
  O('m13', 'Wielka Gromada w Herkulesie (M13)', 'M13', 'globular', 3, 2, 2, 'Najsłynniejsza kula północnego nieba.', { k: 'cluster', glob: true, n: 130, spread: 8 }),
  O('m11', 'Dzika Kaczka (M11)', 'Dzika Kaczka', 'cluster', 3, 2, 2, 'Klucz kaczek w locie.', { k: 'cluster', n: 80, spread: 8, wedge: true }),
  O('m57', 'Mgławica Pierścień (M57)', 'Pierścień', 'nebula', 3, 2, 2, 'Małe kółko dymu.', { k: 'nebula', shape: 'ring', c1: '#e86a4a', c2: '#5fd0c0', R: 7, thick: 3 }),
  O('m27', 'Mgławica Hantle (M27)', 'Hantle', 'nebula', 3, 3, 2, 'Ogryzek jabłka.', { k: 'nebula', shape: 'lobes', c1: '#e0606a', c2: '#5fc8b8' }),
  O('m17', 'Mgławica Omega (M17)', 'Omega', 'nebula', 3, 3, 3, 'Łabędź na wodzie.', { k: 'nebula', shape: 'fan', c1: '#e8607a', c2: '#ffb0a0', flip: true }),
  O('m8', 'Mgławica Laguna (M8)', 'Laguna', 'nebula', 3, 3, 3, 'Bardzo nisko, krótkie okno nad dachami.', { k: 'nebula', shape: 'cloud', c1: '#e8507a', c2: '#8ab8f0' }, { win: [3, 5] }),
  O('m16', 'Mgławica Orzeł (M16)', 'Orzeł', 'nebula', 3, 4, 4, 'W środku kryją się Filary Stworzenia.', { k: 'nebula', shape: 'eagle', c1: '#e04a5a', c2: '#ffc890' }),
  O('veil', 'Mgławica Welon', 'Welon', 'nebula', 3, 4, 4, 'Delikatne włókna, najtrudniejszy obiekt lata.', { k: 'nebula', shape: 'veil', c1: '#e05a6a', c2: '#5fc8d8' }),
];
export const OBJ = Object.fromEntries(OBJECTS.map(o => [o.id, o]));
export const seasonObjects = s => OBJECTS.filter(o => o.s === s);

// Sąsiedzi. from: numer nocy (od 0), w której kot przynosi pierwszy liścik.
export const NEIGHBORS = [
  {
    id: 'lady', name: 'Pani Helena', who: 'starsza pani z naprzeciwka', light: 'lampę na ganku', from: 0,
    likes: ['moon', 'double', 'cluster', 'globular'], first: 'moon', color: '#c8a0d8', hair: '#e8e8f0',
    hello: 'Dzień dobry, nowa sąsiadko! Widzę z ganku, że co wieczór patrzysz w niebo. Mój mąż też tak siadywał.',
    ask: ['Zrobiłabyś dla mnie zdjęcie? Marzy mi się: {o}.', 'Kot znów był u mnie na mleku. A ja mam prośbę: {o}.', 'Stare oczy już nie te. Pokażesz mi, jak wygląda {o}?'],
    off: 'Zgasiłam lampę na ganku. I tak świeciła tylko ćmom, a Tobie będzie ciemniej.',
    guest: 'Upiekłam szarlotkę. Mogę czasem wpaść na Twój taras, jak palą się lampki?',
  },
  {
    id: 'kid', name: 'Antek', who: 'dzieciak z sąsiedniego domu', light: 'lampkę w oknie', from: 1,
    likes: ['planet', 'moon', 'double'], first: 'saturn', color: '#6fc0e8', hair: '#6a4a3a', small: true,
    hello: 'CZEŚĆ!!! To prawda, że masz PRAWDZIWY teleskop? Mama mówi, że mam nie przeszkadzać, więc piszę.',
    ask: ['Pokażesz mi {o}??? Proszę proszę proszę!', 'A da się zobaczyć {o}? W szkole mi nie wierzą.', 'Następne zamówienie: {o}! Powieszę nad łóżkiem.'],
    off: 'Już się nie boję ciemności, bo w ciemności widać planety. Gaszę lampkę!!!',
    guest: 'Mama pozwoliła mi przyjść popatrzeć, jak zapalisz lampki. Przyniosę kakao!',
  },
  {
    id: 'gardener', name: 'Pan Ryszard', who: 'facet od ogrodu', light: 'reflektor z czujnikiem ruchu', from: 3,
    likes: ['galaxy', 'cluster', 'globular', 'nebula'], color: '#7fb07a', hair: '#8a8a8a',
    hello: 'Sąsiadka wybaczy, ale w mieście nic na niebie nie widać. Wiem, bo patrzyłem. Raz.',
    ask: ['Dowód poproszę. Na przykład: {o}.', 'No dobrze, jedno się udało. A {o}? Tego na pewno nie widać.', 'Żona mówi, że mam przestać marudzić. To ostatni raz: {o}.'],
    off: 'Wykręciłem reflektor. Kuny i tak się go nie bały, a te zdjęcia są... no, niczego sobie.',
    guest: 'Mam nadmiar pomidorów i składane krzesło. Wpadnę kiedyś, jak będzie się świeciło.',
  },
  {
    id: 'student', name: 'Ola', who: 'studentka z poddasza', light: 'lampę biurkową', from: 12,
    likes: ['nebula', 'galaxy'], color: '#e8a070', hair: '#3a2a4a',
    hello: 'Hej! Uczę się po nocach na poddaszu i widzę Twoją czerwoną latarkę. Fajnie wiedzieć, że ktoś jeszcze nie śpi.',
    ask: ['Potrzebuję tapety na sesję. Może {o}?', 'Zdałam kolokwium! W nagrodę chciałabym zobaczyć: {o}.', 'Znów zarywam noc. Podeślesz mi {o} na pocieszenie?'],
    off: 'Przeniosłam biurko od okna i kupiłam małą lampkę. Poddasze już Ci nie świeci w obiektyw!',
    guest: 'Po sesji wpadnę z herbatą. Zapal lampki, to będę wiedziała, że można.',
  },
  {
    id: 'couple', name: 'Ania i Jan', who: 'para z końca ulicy', light: 'girlandy na płocie', from: 24,
    likes: ['nebula', 'galaxy', 'globular'], color: '#e87a8a', hair: '#c89a5a', pair: true,
    hello: 'Dobry wieczór! Mieszkamy na końcu ulicy, to nasze girlandy tak mrugają. Podobno robisz zdjęcia nieba?',
    ask: ['Zbliża się nasza rocznica. Szukamy czegoś ładnego, może {o}?', 'Ramka już wisi i czeka. Zmieściłoby się w niej: {o}?', 'Jan się założył, że tego się nie da sfotografować: {o}. Wygramy?'],
    off: 'Zdjęliśmy girlandy z płotu. Twoje zdjęcia świecą ładniej.',
    guest: 'Mamy koc na dwoje i termos. Jak zapalisz lampki, przyjdziemy popatrzeć.',
  },
];
export const NB = Object.fromEntries(NEIGHBORS.map(n => [n.id, n]));

// Wyczyny i wydarzenia specjalne (naklejki na ostatniej stronie albumu)
export const FEATS = [
  { id: 'first', name: 'Pierwsza naklejka', sym: '1', color: '#5a7ac8', hint: 'Wklej pierwsze zdjęcie.' },
  { id: 'streak', name: 'Seria', sym: '≡', color: '#c8a030', hint: 'Zbierz obiekt jednym ciągiem.' },
  { id: 'perfect', name: 'Idealna noc', sym: '8/8', color: '#3a9a8a', hint: 'Wykorzystaj wszystkie 8 godzin.' },
  { id: 'lucky', name: 'Łut szczęścia', sym: '☘', color: '#4a9a4a', hint: 'Zostań mimo złej prognozy.' },
  { id: 'iss', name: 'Stacja kosmiczna', sym: '✦', color: '#8a8ab8', hint: 'Jesień: stuknij w porę.' },
  { id: 'geminids', name: 'Geminidy', sym: '☄', color: '#5a6ad0', hint: 'Zima: noc spadających gwiazd.' },
  { id: 'eclipse', name: 'Zaćmienie Księżyca', sym: '◐', color: '#b8503a', hint: 'Wiosna: pełnia, która ciemnieje.' },
  { id: 'perseids', name: 'Perseidy', sym: '☄', color: '#d07a4a', hint: 'Lato: sąsiedzi na tarasie.' },
  { id: 'comet', name: 'Kometa', sym: '★', color: '#d0b050', hint: 'Finał lata.' },
];

// Prezenty na taras za zapełnioną stronę albumu
export const GIFTS = ['latarenka', 'doniczka z wrzosem', 'poduszka dla psa', 'dzwonki wietrzne'];

// Układ domów w tle (współrzędne w pikselach grafiki 180x320, podstawa domów na y=150)
export const HOUSES = [
  { nb: 'lady', x: 2, w: 30, h: 26, roof: 10 },
  { nb: 'kid', x: 36, w: 28, h: 34, roof: 12 },
  { nb: 'gardener', x: 70, w: 36, h: 24, roof: 9 },
  { nb: 'student', x: 110, w: 26, h: 38, roof: 14 },
  { nb: 'couple', x: 142, w: 36, h: 28, roof: 10 },
];

// Pogoda: wagi prognoz [czysto, może chmura, raczej chmury] na porę roku
export const FORECAST_W = [[0.5, 0.3, 0.2], [0.45, 0.3, 0.25], [0.5, 0.3, 0.2], [0.6, 0.25, 0.15]];

// Wydarzenia: pora roku i noc (od 0)
export const EVENTS = {
  iss: { s: 0, nights: [2, 7] },
  geminids: { s: 1, night: 8 },
  eclipse: { s: 2, night: 5, blocks: [3, 4] },
  perseids: { s: 3, night: 3 },
  comet: { s: 3, night: 11 },
};

// Fazy Księżyca: cykl trwa jedną porę roku (12 nocy), bez faz garbatych, żeby niebo rzadko było rozjaśnione.
// MOON_SEQ[noc] = numer tekstury (0 nów, 2 sierp, 3 pierwsza połowa, 6 pełnia, 9 druga połowa, 10 drugi sierp).
export const MOON_SEQ = [2, 2, 3, 3, 3, 6, 9, 9, 9, 10, 10, 0];
export const moonIndex = night => MOON_SEQ[night % MOON_SEQ.length];
export const PHASES = [
  { id: 'ph_cres', name: 'Sierp', idx: 2 },
  { id: 'ph_q1', name: 'Pierwsza połowa', idx: 3 },
  { id: 'ph_full', name: 'Pełnia', idx: 6 },
  { id: 'ph_q3', name: 'Druga połowa', idx: 9 },
  { id: 'ph_cres2', name: 'Drugi sierp', idx: 10 },
];
export const phaseOf = night => PHASES.find(p => p.idx === moonIndex(night)) || null; // null = nów
export const brightMoon = night => moonIndex(night) === 6; // tylko pełnia rozjaśnia niebo o 1
for (const p of PHASES) FEATS.push({ id: p.id, name: p.name, sym: '☾', color: '#7a80b8', hint: 'Sfotografuj Księżyc w tej fazie.' });
FEATS.push({ id: 'wish', name: 'Odłamek życzenia', sym: '✧', color: '#c87ab0', hint: 'Złap spadającą gwiazdę.' });

// Ciekawostki do przeczytania na wywołanym zdjęciu
const FACTS = {
  moon: 'Księżyc oddala się od Ziemi o około 3,8 cm rocznie. Zawsze widzimy tę samą jego stronę, bo obraca się dokładnie raz na jedno okrążenie.',
  saturn: 'Pierścienie Saturna mają ponad 270 tysięcy km średnicy, ale miejscami tylko kilkadziesiąt metrów grubości. Sama planeta ma średnią gęstość mniejszą niż woda.',
  owl: 'Leży w Kasjopei, około 8 tysięcy lat świetlnych stąd. Dwie najjaśniejsze gwiazdy to „oczy” sowy, a rozłożone rzędy gwiazd to skrzydła.',
  dblcl: 'To dwie młode gromady, h i chi Persei, odległe o ponad 7 tysięcy lat świetlnych. Z ciemnego miejsca widać je gołym okiem jako mglistą plamkę między Perseuszem a Kasjopeją.',
  m15: 'Jedna z najstarszych gromad kulistych: ma około 12 miliardów lat. Jej środek jest tak gęsty, że astronomowie podejrzewają tam czarną dziurę.',
  m31: 'Najdalszy obiekt widoczny gołym okiem: 2,5 miliona lat świetlnych. Światło, które łapiesz, wyruszyło, zanim pojawił się człowiek rozumny. Za kilka miliardów lat zderzy się z Drogą Mleczną.',
  n7000: 'Jej kształt naprawdę przypomina kontynent, razem z Zatoką Meksykańską. Świeci na czerwono, bo pobliskie gorące gwiazdy pobudzają wodór.',
  m33: 'Trzecia co do wielkości galaktyka Grupy Lokalnej, po Andromedzie i Drodze Mlecznej. Leży niecałe 3 miliony lat świetlnych stąd i jest bardzo rozmyta, dlatego potrzebuje ciemnego nieba.',
  heart: 'Leży w Kasjopei, około 7500 lat świetlnych stąd. Gromada młodych gwiazd w środku wydmuchuje gaz i rzeźbi kształt serca.',
  helix: 'Jedna z najbliższych mgławic planetarnych, około 650 lat świetlnych stąd. Tak za kilka miliardów lat skończy Słońce: odrzuci otoczkę i zostawi białego karła.',
  jupiter: 'Zmieściłoby się w nim ponad 1300 Ziem. Cztery największe księżyce odkrył Galileusz w 1610 roku i widać je już w lornetce.',
  mars: 'Czerwony kolor to rdza, czyli tlenki żelaza w pyle. Na Marsie stoi Olympus Mons, najwyższy wulkan Układu Słonecznego: ponad 20 km.',
  m45: 'Gołym okiem widać zwykle sześć lub siedem gwiazd, a jest ich ponad tysiąc. W Japonii nazywają się Subaru, stąd logo z gwiazdkami.',
  m35: 'Leży u stóp Bliźniąt, niecałe 3 tysiące lat świetlnych stąd. Na niebie zajmuje tyle miejsca, co Księżyc w pełni.',
  m37: 'Najbogatsza z trzech gromad Woźnicy: ponad 500 gwiazd i około 500 milionów lat. W środku świeci pomarańczowy olbrzym.',
  m42: 'Kolebka gwiazd odległa o około 1300 lat świetlnych. Gołym okiem widać ją jako środkową „gwiazdę” w mieczu Oriona.',
  flame: 'Leży tuż obok Alnitaka, skrajnej gwiazdy Pasa Oriona. Ciemne pasma pyłu na jej tle wyglądają jak knot płomienia.',
  m1: 'Pozostałość po supernowej, którą chińscy astronomowie zapisali w 1054 roku. W środku wiruje pulsar: około 30 obrotów na sekundę.',
  rosette: 'Leży w Jednorożcu, około 5 tysięcy lat świetlnych stąd. Gromada gorących gwiazd w środku wydmuchała w niej dziurę.',
  horse: 'To ciemny obłok pyłu na tle świecącego wodoru. Zauważyła ją w 1888 roku Williamina Fleming na szklanej kliszy fotograficznej.',
  venus: 'Ma fazy jak Księżyc, co zauważył już Galileusz. Obraca się tak wolno, że dzień na Wenus trwa dłużej niż jej rok.',
  mizar: 'Dawny test wzroku: kto widzi Alkora obok Mizara, ma dobre oczy. Sam Mizar w teleskopie rozdziela się na kolejną parę gwiazd.',
  m44: 'Znana już w starożytności jako mglista plamka w Raku. Galileusz pierwszy rozdzielił ją teleskopem na pojedyncze gwiazdy.',
  m3: 'Około pół miliona gwiazd, 34 tysiące lat świetlnych stąd. Ma wyjątkowo dużo gwiazd zmiennych, które pulsują jak latarnie.',
  m81: 'Para odległa o 12 milionów lat świetlnych. Przyciąganie większej M81 wywołało w M82 gwałtowną burzę narodzin gwiazd.',
  m51: 'Pierwsza galaktyka, w której dostrzeżono spiralę: lord Rosse w 1845 roku. Mniejsza towarzyszka ciągnie ją grawitacją za jedno z ramion.',
  m104: 'Ciemny pas pyłu przecina ją jak rondo kapelusza. W środku siedzi czarna dziura o masie około miliarda Słońc.',
  leo3: 'M65, M66 i NGC 3628, około 35 milionów lat świetlnych stąd. Wszystkie trzy mieszczą się w jednym polu widzenia teleskopu.',
  m101: 'Większa od Drogi Mlecznej: około 170 tysięcy lat świetlnych średnicy. Widzimy ją dokładnie z góry, jak wiatraczek.',
  markarian: 'Fragment Gromady w Pannie, ponad 50 milionów lat świetlnych stąd. Co najmniej siedem galaktyk tego łańcucha porusza się razem.',
  albireo: 'Głowa Łabędzia. Kontrast złotej i niebieskiej gwiazdy to jedna z najładniejszych par na niebie.',
  hanger: 'Oficjalnie Collinder 399, zwana też Gromadą Brocchiego. To nie prawdziwa gromada, tylko przypadkowy układ gwiazd w różnych odległościach.',
  m13: 'Kilkaset tysięcy gwiazd, 22 tysiące lat świetlnych stąd. W 1974 roku z radioteleskopu Arecibo wysłano w jej stronę wiadomość do obcych.',
  m11: 'Jedna z najgęstszych gromad otwartych: prawie 3 tysiące gwiazd. Nazwę zawdzięcza kształtowi klucza lecących kaczek.',
  m57: 'Gaz odrzucony przez umierającą gwiazdę podobną do Słońca. W środku został po niej biały karzeł.',
  m27: 'Pierwsza odkryta mgławica planetarna: Charles Messier, 1764 rok. Świeci na zielonkawo dzięki tlenowi.',
  m17: 'Jedna z najjaśniejszych wylęgarni gwiazd w Drodze Mlecznej, około 5500 lat świetlnych stąd. Bywa też nazywana Łabędziem.',
  m8: 'Z ciemnego miejsca widać ją gołym okiem. Leży w Strzelcu, kilka tysięcy lat świetlnych stąd, a przecina ją ciemny pas pyłu: tytułowa laguna.',
  m16: 'To tutaj teleskop Hubble’a sfotografował Filary Stworzenia. Leży w Wężu, około 6500 lat świetlnych stąd.',
  veil: 'Strzępy gwiazdy, która wybuchła kilkanaście tysięcy lat temu. Cała pętla jest na niebie szersza niż sześć Księżyców w pełni.',
};
for (const o of OBJECTS) o.fact = FACTS[o.id] || '';

// Rozmowy z gośćmi na tarasie (po kolei, przy kolejnych wizytach)
export const TALKS = {
  lady: ['Mój Stefan miał lunetę z mosiądzu. Sprzedałam ją po jego śmierci i żałuję do dziś. Dobrze, że ktoś tu znowu patrzy w górę.', 'Wiesz, że ta ulica nazywała się kiedyś Gwiezdna? Zmienili, bo listonosz mylił z Gwiaździstą.', 'Przyniosłam Ci słoik konfitur. Ten na płocie niech zostanie dla kota.', 'Jak byłam mała, podczas zaciemnienia widziałam Drogę Mleczną z samego rynku. Myślałam, że już jej nie zobaczę.'],
  kid: ['A wiesz, że na Saturnie pada deszcz z diamentów? Pani mówi, że to tylko hipoteza. Co to hipoteza?', 'Jak dorosnę, będę astronautą. Albo kotem. Jeszcze nie wiem.', 'Narysowałem Twój taras. Pies wyszedł jak ziemniak, ale teleskop jest dobry.', 'Tata mówi, że kometa przyleci w wakacje. Mogę wtedy przyjść? Nawet jak będzie bardzo późno?'],
  gardener: ['Te lampy z czujnikiem to żona kazała. Na złodziei. Jedyny, kogo złapały, to jeż.', 'Ogród nocą pachnie inaczej. Nie wiedziałem, bo zawsze świeciłem sobie w oczy.', 'Przyniosłem pomidory. Nie dziękuj, bo i tak nie mam co z nimi robić.', 'Pokazałem zdjęcie szwagrowi. Powiedział, że to z internetu. To mu powiedziałem, żeby przyjechał i sam zobaczył.'],
  student: ['Studiuję fizykę, ale na wykładach nikt nie każe patrzeć w niebo. Trochę absurd.', 'Po sesji kupię lornetkę. Od czego zacząć? Tylko nie mów, że od Księżyca.', 'Czasem widzę z poddasza, jak machasz latarką do kota. On naprawdę wtedy wraca?', 'Napisałam o Twoich zdjęciach w pracy zaliczeniowej o zanieczyszczeniu światłem. Dostałam piątkę.'],
  couple: ['Poznaliśmy się na obozie żeglarskim. Jan udawał, że zna gwiazdozbiory. Znał jeden.', 'Wielki Wóz. Znałem Wielki Wóz. I to wystarczyło.', 'Girlandy wiszą teraz w sypialni. Na płocie i tak mrugały tylko nam w okno.', 'Na rocznicę chcemy tu przyjść z termosem. Kometa byłaby miłym dodatkiem, ale nie wymagamy.'],
};

// Dziennik: jedno zdanie o świcie po każdej nocy (pora roku x noc)
export const DIARY = [
  ['Pierwsza noc w nowym domu. Kartony stoją nierozpakowane, ale teleskop już nie.', 'Ktoś z naprzeciwka pomachał mi rano z ganku. Odmachałam.', 'Kot wrócił z papierkiem przy obroży. Więc tak tu się rozmawia.', 'Okolica świeci jak lotnisko. Mimo to coś widać.', 'Pan od ogrodu twierdzi, że w mieście nic nie widać. Wyzwanie przyjęte.', 'Pierwszy raz ktoś zgasił dla mnie światło. Dziwne uczucie.', 'Liście lecą na taras. Pies uważa, że to jego zasługa.', 'W sklepie pani zapytała, czy to ja „od tych gwiazd”. Chyba tak.', 'Zimno w palce. Kupić rękawiczki bez palców.', 'Niebo jest o ton ciemniejsze niż we wrześniu. Albo mi się wydaje.', 'Kot śpi w kartonie po teleskopie. Pies udaje, że go nie widzi.', 'Koniec jesieni. Znam już trzy osoby i jednego jeża.'],
  ['Pierwszy szron na poręczy. Koc ma teraz dwie warstwy.', 'Na poddaszu naprzeciwko do rana pali się lampa. Ktoś też nie śpi.', 'Herbata stygnie szybciej, niż ją piję.', 'Orion stoi nad dachami jak sąsiad, który przyszedł bez zaproszenia.', 'Pies ogrzewa mi stopy. Twierdzi, że to przypadek.', 'Śnieg odbija światło lamp. Ciekawe, czy dałoby się je zgasić wszystkie.', 'Na ulicy cisza taka, że słychać, jak mruga gwiazda.', 'Ktoś zostawił na progu rękawiczki bez palców. Bez liściku.', 'Spadające gwiazdy liczyliśmy we troje: ja, pies i termos.', 'Dni są krótkie, więc noce mam prawie dla siebie.', 'Kot przyniósł liścik z odciskiem łapy. Chyba własnej.', 'Koniec zimy. W kilku oknach jest już ciemno i wcale nie jest smutno.'],
  ['Pachnie ziemią. Pan Ryszard kopie grządki o siódmej rano.', 'Pierwszy raz ktoś usiadł obok mnie na tarasie.', 'W sklepie mówią, że latem przyleci kometa.', 'Galaktyki są blade jak oddech na szybie. Trzeba cierpliwości.', 'Antek zapytał, czy gwiazdy się kończą. Powiedziałam, że nie wiem.', 'Dwie nowe osoby na końcu ulicy. Ich płot mruga kolorowo.', 'Księżyc zrobił się miedziany i przez chwilę było naprawdę ciemno.', 'Na tarasie stoi już więcej kubków niż moich.', 'Pies nauczył się, że goście oznaczają okruszki.', 'Ola przyniosła lornetkę. Krzyczała na Jowisza.', 'Kot i pies leżą metr od siebie. Postęp.', 'Koniec wiosny. O komecie mówi już cała ulica.'],
  ['Noce są krótkie i ciepłe. Koc bardziej dla zasady.', 'Droga Mleczna stoi nad tarasem. Rok temu nie było jej widać.', 'Pani Helena przyniosła szarlotkę i krzesło. Zostaje.', 'Leżaki sąsiadów stoją u mnie na stałe. Niech stoją.', 'Świerszcze. Tyle świerszczy.', 'Ktoś zapytał, czy mogą zgasić latarnię na rogu. Podobno się da.', 'Antek zasnął na leżaku z lornetką na brzuchu.', 'Pan Ryszard mówi, że niebo jest „niczego sobie”. To u niego owacja.', 'Kometę widać już w lornetce. Mały kłębek.', 'Wszyscy pytają, o której przyjść. Mówię: jak zrobi się ciemno.', 'Jutro. Upiekłam ciasto, pierwszy raz w tym domu.', 'Rok temu nie znałam tu nikogo.'],
];

// Gwiazdozbiory do połączenia w albumie (minigierka), po trzy na porę roku. Punkty w dowolnej skali.
const C = (id, name, s, pts, edges) => ({ id, name, s, pts, edges });
export const CONS = [
  C('cas', 'Kasjopeja', 0, [[16, 62], [26, 74], [35, 64], [45, 76], [54, 66]], [[0, 1], [1, 2], [2, 3], [3, 4]]),
  C('peg', 'Pegaz', 0, [[98, 84], [124, 78], [130, 104], [104, 110], [84, 72], [72, 78]], [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 5]]),
  C('per', 'Perseusz', 0, [[50, 10], [46, 28], [40, 44], [30, 58], [22, 72], [56, 46], [68, 56], [78, 70]], [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [6, 7]]),
  C('ori', 'Orion', 1, [[36, 58], [60, 54], [44, 76], [49, 75], [54, 74], [34, 98], [64, 94], [48, 44]], [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 7], [1, 7]]),
  C('gem', 'Bliźnięta', 1, [[108, 50], [114, 70], [118, 92], [124, 46], [132, 66], [140, 86]], [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 4]]),
  C('tau', 'Byk', 1, [[10, 10], [34, 36], [44, 48], [52, 56], [60, 50], [70, 42], [92, 14], [50, 72]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [3, 7]]),
  C('uma', 'Wielki Wóz', 2, [[14, 66], [28, 60], [40, 64], [52, 72], [54, 88], [72, 90], [74, 74]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]]),
  C('leo', 'Lew', 2, [[104, 62], [112, 54], [120, 58], [118, 70], [106, 76], [140, 84], [150, 76]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]]),
  C('boo', 'Wolarz', 2, [[50, 90], [36, 60], [30, 34], [46, 12], [66, 30], [62, 58]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 5]]),
  C('cyg', 'Łabędź', 3, [[58, 44], [63, 62], [68, 80], [74, 102], [42, 70], [88, 54]], [[0, 1], [1, 2], [2, 3], [4, 1], [1, 5]]),
  C('lyr', 'Lutnia', 3, [[122, 56], [126, 68], [134, 70], [132, 84], [124, 82]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1]]),
  C('aql', 'Orzeł', 3, [[50, 40], [42, 30], [58, 50], [20, 52], [80, 24], [50, 78]], [[1, 0], [0, 2], [0, 3], [0, 4], [0, 5]]),
];
// Obiekty leżące w danym gwiazdozbiorze (albo tuż obok): zdjęcie któregoś z nich odblokowuje wzór na Mapie Nieba.
const MEMBERS = { cas: ['owl', 'heart'], peg: ['m15', 'm31'], per: ['dblcl', 'm33'], ori: ['m42', 'flame', 'horse'], gem: ['m35', 'jupiter'], tau: ['m45', 'm1'],
  uma: ['mizar', 'm81', 'm101', 'm51'], leo: ['leo3', 'm44'], boo: ['m3'], cyg: ['albireo', 'veil'], lyr: ['m57'], aql: ['m11', 'hanger'] };
for (const c of CONS) c.members = MEMBERS[c.id];
export const CON = Object.fromEntries(CONS.map(c => [c.id, c]));
