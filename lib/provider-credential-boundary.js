const FORBIDDEN_CREDENTIAL_KEYS = new Set([
  'apikey',
  'authorization',
  'accesstoken',
  'clientsecret',
  'bearertoken',
])

function normalizeKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function assertNoProviderCredentialFields(value, { root = 'provider request' } = {}) {
  const seen = new WeakSet()

  const visit = (node, path) => {
    if (node === null || typeof node !== 'object') return
    if (seen.has(node)) return
    seen.add(node)

    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${path}[${index}]`))
      return
    }

    for (const [key, child] of Object.entries(node)) {
      if (FORBIDDEN_CREDENTIAL_KEYS.has(normalizeKey(key))) {
        throw new Error(`${root} contains forbidden credential field at ${path}.${key}`)
      }
      visit(child, `${path}.${key}`)
    }
  }

  visit(value, '$')
  return value
}
