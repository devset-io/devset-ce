import { describe, expect, it } from 'vitest'
import { buildCloneWorkflowId } from './FlowBuilderManage.effects'

describe('buildCloneWorkflowId', () => {
  it('appends a -clone- suffix with 3 lowercase alphanumeric characters', () => {
    expect(buildCloneWorkflowId('my-workflow')).toMatch(/^my-workflow-clone-[a-z0-9]{3}$/)
  })

  it('returns different suffixes across calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => buildCloneWorkflowId('wf')))
    expect(ids.size).toBeGreaterThan(1)
  })
})
