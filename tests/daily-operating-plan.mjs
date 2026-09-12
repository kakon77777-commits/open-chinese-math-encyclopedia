import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'

const plan = await fs.readFile('docs/OCME_DAILY_OPERATING_PLAN_v0.1.md', 'utf8')
const logTemplate = await fs.readFile('docs/templates/OCME_DAILY_RUN_LOG_TEMPLATE.md', 'utf8')
const brief = JSON.parse(await fs.readFile('docs/templates/OCME_QUESTION_BRIEF.example.json', 'utf8'))
const index = JSON.parse(await fs.readFile('public/data/index.json', 'utf8'))
const questionIndex = JSON.parse(await fs.readFile('public/data/questions/index.json', 'utf8'))

assert.match(plan, /execution_mode: manual_only/)
assert.match(plan, /automatic_schedule: false/)
assert.match(plan, /question_batch_limit: 100/)
assert.match(plan, /已有 Canonical primary coverage 的領域 \| 4/)
assert.match(plan, /不得自行恢復任何 automation/)

assert.equal(brief.manual_trigger_required, true)
assert.equal(brief.automatic_schedule, false)
assert.equal(brief.question_count, 100)
assert.equal(brief.allocations.reduce((sum, item) => sum + item.count, 0), 100)
const knownMkoIds = new Set(index.objects.map(item => item.id))
assert.equal(brief.source_mko_ids.every(id => knownMkoIds.has(id)), true)
assert.equal(brief.allocations.every(item => brief.source_mko_ids.includes(item.source_mko_id)), true)
assert.equal(questionIndex.daily_target, 100)

for (const heading of ['起始狀態', 'Content / MKO 批次', 'Question Brief 與批次', '驗證', '提交與發布', '異議、停止原因與下一步']) {
  assert.equal(logTemplate.includes(`## ${heading}`), true, `daily log template missing ${heading}`)
}

console.log('Daily operating plan tests passed: manual-only execution, 100-question cap, allocation integrity, and source MKO bindings are preserved.')
