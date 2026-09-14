import assert from 'node:assert/strict'
import worker from '../workers/site-worker.js'

function environment(body = 'ok', contentType = 'text/plain') {
  return {
    ASSETS: {
      async fetch() {
        return new Response(body, { headers: { 'Content-Type': contentType } })
      },
    },
  }
}

const html = await worker.fetch(new Request('https://ocme.evemisslab.com/'), environment('<h1>OCME</h1>', 'text/html'))
assert.equal(await html.text(), '<h1>OCME</h1>')
assert.equal(html.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate')
assert.match(html.headers.get('Content-Security-Policy'), /default-src 'self'/)
assert.equal(html.headers.get('X-Content-Type-Options'), 'nosniff')

const data = await worker.fetch(new Request('https://ocme.evemisslab.com/data/index.json'), environment('{}', 'application/json'))
assert.equal(data.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate')

const questionIndex = await worker.fetch(new Request('https://ocme.evemisslab.com/data/questions/index.json'), environment('{}', 'application/json'))
assert.equal(questionIndex.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate')

const buildManifest = await worker.fetch(new Request('https://ocme.evemisslab.com/build-manifest.json'), environment('{}', 'application/json'))
assert.equal(buildManifest.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate')

const asset = await worker.fetch(new Request('https://ocme.evemisslab.com/src/main.js'), environment('export {}', 'text/javascript'))
assert.equal(asset.headers.get('Cache-Control'), 'public, max-age=3600')

const jsonl = await worker.fetch(new Request('https://ocme.evemisslab.com/data/questions/batches/sample/questions.jsonl'), environment('{}\n', ''))
assert.equal(jsonl.headers.get('Content-Type'), 'application/x-ndjson; charset=utf-8')
assert.equal(jsonl.headers.get('Cache-Control'), 'public, max-age=300, stale-while-revalidate=86400')

console.log('Site Worker tests passed: streamed assets receive CSP, browser protections, and route-specific cache policy.')
