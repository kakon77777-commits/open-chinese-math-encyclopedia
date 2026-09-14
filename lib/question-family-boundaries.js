const NEW_FAMILY_SOURCES = Object.freeze({
  'qf-arithmetic-domain-boundary': 'mko-arithmetic-operations',
  'qf-variable-expression-evaluation': 'mko-variable-expression',
  'qf-finite-sample-space-completeness': 'mko-sample-space',
  'qf-induction-proof-obligation': 'mko-mathematical-induction',
  'qf-basic-counting-principle': 'mko-counting-principle',
})

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])]))
  }
  return value
}

export function canonicalJson(value) {
  return JSON.stringify(normalize(value))
}

export function sourceForNewQuestionFamily(familyId) {
  return NEW_FAMILY_SOURCES[familyId] ?? null
}

function arithmeticResult(parameters, errors) {
  const { a, b, number_system: numberSystem, operator, state } = parameters
  if (numberSystem !== 'N') errors.push('arithmetic number system must be explicit N')
  if (!['+', '-', '*', '/'].includes(operator)) errors.push(`unsupported arithmetic operator ${operator}`)
  if (![a, b].every(Number.isInteger) || a < 0 || b < 0) errors.push('arithmetic operands must be natural numbers')

  if (operator === '/' && b === 0) {
    if (state !== 'zero_divisor') errors.push('zero-divisor state mismatch')
    return { expected: '除數為零，不能給一般數值答案', witness: `${a}/${b}` }
  }

  const value = operator === '+' ? a + b : operator === '-' ? a - b : operator === '*' ? a * b : a / b
  if (Number.isInteger(value) && value >= 0) {
    if (state !== 'defined_in_N') errors.push('defined-in-N state mismatch')
    return { expected: value, witness: `${a}${operator}${b}=${value}` }
  }

  if (state !== 'not_closed_in_N') errors.push('not-closed-in-N state mismatch')
  return {
    expected: '在 N 中不封閉',
    witness: operator === '/' ? `${a}/${b}` : `${a}${operator}${b}=${value}`,
    nonIntegralDivision: operator === '/',
  }
}

function sampleSpaceResult(parameters, errors) {
  const expected = parameters.expected_outcomes
  const listed = parameters.listed_outcomes
  if (!Array.isArray(expected) || !Array.isArray(listed)) {
    errors.push('sample-space outcomes must be arrays')
    return { expected: undefined, witness: undefined }
  }
  if (new Set(expected).size !== expected.length || new Set(listed).size !== listed.length) errors.push('sample-space outcome lists may not contain duplicates')
  const missing = expected.filter(outcome => !listed.includes(outcome))
  const extra = listed.filter(outcome => !expected.includes(outcome))
  const isComplete = missing.length === 0 && extra.length === 0
  const expectedMode = isComplete ? 'complete' : missing.length ? 'missing_outcome' : 'extra_outcome'
  if (parameters.mode !== expectedMode) errors.push(`sample-space mode mismatch: expected ${expectedMode}`)
  return { expected: isComplete ? '是' : '否', witness: missing[0] ?? extra[0] ?? '完整性' }
}

function inductionResult(parameters, errors) {
  const labels = {
    base_case: '證明 P(0)',
    induction_hypothesis: '令 n 為任意自然數並暫設 P(n)',
    induction_step: '在歸納假設下證明 P(n+1)',
    conclusion: '據此斷言所有 n∈N 的 P(n)',
  }
  const roles = Object.keys(labels)
  if (!roles.includes(parameters.target_role)) errors.push(`unknown induction role ${parameters.target_role}`)
  if (parameters.base_index !== 0 || parameters.step_relation !== 'P(n)_implies_P(n+1)') errors.push('induction scope must remain the declared from-zero successor schema')
  if (!Number.isInteger(parameters.finite_examples_checked) || parameters.finite_examples_checked < 1) errors.push('finite example count must be a positive integer')
  if (!Array.isArray(parameters.provided_roles) || parameters.provided_roles.some(role => !roles.includes(role))) errors.push('invalid provided induction roles')
  if (parameters.mode === 'missing_role') {
    const expectedRoles = roles.filter(role => role !== parameters.target_role).sort()
    if (canonicalJson([...parameters.provided_roles].sort()) !== canonicalJson(expectedRoles)) errors.push('missing-role parameters do not omit exactly the target role')
  } else if (parameters.mode === 'identify_role') {
    if (parameters.provided_roles.length !== 1 || parameters.provided_roles[0] !== parameters.target_role) errors.push('identify-role parameters must provide exactly the target role')
  } else {
    errors.push(`unknown induction mode ${parameters.mode}`)
  }
  return { expected: parameters.target_role, witness: labels[parameters.target_role] }
}

function countingResult(parameters, errors) {
  const positiveIntegers = values => Array.isArray(values) && values.length === 2 && values.every(value => Number.isInteger(value) && value > 0)
  if (parameters.mode === 'addition_disjoint') {
    if (!positiveIntegers(parameters.branch_counts)) errors.push('disjoint branch counts must be two positive integers')
    return { expected: parameters.branch_counts?.[0] + parameters.branch_counts?.[1], witness: `${parameters.branch_counts?.[0]}+${parameters.branch_counts?.[1]}` }
  }
  if (parameters.mode === 'multiplication_fixed') {
    if (!positiveIntegers(parameters.stages)) errors.push('fixed stage counts must be two positive integers')
    return { expected: parameters.stages?.[0] * parameters.stages?.[1], witness: `${parameters.stages?.[0]}×${parameters.stages?.[1]}` }
  }
  if (parameters.mode === 'addition_overlap') {
    if (!positiveIntegers(parameters.branch_counts) || typeof parameters.overlap_witness !== 'string' || !parameters.overlap_witness) errors.push('overlap mode requires branch counts and a witness')
    return { expected: '不可無條件相加', witness: parameters.overlap_witness }
  }
  if (parameters.mode === 'multiplication_conditional') {
    if (!positiveIntegers(parameters.conditional_stage_witness) || !Number.isInteger(parameters.stages?.[0]) || parameters.stages[0] <= 0) errors.push('conditional multiplication requires a first-stage count and two conditional counts')
    if (parameters.conditional_stage_witness?.[0] === parameters.conditional_stage_witness?.[1]) errors.push('conditional stage counts must actually differ')
    return { expected: '不可無條件相乘', witness: parameters.conditional_stage_witness?.join(' 或 ') }
  }
  errors.push(`unknown counting mode ${parameters.mode}`)
  return { expected: undefined, witness: undefined }
}

function substantiveParameters(family, parameters) {
  const { semantic_template: ignored, ...all } = parameters
  if (family === 'qf-arithmetic-domain-boundary') {
    const { state: derivedState, ...substantive } = all
    return substantive
  }
  if (family !== 'qf-basic-counting-principle') return all
  if (parameters.mode === 'addition_disjoint') return { mode: parameters.mode, branch_counts: parameters.branch_counts }
  if (parameters.mode === 'multiplication_fixed') return { mode: parameters.mode, stages: parameters.stages }
  if (parameters.mode === 'addition_overlap') return { mode: parameters.mode, branch_counts: parameters.branch_counts, overlap_witness: parameters.overlap_witness }
  if (parameters.mode === 'multiplication_conditional') return { mode: parameters.mode, stages: parameters.stages, conditional_stage_witness: parameters.conditional_stage_witness }
  return all
}

export function semanticTemplateForNewQuestionFamily(family, parameters) {
  if (!sourceForNewQuestionFamily(family)) return null
  return `${family}/${canonicalJson(substantiveParameters(family, parameters))}`
}

export function validateNewQuestionFamily(question) {
  const family = question.variant.family_id
  if (!sourceForNewQuestionFamily(family)) return null
  const parameters = question.variant.parameters
  const explanation = question.answer.explanation_zh
  const errors = []
  let result

  if (family === 'qf-arithmetic-domain-boundary') {
    result = arithmeticResult(parameters, errors)
    if (!question.stem_zh.includes('數系 N（包含 0）')) errors.push('arithmetic stem must state the natural-number convention')
    if (result.nonIntegralDivision && (explanation.includes(`${result.witness}=`) || !/(不整除|不是自然數)/u.test(explanation))) errors.push('non-integral division must use an exact divisibility witness, not a floating approximation')
  } else if (family === 'qf-variable-expression-evaluation') {
    if (parameters.number_system !== 'N' || parameters.variable !== 'x' || parameters.operator !== '+' || parameters.expression_form !== 'x_plus_constant') errors.push('variable-expression parameters exceed the approved x-plus-constant scope')
    if (![parameters.assigned_value, parameters.constant].every(Number.isInteger) || parameters.assigned_value < 0 || parameters.constant < 0) errors.push('variable-expression values must be natural numbers')
    result = { expected: parameters.assigned_value + parameters.constant, witness: `${parameters.assigned_value}+${parameters.constant}` }
    if (!question.stem_zh.includes('代數式') || !question.stem_zh.includes('不是方程式')) errors.push('expression/equation boundary missing from stem')
  } else if (family === 'qf-finite-sample-space-completeness') {
    result = sampleSpaceResult(parameters, errors)
    if (!question.stem_zh.includes('觀察尺度') || !question.stem_zh.includes('所有基本結果')) errors.push('sample-space experiment and observation scale must be explicit')
    if (!/(不從樣本空間推論機率|不指派機率|不推論機率)/u.test(explanation)) errors.push('sample-space explanation must reject an implicit probability claim')
  } else if (family === 'qf-induction-proof-obligation') {
    result = inductionResult(parameters, errors)
    if (!question.stem_zh.includes('有限例子') || !question.stem_zh.includes('不構成普遍證明')) errors.push('induction stem must preserve the finite-example boundary')
  } else {
    result = countingResult(parameters, errors)
    const modeMarker = {
      addition_disjoint: '明示互斥',
      multiplication_fixed: '固定',
      addition_overlap: '都包含',
      multiplication_conditional: '隨第一步',
    }[parameters.mode]
    if (modeMarker && !question.stem_zh.includes(modeMarker)) errors.push(`counting stem omits ${modeMarker} boundary`)
  }

  if (question.answer.value !== result.expected) errors.push(`answer mismatch: expected ${result.expected}, got ${question.answer.value}`)
  if (result.witness !== undefined && !explanation.includes(String(result.witness))) errors.push(`explanation omits independently derived witness ${result.witness}`)
  const expectedTemplate = semanticTemplateForNewQuestionFamily(family, parameters)
  if (parameters.semantic_template !== expectedTemplate) errors.push('semantic template must be reconstructed from family/mode-specific substantive parameters')

  return { expected: result.expected, witness: result.witness, expectedTemplate, errors }
}
