import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { semanticTemplateForNewQuestionFamily, sourceForNewQuestionFamily, validateNewQuestionFamily } from '../lib/question-family-boundaries.js'

function candidate(family, parameters, value, explanation_zh, stem_zh) {
  parameters.semantic_template = semanticTemplateForNewQuestionFamily(family, parameters)
  return { variant: { family_id: family, parameters }, answer: { value, explanation_zh }, stem_zh }
}

const arithmetic = candidate(
  'qf-arithmetic-domain-boundary',
  { number_system: 'N', operator: '/', a: 7, b: 3, state: 'not_closed_in_N' },
  '在 N 中不封閉',
  '7/3 不是自然數，因為 3 不整除 7。',
  '在數系 N（包含 0）中，7/3 的結果應如何分類？',
)
assert.deepEqual(validateNewQuestionFamily(arithmetic).errors, [])
const floatingDivision = structuredClone(arithmetic)
floatingDivision.answer.explanation_zh = '7/3=2.3333333333333335，所以不在 N。'
assert.match(validateNewQuestionFamily(floatingDivision).errors.join('\n'), /exact divisibility witness/)

const expression = candidate(
  'qf-variable-expression-evaluation',
  { number_system: 'N', variable: 'x', assigned_value: 6, operator: '+', constant: 3, expression_form: 'x_plus_constant' },
  9,
  '代入 x=6，得到 6+3=9。',
  '在數系 N 中，給定 x=6。求代數式 x+3 的值（這是表達式，不是方程式）。',
)
assert.deepEqual(validateNewQuestionFamily(expression).errors, [])
const mislabeledEquation = structuredClone(expression)
mislabeledEquation.stem_zh = '在數系 N 中，給定 x=6。求方程式 x+3 的值。'
assert.match(validateNewQuestionFamily(mislabeledEquation).errors.join('\n'), /expression\/equation boundary/)

const sample = candidate(
  'qf-finite-sample-space-completeness',
  { experiment: '擲硬幣一次', observation_scale: '一次明示有限試驗', expected_outcomes: ['正', '反'], listed_outcomes: ['正'], mode: 'missing_outcome' },
  '否',
  '缺少明示可能結果「反」，因此不完整；本題不從樣本空間推論機率。',
  '試驗為擲硬幣一次，觀察尺度是一次；所有基本結果為正、反。候選是否完整？',
)
assert.deepEqual(validateNewQuestionFamily(sample).errors, [])
const probabilityLeak = structuredClone(sample)
probabilityLeak.answer.explanation_zh = '缺少明示可能結果「反」，兩面等可能。'
assert.match(validateNewQuestionFamily(probabilityLeak).errors.join('\n'), /implicit probability claim/)

const induction = candidate(
  'qf-induction-proof-obligation',
  { mode: 'missing_role', target_role: 'base_case', provided_roles: ['induction_hypothesis', 'induction_step', 'conclusion'], base_index: 0, step_relation: 'P(n)_implies_P(n+1)', finite_examples_checked: 5 },
  'base_case',
  '缺少「證明 P(0)」；有限例子不能補足歸納義務。',
  '從 0 起的命題族列了有限例子；這不構成普遍證明。下列哪個角色缺漏？',
)
assert.deepEqual(validateNewQuestionFamily(induction).errors, [])
const falseInduction = structuredClone(induction)
falseInduction.variant.parameters.provided_roles = ['base_case', 'induction_step', 'conclusion']
falseInduction.variant.parameters.semantic_template = semanticTemplateForNewQuestionFamily(falseInduction.variant.family_id, falseInduction.variant.parameters)
assert.match(validateNewQuestionFamily(falseInduction).errors.join('\n'), /omit exactly the target role/)

const countingParameters = { mode: 'addition_overlap', branch_counts: [4, 5], stages: [2, 99], overlap_witness: '共同項', conditional_stage_witness: null }
const counting = candidate(
  'qf-basic-counting-principle',
  countingParameters,
  '不可無條件相加',
  '「共同項」同時屬於兩分支，不能直接相加。',
  '兩分支各有 4 與 5 種結果，但都包含「共同項」。是否可無條件相加？',
)
assert.deepEqual(validateNewQuestionFamily(counting).errors, [])
const changedPadding = { ...counting.variant.parameters, stages: [500, 600] }
assert.equal(semanticTemplateForNewQuestionFamily(counting.variant.family_id, changedPadding), counting.variant.parameters.semantic_template, 'irrelevant padding must not change semantic identity')

const union = candidate(
  'qf-finite-set-union',
  { A: [3, 1], B: [4, 3] },
  '{1, 3, 4}',
  '元素 3 同時出現但只保留一次；結果為 {1, 3, 4}。',
  '令 A={1, 3}，B={3, 4}。求 A∪B（元素只列一次並依遞增排序）。',
)
assert.deepEqual(validateNewQuestionFamily(union).errors, [])
assert.equal(sourceForNewQuestionFamily(union.variant.family_id), 'mko-set-operations')
const permutedUnion = { ...union.variant.parameters, A: [1, 3], B: [3, 4] }
assert.equal(semanticTemplateForNewQuestionFamily(union.variant.family_id, permutedUnion), union.variant.parameters.semantic_template)
const duplicateUnionOutput = structuredClone(union)
duplicateUnionOutput.answer.value = '{1, 3, 3, 4}'
assert.match(validateNewQuestionFamily(duplicateUnionOutput).errors.join('\n'), /answer mismatch/)

const intersection = candidate(
  'qf-finite-set-intersection',
  { A: [1], B: [2] },
  '∅',
  '沒有共同元素，因此交集明確為 ∅。',
  '令 A={1}，B={2}。求 A∩B（元素只列一次並依遞增排序）。',
)
assert.deepEqual(validateNewQuestionFamily(intersection).errors, [])
const falseNonemptyIntersection = structuredClone(intersection)
falseNonemptyIntersection.answer.value = '{1}'
assert.match(validateNewQuestionFamily(falseNonemptyIntersection).errors.join('\n'), /answer mismatch/)

const difference = candidate(
  'qf-finite-set-difference',
  { A: [1, 2], B: [2, 3] },
  '{1}',
  '1 屬於 A 而不屬於 B；反向 B\\A 會是 {3}，不可混同。',
  '令 A={1, 2}，B={2, 3}。求方向性差集 A\\B（元素只列一次並依遞增排序）。',
)
assert.deepEqual(validateNewQuestionFamily(difference).errors, [])
const reversedDifference = structuredClone(difference)
reversedDifference.answer.value = '{3}'
assert.match(validateNewQuestionFamily(reversedDifference).errors.join('\n'), /answer mismatch/)

const complement = candidate(
  'qf-finite-relative-complement',
  { U: [1, 2, 3], A: [1] },
  '{2, 3}',
  '全集 U 已明示且 A⊆U；2 在 U 中但不在 A 中，所以 U\\A={2, 3}。',
  '令明示全集 U={1, 2, 3}，且 A={1}⊆U。求相對補集 U\\A（元素只列一次並依遞增排序）。',
)
assert.deepEqual(validateNewQuestionFamily(complement).errors, [])
const outsideUniverse = structuredClone(complement)
outsideUniverse.variant.parameters.A = [4]
outsideUniverse.variant.parameters.semantic_template = semanticTemplateForNewQuestionFamily(outsideUniverse.variant.family_id, outsideUniverse.variant.parameters)
assert.match(validateNewQuestionFamily(outsideUniverse).errors.join('\n'), /subset of U/)
const missingUniverse = structuredClone(complement)
delete missingUniverse.variant.parameters.U
missingUniverse.variant.parameters.semantic_template = semanticTemplateForNewQuestionFamily(missingUniverse.variant.family_id, missingUniverse.variant.parameters)
assert.match(validateNewQuestionFamily(missingUniverse).errors.join('\n'), /U must be an explicit finite integer set/)

const setBatchManifest = JSON.parse(await fs.readFile('public/data/questions/batches/batch-20260915-finite-set-operations/manifest.json', 'utf8'))
assert.match(setBatchManifest.source_mko_snapshots['mko-set-operations'].commit_sha, /^[a-f0-9]{40}$/)
const ciWorkflow = await fs.readFile('.github/workflows/ci.yml', 'utf8')
assert.match(ciWorkflow, /fetch-depth:\s*0/, 'commit-bound question provenance requires non-shallow CI checkout')

console.log('Question family boundary tests passed: nine post-baseline families enforce exact witnesses, semantic scope, source concepts, and mode-specific deduplication.')
