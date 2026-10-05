import { describe, expect, it } from 'vitest'
import {
  defaultCanonicalAddress,
  formatDshRefUri,
  isCanonicalResourceUri,
  normalizeReference,
  parseDshRefUri,
  parseResourceAddress,
} from '../src/descriptor'

describe('parseDshRefUri / formatDshRefUri', () => {
  it('round-trips kind:id', () => {
    const uri = formatDshRefUri('issue', 'I-0001')
    expect(uri).toBe('dsh-ref:issue:I-0001')
    expect(parseDshRefUri(uri)).toEqual({ namespace: 'dsh-ref', kind: 'issue', id: 'I-0001' })
  })

  it('keeps separators inside id intact (phase2 evidence: / # :)', () => {
    expect(parseDshRefUri('dsh-ref:issue:org/repo#I-1')).toEqual({ namespace: 'dsh-ref', kind: 'issue', id: 'org/repo#I-1' })
    expect(parseDshRefUri('dsh-ref:locate:src/auth.ts#L42-L68')).toEqual({
      namespace: 'dsh-ref',
      kind: 'locate',
      id: 'src/auth.ts#L42-L68',
    })
    expect(parseDshRefUri('dsh-ref:demo:proj:12')).toEqual({ namespace: 'dsh-ref', kind: 'demo', id: 'proj:12' })
  })

  it('rejects malformed targets', () => {
    expect(parseDshRefUri('dsh-resource://issue/I-1')).toBeUndefined()
    expect(parseDshRefUri('dsh-ref:issue:')).toBeUndefined()
    expect(parseDshRefUri('dsh-ref::I-1')).toBeUndefined()
    expect(parseDshRefUri('dsh-ref:nocolon')).toBeUndefined()
    expect(parseDshRefUri('https://example.com')).toBeUndefined()
  })
})

describe('canonical resource address', () => {
  it('detects the dsh-resource scheme', () => {
    expect(isCanonicalResourceUri('dsh-resource://issue/I-1')).toBe(true)
    expect(isCanonicalResourceUri('dsh-ref:issue:I-1')).toBe(false)
    expect(isCanonicalResourceUri('dsh-resource://')).toBe(false)
  })

  it('applies the default alias→canonical rule ', () => {
    expect(defaultCanonicalAddress({ kind: 'issue', id: 'I-0001' })).toBe('dsh-resource://issue/I-0001')
    expect(parseResourceAddress('dsh-resource://issue/I-0001')).toEqual({ namespace: 'dsh-ref', kind: 'issue', id: 'I-0001' })
  })

  it('rejects non-canonical or incomplete addresses', () => {
    expect(parseResourceAddress('dsh-ref:issue:I-1')).toBeUndefined()
    expect(parseResourceAddress('dsh-resource://noseparator')).toBeUndefined()
    expect(parseResourceAddress('dsh-resource:///I-1')).toBeUndefined()
  })
})

describe('normalizeReference', () => {
  it('converts dsh-ref alias to canonical uri and records the alias in metadata', () => {
    const d = normalizeReference({ uri: 'dsh-ref:issue:I-1', label: 'I-1' })
    expect(d).toBeDefined()
    expect(d!.uri).toBe('dsh-resource://issue/I-1')
    expect(d!.kind).toBe('issue')
    expect(d!.label).toBe('I-1')
    expect(d!.metadata!.alias).toBe('dsh-ref:issue:I-1')
  })

  it('passes canonical addresses through unchanged (identity = uri)', () => {
    const d = normalizeReference({ uri: 'dsh-resource://issue/I-1' })
    expect(d!.uri).toBe('dsh-resource://issue/I-1')
    expect(d!.metadata).toBeUndefined()
  })

  it('passes non-DSH schemes through as opaque identity', () => {
    const d = normalizeReference({ uri: 'https://example.com/x', label: 'docs' })
    expect(d!.uri).toBe('https://example.com/x')
    expect(d!.kind).toBeUndefined()
  })

  it('synthesizes canonical uri from kind+id when uri absent', () => {
    const d = normalizeReference({ kind: 'knowledge', id: 'KB-0002' })
    expect(d!.uri).toBe('dsh-resource://knowledge/KB-0002')
    expect(d!.kind).toBe('knowledge')
  })

  it('returns undefined when no identity can be determined', () => {
    expect(normalizeReference({ label: 'only a label' })).toBeUndefined()
    expect(normalizeReference({ kind: 'issue' })).toBeUndefined()
    expect(normalizeReference({ uri: 'dsh-ref:broken' })).toBeUndefined()
  })

  it('preserves snapshot, title and custom metadata keys', () => {
    const d = normalizeReference({
      uri: 'dsh-ref:issue:I-1',
      title: 'Issue I-1',
      snapshot: { status: 'open' },
      metadata: { origin: 'test' },
    })
    expect(d!.title).toBe('Issue I-1')
    expect(d!.snapshot).toEqual({ status: 'open' })
    expect(d!.metadata).toEqual({ origin: 'test', alias: 'dsh-ref:issue:I-1' })
  })
})
