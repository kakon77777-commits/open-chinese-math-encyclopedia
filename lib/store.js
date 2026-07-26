import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(HERE, '..')
export const DATA_DIR = path.join(ROOT, 'public', 'data')

export async function loadIndex() {
  return JSON.parse(await fs.readFile(path.join(DATA_DIR, 'index.json'), 'utf8'))
}

export async function listObjects() {
  const index = await loadIndex()
  return index.objects
}

export async function loadObject(id) {
  const index = await loadIndex()
  const entry = index.objects.find(object => object.id === id)
  if (!entry) throw new Error(`unknown math object: ${id}`)
  const relative = entry.path.replace(/^\/data\//, '')
  return JSON.parse(await fs.readFile(path.join(DATA_DIR, relative), 'utf8'))
}

export async function loadAllObjects() {
  const entries = await listObjects()
  return Promise.all(entries.map(entry => loadObject(entry.id)))
}

export async function resolveDependencies(id, { recursive = false } = {}) {
  const objects = await loadAllObjects()
  const byId = new Map(objects.map(object => [object.id, object]))
  const root = byId.get(id)
  if (!root) throw new Error(`unknown math object: ${id}`)

  const direct = (root.dependencies || []).map(dep => {
    const object = byId.get(dep.id)
    if (!object) throw new Error(`unresolved dependency: ${id} -> ${dep.id}`)
    return compactObject(object)
  })
  if (!recursive) return direct

  const visited = new Set([id])
  const ordered = []
  function walk(object) {
    for (const dep of object.dependencies || []) {
      if (visited.has(dep.id)) continue
      const target = byId.get(dep.id)
      if (!target) throw new Error(`unresolved dependency: ${object.id} -> ${dep.id}`)
      visited.add(dep.id)
      ordered.push(compactObject(target))
      walk(target)
    }
  }
  walk(root)
  return ordered
}

export async function buildDependencyGraph() {
  const objects = await loadAllObjects()
  return {
    schema_version: 'ocme-dependency-graph-v0.3',
    nodes: objects.map(object => ({
      id: object.id,
      title: object.titles['zh-Hant'],
      type: object.type,
      object_version: object.version,
      formula_compiler: object.formula.compiler,
      evidence_refs: object.verification.evidence_refs,
      producers: object.verification.producers,
    })),
    edges: objects.flatMap(object => (object.dependencies || []).map(dep => ({
      from: dep.id,
      to: object.id,
      relation: 'prerequisite_of',
      reason_zh: dep.reason_zh,
    }))),
  }
}

export function compactObject(mko) {
  return {
    id: mko.id,
    type: mko.type,
    title: mko.titles['zh-Hant'],
    summary: mko.summary?.['zh-Hant'] ?? '',
    statement: mko.statement['zh-Hant'],
    formula: {
      tex: mko.formula.tex,
      semantic_ast: mko.formula.semantic_ast,
      compiler: mko.formula.compiler,
    },
    assumptions: (mko.assumptions || []).map(x => x['zh-Hant']),
    symbols: mko.symbols || [],
    dependencies: mko.dependencies || [],
    proof_status: mko.proofs?.[0]?.status ?? 'not_applicable',
    computational_status: mko.verification?.computational_status ?? 'not_run',
    evidence_refs: mko.verification?.evidence_refs || [],
    evidence_producers: mko.verification?.producers || [],
    formal_status: mko.formalization?.status ?? 'unknown',
    provenance: mko.provenance,
  }
}
