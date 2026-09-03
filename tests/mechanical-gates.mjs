import assert from 'node:assert/strict'
import { MECHANICAL_GATES, validateMechanicalGateRegistry } from '../runtime/trust/mechanical-gates.js'
import { executeCommandGate } from '../runtime/trust/command-executor.js'

const registryValidation = validateMechanicalGateRegistry(MECHANICAL_GATES)
assert.equal(registryValidation.ok, true, registryValidation.errors.join('\n'))
assert.equal(MECHANICAL_GATES.length, 12)
assert.equal(new Set(MECHANICAL_GATES.map(gate => gate.gate_id)).size, MECHANICAL_GATES.length)
assert.ok(MECHANICAL_GATES.every(gate => Array.isArray(gate.args)))
assert.ok(MECHANICAL_GATES.every(gate => Array.isArray(gate.scope) && gate.scope.length > 0))
assert.ok(MECHANICAL_GATES.every(gate => typeof gate.executable === 'string' && !gate.executable.includes(' ')))
assert.ok(MECHANICAL_GATES.every(gate => typeof gate.tool_name === 'string' && gate.tool_name.length > 0))
const leanGate = MECHANICAL_GATES.find(gate => gate.gate_id === 'lean_source_gate')
assert.ok(leanGate.scope.some(item => /not formal compilation/i.test(item)))

const passResult = await executeCommandGate({
  gate_id: 'executor_pass_fixture',
  scope: ['command executor fixture'],
  executable: process.execPath,
  args: ['-e', 'process.stdout.write("ok")'],
  tool_name: 'node',
})
assert.equal(passResult.status, 'pass')
assert.equal(passResult.exit_code, 0)
assert.match(passResult.stdout_sha256, /^[a-f0-9]{64}$/)
assert.match(passResult.stderr_sha256, /^[a-f0-9]{64}$/)
assert.equal(Object.hasOwn(passResult, 'stdout'), false)
assert.equal(Object.hasOwn(passResult, 'stderr'), false)
assert.equal(passResult.tool.name, 'node')
assert.ok(passResult.tool.version.length > 0)

const failResult = await executeCommandGate({
  gate_id: 'executor_fail_fixture',
  scope: ['command executor failure fixture'],
  executable: process.execPath,
  args: ['-e', 'process.stderr.write("no"); process.exit(3)'],
  tool_name: 'node',
})
assert.equal(failResult.status, 'fail')
assert.equal(failResult.exit_code, 3)
assert.match(failResult.stderr_sha256, /^[a-f0-9]{64}$/)
assert.equal(Object.hasOwn(failResult, 'stderr'), false)

console.log('Mechanical gate registry and executor tests passed.')
