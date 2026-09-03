import assert from 'node:assert/strict'
import { ProviderRegistry } from '../runtime/providers/provider-registry.js'
import { FakeProvider } from '../runtime/providers/fake-provider.js'

const fake = new FakeProvider({ fixtures: {} })
const registry = new ProviderRegistry()

registry.register('fake', fake)
assert.equal(registry.resolve('fake'), fake)
assert.deepEqual(registry.list(), ['fake'])

assert.throws(() => registry.register('fake', fake), /already registered/)
assert.throws(() => registry.resolve('missing'), /not registered/)
assert.throws(() => registry.register('', fake), /provider id/)
assert.throws(() => registry.register('bad provider id', fake), /provider id/)
assert.throws(() => registry.register('broken', {}), /run/)

const glm = { async run() { return {} } }
registry.register('glm', glm)
assert.deepEqual(registry.list(), ['fake', 'glm'])
assert.equal(registry.resolve('glm'), glm)
assert.notEqual(registry.resolve('glm'), fake)

console.log('R6 provider registry RED/GREEN tests passed.')
