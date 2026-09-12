import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'

const schema = JSON.parse(await fs.readFile('schemas/question-v0.1.schema.json', 'utf8'))
const validate = new Ajv2020({ allErrors: true }).compile(schema)

const candidate = {
  schema_version: 'ocme-question-v0.1',
  id: 'q-20260912-pythagorean-0001',
  batch_id: 'batch-20260912-geometry-foundations',
  language: 'zh-Hant',
  source_mko_ids: ['mko-euclid-pythagorean-theorem'],
  title_zh: '求直角三角形斜邊',
  stem_zh: '直角三角形的兩股長為 3 與 4，斜邊長是多少？',
  answer: {
    kind: 'numeric',
    value: 5,
    explanation_zh: '由畢達哥拉斯定理，斜邊平方為 3²+4²=25，因此斜邊長為 5。'
  },
  difficulty: {
    band: 'lower_secondary',
    level: 2,
    skills: ['畢達哥拉斯定理', '平方根']
  },
  variant: {
    family_id: 'qf-pythagorean-missing-side',
    seed: 12,
    parameters: { a: 3, b: 4, c: 5 }
  },
  verification: {
    status: 'candidate',
    checks: [],
    warning_zh: '此題尚未通過獨立答案重算，因此只能作為候選題目。'
  },
  provenance: {
    generator_role: 'question_producer',
    generator_model: 'gpt-5.6-terra',
    generated_at: '2026-09-12',
    contract_version: 'ocme-question-factory-v0.1'
  }
}

assert.equal(validate(candidate), true, JSON.stringify(validate.errors))

const falseReviewed = structuredClone(candidate)
falseReviewed.provenance.generator_role = 'architecture_owner'
assert.equal(validate(falseReviewed), false)

const unstableId = structuredClone(candidate)
unstableId.id = 'question-one'
assert.equal(validate(unstableId), false)

const missingSource = structuredClone(candidate)
missingSource.source_mko_ids = []
assert.equal(validate(missingSource), false)

console.log('Question Schema tests passed: valid candidates are accepted and identity, source, and role violations are rejected.')
