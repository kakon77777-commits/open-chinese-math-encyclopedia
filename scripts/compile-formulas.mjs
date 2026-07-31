import { promises as fs } from 'node:fs'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { compileFormula } from '../lib/formula-compiler.js'
import { DATA_DIR, listObjects, loadObject } from '../lib/store.js'

const mode = process.argv.includes('--write') ? 'write' : 'check'
const results = []
const errors = []

for (const entry of await listObjects()) {
  const object = await loadObject(entry.id)
  let compiled
  try {
    compiled = compileFormula(object.formula.tex, {
      compilerVersion: object.formula.compiler?.version || '0.4.0',
    })
  } catch (error) {
    errors.push(`${entry.id}: ${error.message}`)
    continue
  }

  const inSync = isDeepStrictEqual(object.formula, compiled)
  results.push({
    id: entry.id,
    tex: object.formula.tex,
    compiler_version: compiled.compiler.version,
    source_sha256: compiled.compiler.source_sha256,
    in_sync: inSync || mode === 'write',
  })

  if (mode === 'write') {
    object.formula = compiled
    const relative = entry.path.replace(/^\/data\//, '')
    await fs.writeFile(path.join(DATA_DIR, relative), `${JSON.stringify(object, null, 2)}\n`, 'utf8')
  } else if (!inSync) {
    errors.push(`${entry.id}: formula derivatives drifted from formula.tex; run npm run compile:formulas`)
  }
}

await fs.mkdir('artifacts', { recursive: true })
await fs.writeFile('artifacts/formula-compilation.json', `${JSON.stringify({
  ok: errors.length === 0,
  schema_version: 'ocme-formula-compilation-v0.2',
  mode,
  object_count: results.length,
  results,
  errors,
}, null, 2)}\n`, 'utf8')

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`Formula ${mode} passed: ${results.length} object(s).`)
