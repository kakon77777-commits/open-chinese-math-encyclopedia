import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
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
const server = new McpServer({ name: 'open-chinese-math-encyclopedia', version: '0.3.0' })

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
  description: '取得完整 Canonical MKO，包括公式 AST、符號、前提、程式伴隨、證據與來源。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try { return jsonResult(await loadObject(id)) }
  catch (error) { return errorResult(error) }
})

server.registerTool('get_math_context_bundle', {
  title: '取得 AI 最小數學上下文包',
  description: '取得適合放入模型上下文的精簡物件，避免載入整篇 UI 或無關資料。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try { return jsonResult(compactObject(await loadObject(id))) }
  catch (error) { return errorResult(error) }
})

server.registerTool('get_dependencies', {
  title: '解析數學物件依賴',
  description: '將 dependency ID 解析為實際數學知識物件；可選擇只取直接依賴或遞迴取得全部前置知識。',
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
  description: '取得公式的 TeX、MathML、編譯器資訊與 Semantic AST，不需解析網頁或公式圖片。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try {
    const object = await loadObject(id)
    return jsonResult({ object_id: id, formula: object.formula, symbols: object.symbols })
  } catch (error) { return errorResult(error) }
})

server.registerTool('compile_formula', {
  title: '編譯 OCME 核心公式',
  description: '將支援子集中的 TeX 編譯為原生 MathML、通用語義 AST 與來源雜湊。遇到未支援命令會直接失敗，不做猜測。',
  inputSchema: {
    tex: z.string().min(1).describe('例如 a^2+b^2=c^2、\\gamma=\\frac{\\pi}{2}'),
  },
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
  description: '取得目前 OCME 物件的節點與 prerequisite_of 邊。',
}, async () => {
  try { return jsonResult(await buildDependencyGraph()) }
  catch (error) { return errorResult(error) }
})

server.registerTool('get_computational_companion', {
  title: '取得計算伴隨與非同一性聲明',
  description: '取得參考程式、其與數學物件的關係，以及保存、近似與遺漏的語義。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try {
    const object = await loadObject(id)
    return jsonResult({ object_id: id, companions: object.computational_companions })
  } catch (error) { return errorResult(error) }
})

server.registerTool('get_verification_status', {
  title: '取得計算與形式驗證狀態',
  description: '明確區分有限計算證據、人工證明與形式證明。',
  inputSchema: { id: z.string().describe('數學知識物件 ID') },
}, async ({ id }) => {
  try {
    const object = await loadObject(id)
    return jsonResult({
      object_id: id,
      human_proofs: object.proofs || [],
      computational: object.verification,
      formalization: object.formalization,
    })
  } catch (error) { return errorResult(error) }
})

await server.connect(new StdioServerTransport())
