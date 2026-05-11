# Function Studio

## 1. Wejscie do Function Studio

`Function Studio` to osobny obszar do konfiguracji logiki pola po polu dla wybranego stage.

Na panelu widzisz:

- przycisk `Open Function Studio`,
- informacje o aktywnym node (`Active node: ...`),
- liczbe funkcji skonfigurowanych w tym kroku (`functions in set: ...`).

### Co robimy na tym etapie

1. Zaznaczamy konkretny stage na canvasie.
2. Sprawdzamy, czy aktywny node jest poprawny.
3. Klikamy `Open Function Studio`.

Po otwarciu przechodzisz do edytora funkcji, gdzie ustawiasz mapowania i wyrazenia dla pola stage.

## 2. Uklad ekranu - najpierw lewa strona, potem prawa

### Lewa strona (od gory)

- **Source Mode**:
  - wybierasz skad stage bierze dane (`none` albo `previous-stage`),
  - to ustawia kontekst dalszej pracy.
- **Hide / Show inherited**:
  - pokazuje lub ukrywa pola dziedziczone.
- **Search field...**:
  - szybkie filtrowanie listy pol.
- **Lista pol (root + inherited + juz skonfigurowane)**:
  - tutaj wybierasz pole, ktore chcesz konfigurowac.

### Source Mode i Hide (prosto)

`Source Mode` ustawia, z jakiego payloadu stage bierze dane:

- **none**: stage startuje od nowego payloadu opartego o schema eventu.
- **previous-stage**: stage bierze dane z poprzedniego kroku i dziedziczy jego pola.

Przycisk **Hide** chowa pola `inherited`, zeby lista byla czystsza i latwiejsza do pracy.
To przydatne, gdy chcesz skupic sie tylko na polach, ktore faktycznie edytujesz.

### Lewa strona (na dole)

Na dole listy widzisz pola, ktore juz maja przypisana logike (np. `FN`, `LITERAL`, `REF`).
To jest szybki podglad, co jest juz ustawione dla danego stage.

### Co oznaczaja badge

- **FN**: wartosc pola jest liczona funkcja (`$fn`).
- **LITERAL**: pole ma wpisana stala wartosc (np. tekst, liczbe, `true/false`, `null`, JSON).
- **REF**: pole bierze wartosc z innego pola przez referencje (`$ref`).
- **PATH**: pole bierze wartosc ze sciezki danych (`$path`).
- **WHEN**: pole ma logike warunkowa (`$when`) i zwraca wartosc zaleznie od warunku.
- **INHERITED**: pole jest odziedziczone z poprzedniego stage i nie zostalo jeszcze nadpisane.
- **required** (czerwone oznaczenie): pole jest wymagane przez schema JSON i musi byc uzupelnione; to nie jest tryb mapowania.

## 3. Prawa sekcja - Function Task (Literal)

To jest najczestszy ekran do ustawienia wartosci pola w stage.

### Co oznacza kazde pole

- **Schema**: wybierasz schema/event, dla ktorego konfigurujesz mapowanie.
- **Tasks**: masz dwa tryby pracy.
- **Function Task**: mapowanie pola w payloadzie stage.
- **State Task**: operacje na stanie (`state`), zamiast zwyklego przypisania pola.
- **Target field**: pole, ktore teraz edytujesz (np. `id`).
- **Value Type**: sposob ustawienia wartosci (`Literal`, `FN`, `REF`, `PATH`, `WHEN`).
- **Literal type**: typ stalej wartosci (np. `String`, `Number`, `Boolean`, `Null`, `JSON`).
- **Literal value**: konkretna wartosc wpisywana do pola.
- **Apply**: zapisuje zmiane dla aktualnie wybranego pola.

### Jak pracowac na tym ekranie

1. Wybierz pole po lewej stronie.
2. Na prawej stronie ustaw `Tasks = Function Task`.
3. Ustaw `Value Type` (np. `Literal`).
4. Wybierz `Literal type`.
5. Wpisz `Literal value`.
6. Kliknij `Apply`.
7. Przejdz do kolejnego pola z listy.

Po `Apply` konfiguracja pola trafia do seta w danym stage.

## 4. Prawa sekcja - State Task

`State Task` sluzy do aktualizacji obiektu `state` na podstawie danych z eventu lub wyrazenia.

### Co oznacza kazde pole

- **Source field (currentEvent)**: pole z aktualnego eventu, z ktorego pobierasz wartosc.
- **Target state path (bez prefixu `state.`)**: miejsce zapisu w stanie, np. `entity.id`.
- **Mapping mode**: sposob zapisu do state.
- **Assign value ($ref)**: bezposrednie przypisanie z wybranego `Source field`.
- **Function ($fn)**: zapis wartosci wyliczonej funkcja.
- **New mapping**: czysci formularz pod dodanie kolejnego wpisu.
- **Apply State Task**: zapisuje/aktualizuje mapping w tabeli ponizej.
- **Lista mappingow na dole**: gotowe wpisy `statePath -> mapping` z akcjami `Edit` i `Remove`.

### Jak pracowac na tym ekranie

1. Ustaw `Target state path`.
2. Wybierz `Mapping mode`.
3. Uzupelnij wymagane pola dla tego trybu.
4. Kliknij `Apply State Task`.
5. Powtorz dla kolejnych pol stanu.

> **Wazne:** mapowania `State Task` wykonywane sa po iteracji stage.
