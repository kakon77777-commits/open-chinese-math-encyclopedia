import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  listEvidence,
  loadEvidence,
  verifyEvidenceAddress,
} from './lib/evidence-store.js'
import { createEveGlyphReviewPacket } from './lib/eveglyph-review.js'
import { compileFormula } from './lib/formula-compiler.js'
import {
  buildDependencyGraph,
  compactObject,
  listObjects,
  loadObject,
  resolveDependencies,
} from './lib/store.js'

const jsonResult = value => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] })
const errorResult = error => ({ content: [{ type: 'text', text: `Error: ${error?.message || error}` }], isError: true })
const server = new McpServer({ name: 'open-chinese-math-encyclopedia', version: '0.6.0' })

async function referencedEvidence(object) {
  return Promise.all((object.verification?.evidence_refs || []).map(ref => loadEvidence(ref.id)))
}

server.registerTool('search_math_objects', {
  title: '搜尋數學知識物件',
  description: '依繁體中文標題、物件 ID、類型或標籤搜尋 OCME 數學知識物件。',
  inputSchema: { query: z.string().default('').describe('搜尋字串；空字串列出全部物件') },
}, async ({ query }) => {
  try {
    const q = query.trim().toLowerCase()
    const objects = await listObjects()
    const results = !q ? objects : objects.filter(x => `${x.id} ${x.title} ${x.type} ${(x.tags || []).join(' ')}`.toLowerCase().includes(q))
    return jsonResult({ results })
  } catch (error) { return errorResult(error) }
})

server.registerTool('get_math_object', {
  title: '取得數學知識物件',
  description: '取得完整 Canonical MKO，包括公式 AST、符號、前提、計算伴隨、evidence_refs、producer 設定與來源。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try { return jsonResult(await loadObject(id)) }
  catch (error) { return errorResult(error) }
})

server.registerTool('get_math_context_bundle', {
  title: '取得 AI 最小數學上下文包',
  description: '取得精簡 MKO 與其明確引用的 Evidence Object，不掃描未被 MKO 承認的證據。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try {
    const object = await loadObject(id)
    return jsonResult({ object: compactObject(object), evidence: await referencedEvidence(object) })
  } catch (error) { return errorResult(error) }
})

server.registerTool('get_dependencies', {
  title: '解析數學物件依賴',
  description: '將 dependency ID 解析為實際數學知識物件；可選擇直接或遞迴取得全部前置知識。',
  inputSchema: {
    id: z.string().describe('數學知識物件 ID'),
    recursive: z.boolean().default(false).describe('是否遞迴解析全部前置依賴'),
  },
}, async ({ id, recursive }) => {
  try { return jsonResult({ object_id: id, recursive, dependencies: await resolveDependencies(id, { recursive }) }) }
  catch (error) { return errorResult(error) }
})

server.registerTool('get_formula_ast', {
  title: '取得公式語義 AST',
  description: '取得公式的 TeX、MathML、編譯器資訊與 Semantic AST，不需解析圖片。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try {
    const object = await loadObject(id)
    return jsonResult({ object_id: id, formula: object.formula, symbols: object.symbols })
  } catch (error) { return errorResult(error) }
})

server.registerTool('compile_formula', {
  title: '編譯 OCME 核心公式',
  description: '將支援子集中的 TeX 編譯為原生 MathML、語義 AST 與來源雜湊；未支援命令直接失敗。',
  inputSchema: { tex: z.string().min(1).describe('例如 a^2+b^2=c^2、\\gamma=\\frac{\\pi}{2}') },
}, async ({ tex }) => {
  try {
    return jsonResult({
      supported_subset: ['equation', 'addition', 'subtraction', 'power', 'subscript', 'function_call', 'fraction', 'square_root', 'group', 'selected_greek_symbols'],
      result: compileFormula(tex),
    })
  } catch (error) { return errorResult(error) }
})

server.registerTool('get_dependency_graph', {
  title: '取得數學知識依賴圖',
  description: '取得 OCME 節點、前置依賴邊、evidence_refs 與 producer 設定。',
}, async () => {
  try { return jsonResult(await buildDependencyGraph()) }
  catch (error) { return errorResult(error) }
})

server.registerTool('list_evidence', {
  title: '列出證據物件',
  description: '列出內容定址 Evidence Object 的 ID、主體、類型、狀態、生產者與路徑。',
}, async () => {
  try { return jsonResult({ results: await listEvidence() }) }
  catch (error) { return errorResult(error) }
})

server.registerTool('get_evidence', {
  title: '取得證據物件',
  description: '按 Evidence ID 取得範圍、檢查結果、限制、來源雜湊與重播命令，並重新驗證內容地址。',
  inputSchema: { id: z.string().describe('Evidence Object ID') },
}, async ({ id }) => {
  try {
    const evidence = await loadEvidence(id)
    return jsonResult({ evidence, address_verification: verifyEvidenceAddress(evidence) })
  } catch (error) { return errorResult(error) }
})

server.registerTool('get_evidence_for_object', {
  title: '取得數學物件明確引用的證據',
  description: '只解析 MKO evidence_refs 中列出的 Evidence Object。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try {
    const object = await loadObject(id)
    return jsonResult({ object_id: id, evidence_refs: object.verification.evidence_refs, evidence: await referencedEvidence(object) })
  } catch (error) { return errorResult(error) }
})

server.registerTool('get_evidence_producers', {
  title: '取得證據生產者設定',
  description: '取得 Python、FELRA 或形式系統的 adapter、設定路徑與狀態；configured 不等於已有證據。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try {
    const object = await loadObject(id)
    const evidence = await referencedEvidence(object)
    const activeEvidenceProducers = new Set(evidence.map(item => item.producer.id))
    return jsonResult({
      object_id: id,
      producers: object.verification.producers.map(producer => ({
        ...producer,
        has_referenced_evidence: activeEvidenceProducers.has(producer.id),
      })),
    })
  } catch (error) { return errorResult(error) }
})

server.registerTool('get_eveglyph_review_packet', {
  title: '取得 EveGlyph 文字審查封包',
  description: '產生唯讀審查封包：中文文字欄位可提案修改，公式、AST、Evidence、producer、形式化與來源血統不可由此工具修改。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try {
    const object = await loadObject(id)
    return jsonResult({
      mode: 'read_only_review_packet',
      patch_schema: 'schemas/eveglyph-review-patch.schema.json',
      direct_publish_available: false,
      packet: createEveGlyphReviewPacket(object),
    })
  } catch (error) { return errorResult(error) }
})

server.registerTool('get_computational_companion', {
  title: '取得計算伴隨與非同一性聲明',
  description: '取得參考程式、數學關係，以及保存、近似與遺漏的語義。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try {
    const object = await loadObject(id)
    return jsonResult({ object_id: id, companions: object.computational_companions })
  } catch (error) { return errorResult(error) }
})

server.registerTool('get_verification_status', {
  title: '取得計算與形式驗證狀態',
  description: '明確區分 MKO 驗證設定、引用證據、人工證明與形式證明。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try {
    const object = await loadObject(id)
    return jsonResult({
      object_id: id,
      human_proofs: object.proofs || [],
      verification: object.verification,
      evidence: await referencedEvidence(object),
      formalization: object.formalization,
    })
  } catch (error) { return errorResult(error) }
})

await server.connect(new StdioServerTransport())
