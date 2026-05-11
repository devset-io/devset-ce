# New Workflow (Create New)

## 1. Creating a new workflow

This is the screen you see after clicking `Create New Workflow` in the Management section.
You start with an empty canvas and immediately build the flow from scratch.

### What you can see on the screen

- **Canvas** on the left, where you add and connect steps.
- **Buttons above the canvas**:
  - `Add stage`
  - `Reset`
- **Workflow panel** on the right:
  - `Workflow ID`
  - `Save`
  - `Add state`
  - `Show DSL Payload`
  - `Open in Playground`
- **Node Tools** on the right side (active after you select a specific node on the canvas).

### How to create a new flow step by step

1. Set `Workflow ID` in the panel on the right.
2. Click `Add stage` to add the first step.
3. Add more steps and define their order.
4. Click a step on the canvas and complete its settings in `Node Tools`.
5. Optionally, click `Add state` if the workflow needs a global state.
6. Click `Show DSL Payload` to inspect the final JSON.
7. Click `Save` to save the new workflow.

### What you can do

- Build a flow from scratch on an empty canvas.
- Add and connect pipeline steps.
- Set and change `Workflow ID` before saving.
- Add `Workflow State` and state mappings.
- Preview the DSL before saving.
- Open Playground with the current payload.

## 2. Adding a new stage and choosing a schema

After clicking `Add stage`, the `Add Stage` dialog opens.
In this step, you choose which schema should be attached to the new stage.

### What you do in this dialog

1. Open the `Schema repo` list.
2. Select a specific event schema (for example `entity-opened (v1)`).
3. Click `Add stage`.

After that, the new stage appears on the canvas and has the selected `event` assigned to it.

### What this gives you

- The stage immediately has the correct schema attached.
- The stage fields are built based on the selected schema.
- Further configuration (`Node Tools`, mappings, functions) stays consistent with that schema.

### What to watch out for

- If you do not select the correct schema, the stage may end up with incorrect fields.
- If there are no schemas in `Schema Repo`, you cannot meaningfully add a new stage.
- `Cancel` closes the dialog without adding the step.

## 3. What each field on the stage card means

After adding a stage to the canvas, a step card appears. Each element on that card means something:

- **Title**: the name (title) of the step shown on the canvas.
- **START**: a marker showing that this step is currently the first step in the pipeline.
- **END**: a marker showing that this step is currently the last step in the pipeline.
- **#N**: the position of the step in the flow.
- **Event name**: the event/schema assigned to this step.
- **Stage ID**: the technical `stage` identifier.
- **repeat xN**: the number of step repetitions (`repeat`).
- **emit on/off**: information whether the step emits output (`emit`).
- **Dots/handles on the sides and top**: connection points used to build the flow between steps.

If you click the stage card, the detailed settings for that step open on the right side in `Node Tools`.

## 4. Node Tools after selecting a stage

After clicking a stage on the canvas, you get this toolset on the right:

- `Repeat`
- `Emit`
- `Stage Inspector`
- `Function Studio`

These settings apply to the selected step, not to the entire workflow.

## 5. Repeat - what each field means

The `Repeat` section is used to control the number of repetitions and loop conditions for the selected stage.

### Fields and buttons

- **Max iterations (repeat)**:
  - the maximum number of step iterations,
  - for example, `220` means the step can run up to 220 times.
- **Add repeatWhile condition**:
  - adds a condition evaluated before each iteration,
  - the loop continues while the condition is true.
- **Add repeatUntil condition**:
  - adds a condition evaluated after an iteration,
  - the loop stops when the condition becomes true.

### How to configure it in practice

1. Enter a limit in `Max iterations (repeat)` if you want a hard maximum.
2. Add `repeatWhile` if the loop should depend on a starting condition.
3. Add `repeatUntil` if you want the loop to stop after reaching a target.

### RepeatWhile (high level)

`repeatWhile` is simply a condition: **repeat the step while the condition is true**.

Example: repeat while the ratio of processed items to total items is less than 75%:

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

In practice, this means the step repeats while the result of that comparison is lower than `75`.

### RepeatUntil (high level)

`repeatUntil` works in the opposite way to `repeatWhile`: **repeat the step until the condition is met**.

Example using the `choiceWeighted(...)` function for a weighted random stop condition:

```txt
choiceWeighted(
  10:50,
  20:30,
  30:20
)
```

At a high level, the system draws a value using the provided weights and uses that result to decide when to stop repeating.

> **Important note:** if you set only `repeatWhile` or `repeatUntil` and do not provide `repeat`, the compiler uses an internal guard (a safety limit) to avoid an infinite loop.

## 6. Emit - whether the stage should send an event to the broker

The `Emit` section decides whether an event should be generated and sent to the broker after the stage is processed.

Available options:

- **always (true)**: the stage always emits output.
- **never (false)**: the stage does not emit output.
- **never (null)**: the stage does not emit output.
- **function condition ($fn)**: emit only when the condition returns `true`.

The simplest rule of thumb:

- if you want a normal flow with message delivery, choose `always (true)`,
- if you want a calculation-only stage without delivery, choose `never`,
- if you want delivery controlled by a condition, choose `function condition ($fn)`.

## 7. Node Inspector - basic step data

`Node Inspector` is where you set the basic information for the selected stage.

### What each field means

- **Title**: the name shown on the step card on the canvas.
- **Stage**: the technical step identifier used in workflow logic.

### Good practice

- Set `Title` in business terms and make it clear about what the stage does.
- Keep `Stage` stable and predictable.

## 8. Before clicking Save, check

1. Whether `Workflow ID` is correct.
2. Whether all steps are added and connected.
3. Whether step settings are complete.
4. Whether the `Show DSL Payload` preview matches what you expect.

## Next step

Go to: [Function Studio](doc:function-studio)