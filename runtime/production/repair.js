import { validateRepairPatch, decodePointer } from '../../lib/repair-patch-validation.js'
import { validateCandidateEnvelope } from '../../lib/candidate-envelope-validation.js'

function containerAndKey(root, segments) {
  if (!segments?.length) throw new Error('repair operation path must not be empty')
  let container = root
  for (const segment of segments.slice(0, -1)) {
    if (Array.isArray(container)) {
      const index = Number(segment)
      if (!Number.isInteger(index) || index < 0 || index >= container.length) throw new Error(`invalid array index ${segment}`)
      container = container[index]
    } else if (container && typeof container === 'object' && Object.hasOwn(container, segment)) {
      container = container[segment]
    } else {
      throw new Error(`repair path does not exist at ${segment}`)
    }
  }
  return { container, key: segments.at(-1) }
}

function applyOperation(root, operation) {
  const segments = decodePointer(operation.path)
  if (!segments) throw new Error(`invalid repair path ${operation.path}`)
  const { container, key } = containerAndKey(root, segments)

  if (Array.isArray(container)) {
    if (operation.op === 'add') {
      if (key === '-') container.push(structuredClone(operation.value))
      else {
        const index = Number(key)
        if (!Number.isInteger(index) || index < 0 || index > container.length) throw new Error(`invalid array add index ${key}`)
        container.splice(index, 0, structuredClone(operation.value))
      }
      return
    }
    const index = Number(key)
    if (!Number.isInteger(index) || index < 0 || index >= container.length) throw new Error(`invalid array index ${key}`)
    if (operation.op === 'replace') container[index] = structuredClone(operation.value)
    else if (operation.op === 'remove') container.splice(index, 1)
    return
  }

  if (!container || typeof container !== 'object') throw new Error(`repair path parent is not an object: ${operation.path}`)
  if (operation.op === 'add') {
    container[key] = structuredClone(operation.value)
  } else if (operation.op === 'replace') {
    if (!Object.hasOwn(container, key)) throw new Error(`repair replace target does not exist: ${operation.path}`)
    container[key] = structuredClone(operation.value)
  } else if (operation.op === 'remove') {
    if (!Object.hasOwn(container, key)) throw new Error(`repair remove target does not exist: ${operation.path}`)
    delete container[key]
  }
}

export async function applyRepairPatch(candidate, ledger, patch, { task, contract } = {}) {
  const validation = await validateRepairPatch(patch, { task, candidate, ledger })
  if (!validation.ok) throw new Error(validation.errors.join('\n'))
  if (!contract || typeof contract !== 'object') throw new TypeError('repair application requires a design contract')

  const nextCandidate = structuredClone(candidate)
  for (const operation of patch.operations) applyOperation(nextCandidate, operation)
  nextCandidate.candidate_revision_id = patch.next_candidate_revision_id

  const candidateValidation = await validateCandidateEnvelope(nextCandidate, task, contract)
  if (!candidateValidation.ok) {
    throw new Error(`Repaired candidate invalid:\n${candidateValidation.errors.join('\n')}`)
  }

  const resolved = new Set(patch.resolves_objections)
  const nextLedger = structuredClone(ledger).map(objection =>
    resolved.has(objection.objection_id) ? { ...objection, status: 'resolved' } : objection,
  )

  return { candidate: nextCandidate, ledger: nextLedger }
}
