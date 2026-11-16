// Dane gry: obiekty, sąsiedzi, wydarzenia. Wszystko, co dotyczy balansu, jest tutaj.

export const SEASONS = ['Jesień', 'Zima', 'Wiosna', 'Lato'];
export const NIGHTS_PER_SEASON = 7;
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
  O('venus', 'Wenus', 'Wenus', 'planet', 2, 1, 1, 'Tylko w pierwszych blokach, potem zachodzi.', { k: 'planet', c: '#fff6e0', r: 9, crescent: true }, { win: [1, 2] }),
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
    id: 'student', name: 'Ola', who: 'studentka z poddasza', light: 'lampę biurkową', from: 7,
    likes: ['nebula', 'galaxy'], color: '#e8a070', hair: '#3a2a4a',
    hello: 'Hej! Uczę się po nocach na poddaszu i widzę Twoją czerwoną latarkę. Fajnie wiedzieć, że ktoś jeszcze nie śpi.',
    ask: ['Potrzebuję tapety na sesję. Może {o}?', 'Zdałam kolokwium! W nagrodę chciałabym zobaczyć: {o}.', 'Znów zarywam noc. Podeślesz mi {o} na pocieszenie?'],
    off: 'Przeniosłam biurko od okna i kupiłam małą lampkę. Poddasze już Ci nie świeci w obiektyw!',
    guest: 'Po sesji wpadnę z herbatą. Zapal lampki, to będę wiedziała, że można.',
  },
  {
    id: 'couple', name: 'Ania i Jan', who: 'para z końca ulicy', light: 'girlandy na płocie', from: 14,
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
  { id: 'perfect', name: 'Idealna noc', sym: '8/8', color: '#3a9a8a', hint: 'Wykorzystaj wszystkie 8 bloków.' },
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
  iss: { s: 0, nights: [2, 5] },
  geminids: { s: 1, night: 4 },
  eclipse: { s: 2, night: 3, blocks: [3, 4] },
  perseids: { s: 3, night: 1 },
  comet: { s: 3, night: 6 },
};
export const FULL_MOON_NIGHT = 3;
