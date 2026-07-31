import assert from 'node:assert/strict'
import {
  loadArchitectureBundle,
  validateArchitectureBundle,
} from '../lib/architecture-validation.js'
import {
  DIFFICULTY_DIMENSIONS,
  getArchitectureSummary,
  loadArchitectureProfile,
} from '../lib/architecture-store.js'

const bundle = await loadArchitectureBundle()
const valid = await validateArchitectureBundle(bundle)
assert.equal(valid.ok, true, valid.errors.join('\n'))
assert.equal(valid.summary.object_count, 6)
assert.equal(valid.summary.profile_count, 6)
assert.equal(valid.summary.domain_count, 20)
assert.equal(valid.summary.method_count, 20)
assert.equal(valid.summary.learning_path_count, 5)
assert.equal(valid.summary.curriculum_framework_count, 4)
assert.equal(valid.summary.curriculum_alignment_count, 10)
assert.equal(valid.summary.difficulty_dimension_count, 12)

const theorem = await loadArchitectureProfile('mko-euclid-pythagorean-theorem')
assert.equal(theorem.classification.assertions.some(item => item.axis === 'domain' && item.term_id === 'geometry' && item.role === 'primary'), true)
assert.equal(theorem.methodology.method_ids.includes('method-formal-verification'), true)
assert.equal(theorem.learning.path_ids.length, 4)
assert.deepEqual(Object.keys(theorem.difficulty.profiles[0].dimensions), DIFFICULTY_DIMENSIONS)

const summary = await getArchitectureSummary()
assert.equal(summary.profile_count, 6)
assert.equal(summary.difficulty_dimensions.length, 12)

const unknownDomain = structuredClone(bundle)
unknownDomain.profiles[0].classification.assertions[0].term_id = 'domain-does-not-exist'
const unknownDomainResult = await validateArchitectureBundle(unknownDomain)
assert.equal(unknownDomainResult.ok, false)
assert.equal(unknownDomainResult.errors.some(error => error.includes('unknown domain')), true)

const cycle = structuredClone(bundle)
const geometryPath = cycle.learningPaths.find(item => item.id === 'path-geometry-foundations')
geometryPath.edges.push({
  from: 'mko-euclid-pythagorean-theorem',
  to: 'mko-euclidean-length',
  relation: 'recommended_before',
})
const cycleResult = await validateArchitectureBundle(cycle)
assert.equal(cycleResult.ok, false)
assert.equal(cycleResult.errors.some(error => error.includes('learning cycle')), true)

const missingProfile = structuredClone(bundle)
missingProfile.profiles.pop()
const missingProfileResult = await validateArchitectureBundle(missingProfile)
assert.equal(missingProfileResult.ok, false)
assert.equal(missingProfileResult.errors.some(error => error.includes('missing architecture profile')), true)

const malformedDifficulty = structuredClone(bundle)
delete malformedDifficulty.profiles[0].difficulty.profiles[0].dimensions.formalization_burden
const malformedResult = await validateArchitectureBundle(malformedDifficulty)
assert.equal(malformedResult.ok, false)
assert.equal(malformedResult.errors.some(error => error.includes('formalization_burden') || error.includes('difficulty dimensions')), true)

console.log('Architecture tests passed: 6 profiles, 20 domains, 20 methods, 5 paths, 12 dimensions and negative gates.')
