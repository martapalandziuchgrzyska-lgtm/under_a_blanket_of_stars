# Under a Blanket of Stars

Cozy gra pixel-art o obserwowaniu nocnego nieba z tarasu. Phaser 4 (4.2.1), czysty JavaScript, bez kroku budowania.

## Uruchomienie

Gra używa modułów ES, więc potrzebuje serwera HTTP (otwarcie `index.html` z dysku nie zadziała):

```bash
python3 -m http.server 8123
```

Potem otwórz http://localhost:8123. Na telefonie: wrzuć folder na GitHub Pages i otwórz adres strony.

## Struktura

- `index.html` – strona startowa
- `lib/phaser.esm.min.js` – Phaser 4
- `src/data.js` – obiekty, sąsiedzi, wydarzenia, balans
- `src/state.js` – stan gry, zapis (localStorage), reguły
- `src/art.js` – cała grafika rysowana kodem (do podmiany na sprite'y)
- `src/world.js` – taras, domy, niebo
- `src/NightScene.js` – noc: plan 8 bloków, prognoza, liściki
- `src/DevelopScene.js` – minigierki wywoływania zdjęć
- `src/AlbumScene.js` – album z naklejkami
- `src/ScanScene.js` – skanowanie nieba
- `src/DawnScene.js` – świt między nocami

## Opis projektu

Pełny opis gry (zasady, zawartość, wygląd, rzeczy otwarte) jest w `docs/opis-projektu.pdf`. Po każdej zmianie w grze zaktualizuj tekst w `tools/make_doc.py` i uruchom:

```bash
python3 tools/make_doc.py
```
