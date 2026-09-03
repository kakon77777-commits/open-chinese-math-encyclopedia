const FORBIDDEN_PROTOCOL_KEYS = new Set([
  'canonical_state',
  'canonical_verdict',
  'reasoning_trace',
])

export function findForbiddenProtocolKeys(value) {
  const matches = []
  const seen = new WeakSet()

  function visit(node, path) {
    if (node === null || typeof node !== 'object') return
    if (seen.has(node)) return
    seen.add(node)

    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${path}[${index}]`))
      return
    }

    for (const [key, child] of Object.entries(node)) {
      const childPath = `${path}.${key}`
      if (FORBIDDEN_PROTOCOL_KEYS.has(key)) matches.push(childPath)
      visit(child, childPath)
    }
  }

  visit(value, '$')
  return matches
}

export function isForbiddenProtocolKey(key) {
  return FORBIDDEN_PROTOCOL_KEYS.has(key)
}
