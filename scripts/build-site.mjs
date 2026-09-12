import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const requested = process.argv.find(argument => argument.startsWith('--out-dir='))?.slice('--out-dir='.length)
const OUTPUT = path.resolve(ROOT, requested || 'dist')
const defaultOutput = path.join(ROOT, 'dist')

if (OUTPUT === ROOT || (OUTPUT !== defaultOutput && !path.basename(OUTPUT).startsWith('ocme-site-'))) {
  throw new Error(`refusing unsafe site output directory: ${OUTPUT}`)
}

async function copyDirectory(source, destination) {
  await fs.mkdir(destination, { recursive: true })
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name)
    const to = path.join(destination, entry.name)
    if (entry.isDirectory()) await copyDirectory(from, to)
    else if (entry.isFile()) await fs.copyFile(from, to)
  }
}

async function collectFiles(directory) {
  const files = []
  async function walk(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name)
      if (entry.isDirectory()) await walk(absolute)
      else if (entry.isFile() && entry.name !== 'build-manifest.json') files.push(absolute)
    }
  }
  await walk(directory)
  return files.sort((a, b) => a.localeCompare(b, 'en'))
}

await fs.rm(OUTPUT, { recursive: true, force: true })
await fs.mkdir(OUTPUT, { recursive: true })
await fs.copyFile(path.join(ROOT, 'index.html'), path.join(OUTPUT, 'index.html'))
await copyDirectory(path.join(ROOT, 'src'), path.join(OUTPUT, 'src'))
await copyDirectory(path.join(ROOT, 'public'), OUTPUT)

const files = await collectFiles(OUTPUT)
const manifest = {
  schema_version: 'ocme-site-build-v0.1',
  file_count: files.length,
  files: [],
}
for (const absolute of files) {
  const bytes = await fs.readFile(absolute)
  manifest.files.push({
    path: path.relative(OUTPUT, absolute).replaceAll('\\', '/'),
    size: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  })
}
await fs.writeFile(path.join(OUTPUT, 'build-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

console.log(`Built OCME site: ${manifest.file_count} files -> ${OUTPUT}`)
