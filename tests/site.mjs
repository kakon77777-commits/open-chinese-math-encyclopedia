import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const output = await fs.mkdtemp(path.join(os.tmpdir(), 'ocme-site-'))
try {
  const build = spawnSync(process.execPath, ['scripts/build-site.mjs', `--out-dir=${output}`], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })
  assert.equal(build.status, 0, build.stderr || build.stdout)

  const required = [
    'index.html', 'src/main.js', 'src/styles.css', 'favicon.svg', 'site.webmanifest',
    'robots.txt', 'sitemap.xml', 'build-manifest.json',
    'data/index.json', 'data/atlas/core-atlas.json', 'data/evidence/index.json',
    'data/architecture/learning-paths.json', 'data/questions/index.json',
  ]
  for (const relative of required) {
    assert.equal((await fs.stat(path.join(output, relative))).isFile(), true, `missing site artifact: ${relative}`)
  }

  for (const privatePath of ['runtime', 'schemas', 'research', 'node_modules', 'docs']) {
    await assert.rejects(fs.stat(path.join(output, privatePath)), { code: 'ENOENT' })
  }

  const html = await fs.readFile(path.join(output, 'index.html'), 'utf8')
  assert.match(html, /OCME · 開源中文數學百科/)
  assert.match(html, /https:\/\/ocme\.evemisslab\.com\//)

  const atlas = JSON.parse(await fs.readFile(path.join(output, 'data/atlas/core-atlas.json'), 'utf8'))
  const index = JSON.parse(await fs.readFile(path.join(output, 'data/index.json'), 'utf8'))
  const questions = JSON.parse(await fs.readFile(path.join(output, 'data/questions/index.json'), 'utf8'))
  const manifest = JSON.parse(await fs.readFile(path.join(output, 'build-manifest.json'), 'utf8'))
  assert.equal(atlas.entries.length, 80)
  assert.equal(index.objects.length, 9)
  assert.equal(questions.daily_target, 100)
  assert.equal(questions.published_question_count, 0)
  assert.equal(manifest.files.some(file => file.path === 'data/index.json'), true)
  assert.equal(manifest.files.every(file => /^[a-f0-9]{64}$/.test(file.sha256)), true)
} finally {
  const resolved = path.resolve(output)
  assert.equal(path.basename(resolved).startsWith('ocme-site-'), true)
  await fs.rm(resolved, { recursive: true, force: true })
}

console.log('Site tests passed: production artifact contains the public Atlas/MKO surfaces and excludes private runtime sources.')
