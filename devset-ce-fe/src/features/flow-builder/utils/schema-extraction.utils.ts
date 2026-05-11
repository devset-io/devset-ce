/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

// ──────────────────────────────────────────────────────────────
// Schema extraction utilities
//
// Parses event schemas (JSON Schema or Protobuf .proto files)
// and extracts field metadata used throughout the flow builder:
//   - Root field names, required fields, type hints
//   - Default value generation from schema definitions
//   - Nested scope field resolution (for drill-down UI)
//   - Template generation for set blocks
//
// Supports both JSON Schema and Protobuf schema formats.
// ──────────────────────────────────────────────────────────────

import type { LoadedSchema } from '../types'

// ── Generic helpers ──

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null // SAFETY: value confirmed as non-null non-array object by preceding guards

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

// ── Protobuf types ──

type ProtoField = {
  name: string
  type: string
  required: boolean
  repeated: boolean
}

type ProtoMessage = {
  name: string
  fields: ProtoField[]
  isTopLevel: boolean
}

// ── Protobuf regex constants ──

const PROTO_MESSAGE_START_REGEX = /message\s+([A-Za-z_]\w*)\s*\{/g
const PROTO_FIELD_LINE_REGEX =
  /^\s*(?:(optional|required|repeated)\s+)?([A-Za-z_][\w.]*)\s+([A-Za-z_]\w*)\s*=\s*(\d+)\s*(?:\[[^\]]*\])?\s*;/gm
const PROTO_ENUM_BLOCK_REGEX = /enum\s+([A-Za-z_]\w*)\s*\{([\s\S]*?)\}/g
const PROTO_NUMBER_TYPES = new Set([
  'double',
  'float',
  'int32',
  'int64',
  'uint32',
  'uint64',
  'sint32',
  'sint64',
  'fixed32',
  'fixed64',
  'sfixed32',
  'sfixed64',
])

// ── JSON Schema resolution ──

const resolveSchemaType = (schemaPart: Record<string, unknown>): string | null => {
  const directType = schemaPart.type
  if (typeof directType === 'string') {
    return directType
  }
  if (Array.isArray(directType)) {
    const firstConcrete = directType.find((type) => type !== 'null')
    return typeof firstConcrete === 'string' ? firstConcrete : null
  }
  const compositeKeys: Array<'allOf' | 'anyOf' | 'oneOf'> = ['allOf', 'anyOf', 'oneOf']
  for (const key of compositeKeys) {
    const composite = schemaPart[key]
    if (!Array.isArray(composite)) {
      continue
    }
    for (const candidate of composite) {
      const candidateRecord = toRecord(candidate)
      if (!candidateRecord) {
        continue
      }
      const nested = resolveSchemaType(candidateRecord)
      if (nested) {
        return nested
      }
    }
  }
  return null
}

const resolveSchemaDefaultValue = (schemaPart: Record<string, unknown>): unknown => {
  if (Object.prototype.hasOwnProperty.call(schemaPart, 'default')) {
    return schemaPart.default
  }
  const inferredType = resolveSchemaType(schemaPart)
  if (inferredType === 'integer' || inferredType === 'number') {
    return 0
  }
  if (inferredType === 'boolean') {
    return false
  }
  if (inferredType === 'array') {
    return []
  }
  if (inferredType === 'object') {
    return {}
  }
  if (inferredType === 'null') {
    return null
  }
  return ''
}

type RootSchemaMetadata = {
  properties: Record<string, unknown>
  required: string[]
}

// ── Public types ──

export type LiteralKindHint = 'string' | 'number' | 'boolean' | 'null' | 'json'

export type SchemaScopeField = {
  field: string
  isContainer: boolean
  isRequired: boolean
  literalKindHint: LiteralKindHint
}

// ── JSON Schema metadata extraction ──

const extractRootSchemaMetadataForJson = (schemaObject: Record<string, unknown>): RootSchemaMetadata | null => {
  const properties = toRecord(schemaObject.properties)
  const safeProperties = properties ?? {}
  const propertyKeys = Object.keys(safeProperties)
  if (propertyKeys.length > 0) {
    const payloadSchema = toRecord(safeProperties.payload)
    const payloadProperties = toRecord(payloadSchema?.properties)
    if (payloadProperties && Object.keys(payloadProperties).length > 0) {
      return {
        properties: payloadProperties,
        required: toStringArray(payloadSchema?.required),
      }
    }
    const currentEventSchema = toRecord(safeProperties.currentEvent)
    const currentEventProperties = toRecord(currentEventSchema?.properties)
    if (currentEventProperties && Object.keys(currentEventProperties).length > 0) {
      return {
        properties: currentEventProperties,
        required: toStringArray(currentEventSchema?.required),
      }
    }
    return {
      properties: safeProperties,
      required: toStringArray(schemaObject.required),
    }
  }

  const compositeKeys: Array<'allOf' | 'anyOf' | 'oneOf'> = ['allOf', 'anyOf', 'oneOf']
  for (const key of compositeKeys) {
    const candidates = schemaObject[key]
    if (!Array.isArray(candidates)) {
      continue
    }
    for (const candidate of candidates) {
      const candidateRecord = toRecord(candidate)
      if (!candidateRecord) {
        continue
      }
      const extracted = extractRootSchemaMetadataForJson(candidateRecord)
      if (extracted && Object.keys(extracted.properties).length > 0) {
        return extracted
      }
    }
  }

  return null
}

// ── Protobuf parsing ──

const findMatchingBrace = (source: string, openBraceIndex: number): number => {
  let depth = 0
  for (let index = openBraceIndex; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') {
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return index
      }
    }
  }
  return -1
}

const getBraceDepthAt = (source: string, index: number): number => {
  let depth = 0
  for (let cursor = 0; cursor < index; cursor += 1) {
    const char = source[cursor]
    if (char === '{') {
      depth += 1
    } else if (char === '}') {
      depth = Math.max(0, depth - 1)
    }
  }
  return depth
}

const extractTopLevelLines = (blockBody: string): string[] => {
  const lines: string[] = []
  let depth = 0
  let currentLine = ''

  for (let index = 0; index < blockBody.length; index += 1) {
    const char = blockBody[index]
    if (char === '{') {
      depth += 1
      currentLine += char
      continue
    }
    if (char === '}') {
      depth -= 1
      currentLine += char
      continue
    }
    if (char === '\n') {
      if (depth === 0) {
        lines.push(currentLine)
      }
      currentLine = ''
      continue
    }
    currentLine += char
  }

  if (currentLine.trim().length > 0 && depth === 0) {
    lines.push(currentLine)
  }

  return lines
}

const parseProtoFields = (messageBody: string): ProtoField[] => {
  const fields: ProtoField[] = []
  const topLevelLines = extractTopLevelLines(messageBody)
  topLevelLines.forEach((line) => {
    const match = new RegExp(PROTO_FIELD_LINE_REGEX).exec(line)
    if (!match) {
      return
    }
    const label = match[1]
    fields.push({
      required: label === 'required',
      repeated: label === 'repeated',
      type: match[2],
      name: match[3],
    })
  })
  return fields
}

const parseProtoMessages = (protoSource: string): ProtoMessage[] => {
  const messages: ProtoMessage[] = []
  const regex = new RegExp(PROTO_MESSAGE_START_REGEX)
  let blockMatch = regex.exec(protoSource)
  while (blockMatch) {
    const messageName = blockMatch[1]
    const openBraceIndex = blockMatch.index + blockMatch[0].lastIndexOf('{')
    const closeBraceIndex = findMatchingBrace(protoSource, openBraceIndex)
    if (closeBraceIndex > openBraceIndex) {
      const body = protoSource.slice(openBraceIndex + 1, closeBraceIndex)
      const messageBraceDepth = getBraceDepthAt(protoSource, blockMatch.index)
      messages.push({
        name: messageName,
        fields: parseProtoFields(body),
        isTopLevel: messageBraceDepth === 0,
      })
      regex.lastIndex = blockMatch.index + blockMatch[0].length
    } else {
      regex.lastIndex = blockMatch.index + blockMatch[0].length
    }
    blockMatch = regex.exec(protoSource)
  }
  return messages
}

const normalizeProtoMessageName = (value: string): string =>
  value
    .trim()
    .split('.')
    .pop()
    ?.replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase() ?? ''

const resolvePreferredProtoMessage = (
  messages: ProtoMessage[],
  preferredMessageName?: string,
): ProtoMessage | null => {
  if (!preferredMessageName) {
    return null
  }
  const normalizedPreferred = normalizeProtoMessageName(preferredMessageName)
  if (!normalizedPreferred) {
    return null
  }
  return (
    messages.find((message) => normalizeProtoMessageName(message.name) === normalizedPreferred) ??
    null
  )
}

const parseProtoEnumNames = (protoSource: string): Set<string> => {
  const names = new Set<string>()
  const regex = new RegExp(PROTO_ENUM_BLOCK_REGEX)
  let blockMatch = regex.exec(protoSource)
  while (blockMatch) {
    names.add(blockMatch[1])
    blockMatch = regex.exec(protoSource)
  }
  return names
}

const buildSchemaPartFromProtoType = (
  typeName: string,
  messageByName: Map<string, ProtoMessage>,
  enumNames: Set<string>,
  stack: Set<string>,
): Record<string, unknown> => {
  if (typeName === 'bool') {
    return { type: 'boolean' }
  }
  if (PROTO_NUMBER_TYPES.has(typeName) || enumNames.has(typeName)) {
    return { type: 'number' }
  }
  if (typeName === 'string' || typeName === 'bytes') {
    return { type: 'string' }
  }

  const message = messageByName.get(typeName) ?? messageByName.get(typeName.split('.').pop() ?? typeName)
  if (!message) {
    return { type: 'object' }
  }
  if (stack.has(typeName)) {
    return { type: 'object' }
  }

  const nextStack = new Set(stack)
  nextStack.add(typeName)
  const properties = Object.fromEntries(
    message.fields.map((field) => [
      field.name,
      toSchemaPartFromProtoField(field, messageByName, enumNames, nextStack),
    ]),
  )
  const required = message.fields.filter((field) => field.required).map((field) => field.name)
  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  }
}

const toSchemaPartFromProtoField = (
  field: ProtoField,
  messageByName: Map<string, ProtoMessage>,
  enumNames: Set<string>,
  stack: Set<string>,
): Record<string, unknown> => {
  const baseType = buildSchemaPartFromProtoType(field.type, messageByName, enumNames, stack)
  if (field.repeated) {
    return { type: 'array', items: baseType }
  }
  return baseType
}

const extractRootSchemaMetadataForProtobuf = (
  protoSource: string,
  preferredMessageName?: string,
): RootSchemaMetadata | null => {
  const messages = parseProtoMessages(protoSource)
  if (messages.length === 0) {
    return null
  }

  const topLevelMessagesWithFields = messages.filter((message) => message.isTopLevel && message.fields.length > 0)
  const messagesWithFields = messages.filter((message) => message.fields.length > 0)

  const messageByName = new Map(messages.map((message) => [message.name, message]))
  const preferredTopLevel = resolvePreferredProtoMessage(topLevelMessagesWithFields, preferredMessageName)
  const preferredAnyLevel = resolvePreferredProtoMessage(messagesWithFields, preferredMessageName)
  const preferredMessage =
    preferredTopLevel ??
    (topLevelMessagesWithFields.length > 0 ? topLevelMessagesWithFields[0] : null) ??
    preferredAnyLevel ??
    messagesWithFields[0] ??
    messages[0]
  const enumNames = parseProtoEnumNames(protoSource)
  const properties = Object.fromEntries(
    preferredMessage.fields.map((field) => [
      field.name,
      toSchemaPartFromProtoField(field, messageByName, enumNames, new Set([preferredMessage.name])),
    ]),
  )
  return {
    properties,
    required: preferredMessage.fields.filter((field) => field.required).map((field) => field.name),
  }
}

// ── Unified schema metadata extraction ──

const extractRootSchemaMetadata = (schema: LoadedSchema | undefined): RootSchemaMetadata | null => {
  if (!schema) {
    return null
  }

  if (schema.schemaType === 'protobuf') {
    if (typeof schema.schema !== 'string') {
      return null
    }
    return extractRootSchemaMetadataForProtobuf(schema.schema, schema.id)
  }

  if (schema.schemaType === 'json') {
    const schemaObject = toRecord(schema.schema)
    if (!schemaObject) {
      return null
    }
    return extractRootSchemaMetadataForJson(schemaObject)
  }

  // Fallback only for legacy/unknown schemas where backend type is absent.
  if (typeof schema.schema === 'string') {
    return extractRootSchemaMetadataForProtobuf(schema.schema, schema.id)
  }
  const schemaObject = toRecord(schema.schema)
  return schemaObject ? extractRootSchemaMetadataForJson(schemaObject) : null
}

// ── Template building ──

const buildTemplateValueFromSchemaPart = (
  schemaPart: Record<string, unknown>,
  isRequired: boolean,
): { include: boolean; value: unknown } => {
  const resolvedType = resolveSchemaType(schemaPart)

  if (resolvedType === 'object') {
    const properties = toRecord(schemaPart.properties) ?? {}
    const requiredSet = new Set(toStringArray(schemaPart.required))
    const nestedEntries = Object.entries(properties)
      .map(([field, nestedValue]) => {
        const nestedPart = toRecord(nestedValue)
        if (!nestedPart) {
          return null
        }
        const nestedTemplate = buildTemplateValueFromSchemaPart(nestedPart, requiredSet.has(field))
        if (!nestedTemplate.include) {
          return null
        }
        return [field, nestedTemplate.value] as const
      })
      .filter((entry): entry is readonly [string, unknown] => entry !== null)

    if (isRequired || nestedEntries.length > 0) {
      return {
        include: true,
        value: Object.fromEntries(nestedEntries),
      }
    }

    return {
      include: false,
      value: {},
    }
  }

  if (resolvedType === 'array') {
    return {
      include: isRequired,
      value: [],
    }
  }

  if (!isRequired) {
    return {
      include: false,
      value: undefined,
    }
  }

  return {
    include: true,
    value: resolveSchemaDefaultValue(schemaPart),
  }
}

const resolveScopeProperties = (
  metadata: RootSchemaMetadata,
  scopePath: string,
): { properties: Record<string, unknown>; required: string[] } | null => {
  if (!scopePath) {
    return metadata
  }

  const tokens = scopePath
    .split('.')
    .map((token) => token.trim())
    .filter(Boolean)

  let currentProperties: Record<string, unknown> = metadata.properties
  let currentRequired: string[] = metadata.required

  for (const token of tokens) {
    const nextPart = toRecord(currentProperties[token])
    if (!nextPart) {
      return null
    }

    const nestedProperties = toRecord(nextPart.properties)
    if (nestedProperties) {
      currentProperties = nestedProperties
      currentRequired = toStringArray(nextPart.required)
      continue
    }

    const arrayItems = toRecord(nextPart.items)
    const arrayItemProperties = toRecord(arrayItems?.properties)
    if (arrayItemProperties) {
      currentProperties = arrayItemProperties
      currentRequired = toStringArray(arrayItems?.required)
      continue
    }

    return null
  }

  return { properties: currentProperties, required: currentRequired }
}

const toLiteralKindHint = (schemaPart: Record<string, unknown>): LiteralKindHint => {
  const inferredType = resolveSchemaType(schemaPart)
  if (inferredType === 'integer' || inferredType === 'number') {
    return 'number'
  }
  if (inferredType === 'boolean') {
    return 'boolean'
  }
  if (inferredType === 'null') {
    return 'null'
  }
  if (inferredType === 'object' || inferredType === 'array') {
    return 'json'
  }
  return 'string'
}

const buildCompleteTemplateValueFromSchemaPart = (schemaPart: Record<string, unknown>): unknown => {
  const resolvedType = resolveSchemaType(schemaPart)

  if (resolvedType === 'object') {
    const properties = toRecord(schemaPart.properties) ?? {}
    return Object.fromEntries(
      Object.entries(properties)
        .map(([field, value]) => {
          const nestedPart = toRecord(value)
          if (!nestedPart) {
            return null
          }
          return [field, buildCompleteTemplateValueFromSchemaPart(nestedPart)] as const
        })
        .filter((entry): entry is readonly [string, unknown] => entry !== null),
    )
  }

  if (resolvedType === 'array') {
    return []
  }

  return resolveSchemaDefaultValue(schemaPart)
}

// ── Public API ──

export const extractSchemaScopeFields = (schema: LoadedSchema | undefined, scopePath: string): SchemaScopeField[] => {
  const metadata = extractRootSchemaMetadata(schema)
  if (!metadata) {
    return []
  }

  const scopeMetadata = resolveScopeProperties(metadata, scopePath)
  if (!scopeMetadata) {
    return []
  }

  const requiredSet = new Set(scopeMetadata.required)
  return Object.entries(scopeMetadata.properties).map(([key, value]) => {
    const schemaPart = toRecord(value)
    const hint = schemaPart ? toLiteralKindHint(schemaPart) : 'string'
    return {
      field: scopePath ? `${scopePath}.${key}` : key,
      isContainer: hint === 'json',
      isRequired: requiredSet.has(key),
      literalKindHint: hint,
    }
  })
}

export const extractSchemaRootFields = (schema: LoadedSchema | undefined): string[] => {
  const metadata = extractRootSchemaMetadata(schema)
  return metadata ? Object.keys(metadata.properties) : []
}

/** Recursive tree node representing a single schema field and its nested children. */
export type SchemaFieldNode = {
  field: string
  label: string
  children: SchemaFieldNode[]
}

/** Recursively builds a tree of field nodes from a schema. */
export const extractSchemaFieldTree = (schema: LoadedSchema | undefined): SchemaFieldNode[] => {
  const metadata = extractRootSchemaMetadata(schema)
  if (!metadata) return []
  const walk = (properties: Record<string, unknown>, prefix: string): SchemaFieldNode[] =>
    Object.entries(properties).map(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key
      const part = toRecord(value)
      const nested = toRecord(part?.properties)
      return {
        field: path,
        label: key,
        children: nested && Object.keys(nested).length > 0 ? walk(nested, path) : [],
      }
    })
  return walk(metadata.properties, '')
}

export const extractSchemaRequiredRootFields = (schema: LoadedSchema | undefined): string[] => {
  if (!schema) {
    return []
  }
  const metadata = extractRootSchemaMetadata(schema)
  return metadata?.required ?? []
}

export const extractSchemaRootLiteralKindHints = (
  schema: LoadedSchema | undefined,
): Record<string, LiteralKindHint> => {
  const metadata = extractRootSchemaMetadata(schema)
  if (!metadata) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(metadata.properties).map(([field, value]) => {
      const schemaPart = toRecord(value)
      return [field, schemaPart ? toLiteralKindHint(schemaPart) : 'string']
    }),
  ) as Record<string, LiteralKindHint> // SAFETY: Object.fromEntries loses type precision; entries are [string, LiteralKindHint] pairs
}

export const buildDefaultSetFromSchema = (schema: LoadedSchema | undefined): Record<string, unknown> => {
  const metadata = extractRootSchemaMetadata(schema)
  if (!metadata) {
    return {}
  }
  const requiredFields = new Set(metadata.required)
  return Object.fromEntries(
    Object.entries(metadata.properties)
      .map(([field, value]) => {
        if (requiredFields.has(field)) {
          return [field, undefined]
        }
        const schemaPart = toRecord(value)
        return [field, schemaPart ? resolveSchemaDefaultValue(schemaPart) : '']
      })
      .filter(([, value]) => value !== undefined),
  )
}

export const buildRequiredSetTemplateFromSchema = (schema: LoadedSchema | undefined): Record<string, unknown> => {
  const metadata = extractRootSchemaMetadata(schema)
  if (!metadata) {
    return {}
  }

  const requiredRootFields = new Set(metadata.required)
  return Object.fromEntries(
    Object.entries(metadata.properties)
      .map(([field, value]) => {
        const schemaPart = toRecord(value)
        if (!schemaPart) {
          return null
        }
        const templateValue = buildTemplateValueFromSchemaPart(schemaPart, requiredRootFields.has(field))
        if (!templateValue.include) {
          return null
        }
        return [field, templateValue.value] as const
      })
      .filter((entry): entry is readonly [string, unknown] => entry !== null),
  )
}

export const buildCompleteSetTemplateFromSchema = (schema: LoadedSchema | undefined): Record<string, unknown> => {
  const metadata = extractRootSchemaMetadata(schema)
  if (!metadata) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(metadata.properties)
      .map(([field, value]) => {
        const schemaPart = toRecord(value)
        if (!schemaPart) {
          return null
        }
        return [field, buildCompleteTemplateValueFromSchemaPart(schemaPart)] as const
      })
      .filter((entry): entry is readonly [string, unknown] => entry !== null),
  )
}
