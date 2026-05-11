# New Workflow (Create New)

## 1. Tworzenie nowego workflow

To jest ekran, ktory widzisz po kliknieciu `Create New Workflow` w sekcji Management.
Startujesz z pustym canvasem i od razu budujesz flow od zera.

### Co widzimy na ekranie

- **Canvas** po lewej, na ktorym dodajesz i laczysz kroki.
- **Przyciski nad canvasem**:
  - `Add stage`
  - `Reset`
- **Panel Workflow** po prawej:
  - `Workflow ID`
  - `Save`
  - `Add state`
  - `Show DSL Payload`
  - `Open in Playground`
- **Node Tools** po prawej (aktywne po zaznaczeniu konkretnego node na canvasie).

### Jak stworzyc nowy flow krok po kroku

1. Ustaw `Workflow ID` w panelu po prawej.
2. Kliknij `Add stage`, aby dodac pierwszy krok.
3. Dodaj kolejne kroki i ustaw ich kolejnosc.
4. Kliknij krok na canvasie i uzupelnij jego ustawienia w `Node Tools`.
5. (Opcjonalnie) kliknij `Add state`, jesli workflow ma miec stan globalny.
6. Kliknij `Show DSL Payload`, aby sprawdzic finalny JSON.
7. Kliknij `Save`, zeby zapisac nowy workflow.

### Co mozna zrobic

- Budowac flow od zera na pustym canvasie.
- Dodawac i laczyc kroki pipeline.
- Ustawic i zmieniac `Workflow ID` przed zapisem.
- Dodac `Workflow State` i mapowania state.
- Podejrzec DSL przed zapisem.
- Otworzyc Playground z aktualnym payloadem.

## 2. Dodanie nowego stage i wybor schemy

Po kliknieciu `Add stage` otwiera sie okno `Add Stage`.
W tym kroku wybierasz, jaki schema ma byc podpiety pod nowy stage.

### Co robimy w tym oknie

1. Otwieramy liste `Schema repo`.
2. Wybieramy konkretny schema event (np. `entity-opened (v1)`).
3. Klikamy `Add stage`.

Po tej akcji nowy stage pojawi sie na canvasie i bedzie mial przypisany wybrany `event`.

### Co to daje

- Stage od razu ma poprawnie podpiety schema.
- Pola stage sa budowane na podstawie wybranego schema.
- Dalsza konfiguracja (`Node Tools`, mapowania, funkcje) jest spojna z tym schematem.

### Na co uwazac

- Jesli nie wybierzesz poprawnego schema, stage moze miec niepoprawne pola.
- Gdy nie ma schematow w `Schema Repo`, nie da sie sensownie dodac nowego stage.
- `Cancel` zamyka okno bez dodawania kroku.

## 3. Co oznacza kazde pole na karcie stage

Po dodaniu stage na canvasie pojawia sie karta kroku. Kazdy element na niej cos oznacza:

- **Tytul**: nazwa (tytul) kroku widoczna na canvasie.
- **START**: znacznik, ze ten krok jest aktualnie pierwszym krokiem w pipeline.
- **END**: znacznik, ze ten krok jest aktualnie ostatnim krokiem w pipeline.
- **#N**: numer porzadkowy kroku w przeplywie.
- **Nazwa eventu**: event/schema przypisany do tego kroku.
- **Stage ID**: techniczny identyfikator `stage`.
- **repeat xN**: liczba powtorzen kroku (`repeat`).
- **emit on/off**: informacja, czy krok emituje wynik (`emit`).
- **Kropka/uchwyty po bokach i gorze**: punkty laczenia do budowania przeplywu miedzy krokami.

Jesli klikniesz karte stage, po prawej stronie otworza sie szczegolowe ustawienia tego kroku (`Node Tools`).

## 4. Node Tools po zaznaczeniu stage

Po kliknieciu stage na canvasie po prawej stronie masz zestaw narzedzi:

- `Repeat`
- `Emit`
- `Stage Inspector`
- `Function Studio`

To sa ustawienia konkretnego kroku, nie calego workflow.

## 5. Repeat - co oznacza kazde pole

Sekcja `Repeat` sluzy do kontroli liczby powtorzen i warunkow petli dla wybranego stage.

### Pola i przyciski

- **Max iterations (repeat)**:
  - liczba maksymalnych iteracji kroku,
  - np. `220` oznacza, ze krok moze wykonac sie do 220 razy.
- **Add repeatWhile condition**:
  - dodaje warunek wykonywany przed kazda iteracja,
  - petla idzie dalej, dopoki warunek jest spelniony.
- **Add repeatUntil condition**:
  - dodaje warunek sprawdzany po iteracji,
  - petla zatrzymuje sie, gdy warunek zostanie spelniony.

### Jak to ustawic praktycznie

1. Wpisz limit w `Max iterations (repeat)` jesli chcesz sztywny max.
2. Dodaj `repeatWhile`, jesli petla ma zalezec od warunku startowego.
3. Dodaj `repeatUntil`, jesli chcesz konczyc po osiagnieciu celu.

### RepeatWhile (z grubsza)

`repeatWhile` to po prostu warunek: **powtarzaj krok, dopoki warunek jest prawdziwy**.

Przyklad: powtarzaj dopoki stosunek przetworzonych elementow do calkowitych jest mniejszy niz 75%:

```txt
lt(
  percent(
    state.entity.legCount,
    add(
      state.entity.legCount,
      state.entity.waypointCount
    )
  ),
  75
)
```

Czyli w praktyce: krok bedzie sie powtarzal, dopoki wynik tego porownania jest mniejszy niz `75`.

### RepeatUntil (z grubsza)

`repeatUntil` dziala odwrotnie do `repeatWhile`: **powtarzaj krok, az warunek zostanie spelniony**.

Przyklad z funkcja `choiceWeighted(...)` jako losowy warunek stopu:

```txt
choiceWeighted(
  10:50,
  20:30,
  30:20
)
```

Z grubsza: system losuje wartosc wedlug podanych wag i na tej podstawie decyduje, kiedy zakonczyc powtarzanie.

> **Wazna uwaga:** jesli ustawisz tylko `repeatWhile` lub `repeatUntil`, a nie podasz `repeat`, kompilator stosuje wewnetrzny guard (limit bezpieczenstwa), zeby uniknac petli nieskonczonej.

## 6. Emit - czy stage ma wyslac event do brokera

Sekcja `Emit` decyduje, czy po przejsciu stage ma zostac wygenerowane i wyslane zdarzenie do brokera.

Dostepne opcje:

- **always (true)**: stage zawsze emituje wynik.
- **never (false)**: stage nie emituje wyniku.
- **never (null)**: stage nie emituje wyniku.
- **function condition ($fn)**: emisja tylko wtedy, gdy warunek zwroci `true`.

Najprosciej:

- chcesz normalny przeplyw i wysylke: wybierz `always (true)`,
- chcesz etap tylko obliczeniowy bez wysylki: wybierz `never`,
- chcesz kontrolowac wysylke warunkiem: wybierz `function condition ($fn)`.

## 7. Node Inspector - podstawowe dane kroku

`Node Inspector` to miejsce, gdzie ustawiasz podstawowe informacje o wybranym stage.

### Co oznacza kazde pole

- **Title**: nazwa widoczna na karcie kroku na canvasie.
- **Stage**: techniczny identyfikator kroku uzywany w logice workflow.

### Dobra praktyka

- `Title` ustawiaj biznesowo i jasno (co robi etap).
- `Stage` trzymaj stabilny i przewidywalny.

## 8. Przed kliknieciem Save sprawdz

1. Czy `Workflow ID` jest poprawny.
2. Czy wszystkie kroki sa dodane i polaczone.
3. Czy ustawienia krokow sa kompletne.
4. Czy podglad `Show DSL Payload` wyglada tak, jak oczekujesz.

## Next krok

Przejdz do: [Function Studio](doc:function-studio)
