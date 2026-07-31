import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from '../lib/store.js'
import { validateCurrentArchitecture } from '../lib/architecture-validation.js'

const result = await validateCurrentArchitecture()
await fs.mkdir(path.join(ROOT, 'artifacts'), { recursive: true })
await fs.writeFile(
  path.join(ROOT, 'artifacts', 'architecture-validation.json'),
  JSON.stringify(result, null, 2) + '\n',
  'utf8',
)

if (!result.ok) {
  console.error(result.errors.join('\n'))
  process.exit(1)
}

console.log(
  `Architecture validation passed: ${result.summary.object_count} MKO, ` +
  `${result.summary.domain_count} domains, ${result.summary.method_count} methods, ` +
  `${result.summary.learning_path_count} paths and ${result.summary.difficulty_dimension_count} difficulty dimensions.`
)
