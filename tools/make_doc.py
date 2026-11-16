#!/usr/bin/env python3
"""Buduje docs/opis-projektu.html (i PDF przez Chrome) z opisu poniżej i tabel wyciągniętych z src/data.js.
Uruchom po każdej zmianie w grze:  python3 tools/make_doc.py"""
import re, subprocess, datetime, pathlib, html

ROOT = pathlib.Path(__file__).resolve().parent.parent
data = (ROOT / 'src' / 'data.js').read_text(encoding='utf-8')
SEASONS = ['Jesień', 'Zima', 'Wiosna', 'Lato']
TYPES = {'moon': 'Księżyc', 'planet': 'planeta', 'double': 'gwiazda podwójna', 'cluster': 'gromada', 'globular': 'gromada kulista', 'nebula': 'mgławica', 'galaxy': 'galaktyka'}
GAMES = {'moon': 'ostrość', 'planet': 'ostrość', 'double': 'ostrość', 'cluster': 'nakładanie klatek', 'globular': 'nakładanie klatek', 'nebula': 'suwaki barw', 'galaxy': 'ścieranie szumu'}

objs = re.findall(r"O\('(\w+)', '([^']+)', '[^']+', '(\w+)', (\d), (\d), (\d), '([^']*)'", data)
facts = dict(re.findall(r"^  (\w+): '((?:[^'\\]|\\.)*)',$", data, re.M))
nbs = re.findall(r"id: '(\w+)', name: '([^']+)', who: '([^']+)', light: '([^']+)', from: (\d+)", data)
nights = int(re.search(r'NIGHTS_PER_SEASON = (\d+)', data).group(1))
e = html.escape

def obj_table():
    rows = ''.join(f"<tr><td>{e(n)}</td><td>{TYPES[t]}</td><td>{SEASONS[int(s)]}</td><td>{lvl}</td><td>{b} / {int(b)*2} / {int(b)*3}</td><td>{GAMES[t]}</td><td>{e(note)}</td></tr>" for _, n, t, s, lvl, b, note in objs)
    return "<table><tr><th>Obiekt</th><th>Typ</th><th>Pora</th><th>Poziom</th><th>Bloki na ★ / ★★ / ★★★</th><th>Minigierka</th><th>Notatka</th></tr>" + rows + "</table>"

def fact_list():
    return '<ul>' + ''.join(f"<li><b>{e(n)}:</b> {e(facts.get(i, ''))}</li>" for i, n, *_ in objs) + '</ul>'

def nb_table():
    rows = ''.join(f"<tr><td>{e(n)}</td><td>{e(w)}</td><td>{e(l)}</td><td>{SEASONS[int(f)//nights]}, noc {int(f)%nights+1}</td></tr>" for _, n, w, l, f in nbs)
    return "<table><tr><th>Imię (robocze)</th><th>Kto</th><th>Jego światło</th><th>Pierwszy liścik</th></tr>" + rows + "</table>"

BODY = f"""
<h1>Under a Blanket of Stars</h1>
<p class="meta">Opis projektu gry · stan na {datetime.date.today().isoformat()} · dokument generowany z kodu (tools/make_doc.py)</p>

<h2>1. W skrócie</h2>
<p>Cozy gra pixel-art na telefon (pion) o obserwowaniu nocnego nieba z tarasu. Bohaterka zawinięta w koc w gwiazdki co noc planuje 8 bloków czasu: szuka obiektów, zbiera ich światło teleskopem, wywołuje zdjęcia w dotykowych minigierkach i wkleja je do albumu. Kot nosi liściki od sąsiadów, pies leży obok. Każdy zaprzyjaźniony sąsiad gasi swoje światło, więc niebo ciemnieje i odsłania słabsze obiekty, aż do komety w finale lata.</p>
<p>Zasada nadrzędna: <b>nic nie przepada</b>. Nie ma kar, zebrane światło zostaje na kolejne noce, plan można zmieniać w trakcie nocy.</p>

<h2>2. Platforma i technikalia</h2>
<ul>
<li>Silnik: Phaser 4 (4.2.1), czysty JavaScript w modułach ES, bez kroku budowania.</li>
<li>Hosting: GitHub Pages z gałęzi main (repo under_a_blanket_of_stars).</li>
<li>Ekran: pionowy, logiczne 360×640; grafika pixel-art w siatce 360 px szerokości, tekst w podwójnej rozdzielczości.</li>
<li>Sterowanie: stuknięcia i przeciąganie.</li>
<li>Zapis: localStorage, po każdym bloku. Zmiana formatu zapisu resetuje postęp (gra jest w budowie).</li>
<li>Grafika: w całości rysowana kodem do tekstur (src/art.js), do podmiany na sprite'y pod tymi samymi kluczami.</li>
<li>Fonty: Nunito (interfejs, tytuł) i Patrick Hand (liściki, dziennik) z Google Fonts.</li>
</ul>

<h2>3. Struktura czasu</h2>
<ul>
<li>Rok = 4 pory roku × {nights} nocy = {nights*4} nocy. Po komecie rok zaczyna się od nowa i można dalej uzupełniać album.</li>
<li>Noc = 8 bloków. Zimą kokon wytrzymuje 6 bloków; herbata i pies (stuknięcie) dodają po jednym. Latem pierwszy i ostatni blok to zmierzch: tylko obiekty poziomu 1.</li>
<li>Między nocami jest animacja świtu: niebo jaśnieje, wschodzi słońce, przelatują ptaki, a w dzienniku pojawia się jedno zdanie fabuły (48 wpisów, po jednym na noc).</li>
</ul>

<h2>4. Blok: co można robić</h2>
<p>Gracz stuka blok (albo obiekt na niebie, słoik, gościa) i wybiera czynność. Każda zajmuje jeden blok.</p>
<table>
<tr><th>Czynność</th><th>Co daje</th><th>Pogoda</th></tr>
<tr><td>Zbieranie światła obiektu</td><td>+1 światło (+2 przy bardzo ciemnym niebie: ciemność ≥ poziom + 3)</td><td>czyste niebo; cienka chmura przepuszcza tylko obiekty poziomu 1</td></tr>
<tr><td>Skanuj niebo</td><td>minigierka „ciepło–zimno”: namierza jeden nieodkryty obiekt</td><td>nie przy chmurach</td></tr>
<tr><td>Wywołaj zdjęcie</td><td>minigierka zależna od typu obiektu; daje naklejkę albo lepszą odbitkę</td><td>bez znaczenia</td></tr>
<tr><td>Przeczytaj liściki</td><td>otwiera wszystkie liściki ze słoika</td><td>bez znaczenia</td></tr>
<tr><td>Wyślij zdjęcia kotem</td><td>wysyła wszystkie gotowe zdjęcia, +1 serce u każdego adresata</td><td>bez znaczenia</td></tr>
<tr><td>Porozmawiaj z gościem</td><td>kwestia fabularna sąsiada, +1 serce (pierwsze 4 rozmowy), raz na noc na gościa</td><td>bez znaczenia</td></tr>
<tr><td>Księżyc: faza</td><td>naklejka fazy do kolekcji (sierp, pierwsza kwadra, garbaty, pełnia, ostatnia kwadra)</td><td>nie przy chmurach</td></tr>
<tr><td>Wydarzenie (zaćmienie, kometa)</td><td>naklejka wydarzenia</td><td>nie przy chmurach</td></tr>
<tr><td>Odpoczynek</td><td>nic; pusty blok</td><td>bez znaczenia</td></tr>
</table>

<h2>5. Prognoza</h2>
<ul>
<li>Ikonka nad każdym blokiem: czysto / może być chmura / raczej chmury. Bez procentów.</li>
<li>Dwa najbliższe bloki mają prognozę ostateczną, dalsze mogą się jeszcze przesunąć o jeden stopień.</li>
<li>Pogoda rozstrzyga się dopiero w bloku: czysto, cienka chmura albo chmury. Przy „raczej chmury” jest ok. 22% szans na czyste niebo (naklejka „Łut szczęścia”).</li>
</ul>

<h2>6. Ciemność nieba</h2>
<p>Ciemność = 2 + liczba zgaszonych świateł sąsiadów, −1 gdy palą się lampki na tarasie, −1 w noce wokół pełni (noce 4–6 każdej pory), minimum 1. Obiekt wymaga ciemności równej swojemu poziomowi (1–4). Zaćmienie Księżyca na dwa bloki znosi karę za pełnię.</p>
<p>Lampki to wybór: zapalone dają jeden liścik więcej na noc i gości na tarasie, zgaszone dają ciemniejsze niebo.</p>

<h2>7. Obiekty, światło i gwiazdki</h2>
<ul>
<li>40 prawdziwych obiektów widocznych z Polski, po 10 na porę roku. Jasne (poziom 1) są znane od razu; pozostałe wiszą na niebie jako mgliste plamki, dopóki gracz ich nie namierzy skanowaniem.</li>
<li>Obiekty są rozsiane po całym niebie (stałe miejsca, inne w każdej porze). Stuknięcie obiektu ustawia go jako cel bieżącego bloku.</li>
<li>Światło układa się w progi: b bloków = ★, 2b = ★★, 3b = ★★★ (komplet). Minigierka wywoływania nie da więcej gwiazdek, niż pozwala zebrane światło. Światło nie znika po wywołaniu.</li>
<li>Pierwszą naklejkę gracz sam przeciąga do albumu; lepsza odbitka podmienia ją automatycznie.</li>
<li>Złota ramka: obiekt (wymagający więcej niż 1 bloku) doprowadzony do pierwszej gwiazdki jednym ciągiem, jednej nocy.</li>
<li>Niektóre obiekty mają okna widoczności (np. Andromeda dopiero od bloku 3, Wenus tylko w blokach 1–2) albo nie lubią jasnego Księżyca.</li>
</ul>
{obj_table()}

<h2>8. Wywoływanie zdjęć (minigierki)</h2>
<ul>
<li><b>Ostrość</b> (Księżyc, planety, gwiazdy podwójne): suwak, aż rozdwojony obraz zejdzie się w jeden.</li>
<li><b>Nakładanie klatek</b> (gromady): przeciąganie 2–3 przesuniętych klatek tak, żeby gwiazdy się pokryły.</li>
<li><b>Suwaki barw</b> (mgławice): trzy suwaki (wodór, tlen, gwiazdy), każda warstwa świeci najmocniej w jednym punkcie.</li>
<li><b>Ścieranie szumu</b> (galaktyki): ścieranie palcem z ograniczonym „zużyciem ściereczki”.</li>
</ul>
<p>Więcej zebranego światła = większa tolerancja. Na ekranie wyniku i w albumie jest ciekawostka o obiekcie.</p>

<h2>9. Album</h2>
<ul>
<li>Strony: Jesień, Zima, Wiosna, Lato (po 10 zdjęć, szare kontury brakujących) oraz Wyczyny.</li>
<li>Stuknięcie zdjęcia otwiera kartę: duży kadr, gwiazdki, notatka i ciekawostka.</li>
<li>Wyczyny i wydarzenia: Pierwsza naklejka, Seria, Idealna noc (8/8 udanych bloków), Łut szczęścia, Stacja kosmiczna, Geminidy, Zaćmienie Księżyca, Perseidy, Kometa oraz 5 faz Księżyca.</li>
<li>Zapełniona strona pory roku = prezent od sąsiadów na taras (latarenka, doniczka z wrzosem, poduszka dla psa, dzwonki wietrzne).</li>
</ul>

<h2>10. Sąsiedzi, liściki, goście</h2>
{nb_table()}
<ul>
<li>Kot wychodzi po pierwszym bloku i wraca z liścikami (2 na noc, 3 przy zapalonych lampkach). Najpierw piszą ci, których bohaterka zna najsłabiej.</li>
<li>Liścik = prośba o zdjęcie konkretnego obiektu. Sąsiad nigdy nie prosi drugi raz o to samo i najpierw prosi o zdjęcia, których gracz jeszcze nie ma. Prośby dotyczą obiektów osiągalnych przy obecnej liczbie zgaszonych świateł.</li>
<li>Serca: 2 = sąsiad gasi swoje światło; 3 = zaczyna wpadać na taras (co drugą noc, gdy palą się lampki).</li>
<li>Z gościem można porozmawiać (blok): po 4 kwestie fabularne na sąsiada.</li>
<li>W noce Perseidów i komety na taras przychodzą wszyscy znajomi.</li>
</ul>

<h2>11. Księżyc</h2>
<p>Księżyc jest jeden i zmienia fazę co noc; cykl trwa jedną porę roku. Pora zaczyna się wąskim sierpem, pełnia wypada w 5. noc, nów w 11. Jesienią Księżyc jest też zwykłym obiektem do albumu. W każdej porze można złapać brakującą fazę do kolekcji. Wokół pełni niebo jest jaśniejsze o 1, w nów najciemniejsze.</p>

<h2>12. Wydarzenia specjalne</h2>
<table>
<tr><th>Wydarzenie</th><th>Kiedy</th><th>Jak działa</th></tr>
<tr><td>Przelot stacji kosmicznej</td><td>jesień, noc 3 (powtórka w noc 8)</td><td>jasna kropka sunie po niebie, trzeba stuknąć w porę</td></tr>
<tr><td>Geminidy</td><td>zima, noc 9</td><td>noc bez teleskopu: 30 sekund stukania w spadające gwiazdy</td></tr>
<tr><td>Zaćmienie Księżyca</td><td>wiosna, noc 5 (pełnia), bloki 4–5</td><td>Księżyc ciemnieje, kara za pełnię znika; można je sfotografować</td></tr>
<tr><td>Perseidy</td><td>lato, noc 4</td><td>jak Geminidy, z sąsiadami na tarasie</td></tr>
<tr><td>Kometa</td><td>lato, noc 12 (finał)</td><td>długość warkocza zależy od ciemności; po zdjęciu zakończenie fabuły</td></tr>
</table>

<h2>13. Fabuła</h2>
<p>Bohaterka dopiero się wprowadziła i nikogo nie zna. Niebo staje się sposobem na poznanie ludzi. Łuk na cztery pory: jesień (nowa, jasne niebo, pierwszy liścik), zima (kolejni sąsiedzi, pierwsze zgaszone światła, pierwsze mgławice), wiosna (goście na tarasie, plotka o komecie), lato (ciemne niebo, pełny taras, wspólna noc pod kometą). Kot i pies trzymają się osobno, w finale śpią razem.</p>
<p>Fabułę niosą: liściki (powitanie + 3 prośby + „zgasiłam światło” + „wpadnę” na sąsiada), rozmowy z gośćmi (4 na sąsiada), dziennik o świcie (48 zdań) i okienka na początku każdej pory roku.</p>

<h2>14. Wygląd</h2>
<ul>
<li>Paleta indygo–fiolet z ditheringiem; ciepłe punkty światła (lampki, okna). Niebo zajmuje około trzech czwartych sceny, taras jest wąskim pasem na dole.</li>
<li>Paralaksa: gwiazdy, obłoki gwiezdne, chmurki, miasto w oddali i domy dryfują z różną prędkością i wychylają się za palcem w poziomie i pionie.</li>
<li>Na niebie: gwiazdozbiory połączone liniami (po dwa na porę roku, z podpisami), spadające gwiazdy jako ozdoba, Droga Mleczna latem.</li>
<li>Taras: bohaterka w granatowym kocu w gwiazdki na drewnianym fotelu, mosiężny teleskop, pies, chodzący kot, słoik na płocie, migocząca girlanda lampek.</li>
<li>Interfejs: zaokrąglone rogi, font Nunito; liściki i dziennik pismem odręcznym na kremowym papierze.</li>
</ul>

<h2>15. Ciekawostki o obiektach (tekst w grze)</h2>
{fact_list()}

<h2>16. Pliki</h2>
<ul>
<li>index.html, lib/phaser.esm.min.js</li>
<li>src/data.js – obiekty, sąsiedzi, wydarzenia, fazy, ciekawostki, rozmowy, dziennik, gwiazdozbiory</li>
<li>src/state.js – stan, zapis, reguły</li>
<li>src/art.js – grafika rysowana kodem; src/world.js – taras i niebo</li>
<li>src/NightScene.js, ScanScene.js, DevelopScene.js, AlbumScene.js, DawnScene.js, main.js (ekran tytułowy), ui.js</li>
<li>tools/make_doc.py – ten dokument</li>
</ul>

<h2>17. Rzeczy otwarte</h2>
<ul>
<li>Imiona sąsiadów, kota i psa są robocze.</li>
<li>Balans: tempo zdobywania gwiazdek, liczba nocy w porze, próg podwójnego światła.</li>
<li>Zdjęcia obiektów mają 48×48 pikseli i są generowane proceduralnie; do ewentualnego przerysowania.</li>
<li>Brak dźwięku i muzyki.</li>
<li>Naklejki wyczynów wklejają się same (tylko zdjęcia wkleja się ręcznie).</li>
</ul>
"""

CSS = "body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:10.5pt;line-height:1.45;color:#1c1c2a;margin:0}h1{font-size:22pt;margin:0 0 2pt}h2{font-size:13pt;margin:16pt 0 4pt;color:#2a2f7a;border-bottom:1px solid #c8cbe8;padding-bottom:2pt}.meta{color:#666;font-size:9pt;margin-top:0}table{border-collapse:collapse;width:100%;font-size:8.5pt;margin:6pt 0}th,td{border:1px solid #c8cbe8;padding:3pt 5pt;text-align:left;vertical-align:top}th{background:#eceefa}tr{break-inside:avoid}ul{margin:4pt 0;padding-left:16pt}li{margin:1.5pt 0}@page{size:A4;margin:16mm 15mm}"
out = ROOT / 'docs' / 'opis-projektu.html'
out.write_text(f"<!doctype html><html lang='pl'><head><meta charset='utf-8'><title>Under a Blanket of Stars: opis projektu</title><style>{CSS}</style></head><body>{BODY}</body></html>", encoding='utf-8')
pdf = ROOT / 'docs' / 'opis-projektu.pdf'
chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
r = subprocess.run([chrome, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', f'--print-to-pdf={pdf}', out.as_uri()], capture_output=True, text=True, timeout=120)
print('objects', len(objs), 'facts', len(facts), 'neighbors', len(nbs), '| pdf', pdf.exists() and pdf.stat().st_size, r.returncode, r.stderr[-200:])
