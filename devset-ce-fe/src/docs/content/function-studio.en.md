# Function Studio

## 1. Entering Function Studio

`Function Studio` is a separate area for configuring logic field by field for the selected stage.

In the panel, you can see:

- the `Open Function Studio` button,
- information about the active node (`Active node: ...`),
- the number of functions configured in this step (`functions in set: ...`).

### What you do at this stage

1. Select a specific stage on the canvas.
2. Check whether the active node is the correct one.
3. Click `Open Function Studio`.

After opening it, you move to the function editor, where you configure mappings and expressions for stage fields.

## 2. Screen layout - left side first, then right side

### Left side (top)

- **Source Mode**:
  - choose where the stage gets its data from (`none` or `previous-stage`),
  - this sets the context for the rest of the work.
- **Hide / Show inherited**:
  - shows or hides inherited fields.
- **Search field...**:
  - quickly filters the list of fields.
- **Field list (root + inherited + already configured)**:
  - this is where you choose the field you want to configure.

### Source Mode and Hide (simple explanation)

`Source Mode` sets which payload the stage reads data from:

- **none**: the stage starts from a new payload based on the event schema.
- **previous-stage**: the stage takes data from the previous step and inherits its fields.

The **Hide** button hides `inherited` fields so the list stays cleaner and easier to work with.
This is useful when you want to focus only on the fields you are actually editing.

### Left side (bottom)

At the bottom of the list, you can see fields that already have logic assigned (for example `FN`, `LITERAL`, `REF`).
This gives you a quick preview of what is already configured for the stage.

### What the badges mean

- **FN**: the field value is calculated by a function (`$fn`).
- **LITERAL**: the field has a fixed value entered directly (for example text, number, `true/false`, `null`, or JSON).
- **REF**: the field takes its value from another field through a reference (`$ref`).
- **PATH**: the field takes its value from a data path (`$path`).
- **WHEN**: the field has conditional logic (`$when`) and returns a value depending on the condition.
- **INHERITED**: the field was inherited from the previous stage and has not been overridden yet.
- **required** (red marker): the field is required by the JSON schema and must be filled in; this is not a mapping mode.

## 3. Right section - Function Task (Literal)

This is the most common screen for setting a field value in a stage.

### What each field means

- **Schema**: choose the schema/event for which you are configuring the mapping.
- **Tasks**: you have two work modes.
- **Function Task**: field mapping in the stage payload.
- **State Task**: operations on `state` instead of a regular field assignment.
- **Target field**: the field you are currently editing (for example `id`).
- **Value Type**: how the value is set (`Literal`, `FN`, `REF`, `PATH`, `WHEN`).
- **Literal type**: the type of fixed value (for example `String`, `Number`, `Boolean`, `Null`, `JSON`).
- **Literal value**: the specific value entered into the field.
- **Apply**: saves the change for the currently selected field.

### How to work on this screen

1. Select a field on the left side.
2. On the right side, set `Tasks = Function Task`.
3. Set `Value Type` (for example `Literal`).
4. Choose `Literal type`.
5. Enter the `Literal value`.
6. Click `Apply`.
7. Move to the next field in the list.

After `Apply`, the field configuration is stored in the set for that stage.

## 4. Right section - State Task

`State Task` is used to update the `state` object based on event data or an expression.

### What each field means

- **Source field (currentEvent)**: the field from the current event that you read the value from.
- **Target state path (without the `state.` prefix)**: where the value is written in state, for example `entity.id`.
- **Mapping mode**: how the value is written to state.
- **Assign value ($ref)**: a direct assignment from the selected `Source field`.
- **Function ($fn)**: writes a value calculated by a function.
- **New mapping**: clears the form so you can add another entry.
- **Apply State Task**: saves or updates the mapping in the table below.
- **Mapping list at the bottom**: ready-to-use `statePath -> mapping` entries with `Edit` and `Remove` actions.

### How to work on this screen

1. Set `Target state path`.
2. Choose `Mapping mode`.
3. Fill in the required fields for that mode.
4. Click `Apply State Task`.
5. Repeat for the next state fields.

> **Important:** `State Task` mappings are executed after the stage iteration.
