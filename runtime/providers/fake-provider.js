import { validateProviderRequest, validateProviderResponse } from './provider-interface.js'

function fixtureKey(request) {
  const suffix = request.run_metadata.fixture_key
  if (typeof suffix !== 'string' || suffix.length === 0) throw new Error('Fake Provider requires run_metadata.fixture_key')
  return `${request.role}:${request.prompt_class}:${suffix}`
}

export class FakeProvider {
  constructor({ fixtures } = {}) {
    if (!fixtures || typeof fixtures !== 'object' || Array.isArray(fixtures)) throw new TypeError('Fake Provider fixtures must be an object')
    this.fixtures = structuredClone(fixtures)
  }

  async run(rawRequest) {
    const request = validateProviderRequest(rawRequest)
    const key = fixtureKey(request)
    if (!Object.hasOwn(this.fixtures, key)) throw new Error(`missing fake provider fixture ${key}`)

    const response = {
      structured_output: structuredClone(this.fixtures[key]),
      usage: {
        input_units: 0,
        output_units: 0,
      },
      provider_metadata: {
        provider: 'fake',
        fixture_key: key,
        deterministic: true,
        network_used: false,
      },
    }
    return validateProviderResponse(response)
  }
}
