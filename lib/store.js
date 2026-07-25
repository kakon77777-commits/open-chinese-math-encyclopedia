import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(HERE, '..')
export const DATA_DIR = path.join(ROOT, 'public', 'data')

export async function loadIndex() {
  return JSON.parse(await fs.readFile(path.join(DATA_DIR, 'index.json'), 'utf8'))
}

export async function loadObject(id) {
  const index = await loadIndex()
  const entry = index.objects.find(object => object.id === id)
  if (!entry) throw new Error(`unknown math object: ${id}`)
  const relative = entry.path.replace(/^\/data\//, '')
  return JSON.parse(await fs.readFile(path.join(DATA_DIR, relative), 'utf8'))
}

export async function listObjects() {
  const index = await loadIndex()
  return index.objects
}

export function compactObject(mko) {
  return {
    id: mko.id,
    type: mko.type,
    title: mko.titles['zh-Hant'],
    statement: mko.statement['zh-Hant'],
    tex: mko.formula.tex,
    assumptions: mko.assumptions.map(x => x['zh-Hant']),
    symbols: mko.symbols,
    dependencies: mko.dependencies,
    proof_status: mko.proofs?.[0]?.status ?? 'unknown',
    computational_status: mko.verification.computational_status,
    formal_status: mko.formalization.status,
    provenance: mko.provenance,
  }
}
