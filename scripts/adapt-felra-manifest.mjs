import { promises as fs } from 'node:fs'
import path from 'node:path'
import { adaptFelraManifest } from '../lib/evidence-adapters/felra.js'
import { ROOT, loadObject } from '../lib/store.js'
import { createMkoValidator, formatSchemaErrors } from '../lib/schema-validation.js'

function argument(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : null
}

const manifestArgument = argument('--manifest')
if (!manifestArgument) {
  console.error('Usage: npm run adapt:felra -- --manifest <path> [--output <path>] [--ingest]')
  process.exit(2)
}

const manifestPath = path.resolve(ROOT, manifestArgument)
if (manifestPath !== ROOT && !manifestPath.startsWith(`${ROOT}${path.sep}`)) {
  console.error('Manifest path must stay inside the repository.')
  process.exit(2)
}

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
const schema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'felra-run-manifest.schema.json'), 'utf8'))
const validate = createMkoValidator(schema)
if (!validate(manifest)) {
  console.error(formatSchemaErrors(manifestArgument, validate.errors).join('\n'))
  process.exit(1)
}

const subject = await loadObject(manifest.subject_id)
const evidence = await adaptFelraManifest(manifest, { subject, root: ROOT })
const outputArgument = argument('--output')
if (outputArgument) {
  const outputPath = path.resolve(ROOT, outputArgument)
  if (outputPath !== ROOT && !outputPath.startsWith(`${ROOT}${path.sep}`)) {
    console.error('Output path must stay inside the repository.')
    process.exit(2)
  }
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
}

if (process.argv.includes('--ingest')) {
  const safeProject = manifest.project_id.replace(/[^a-zA-Z0-9._-]+/g, '-')
  const targetDir = path.join(ROOT, 'evidence-sources', 'felra')
  const targetPath = path.join(targetDir, `${manifest.subject_id}--${safeProject}.json`)
  await fs.mkdir(targetDir, { recursive: true })
  await fs.writeFile(targetPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.error(`Ingested manifest: ${path.relative(ROOT, targetPath)}`)
  console.error('Run npm run build:evidence to rebuild the canonical Evidence index.')
}

console.log(JSON.stringify({
  evidence,
  note: 'This preview is not canonical until its manifest is ingested and npm run build:evidence succeeds.',
}, null, 2))
