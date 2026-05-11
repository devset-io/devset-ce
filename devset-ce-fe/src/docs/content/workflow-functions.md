# Workflow - Funkcje

## 1. O tym dokumencie

Tu masz tylko funkcje DSL: jak dzialaja i jak ich uzywac.

## 2. Jak czytac odwolania (najwazniejsze)

W DSL argumenty funkcji najczesciej wskazuja dane przez sciezki.

- `.pole` oznacza pole aktualnego stage (aktualnego eventu), np. `.value`.
- `state.*` oznacza odwolanie do stanu workflow, np. `state.entity.totalMileage`.
- `lastAppendedEvent.*` oznacza dane ostatnio wyemitowanego eventu.

Przyklad:

```txt
add(state.entity.totalMileage,.value)
```

Znaczenie:

- `state.entity.totalMileage` to wartosc trzymana w state workflow.
- `.value` to wartosc z aktualnego stage.

## 3. Funkcje warunkowe (Condition Functions)

Te operatory sa uzywane glownie w:

- `when`
- `repeatWhile`
- `repeatUntil`
- warunkowym `emit`

Kazda funkcja warunkowa przyjmuje dokladnie 2 argumenty.

Jak dziala ocena warunku:

1. Silnik pobiera argument `a` i `b` (ze stalej albo ze sciezki typu `.pole`, `state.*`).
2. Porownuje je zgodnie z operatorem.
3. Zwraca `true` albo `false`.

Wazne zasady:

- `lt/lte/gt/gte` to porownania porzadkowe.
- `eq/neq` to porownania rownosci/roznosci.
- Dla porownan porzadkowych `null` jest niepoprawny.
- Operatory sa dwuargumentowe, zawsze `fn(a,b)`.

### 3.1 `lt(a,b)`

Sprawdza, czy `a < b`.

Przyklad:

```txt
lt(.value,.limitValue)
```

### 3.2 `lte(a,b)`

Sprawdza, czy `a <= b`.

Przyklad:

```txt
lte(.value,.limitValue)
```

### 3.3 `gt(a,b)`

Sprawdza, czy `a > b`.

Przyklad:

```txt
gt(state.entity.waypointCount,1000)
```

### 3.4 `gte(a,b)`

Sprawdza, czy `a >= b`.

Przyklad:

```txt
gte(.retries,3)
```

### 3.5 `eq(a,b)`

Sprawdza, czy `a` i `b` sa rowne.

Przyklad:

```txt
eq(.status,"APPROVED")
```

### 3.6 `neq(a,b)`

Sprawdza, czy `a` i `b` sa rozne.

Przyklad:

```txt
neq(state.entity.lastStatus,"CLOSED")
```

### 3.7 Jak to dziala w praktyce

- `when`: gdy warunek `true`, idzie `value`; gdy `false`, idzie `default` (albo brak zapisu, jesli default nie ma).
- `repeatWhile`: sprawdzany przed iteracja; `false` konczy petle.
- `repeatUntil`: sprawdzany po iteracji; `true` konczy petle.
- `emit` warunkowy: `true` wysyla event, `false` pomija wysylke.

Wazne dla `when`:

- `Include default` jest opcjonalne (nie musi byc wlaczone).
- Gdy `Include default` jest wylaczone i warunek zwroci `false`, pole nie zostanie zapisane.

### 3.8 Pelny przyklad `when` + `emit`

```json
{
  "pipeline": [
    {
      "stage": "demo-conditions",
      "event": "entity-opened",
      "set": {
        "ltExample": {
          "when": { "$fn": "lt(.value,state.limit)" },
          "value": "value < limit",
          "default": "value >= limit"
        },
        "lteExample": {
          "when": { "$fn": "lte(.value,state.limit)" },
          "value": "value <= limit",
          "default": "value > limit"
        },
        "gtExample": {
          "when": { "$fn": "gt(.value,state.limit)" },
          "value": "value > limit",
          "default": "value <= limit"
        },
        "gteExample": {
          "when": { "$fn": "gte(.value,state.limit)" },
          "value": "value >= limit",
          "default": "value < limit"
        },
        "eqExample": {
          "when": { "$fn": "eq(.status,'OPEN')" },
          "value": "status == OPEN",
          "default": "status != OPEN"
        },
        "neqExample": {
          "when": { "$fn": "neq(.flag,true)" },
          "value": "flag != true",
          "default": "flag == true"
        }
      },
      "emit": { "$fn": "lte(.value,state.limit)" }
    }
  ]
}
```

### 3.9 Zagniezdzanie funkcji (`when`)

Mozesz zagniezdzac funkcje, ale wszystko zapisujesz jako jeden string w `"$fn"`.

Poprawnie:

```json
{ "$fn": "eq(add(.a,.b),1)" }
```

Czyli:

- zewnetrzna funkcja warunkowa: `eq(...)`,
- wewnatrz argumentu: funkcja ekspresji `add(...)`.

Niepoprawnie:

```json
{ "$fn": "eq($fn(add(.a,.b)),1)" }
```

Wazne:

- `sum(...)` nie jest wspierane,
- do sumowania uzywaj `add(...)` (lub `sub(...)` dla odejmowania).

## 4. Funkcje wartosci (`$fn` w mapowaniach)

To funkcje do wyliczania wartosci pola, np. w `set` albo `state`.

### 4.1 `now()`

Zwraca aktualny timestamp wykonania.

Przyklad:

```json
"createdAt": { "$fn": "now()" }
```

### 4.2 `nows()`

Zwraca aktualny timestamp wykonania w sekundach.

Przyklad:

```json
"createdAtSeconds": { "$fn": "nows()" }
```

### 4.3 `nowms()`

Zwraca aktualny timestamp wykonania w milisekundach.

Przyklad:

```json
"createdAtMs": { "$fn": "nowms()" }
```

### 4.4 `uuid` / `uuid()`

Generuje UUID.

Przyklad:

```json
"id": { "$fn": "uuid" }
```

### 4.5 `string` / `string()`

Generuje losowy identyfikator tekstowy (UUID string).

Przyklad:

```json
"requestId": { "$fn": "string()" }
```

### 4.6 `bit` / `bit()`

Zwraca losowe `0` albo `1`.

Przyklad:

```json
"flagBit": { "$fn": "bit()" }
```

### 4.7 `bool` / `boolean` (oraz `bool()` / `boolean()`)

Zwraca losowe `true` albo `false`.

Przyklad:

```json
"isActive": { "$fn": "boolean()" }
```

### 4.8 `int(min,max)`

Losuje liczbe calkowita `int` w zakresie domknietym `min..max`.

Przyklad:

```json
"attempt": { "$fn": "int(1,5)" }
```

### 4.9 `long(min,max)`

Losuje liczbe calkowita `long` w zakresie domknietym `min..max`.

Przyklad:

```json
"sequence": { "$fn": "long(1000,9999)" }
```

### 4.10 `choice(v1,v2,...)`

Wybiera jedna z podanych wartosci.

Przyklad:

```json
"tier": { "$fn": "choice(BASIC,PRO,VIP)" }
```

### 4.11 `choiceWeighted(value:weight,...)`

Wybiera wartosc losowo, ale z wagami.

Przyklad:

```json
"offer": { "$fn": "choiceWeighted(A:60,B:30,C:10)" }
```

Wazne:

- format to zawsze `wartosc:waga`,
- wagi musza byc dodatnie.

### 4.12 `add(a,b)`

Dodaje 2 liczby.

Przyklad:

```txt
add(state.entity.totalMileage,.value)
```

### 4.13 `sub(a,b)`

Odejmuje `b` od `a`.

Przyklad:

```json
"scoreDelta": { "$fn": "sub(.newScore,.oldScore)" }
```

### 4.14 `percent(value,total)`

Liczby procent z `value` wzgledem `total`.

Przyklad:

```json
"countRatio": { "$fn": "percent(state.entity.totalMileage,add(state.entity.legCount,state.entity.waypointCount))" }
```

Wazne:

- `total = 0` jest bledne.

## 5. Mini cheat sheet

Najczestsze gotowce:

- identyfikator: `uuid`
- timestamp: `now()`
- timestamp (seconds): `nows()`
- timestamp (milliseconds): `nowms()`
- losowa liczba: `int(1,100)`
- suma: `add(a,b)`
- procent: `percent(value,total)`
- warunek: `lte(.value,.limitValue)`
