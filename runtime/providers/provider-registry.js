import { assertProviderAdapter } from './provider-interface.js'

const PROVIDER_ID_PATTERN = /^[a-z][a-z0-9_-]*$/

function assertProviderId(providerId) {
  if (typeof providerId !== 'string' || !PROVIDER_ID_PATTERN.test(providerId)) {
    throw new TypeError('provider id must match /^[a-z][a-z0-9_-]*$/')
  }
  return providerId
}

export class ProviderRegistry {
  #providers = new Map()

  register(providerId, adapter) {
    const id = assertProviderId(providerId)
    if (this.#providers.has(id)) throw new Error(`provider ${id} already registered`)
    this.#providers.set(id, assertProviderAdapter(adapter))
    return this
  }

  resolve(providerId) {
    const id = assertProviderId(providerId)
    if (!this.#providers.has(id)) throw new Error(`provider ${id} not registered`)
    return this.#providers.get(id)
  }

  list() {
    return [...this.#providers.keys()].sort()
  }
}
