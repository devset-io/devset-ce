# Brokers

This is where you configure the broker connection used by `Workflow Runs`.

## What you configure

- `Host`
- `Port`
- `Login`
- `Password` (if required)
- other connection parameters (depending on the broker)

## How to work with it

1. Add a new broker.
2. Fill in the connection details.
3. Save the configuration.
4. Check whether the broker is active and connected.
5. In `Workflow Runs`, select this broker and start the workflow.

## Good practice

- test in a dev/test environment first,
- keep credentials outside a public repository,
- name the broker so it is clear which environment it is for.

## Next step

Go to: [Message Dispatch](doc:message-dispatch)
