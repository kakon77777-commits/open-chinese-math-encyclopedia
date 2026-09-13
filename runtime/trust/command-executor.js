import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { ROOT } from '../../lib/store.js'

const versionCache = new Map()

function resolvePlatformInvocation(executable, args, env = process.env) {
  if (process.platform !== 'win32' || !['npm', 'npx'].includes(executable)) return { executable, args }
  const cliName = executable === 'npm' ? 'npm-cli.js' : 'npx-cli.js'
  const environmentCli = executable === 'npm' ? env.npm_execpath : null
  const cliPath = environmentCli || path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', cliName)
  return {
    executable: env.npm_node_execpath || process.execPath,
    args: [cliPath, ...args],
  }
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex')
}

function capture(executable, args, { cwd = ROOT, env = process.env, timeoutMs = 120000 } = {}) {
  return new Promise(resolve => {
    let child
    try {
      child = spawn(executable, args, { cwd, env, shell: false, windowsHide: true })
    } catch (error) {
      resolve({ exitCode: 127, stdout: '', stderr: `${error.message}\n`, timedOut: false })
      return
    }
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

async function detectToolVersion(toolName, invocation, options) {
  const cacheKey = `${toolName}\u0000${invocation.executable}\u0000${invocation.args.join('\u0000')}`
  if (versionCache.has(cacheKey)) return versionCache.get(cacheKey)

  let version
  if (toolName === 'node') {
    version = process.version
  } else {
    const probe = await capture(invocation.executable, invocation.args, { ...options, timeoutMs: Math.min(options?.timeoutMs ?? 120000, 10000) })
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

  const environment = options.env || process.env
  const invocation = resolvePlatformInvocation(gate.executable, gate.args, environment)
  const versionInvocation = resolvePlatformInvocation(gate.executable, ['--version'], environment)
  const started = process.hrtime.bigint()
  const result = await capture(invocation.executable, invocation.args, options)
  const durationMs = Number((process.hrtime.bigint() - started) / 1000000n)
  const toolVersion = await detectToolVersion(gate.tool_name, versionInvocation, options)

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
