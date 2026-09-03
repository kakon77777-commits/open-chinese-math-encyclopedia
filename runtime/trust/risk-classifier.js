const CLASS_RANK = Object.freeze({ L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 })
const DIFFICULTY_KEYS = Object.freeze([
  'prerequisite_depth',
  'abstraction_level',
  'proof_burden',
  'exception_boundary_density',
  'formalization_burden',
])

function scoreToClass(score) {
  if (score >= 75) return 'L4'
  if (score >= 50) return 'L3'
  if (score >= 30) return 'L2'
  if (score >= 15) return 'L1'
  return 'L0'
}

function higherClass(left, right) {
  if (left === null) return right
  if (right === null) return left
  return CLASS_RANK[left] >= CLASS_RANK[right] ? left : right
}

function factor(factorId, scoreDelta, observed, reason) {
  return { factor_id: factorId, score_delta: scoreDelta, observed, reason }
}

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`)
}

function requireArray(value, name) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`)
}

function validateIdentity(task, atlasEntry, mechanicalReport, objections) {
  if (task.atlas_id !== atlasEntry.id) throw new Error(`task atlas_id must equal atlas entry id ${atlasEntry.id}`)
  if (task.target_mko_id !== atlasEntry.target_mko_id) throw new Error(`task target_mko_id must equal atlas target ${atlasEntry.target_mko_id}`)
  if (mechanicalReport.target_mko_id !== task.target_mko_id) throw new Error(`mechanical report target_mko_id must equal ${task.target_mko_id}`)
  for (const objection of objections) {
    requireObject(objection, 'objection')
    if (objection.target_candidate_revision_id !== mechanicalReport.candidate_revision_id) {
      throw new Error(`objection ${objection.objection_id ?? '<unknown>'} targets a different candidate revision`)
    }
    if (objection.target_candidate_id !== task.target_mko_id) {
      throw new Error(`objection ${objection.objection_id ?? '<unknown>'} targets a different candidate id`)
    }
  }
}

function downstreamContribution(count) {
  if (count >= 8) return 15
  if (count >= 4) return 10
  if (count >= 1) return 5
  return 0
}

function objectKindContribution(kind) {
  if (kind === 'theorem' || kind === 'proof') return { score: 15, known: true }
  if (kind === 'function' || kind === 'relation') return { score: 5, known: true }
  if (['concept', 'notation', 'operation', 'representation'].includes(kind)) return { score: 0, known: true }
  return { score: 10, known: false }
}

export function classifyRoutingRisk({
  task,
  atlasEntry,
  atlas,
  mechanicalReport,
  objections = [],
  unresolvedRisks = [],
}) {
  requireObject(task, 'task')
  requireObject(atlasEntry, 'atlasEntry')
  requireObject(atlas, 'atlas')
  requireObject(mechanicalReport, 'mechanicalReport')
  requireArray(objections, 'objections')
  requireArray(unresolvedRisks, 'unresolvedRisks')
  if (!Array.isArray(atlas.entries)) throw new TypeError('atlas.entries must be an array')
  validateIdentity(task, atlasEntry, mechanicalReport, objections)

  const factors = []
  let score = 0
  let hardFloor = null
  const add = (id, delta, observed, reason) => {
    score += delta
    factors.push(factor(id, delta, observed, reason))
  }
  const floor = (value, id, observed, reason) => {
    hardFloor = higherClass(hardFloor, value)
    factors.push(factor(id, 0, observed, reason))
  }

  if (mechanicalReport.mechanical_status === 'fail') {
    add('mechanical_failure', 100, 'mechanical_status=fail', 'A failed deterministic mechanical report requires repair before trust can increase.')
    floor('L4', 'mechanical_failure_floor', 'L4', 'Mechanical failure imposes the highest routing-risk floor.')
  } else if (mechanicalReport.mechanical_status !== 'pass') {
    throw new Error(`unsupported mechanical_status: ${mechanicalReport.mechanical_status}`)
  }

  const open = objections.filter(objection => objection.status === 'open')
  const criticalCount = open.filter(objection => objection.severity === 'critical').length
  const majorCount = open.filter(objection => objection.severity === 'major').length
  const minorCount = open.filter(objection => objection.severity === 'minor').length

  if (criticalCount > 0) {
    add('critical_objections', criticalCount * 40, `${criticalCount} open critical`, 'Open critical objections substantially increase routing burden.')
    floor('L4', 'critical_objection_floor', 'L4', 'Any open critical objection requires the highest assurance route.')
  }
  if (majorCount > 0) {
    add('major_objections', Math.min(50, majorCount * 25), `${majorCount} open major`, 'Open major objections require high-assurance review.')
    floor('L3', 'major_objection_floor', 'L3', 'Any open major objection prevents routing below L3.')
  }
  if (minorCount > 0) {
    add('minor_objections', Math.min(24, minorCount * 8), `${minorCount} open minor`, 'Open minor objections increase repair and review burden.')
  }

  const counterexamples = open.filter(objection => objection.type === 'counterexample_found').length
  if (counterexamples > 0) {
    floor('L4', 'counterexample_floor', `${counterexamples} open counterexample objection(s)`, 'An unresolved counterexample requires the highest assurance route.')
  }
  const formalizationMismatches = open.filter(objection => objection.type === 'formalization_mismatch').length
  if (formalizationMismatches > 0) {
    floor('L3', 'formalization_mismatch_floor', `${formalizationMismatches} open formalization mismatch(es)`, 'Formal-semantic mismatch requires high-assurance review.')
  }

  if (unresolvedRisks.length > 0) {
    add('unresolved_risks', Math.min(18, unresolvedRisks.length * 6), `${unresolvedRisks.length} unresolved risk(s)`, 'Explicit unresolved risks increase routing burden without being treated as probabilities.')
  }

  const difficultyValues = DIFFICULTY_KEYS.map(key => Number(atlasEntry.difficulty?.[key] ?? 1))
  if (difficultyValues.some(value => !Number.isFinite(value) || value < 1)) throw new Error('atlas difficulty values must be finite numbers >= 1')
  const difficultyMax = Math.max(...difficultyValues)
  const difficultyScore = Math.max(0, Math.round((difficultyMax - 1) * 5))
  add('atlas_difficulty', difficultyScore, `dmax=${difficultyMax}`, 'Atlas structural difficulty increases verification and formalization burden.')

  const downstreamCount = atlas.entries.filter(entry =>
    Array.isArray(entry.prerequisites) && entry.prerequisites.includes(atlasEntry.id)
  ).length
  const centralityScore = downstreamContribution(downstreamCount)
  add('downstream_centrality', centralityScore, `${downstreamCount} direct downstream dependent(s)`, 'Highly reused knowledge has greater downstream impact if incorrect.')

  const objectKind = objectKindContribution(atlasEntry.object_kind)
  if (objectKind.score > 0 || !objectKind.known) {
    add('object_kind', objectKind.score, `object_kind=${atlasEntry.object_kind ?? '<unknown>'}`, objectKind.known
      ? 'This object kind carries additional proof or semantic review burden.'
      : 'Unknown object kinds receive a conservative routing-risk contribution.')
  }

  score = Math.min(100, Math.max(0, Math.round(score)))
  let riskClass = scoreToClass(score)
  if (hardFloor !== null && CLASS_RANK[hardFloor] > CLASS_RANK[riskClass]) riskClass = hardFloor

  return {
    schema_version: 'ocme-risk-profile-v0.1',
    profile_id: `risk-${mechanicalReport.candidate_revision_id}`,
    policy_version: 'ocme-risk-policy-v0.1',
    epistemic_scope: 'routing_risk_only',
    task_id: task.task_id,
    atlas_id: atlasEntry.id,
    candidate_revision_id: mechanicalReport.candidate_revision_id,
    mechanical_report_id: mechanicalReport.report_id,
    materialization_priority: task.priority,
    risk_score: score,
    risk_class: riskClass,
    hard_floor: hardFloor,
    factors,
    downstream_dependency_count: downstreamCount,
  }
}
