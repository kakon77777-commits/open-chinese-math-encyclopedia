import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  browseDomain,
  getArchitectureSummary,
  getLearningPathsForObject,
  getMethod,
  loadArchitectureProfile,
  loadArchitectureRegistries,
} from './lib/architecture-store.js'
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
const server = new McpServer({ name: 'open-chinese-math-encyclopedia', version: '0.9.0' })

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
  description: '取得精簡 MKO、其明確引用的 Evidence，以及分類、難度、路徑與方法 Architecture Profile。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try {
    const object = await loadObject(id)
    const [evidence, architecture] = await Promise.all([
      referencedEvidence(object),
      loadArchitectureProfile(id),
    ])
    return jsonResult({ object: compactObject(object), evidence, architecture })
  } catch (error) { return errorResult(error) }
})

server.registerTool('get_architecture_summary', {
  title: '取得 OCME 數學世界架構摘要',
  description: '取得領域、方法、學習路徑、課綱對齊、Profile 與難度維度數量。',
}, async () => {
  try { return jsonResult(await getArchitectureSummary()) }
  catch (error) { return errorResult(error) }
})

server.registerTool('list_architecture_terms', {
  title: '列出數學領域、方法與課綱框架',
  description: '列出 v0.9 Architecture Store 的領域、方法與課綱框架，不包含完整 MKO 內容。',
}, async () => {
  try {
    const registries = await loadArchitectureRegistries()
    return jsonResult({
      domains: registries.domains,
      methods: registries.methods.map(method => ({
        id: method.id,
        title_zh: method.title_zh,
        category: method.category,
      })),
      curriculum_frameworks: registries.curricula.frameworks,
      learning_paths: registries.learningPaths.map(pathObject => ({
        id: pathObject.id,
        title_zh: pathObject.title_zh,
        audience: pathObject.audience,
        goal_zh: pathObject.goal_zh,
      })),
    })
  } catch (error) { return errorResult(error) }
})

server.registerTool('get_classification', {
  title: '取得數學物件多軸分類',
  description: '取得 domain、object kind、method、representation 等帶理由的分類 assertion。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try {
    const profile = await loadArchitectureProfile(id)
    return jsonResult({ object_id: id, classification: profile.classification })
  } catch (error) { return errorResult(error) }
})

server.registerTool('get_difficulty_profile', {
  title: '取得任務型數學難度向量',
  description: '取得十二維難度輪廓；這不是單一總分，也不把課程位置當作固有難度。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try {
    const profile = await loadArchitectureProfile(id)
    return jsonResult({ object_id: id, difficulty: profile.difficulty })
  } catch (error) { return errorResult(error) }
})

server.registerTool('get_learning_paths', {
  title: '取得包含此物件的學習路徑',
  description: '取得通識、幾何、函數到極限、形式化或證據素養等可選路徑；不宣稱存在唯一學習順序。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try { return jsonResult({ object_id: id, paths: await getLearningPathsForObject(id) }) }
  catch (error) { return errorResult(error) }
})

server.registerTool('browse_domain', {
  title: '瀏覽數學領域',
  description: '取得領域說明與目前被該領域 assertion 引用的 MKO。',
  inputSchema: { domain_id: z.string().describe('例如 geometry、analysis、foundations_logic') },
}, async ({ domain_id }) => {
  try { return jsonResult(await browseDomain(domain_id)) }
  catch (error) { return errorResult(error) }
})

server.registerTool('get_method', {
  title: '取得數學方法物件',
  description: '取得方法的適用訊號、步驟、失敗模式、相關方法與目前對應 MKO。',
  inputSchema: { method_id: z.string().describe('例如 method-construction 或 method-formal-verification') },
}, async ({ method_id }) => {
  try { return jsonResult(await getMethod(method_id)) }
  catch (error) { return errorResult(error) }
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
  inputSchema: { tex: z.string().min(1).describe('例如 a^2+b^2=c^2、x\\in A、f:X\\to Y、x\\to a') },
}, async ({ tex }) => {
  try {
    return jsonResult({
      supported_subset: [
        'equation', 'membership', 'mapping', 'tends_to', 'addition', 'subtraction',
        'power', 'subscript', 'function_call', 'fraction', 'square_root', 'group',
        'selected_greek_symbols'
      ],
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

server.registerTool('get_formal_proof', {
  title: '取得精確形式證據與語義橋狀態',
  description: '只回傳 MKO 明確引用的 formal_proof Evidence；多個形式聲明保持分離，並顯示各自範圍、限制與目前語義橋狀態。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try {
    const object = await loadObject(id)
    const evidence = (await referencedEvidence(object)).filter(item => item.evidence_type === 'formal_proof')
    return jsonResult({
      object_id: id,
      formalization: object.formalization,
      semantic_mapping_status: object.formalization?.status || 'not_formalized',
      semantic_mapping_complete: object.formalization?.status === 'fully_formalized',
      formal_evidence_count: evidence.length,
      exact_claims: evidence.map(item => ({
        evidence_id: item.id,
        statement_zh: item.claim_scope.statement_zh,
        quantification: item.claim_scope.quantification,
        universal_proof: item.claim_scope.universal_proof,
        limitations: item.limitations,
      })),
      exact_formal_evidence: evidence,
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
