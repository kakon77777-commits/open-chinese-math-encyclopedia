import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from './store.js'
import { createMkoValidator, formatSchemaErrors } from './schema-validation.js'

export async function loadDesignContractSchema() {
  return JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'design-contract.schema.json'), 'utf8'))
}

export function createDesignContractValidator(schema) {
  return createMkoValidator(schema)
}

function sameStringArray(left, right) {
  return Array.isArray(left) && Array.isArray(right) &&
    left.length === right.length && left.every((value, index) => value === right[index])
}

export async function validateDesignContract(contract, task, { schema = null } = {}) {
  const errors = []
  if (!task || typeof task !== 'object') return { ok: false, errors: ['design contract validation requires a materialization task'] }

  const contractSchema = schema ?? await loadDesignContractSchema()
  const validate = createDesignContractValidator(contractSchema)
  if (!validate(contract)) {
    errors.push(...formatSchemaErrors(contract?.contract_id ?? 'design-contract', validate.errors))
    return { ok: false, errors }
  }

  const expectedContractId = `contract-${task.task_id}`
  if (contract.contract_id !== expectedContractId) {
    errors.push(`${contract.contract_id}: contract_id must equal ${expectedContractId}`)
  }
  if (contract.task_id !== task.task_id) {
    errors.push(`${contract.contract_id}: task_id must equal ${task.task_id}`)
  }
  if (contract.target_mko_id !== task.target_mko_id) {
    errors.push(`${contract.contract_id}: target_mko_id must equal ${task.target_mko_id}`)
  }
  if (!sameStringArray(contract.required_prerequisites, task.prerequisite_atlas_ids)) {
    errors.push(`${contract.contract_id}: required_prerequisites must exactly match task prerequisite_atlas_ids`)
  }

  return { ok: errors.length === 0, errors }
}
