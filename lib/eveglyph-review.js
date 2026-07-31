import { createHash } from 'node:crypto'
import { canonicalJson } from './evidence-store.js'

function sha256Text(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value || '')
  if (!match) throw new Error(`invalid semantic version: ${value}`)
  return match.slice(1).map(Number)
}

function compareVersions(left, right) {
  const a = parseVersion(left)
  const b = parseVersion(right)
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index]
  }
  return 0
}

export function objectReviewSha256(object) {
  return sha256Text(canonicalJson(object))
}

export function createEveGlyphReviewPacket(object) {
  return {
    schema_version: 'ocme-eveglyph-review-packet-v0.1',
    object_id: object.id,
    object_type: object.type,
    object_version: object.version,
    base_object_sha256: objectReviewSha256(object),
    editable: {
      title_zh: object.titles?.['zh-Hant'] ?? '',
      summary_zh: object.summary?.['zh-Hant'] ?? '',
      statement_zh: object.statement?.['zh-Hant'] ?? '',
      explanation_paragraphs_zh: object.explanation?.paragraphs_zh ?? [],
      common_misconception_zh: object.explanation?.common_misconception_zh ?? '',
      proof_summaries_zh: Object.fromEntries((object.proofs || []).map(proof => [proof.id, proof.summary_zh])),
    },
    read_only: {
      formula: object.formula,
      assumptions: object.assumptions,
      symbols: object.symbols,
      dependencies: object.dependencies,
      computational_companions: object.computational_companions,
      verification: object.verification,
      formalization: object.formalization,
      provenance: object.provenance,
    },
    policy: {
      editable_fields: [
        'title_zh',
        'summary_zh',
        'statement_zh',
        'explanation_paragraphs_zh',
        'common_misconception_zh',
        'proof_summaries_zh',
      ],
      machine_managed_fields: [
        'formula',
        'assumptions',
        'symbols',
        'dependencies',
        'computational_companions',
        'verification',
        'formalization',
        'provenance',
      ],
      requires_fresh_base_sha256: true,
    },
  }
}

export function applyEveGlyphReviewPatch(object, patch) {
  if (patch.object_id !== object.id) {
    throw new Error(`review patch object mismatch: ${patch.object_id} != ${object.id}`)
  }
  const currentSha = objectReviewSha256(object)
  if (patch.base_object_sha256 !== currentSha) {
    throw new Error(`stale review patch: expected base ${currentSha}, received ${patch.base_object_sha256}`)
  }
  if (compareVersions(patch.new_object_version, object.version) <= 0) {
    throw new Error(`new object version must be greater than ${object.version}`)
  }

  const updated = structuredClone(object)
  const changes = patch.changes
  if (changes.title_zh !== undefined) updated.titles['zh-Hant'] = changes.title_zh
  if (changes.summary_zh !== undefined) updated.summary['zh-Hant'] = changes.summary_zh
  if (changes.statement_zh !== undefined) updated.statement['zh-Hant'] = changes.statement_zh
  if (changes.explanation_paragraphs_zh !== undefined) {
    updated.explanation.paragraphs_zh = structuredClone(changes.explanation_paragraphs_zh)
  }
  if (changes.common_misconception_zh !== undefined) {
    updated.explanation.common_misconception_zh = changes.common_misconception_zh
  }
  if (changes.proof_summaries_zh !== undefined) {
    const proofById = new Map((updated.proofs || []).map(proof => [proof.id, proof]))
    for (const [proofId, summary] of Object.entries(changes.proof_summaries_zh)) {
      const proof = proofById.get(proofId)
      if (!proof) throw new Error(`unknown proof ID in review patch: ${proofId}`)
      proof.summary_zh = summary
    }
  }
  updated.version = patch.new_object_version
  return updated
}

export function renderEveGlyphReviewMarkdown(packet) {
  const proofs = Object.entries(packet.editable.proof_summaries_zh)
    .map(([id, summary]) => `### ${id}\n\n${summary}`)
    .join('\n\n') || '_此物件沒有證明摘要。_'
  const explanations = packet.editable.explanation_paragraphs_zh
    .map((paragraph, index) => `${index + 1}. ${paragraph}`)
    .join('\n')
  return `---
schema_version: ocme-eveglyph-review-packet-v0.1
object_id: ${packet.object_id}
object_type: ${packet.object_type}
object_version: ${packet.object_version}
base_object_sha256: ${packet.base_object_sha256}
review_surface: eveglyph
machine_fields: read_only
---

# ${packet.editable.title_zh}

> 此文件只供中文文字審查。公式、AST、Evidence、producer、形式化狀態與來源血統均為機器管理欄位，不得在此修改。

## 摘要

${packet.editable.summary_zh}

## 數學敘述

${packet.editable.statement_zh}

## 解釋段落

${explanations}

## 常見誤解

${packet.editable.common_misconception_zh}

## 證明摘要

${proofs}

## 唯讀機器狀態

- 公式 TeX：\`${packet.read_only.formula.tex}\`
- 公式編譯器：\`${packet.read_only.formula.compiler.id} v${packet.read_only.formula.compiler.version}\`
- Evidence refs：${packet.read_only.verification.evidence_refs.length}
- Evidence producers：${packet.read_only.verification.producers.map(item => `${item.id}:${item.status}`).join('、')}
- 形式化狀態：\`${packet.read_only.formalization.status}\`

## Patch 提交規則

Patch 必須符合 \`schemas/eveglyph-review-patch.schema.json\`，並攜帶本文件的 \`base_object_sha256\`。基線不一致時，系統會拒絕套用。
`
}
