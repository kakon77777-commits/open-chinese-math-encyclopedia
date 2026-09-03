import { assertProviderAdapter } from '../providers/provider-interface.js'
import { runDesigner } from './designer.js'
import { runBuilder, runBuilderRepair } from './builder.js'
import { runVerifier } from './verifier.js'
import { mergeVerificationIntoLedger } from './objection-ledger.js'
import { applyRepairPatch } from './repair.js'
import { evaluateConvergence } from './convergence.js'

function assertContextMap(contexts) {
  if (!contexts || typeof contexts !== 'object' || Array.isArray(contexts)) throw new TypeError('contexts must be an object')
  for (const key of ['designer', 'builder', 'verifier', 'repair']) {
    if (contexts[key] !== undefined && (contexts[key] === null || typeof contexts[key] !== 'object' || Array.isArray(contexts[key]))) {
      throw new TypeError(`contexts.${key} must be an object`)
    }
  }
}

export async function runDbvLoop({
  provider,
  task,
  contexts = {},
  maxAttempts = 3,
  majorThreshold = 0,
  mechanicalState = 'not_run',
}) {
  assertProviderAdapter(provider)
  if (!task || typeof task !== 'object' || Array.isArray(task)) throw new TypeError('task must be an object')
  assertContextMap(contexts)

  const taskSnapshot = structuredClone(task)
  const contract = await runDesigner({ provider, task, context: contexts.designer ?? {} })
  let candidate = await runBuilder({ provider, task, contract, context: contexts.builder ?? {} })
  let ledger = []
  const verificationReports = []
  const repairPatches = []
  let lastConvergence = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const report = await runVerifier({ provider, task, contract, candidate, context: contexts.verifier ?? {} })
    verificationReports.push(report)
    ledger = mergeVerificationIntoLedger(ledger, report)

    lastConvergence = evaluateConvergence({
      ledger,
      attempt,
      maxAttempts,
      majorThreshold,
      mechanicalState,
    })

    if (lastConvergence.status !== 'continue') {
      if (JSON.stringify(task) !== JSON.stringify(taskSnapshot)) throw new Error('R3 DBV loop mutated its input materialization task')
      return {
        status: lastConvergence.status,
        attempts: attempt,
        contract,
        candidate,
        ledger,
        verification_reports: verificationReports,
        repair_patches: repairPatches,
        convergence: lastConvergence,
      }
    }

    const patch = await runBuilderRepair({
      provider,
      task,
      contract,
      candidate,
      ledger,
      context: contexts.repair ?? {},
    })
    repairPatches.push(patch)
    const repaired = await applyRepairPatch(candidate, ledger, patch, { task, contract })
    candidate = repaired.candidate
    ledger = repaired.ledger
  }

  throw new Error(`DBV loop ended without a convergence result: ${JSON.stringify(lastConvergence)}`)
}
