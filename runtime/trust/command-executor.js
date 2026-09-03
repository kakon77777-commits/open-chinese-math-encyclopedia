import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { ROOT } from '../../lib/store.js'

const versionCache = new Map()

function sha256Text(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex')
}

function capture(executable, args, { cwd = ROOT, env = process.env, timeoutMs = 120000 } = {}) {
  return new Promise(resolve => {
    const child = spawn(executable, args, { cwd, env, shell: false, windowsHide: true })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    child.stdout?.setEncoding('utf8')
    child.stderr?.setEncoding('utf8')
    child.stdout?.on('data', chunk => { stdout += chunk })
    child.stderr?.on('data', chunk => { stderr += chunk })

    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)

    child.on('error', error => {
      clearTimeout(timer)
      resolve({ exitCode: 127, stdout, stderr: `${stderr}${error.message}\n`, timedOut: false })
    })
    child.on('close', code => {
      clearTimeout(timer)
      if (timedOut) stderr += `command timed out after ${timeoutMs}ms\n`
      resolve({ exitCode: timedOut ? 124 : (Number.isInteger(code) ? code : 1), stdout, stderr, timedOut })
    })
  })
}

async function detectToolVersion(toolName, executable, options) {
  const cacheKey = `${toolName}\u0000${executable}`
  if (versionCache.has(cacheKey)) return versionCache.get(cacheKey)

  let version
  if (toolName === 'node') {
    version = process.version
  } else {
    const probe = await capture(executable, ['--version'], { ...options, timeoutMs: Math.min(options?.timeoutMs ?? 120000, 10000) })
    version = (probe.stdout || probe.stderr).trim().split(/\r?\n/)[0] || `exit-${probe.exitCode}`
  }
  versionCache.set(cacheKey, version)
  return version
}

export async function executeCommandGate(gate, options = {}) {
  if (!gate || typeof gate !== 'object' || Array.isArray(gate)) throw new TypeError('gate must be an object')
  if (typeof gate.gate_id !== 'string' || gate.gate_id.length === 0) throw new TypeError('gate.gate_id is required')
  if (!Array.isArray(gate.scope) || gate.scope.length === 0) throw new TypeError('gate.scope is required')
  if (typeof gate.executable !== 'string' || gate.executable.length === 0) throw new TypeError('gate.executable is required')
  if (!Array.isArray(gate.args)) throw new TypeError('gate.args must be an array')
  if (typeof gate.tool_name !== 'string' || gate.tool_name.length === 0) throw new TypeError('gate.tool_name is required')

  const started = process.hrtime.bigint()
  const result = await capture(gate.executable, gate.args, options)
  const durationMs = Number((process.hrtime.bigint() - started) / 1000000n)
  const toolVersion = await detectToolVersion(gate.tool_name, gate.executable, options)

  return {
    gate_id: gate.gate_id,
    scope: structuredClone(gate.scope),
    status: result.exitCode === 0 ? 'pass' : 'fail',
    executable: gate.executable,
    args: structuredClone(gate.args),
    exit_code: result.exitCode,
    stdout_sha256: sha256Text(result.stdout),
    stderr_sha256: sha256Text(result.stderr),
    duration_ms: Math.max(0, durationMs),
    tool: { name: gate.tool_name, version: toolVersion },
  }
}
