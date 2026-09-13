import { execFileSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const errors = []
const GENERATED_SOURCE_DIRECTORIES = new Set(['.lake', '__pycache__'])

async function collectTextFiles(relativeDirectory) {
  const root = path.join(ROOT, relativeDirectory)
  const files = []
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (GENERATED_SOURCE_DIRECTORIES.has(entry.name)) continue
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) await walk(absolute)
      else if (entry.isFile() && path.extname(entry.name) !== '.pyc') files.push(absolute)
    }
  }
  await walk(root)
  return files
}

const sourceDirectories = [
  'reference/python',
  'formal/lean',
  'felra',
  'evidence-sources',
]
const sourceFiles = (await Promise.all(sourceDirectories.map(collectTextFiles))).flat()

for (const absolute of sourceFiles) {
  const bytes = await fs.readFile(absolute)
  if (bytes.includes(13)) {
    errors.push(`${path.relative(ROOT, absolute)}: CR byte found; content-addressed text inputs must use LF`)
  }
}

const attributes = await fs.readFile(path.join(ROOT, '.gitattributes'), 'utf8').catch(() => '')
if (!attributes.split('\n').some(line => line.trim() === '* text=auto eol=lf')) {
  errors.push('.gitattributes must enforce LF for repository text files')
}

const packageJson = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8'))
const packageLock = await fs.readFile(path.join(ROOT, 'package-lock.json'), 'utf8')
  .then(JSON.parse)
  .catch(() => null)
if (!packageLock) {
  errors.push('package-lock.json is required for npm ci reproducibility')
} else {
  const lockedRoot = packageLock.packages?.['']
  if (packageLock.lockfileVersion !== 3) errors.push(`package-lock.json: expected lockfileVersion 3, found ${packageLock.lockfileVersion}`)
  if (lockedRoot?.name !== packageJson.name || lockedRoot?.version !== packageJson.version) {
    errors.push('package-lock.json root package name/version does not match package.json')
  }
  if (JSON.stringify(lockedRoot?.dependencies || {}) !== JSON.stringify(packageJson.dependencies || {})) {
    errors.push('package-lock.json root dependencies do not match package.json')
  }
}

try {
  const tracked = execFileSync('git', ['ls-files', '--', 'artifacts'], { cwd: ROOT, encoding: 'utf8' })
    .split(/\r?\n/).filter(Boolean)
  const deleted = new Set(execFileSync('git', ['ls-files', '--deleted', '--', 'artifacts'], { cwd: ROOT, encoding: 'utf8' })
    .split(/\r?\n/).filter(Boolean))
  const effectiveTracked = tracked.filter(file => !deleted.has(file))
  const allowedTrackedArtifact = file => file === 'artifacts/materialization-tasks.jsonl'
    || /^artifacts\/r\d+-[a-z0-9-]+-validation\.json$/.test(file)
  const volatileTracked = effectiveTracked.filter(file => !allowedTrackedArtifact(file))
  if (volatileTracked.length) {
    errors.push(`volatile generated artifacts must not be tracked: ${volatileTracked.join(', ')}`)
  }
} catch (error) {
  errors.push(`unable to inspect generated artifact tracking: ${error.message}`)
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`Reproducibility check passed: ${sourceFiles.length} content-addressed text source file(s) use LF, npm is locked, and tracked artifact snapshots match policy.`)
