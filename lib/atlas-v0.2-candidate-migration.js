import { canonicalDependencyMismatches } from './atlas-v0.2-candidate-validation.js'

export function migrateV01AtlasToV02Candidate(atlas, objects, { baselineCommit } = {}) {
  if (atlas?.schema_version !== 'ocme-core-atlas-v0.1' || atlas?.atlas_version !== '0.10.0') {
    throw new Error('candidate migration requires the OCME Core Atlas v0.1 / 0.10.0 baseline')
  }
  if (!/^[a-f0-9]{40}$/.test(baselineCommit || '')) throw new Error('candidate migration requires a full baseline commit SHA')

  const candidate = {
    schema_version: 'ocme-core-atlas-v0.2-candidate',
    atlas_version: '0.11.0-candidate.1',
    status: 'schema_candidate',
    title_zh: atlas.title_zh,
    design_note_zh: '候選 Schema 將 prerequisites 固定為 materialization hard gate；非阻塞語義關聯另存 relationships，且不授權擴張或升格。',
    hard_prerequisite_semantics: 'materialization_blocking',
    groups: structuredClone(atlas.groups),
    entries: atlas.entries.map(entry => ({ ...structuredClone(entry), relationships: [] })),
    migration: {
      baseline_schema_version: atlas.schema_version,
      baseline_atlas_version: atlas.atlas_version,
      baseline_commit: baselineCommit,
      canonical_dependency_alignment: {
        status: 'legacy_unresolved',
        exceptions: [],
      },
    },
  }

  candidate.migration.canonical_dependency_alignment.exceptions = canonicalDependencyMismatches(candidate, objects).map(mismatch => ({
    ...mismatch,
    reason_zh: '既有 Atlas hard prerequisites 與已發布 MKO dependencies 尚未完成逐物件遷移審查。',
  }))
  return candidate
}
