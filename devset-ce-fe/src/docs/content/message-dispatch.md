# Message Dispatch

`Message Dispatch` sluzy do szybkiego wyslania pojedynczej wiadomosci do wybranego brokera (Kafka lub Rabbit) bez uruchamiania calego workflow.

## 1. Kiedy uzywac

- chcesz sprawdzic, czy connector i destination dzialaja,
- testujesz payload JSON/Protobuf dla jednego eventu,
- potrzebujesz szybko odtworzyc wpis z historii i wyslac ponownie,
- chcesz zapisac gotowy payload jako `single-request`.

## 2. Uklad ekranu

Ekran sklada sie z 3 czesci:

1. `Collections` po lewej: lista kolekcji i zapisanych `single-requestow`.
2. `Message Dispatch` na srodku: konfiguracja brokera, payloadu i wysylki.
3. `Historia` po prawej (otwierana przyciskiem `Historia`): filtrowanie i podglad poprzednich wysylek.

## 3. Szybki flow krok po kroku

1. Wybierz `Connector`.
2. Ustaw `Content type` (`JSON` albo `PROTOBUF`).
3. Ustaw destination dla brokera.
4. Dla Kafka ustaw `Topic` (wymagany), opcjonalnie `Kafka key` i `Headers`.
5. Dla Rabbit ustaw przynajmniej jedno z: `Queue (topic)`, `routingKey`, `exchange`.
6. Uzupelnij `Step state (JSON object)`.
7. Kliknij `Send message`.

## 4. JSON mode

W `JSON` mozesz:

- kliknac `Import schema` i zaladowac template z `Schema Repo`,
- edytowac payload w `Raw DSL`,
- przelaczyc sie na `Function Studio` i ustawic wartosci funkcjami.

## 5. PROTOBUF mode

W `PROTOBUF` dochodzi obowiazkowy krok z baza `.proto`:

1. W sekcji `Proto schema (.proto)` wybierz schema z menu `Schemas` albo wklej recznie.
2. Kliknij `Apply as base`.
3. Dopiero po tym odblokowuja sie edycja `Step state` i `Send message`.

Wazne:

- `Step state` dalej edytujesz jako JSON, ale wysylka idzie jako `application/x-protobuf`.
- Jesli dodasz nowe pole poza aktualnym `.proto`, wysylka zostanie zablokowana do czasu ponownego `Apply as base`.
- `Wire Format` (prefix 0-65535) jest dostepny dla Protobuf i pozwala dodac binarny prefix przed payloadem.

## 6. Collections i single-request

W panelu `Collections` mozesz:

- dodac nowa kolekcje (`Add`),
- rozwinac kolekcje i zaladowac zapisany request,
- usunac kolekcje lub pojedynczy request z menu `...`.

W panelu glownym przycisk `Save` otwiera modal:

- `Collection` moze byc nowa lub istniejaca,
- `singleRequestName` jest wymagane.

## 7. Historia wysylek

Panel `Historia` pozwala:

- filtrowac po brokerze (`Kafka`/`Rabbit`) i formacie (`JSON`/`PROTOBUF`),
- szukac po `producer`, `runId`, `topic` i innych polach,
- kliknac `Preview`, aby zobaczyc pelne dane wpisu,
- kliknac `Load`, aby zaladowac wpis do formularza i wyslac ponownie.

## 8. Najczestsze bledy

- `Dla Kafka topic jest wymagany.`: uzupelnij `Topic`.
- `Dla Rabbit podaj co najmniej jedno...`: uzupelnij `Queue`, `routingKey` lub `exchange`.
- `Dla protobuf najpierw kliknij Apply as base.`: zastosuj `.proto` jako baze.
- `Wire Format prefix musi byc liczba calkowita z zakresu 0-65535.`: popraw prefix.
