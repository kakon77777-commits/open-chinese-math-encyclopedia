import assert from 'node:assert/strict'
import { adaptLeanManifest } from '../lib/evidence-adapters/lean.js'
import { ROOT, loadObject } from '../lib/store.js'
import { verifyEvidenceAddress } from '../lib/evidence-store.js'

const subject = await loadObject('mko-euclid-pythagorean-theorem')
const manifest = {
  schema_version: 'lean-run-manifest-v0.1',
  subject_id: subject.id,
  producer_version: '4.30.0',
  mathlib_version: 'v4.30.0',
  toolchain: 'Lean 4.30.0',
  command: 'cd formal/lean && lake update && lake exe cache get && lake build',
  theorem_name: 'OCMEFormal.pythagorean_vector',
  status: 'passed',
  claim_scope: {
    quantification: 'formal_universal',
    universal_proof: true,
    statement_zh: '在任意實內積空間中，若向量 x 與 y 的夾角為 π/2，則向量和的範數平方等於兩向量範數平方之和。'
  },
  checks: [
    { id: 'lake_build', status: 'passed' },
    { id: 'no_proof_placeholders', status: 'passed' },
    { id: 'theorem_typecheck', status: 'passed' }
  ],
  limitations: [
    '形式證據直接證明向量夾角版本；百科條目的三角形邊長語句與向量模型之間仍需語義映射。'
  ],
  source_paths: [
    'formal/lean/lean-toolchain',
    'formal/lean/lakefile.toml',
    'formal/lean/OCMEFormal.lean',
    'formal/lean/OCMEFormal/Pythagorean.lean'
  ],
  replay: {
    command: 'cd formal/lean && lake update && lake exe cache get && lake build',
    expected_exit_code: 0,
    source_artifact: 'formal/lean/OCMEFormal/Pythagorean.lean'
  }
}

const evidence = await adaptLeanManifest(manifest, { subject, root: ROOT })
assert.equal(evidence.evidence_type, 'formal_proof')
assert.equal(evidence.claim_scope.universal_proof, true)
assert.equal(evidence.claim_scope.quantification, 'formal_universal')
assert.equal(evidence.producer.id, 'lean-mathlib')
assert.equal(evidence.sources.length, 4)
assert.equal(verifyEvidenceAddress(evidence).ok, true)

const wrongSubject = structuredClone(manifest)
wrongSubject.subject_id = 'mko-right-triangle'
await assert.rejects(() => adaptLeanManifest(wrongSubject, { subject, root: ROOT }), /subject does not match/)

const nonUniversal = structuredClone(manifest)
nonUniversal.claim_scope.universal_proof = false
await assert.rejects(() => adaptLeanManifest(nonUniversal, { subject, root: ROOT }), /universally quantified/)

const escapedPath = structuredClone(manifest)
escapedPath.source_paths = ['../outside.lean', ...manifest.source_paths.slice(1)]
await assert.rejects(() => adaptLeanManifest(escapedPath, { subject, root: ROOT }), /escapes repository/)

console.log('Lean evidence adapter tests passed.')
