import crypto from 'node:crypto'

function normalizeJson(value, path = '$') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${path}: non-finite numbers are not canonical JSON`)
    return value
  }
  if (Array.isArray(value)) return value.map((item, index) => normalizeJson(item, `${path}[${index}]`))
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${path}: only plain JSON objects are supported`)
    const out = {}
    for (const key of Object.keys(value).sort()) {
      const item = value[key]
      if (item === undefined || typeof item === 'function' || typeof item === 'symbol' || typeof item === 'bigint') {
        throw new TypeError(`${path}.${key}: unsupported canonical JSON value`)
      }
      out[key] = normalizeJson(item, `${path}.${key}`)
    }
    return out
  }
  throw new TypeError(`${path}: unsupported canonical JSON value`)
}

export function canonicalJsonString(value) {
  return JSON.stringify(normalizeJson(value))
}

export function sha256CanonicalJson(value) {
  return crypto.createHash('sha256').update(canonicalJsonString(value), 'utf8').digest('hex')
}
