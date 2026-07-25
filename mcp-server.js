import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { compactObject, listObjects, loadObject } from './lib/store.js'

const jsonResult = value => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] })
const errorResult = error => ({ content: [{ type: 'text', text: `Error: ${error?.message || error}` }], isError: true })
const server = new McpServer({ name: 'open-chinese-math-encyclopedia', version: '0.1.0' })

server.registerTool('search_math_objects', {
  title: '搜尋數學知識物件',
  description: '依繁體中文標題或物件 ID 搜尋 OCME 數學知識物件。',
  inputSchema: { query: z.string().default('').describe('搜尋字串；空字串列出全部物件') },
}, async ({ query }) => {
  try {
    const q = query.trim().toLowerCase()
    const objects = await listObjects()
    const results = !q ? objects : objects.filter(x => `${x.id} ${x.title}`.toLowerCase().includes(q))
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
      human_proofs: object.proofs,
      computational: object.verification,
      formalization: object.formalization,
    })
  } catch (error) { return errorResult(error) }
})

await server.connect(new StdioServerTransport())
