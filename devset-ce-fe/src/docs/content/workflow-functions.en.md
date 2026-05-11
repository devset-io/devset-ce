# Workflow - Functions

## 1. About this document

This document focuses only on DSL functions: how they work and how to use them.

## 2. How to read references (most important)

In the DSL, function arguments usually point to data through paths.

- `.field` means a field from the current stage (the current event), for example `.value`.
- `state.*` means a reference to workflow state, for example `state.entity.totalMileage`.
- `lastAppendedEvent.*` means data from the most recently emitted event.

Example:

```txt
add(state.entity.totalMileage,.value)
```

Meaning:

- `state.entity.totalMileage` is a value stored in workflow state.
- `.value` is a value from the current stage.

## 3. Conditional functions (Condition Functions)

These operators are mainly used in:

- `when`
- `repeatWhile`
- `repeatUntil`
- conditional `emit`

Each conditional function accepts exactly 2 arguments.

How condition evaluation works:

1. The engine reads argument `a` and `b` (either from a literal or from a path such as `.field` or `state.*`).
2. It compares them according to the operator.
3. It returns `true` or `false`.

Important rules:

- `lt/lte/gt/gte` are ordering comparisons.
- `eq/neq` are equality/inequality comparisons.
- For ordering comparisons, `null` is invalid.
- Operators always take two arguments in the form `fn(a,b)`.

### 3.1 `lt(a,b)`

Checks whether `a < b`.

Example:

```txt
lt(.value,.limitValue)
```

### 3.2 `lte(a,b)`

Checks whether `a <= b`.

Example:

```txt
lte(.value,.limitValue)
```

### 3.3 `gt(a,b)`

Checks whether `a > b`.

Example:

```txt
gt(state.entity.waypointCount,1000)
```

### 3.4 `gte(a,b)`

Checks whether `a >= b`.

Example:

```txt
gte(.retries,3)
```

### 3.5 `eq(a,b)`

Checks whether `a` and `b` are equal.

Example:

```txt
eq(.status,"APPROVED")
```

### 3.6 `neq(a,b)`

Checks whether `a` and `b` are different.

Example:

```txt
neq(state.entity.lastStatus,"CLOSED")
```

### 3.7 How it works in practice

- `when`: when the condition is `true`, `value` is used; when it is `false`, `default` is used instead, or nothing is written if there is no default.
- `repeatWhile`: evaluated before the iteration; `false` ends the loop.
- `repeatUntil`: evaluated after the iteration; `true` ends the loop.
- conditional `emit`: `true` sends the event, `false` skips it.

Important for `when`:

- `Include default` is optional and does not have to be enabled.
- When `Include default` is disabled and the condition returns `false`, the field is not written.

### 3.8 Full example of `when` + `emit`

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

### 3.9 Nested functions (`when`)

You can nest functions, but the whole expression is still written as one string in `"$fn"`.

Correct:

```json
{ "$fn": "eq(add(.a,.b),1)" }
```

That means:

- outer conditional function: `eq(...)`,
- inside its argument: expression function `add(...)`.

Incorrect:

```json
{ "$fn": "eq($fn(add(.a,.b)),1)" }
```

Important:

- `sum(...)` is not supported,
- use `add(...)` for addition and `sub(...)` for subtraction.

## 4. Value functions (`$fn` in mappings)

These functions calculate field values, for example in `set` or `state`.

### 4.1 `now()`

Returns the current execution timestamp.

Example:

```json
"createdAt": { "$fn": "now()" }
```

### 4.2 `nows()`

Returns the current execution timestamp in seconds.

Example:

```json
"createdAtSeconds": { "$fn": "nows()" }
```

### 4.3 `nowms()`

Returns the current execution timestamp in milliseconds.

Example:

```json
"createdAtMs": { "$fn": "nowms()" }
```

### 4.4 `uuid` / `uuid()`

Generates a UUID.

Example:

```json
"id": { "$fn": "uuid" }
```

### 4.5 `string` / `string()`

Generates a random text identifier (UUID string).

Example:

```json
"requestId": { "$fn": "string()" }
```

### 4.6 `bit` / `bit()`

Returns a random `0` or `1`.

Example:

```json
"flagBit": { "$fn": "bit()" }
```

### 4.7 `bool` / `boolean` (and `bool()` / `boolean()`)

Returns a random `true` or `false`.

Example:

```json
"isActive": { "$fn": "boolean()" }
```

### 4.8 `int(min,max)`

Draws a random `int` in the closed range `min..max`.

Example:

```json
"attempt": { "$fn": "int(1,5)" }
```

### 4.9 `long(min,max)`

Draws a random `long` in the closed range `min..max`.

Example:

```json
"sequence": { "$fn": "long(1000,9999)" }
```

### 4.10 `choice(v1,v2,...)`

Selects one of the provided values.

Example:

```json
"tier": { "$fn": "choice(BASIC,PRO,VIP)" }
```

### 4.11 `choiceWeighted(value:weight,...)`

Selects a value randomly, but with weights.

Example:

```json
"offer": { "$fn": "choiceWeighted(A:60,B:30,C:10)" }
```

Important:

- the format is always `value:weight`,
- weights must be positive.

### 4.12 `add(a,b)`

Adds 2 numbers.

Example:

```txt
add(state.entity.totalMileage,.value)
```

### 4.13 `sub(a,b)`

Subtracts `b` from `a`.

Example:

```json
"scoreDelta": { "$fn": "sub(.newScore,.oldScore)" }
```

### 4.14 `percent(value,total)`

Calculates the percentage of `value` relative to `total`.

Example:

```json
"countRatio": { "$fn": "percent(state.entity.totalMileage,add(state.entity.legCount,state.entity.waypointCount))" }
```

Important:

- `total = 0` is invalid.

## 5. Mini cheat sheet

Most common snippets:

- identifier: `uuid`
- timestamp: `now()`
- timestamp (seconds): `nows()`
- timestamp (milliseconds): `nowms()`
- random number: `int(1,100)`
- sum: `add(a,b)`
- percentage: `percent(value,total)`
- condition: `lte(.value,.limitValue)`
