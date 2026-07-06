import { describe, expect, it } from 'vitest'
import { DEFAULT_WORKFLOW_ID_PREFIX, generateDefaultWorkflowId } from './constants'

describe('generateDefaultWorkflowId', () => {
  it('prefixes the id and appends a 7-character lowercase alphanumeric suffix', () => {
    expect(generateDefaultWorkflowId()).toMatch(
      new RegExp(`^${DEFAULT_WORKFLOW_ID_PREFIX}-[a-z0-9]{7}$`),
    )
  })

  it('returns different ids across calls', () => {
    expect(generateDefaultWorkflowId()).not.toBe(generateDefaultWorkflowId())
  })
})
