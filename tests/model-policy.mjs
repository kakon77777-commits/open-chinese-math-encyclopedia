import assert from 'node:assert/strict'
import { createModelPolicy } from '../runtime/providers/model-policy.js'

const request = (role, promptClass) => ({
  role,
  prompt_class: promptClass,
  context: {},
  output_schema_id: 'fixture-schema',
  run_metadata: {},
})

const shared = createModelPolicy({ provider: 'glm', model: 'glm-5.3-flash' })
const designer = shared.resolve(request('designer', 'design_contract'))
const builder = shared.resolve(request('builder', 'candidate_build'))
const repair = shared.resolve(request('builder', 'builder_repair'))
const verifier = shared.resolve(request('verifier', 'candidate_verify'))

for (const policy of [designer, builder, repair, verifier]) {
  assert.equal(policy.provider, 'glm')
  assert.equal(policy.model, 'glm-5.3-flash')
  assert.equal(policy.model_version, 'glm-5.3-flash')
  assert.equal(policy.policy_version, 'ocme-model-policy-v0.1')
  assert.equal(Object.hasOwn(policy, 'canonical_verdict'), false)
  assert.equal(Object.hasOwn(policy, 'confidence'), false)
}

assert.notEqual(designer.prompt_id, builder.prompt_id)
assert.notEqual(builder.prompt_id, verifier.prompt_id)
assert.notEqual(builder.prompt_id, repair.prompt_id)
assert.notEqual(designer.context_class, builder.context_class)
assert.notEqual(builder.context_class, verifier.context_class)
assert.notEqual(designer.source_set_id, verifier.source_set_id)
assert.notEqual(designer.verification_goal, verifier.verification_goal)

const overridden = createModelPolicy({
  provider: 'glm',
  model: 'glm-default',
  models: { designer: 'glm-designer', builder: 'glm-builder', verifier: 'glm-verifier' },
})
assert.equal(overridden.resolve(request('designer', 'design_contract')).model, 'glm-designer')
assert.equal(overridden.resolve(request('builder', 'candidate_build')).model, 'glm-builder')
assert.equal(overridden.resolve(request('builder', 'builder_repair')).model, 'glm-builder')
assert.equal(overridden.resolve(request('verifier', 'candidate_verify')).model, 'glm-verifier')

const mutableModels = { designer: 'glm-designer-stable' }
const snapshotted = createModelPolicy({ provider: 'glm', model: 'glm-default', models: mutableModels })
mutableModels.designer = 'glm-designer-mutated-after-construction'
assert.equal(
  snapshotted.resolve(request('designer', 'design_contract')).model,
  'glm-designer-stable',
  'model policy must snapshot caller configuration at construction time',
)

assert.throws(() => shared.resolve(request('designer', 'candidate_build')), /unsupported role\/prompt/)
assert.throws(() => shared.resolve(request('canonicalizer', 'canonicalize')), /unsupported role\/prompt/)
assert.throws(
  () => createModelPolicy({ requestOptions: { designer: { tools: [] } } }),
  /unsupported model request option/,
)

console.log('R6 deterministic model policy RED/GREEN tests passed.')
