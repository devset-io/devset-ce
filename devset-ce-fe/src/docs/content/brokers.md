# Brokers

Tutaj konfigurujesz polaczenie do brokera, z ktorego korzysta `Workflow Runs`.

## Co ustawiasz

- `Host`
- `Port`
- `Login`
- `Haslo` (jesli wymagane)
- pozostale parametry polaczenia (w zaleznosci od brokera)

## Jak pracowac

1. Dodaj nowego brokera.
2. Uzupelnij dane polaczenia.
3. Zapisz konfiguracje.
4. Sprawdz, czy broker jest aktywny/polaczony.
5. W `Workflow Runs` wybierz tego brokera i uruchom workflow.

## Dobra praktyka

- najpierw testuj na srodowisku dev/test,
- trzymaj dane dostepowe poza publicznym repo,
- nazwij broker tak, zeby bylo jasne do jakiego srodowiska sluzy.

## Next krok

Przejdz do: [Message Dispatch](doc:message-dispatch)
