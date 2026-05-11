# Message Dispatch

`Message Dispatch` is used to quickly send a single message to the selected broker (Kafka or Rabbit) without running the entire workflow.

## 1. When to use it

- when you want to check whether the connector and destination work,
- when you are testing a JSON/Protobuf payload for a single event,
- when you need to quickly replay an entry from history and send it again,
- when you want to save a ready payload as a `single-request`.

## 2. Screen layout

The screen is made up of three parts:

1. `Collections` on the left: the list of collections and saved `single-requests`.
2. `Message Dispatch` in the center: broker, payload, and sending configuration.
3. `History` on the right (opened with the `History` button): filtering and preview of previous sends.

## 3. Quick flow step by step

1. Select `Connector`.
2. Set `Content type` (`JSON` or `PROTOBUF`).
3. Set the broker destination.
4. For Kafka, set `Topic` (required), and optionally `Kafka key` and `Headers`.
5. For Rabbit, set at least one of: `Queue (topic)`, `routingKey`, `exchange`.
6. Fill in `Step state (JSON object)`.
7. Click `Send message`.

## 4. JSON mode

In `JSON`, you can:

- click `Import schema` and load a template from `Schema Repo`,
- edit the payload in `Raw DSL`,
- switch to `Function Studio` and set values with functions.

## 5. PROTOBUF mode

In `PROTOBUF`, there is one required extra step with the `.proto` base:

1. In the `Proto schema (.proto)` section, choose a schema from the `Schemas` menu or paste it manually.
2. Click `Apply as base`.
3. Only after that are `Step state` editing and `Send message` enabled.

Important:

- You still edit `Step state` as JSON, but the message is sent as `application/x-protobuf`.
- If you add a new field outside the current `.proto`, sending is blocked until you click `Apply as base` again.
- `Wire Format` (prefix `0-65535`) is available for Protobuf and lets you prepend a binary prefix before the payload.

## 6. Collections and single-request

In the `Collections` panel, you can:

- add a new collection (`Add`),
- expand a collection and load a saved request,
- delete a collection or a single request from the `...` menu.

In the main panel, the `Save` button opens a modal:

- `Collection` can be new or existing,
- `singleRequestName` is required.

## 7. Send history

The `History` panel lets you:

- filter by broker (`Kafka`/`Rabbit`) and format (`JSON`/`PROTOBUF`),
- search by `producer`, `runId`, `topic`, and other fields,
- click `Preview` to see full entry details,
- click `Load` to load the entry into the form and send it again.

## 8. Most common errors

- `Kafka topic is required.`: fill in `Topic`.
- `For Rabbit, provide at least one...`: fill in `Queue`, `routingKey`, or `exchange`.
- `For protobuf, click Apply as base first.`: apply the `.proto` as the base.
- `Wire Format prefix must be an integer between 0 and 65535.`: correct the prefix.
