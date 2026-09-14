import assert from 'node:assert/strict'
import { semanticTemplateForNewQuestionFamily, validateNewQuestionFamily } from '../lib/question-family-boundaries.js'

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

console.log('Question family boundary tests passed: five new families enforce exact witnesses, semantic scope, source concepts, and mode-specific deduplication.')
