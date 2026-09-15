import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import { sourceForNewQuestionFamily, validateNewQuestionFamily } from '../lib/question-family-boundaries.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = path.join(ROOT, 'public')
const QUESTION_ROOT = path.join(PUBLIC, 'data', 'questions')
const schema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'question-v0.1.schema.json'), 'utf8'))
const objectIndex = JSON.parse(await fs.readFile(path.join(PUBLIC, 'data', 'index.json'), 'utf8'))
const questionIndex = JSON.parse(await fs.readFile(path.join(QUESTION_ROOT, 'index.json'), 'utf8'))
const validateQuestion = new Ajv2020({ allErrors: true }).compile(schema)
const knownMkoIds = new Set(objectIndex.objects.map(item => item.id))
const errors = []
const globalIds = new Set()
const establishedFamilySources = Object.freeze({
  'qf-distance-coordinate': 'mko-euclidean-length',
  'qf-right-triangle-determination': 'mko-right-triangle',
  'qf-pythagorean-missing-side': 'mko-euclid-pythagorean-theorem',
  'qf-pythagorean-counterexample': 'mko-euclid-pythagorean-theorem',
  'qf-natural-number-membership': 'mko-natural-number',
  'qf-finite-set-membership': 'mko-set-membership',
  'qf-proposition-classification': 'mko-proposition',
  'qf-finite-function-mapping': 'mko-function-mapping',
})

function fail(scope, message) {
  errors.push(`${scope}: ${message}`)
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function sha256CanonicalText(bytes) {
  return sha256(Buffer.from(bytes.toString('utf8').replace(/\r\n?/g, '\n'), 'utf8'))
}

function resolvePublic(publicPath) {
  if (typeof publicPath !== 'string' || !publicPath.startsWith('/data/questions/')) {
    throw new Error(`invalid public question path: ${publicPath}`)
  }
  const resolved = path.resolve(PUBLIC, publicPath.replace(/^\/+/, ''))
  if (!resolved.startsWith(QUESTION_ROOT + path.sep)) throw new Error(`question path escapes public root: ${publicPath}`)
  return resolved
}

function asYesNo(value) {
  return value ? '是' : '否'
}

function finiteFunctionIsValid({ domain, codomain, pairs }) {
  return domain.every(input => pairs.filter(([candidate]) => candidate === input).length === 1)
    && pairs.every(([input, output]) => domain.includes(input) && codomain.includes(output))
}

function pythagoreanSides(values) {
  const [a, b, c] = values
  return a > 0 && b > 0 && c > 0 && a ** 2 + b ** 2 === c ** 2
}

function expectedAnswer(question, scope) {
  const family = question.variant.family_id
  const parameters = question.variant.parameters
  if (family === 'qf-distance-coordinate') {
    return Math.hypot(parameters.q[0] - parameters.p[0], parameters.q[1] - parameters.p[1])
  }
  if (family === 'qf-right-triangle-determination') {
    if (parameters.mode !== 'angles') fail(scope, 'right-triangle determination may not use the uncited converse theorem')
    return asYesNo(parameters.angles.reduce((sum, value) => sum + value, 0) === 180 && parameters.angles.includes(90))
  }
  if (family === 'qf-pythagorean-missing-side') {
    return parameters.mode === 'hypotenuse'
      ? Math.sqrt(parameters.legs[0] ** 2 + parameters.legs[1] ** 2)
      : Math.sqrt(parameters.hypotenuse ** 2 - parameters.legs[1] ** 2)
  }
  if (family === 'qf-pythagorean-counterexample') {
    const invalid = parameters.options.map(pythagoreanSides).map((valid, index) => valid ? null : index).filter(index => index !== null)
    if (invalid.length !== 1 || invalid[0] !== parameters.counterexample_index) fail(scope, 'counterexample options must have exactly one declared invalid square relation')
    return ['甲', '乙', '丙', '丁'][parameters.counterexample_index]
  }
  if (family === 'qf-natural-number-membership') {
    if (!question.stem_zh.includes('N 包含 0')) fail(scope, 'natural-number convention must be explicit')
    return asYesNo(Number.isInteger(parameters.value) && parameters.value >= 0)
  }
  if (family === 'qf-finite-set-membership') {
    if (!question.stem_zh.includes('明示列舉')) fail(scope, 'finite-set boundary must be explicit')
    return asYesNo(parameters.elements.includes(parameters.query))
  }
  if (family === 'qf-proposition-classification') {
    const allowed = ['closed_declarative', 'open_sentence', 'question', 'command']
    if (!allowed.includes(parameters.kind)) fail(scope, `unknown proposition kind ${parameters.kind}`)
    const result = parameters.kind === 'closed_declarative'
    if (result && !question.answer.explanation_zh.includes('不表示它已被證明為真')) fail(scope, 'proposition/proof boundary missing from explanation')
    return asYesNo(result)
  }
  if (family === 'qf-finite-function-mapping') {
    if (!question.stem_zh.includes('陪域') || !question.stem_zh.includes('值域')) fail(scope, 'codomain/range boundary must be explicit')
    const explanation = question.answer.explanation_zh
    if (parameters.scenario === 'multiple_outputs') {
      const witness = parameters.domain.find(input => parameters.pairs.filter(([candidate]) => candidate === input).length > 1)
      if (!witness || !explanation.includes(witness)) fail(scope, 'multiple-output explanation must name the actual input witness')
    } else if (parameters.scenario === 'missing_input') {
      const witness = parameters.domain.find(input => parameters.pairs.every(([candidate]) => candidate !== input))
      if (!witness || !explanation.includes(witness)) fail(scope, 'missing-input explanation must name the actual input witness')
    } else if (parameters.scenario === 'outside_codomain') {
      const witness = parameters.pairs.find(([, output]) => !parameters.codomain.includes(output))?.[1]
      if (!witness || !explanation.includes(witness)) fail(scope, 'outside-codomain explanation must name the actual output witness')
    }
    return asYesNo(finiteFunctionIsValid(parameters))
  }
  const newFamilyResult = validateNewQuestionFamily(question)
  if (newFamilyResult) {
    for (const message of newFamilyResult.errors) fail(scope, message)
    return newFamilyResult.expected
  }
  fail(scope, `unsupported question family ${family}`)
  return undefined
}

let publishedCount = 0
for (const batch of questionIndex.batches || []) {
  const scope = batch.id || 'unknown-batch'
  try {
    const [raw, manifestText, reportText] = await Promise.all([
      fs.readFile(resolvePublic(batch.path), 'utf8'),
      fs.readFile(resolvePublic(batch.manifest_path), 'utf8'),
      fs.readFile(resolvePublic(batch.validation_report_path), 'utf8'),
    ])
    const manifest = JSON.parse(manifestText)
    const report = JSON.parse(reportText)
    const digest = sha256(raw)
    if (digest !== batch.sha256) fail(scope, 'index SHA-256 does not match questions.jsonl')
    if (digest !== manifest.artifacts?.questions_sha256) fail(scope, 'manifest SHA-256 does not match questions.jsonl')
    if (digest !== report.batch_sha256 || report.outcome !== 'passed') fail(scope, 'validation report is not a passing report for this batch')
    if (manifest.batch_id !== batch.id || report.batch_id !== batch.id) fail(scope, 'batch identity mismatch')

    const questions = raw.trimEnd().split(/\r?\n/).map((line, index) => {
      try { return JSON.parse(line) } catch { fail(`${scope} line ${index + 1}`, 'invalid JSON'); return null }
    }).filter(Boolean)
    if (questions.length !== batch.question_count || questions.length !== manifest.counts?.total) fail(scope, 'question count mismatch')
    if (questions.length > questionIndex.daily_target) fail(scope, 'batch exceeds current 100-question limit')

    const seeds = new Set()
    const stems = new Set()
    const templates = new Set()
    for (const [index, question] of questions.entries()) {
      const questionScope = `${scope} line ${index + 1}`
      if (!validateQuestion(question)) fail(questionScope, validateQuestion.errors.map(error => `${error.instancePath} ${error.message}`).join('; '))
      if (question.batch_id !== batch.id) fail(questionScope, 'question batch_id mismatch')
      if (globalIds.has(question.id)) fail(questionScope, `duplicate global question id ${question.id}`)
      globalIds.add(question.id)
      if (seeds.has(question.variant.seed)) fail(questionScope, `duplicate seed ${question.variant.seed}`)
      seeds.add(question.variant.seed)
      if (stems.has(question.stem_zh)) fail(questionScope, 'duplicate exact stem')
      stems.add(question.stem_zh)
      const template = question.variant.parameters.semantic_template
      if (template && templates.has(template)) fail(questionScope, 'duplicate semantic template')
      if (template) templates.add(template)
      const expectedSource = establishedFamilySources[question.variant.family_id] ?? sourceForNewQuestionFamily(question.variant.family_id)
      if (!expectedSource) fail(questionScope, `question family has no source binding: ${question.variant.family_id}`)
      else if (question.source_mko_ids.length !== 1 || question.source_mko_ids[0] !== expectedSource) fail(questionScope, `source attribution mismatch: expected only ${expectedSource}`)
      for (const id of question.source_mko_ids) if (!knownMkoIds.has(id)) fail(questionScope, `unknown source MKO ${id}`)
      if (question.stem_zh.includes('畢達哥拉斯逆定理') || question.answer.explanation_zh.includes('畢達哥拉斯逆定理')) fail(questionScope, 'uncited converse theorem')
      if (question.answer.explanation_zh.includes('+-') || /\(-\d+(?:\.\d+)?²/u.test(question.answer.explanation_zh)) fail(questionScope, 'ambiguous negative-square notation')
      const expected = expectedAnswer(question, questionScope)
      const actual = question.answer.value
      const matches = typeof expected === 'number' ? typeof actual === 'number' && Math.abs(expected - actual) < 1e-9 : expected === actual
      if (!matches) fail(questionScope, `answer mismatch: expected ${expected}, got ${actual}`)
      if (!['candidate', 'mechanically_checked'].includes(question.verification.status)) fail(questionScope, `invalid publication status ${question.verification.status}`)
    }

    for (const [id, snapshot] of Object.entries(manifest.source_mko_snapshots || {})) {
      if (!knownMkoIds.has(id)) fail(scope, `unknown snapshot source MKO ${id}`)
      const sourcePath = path.resolve(ROOT, snapshot.path)
      if (!sourcePath.startsWith(path.join(PUBLIC, 'data', 'mko') + path.sep)) fail(scope, `snapshot path escapes MKO data: ${snapshot.path}`)
      else if (typeof snapshot.sha256 !== 'string') fail(scope, `source MKO snapshot is missing LF-normalized text SHA-256: ${id}`)
      else if (sha256CanonicalText(await fs.readFile(sourcePath)) !== snapshot.sha256) fail(scope, `source MKO snapshot drift: ${id}`)
      if (batch.source_commit_sha) {
        if (snapshot.commit_sha !== batch.source_commit_sha) fail(scope, `source commit mismatch for ${id}`)
        else {
          try {
            const resolvedCommit = execFileSync('git', ['rev-parse', '--verify', `${snapshot.commit_sha}^{commit}`], { cwd: ROOT, encoding: 'utf8' }).trim()
            const committedBytes = execFileSync('git', ['show', `${snapshot.commit_sha}:${snapshot.path}`], { cwd: ROOT })
            if (resolvedCommit !== snapshot.commit_sha) fail(scope, `source commit is not a full resolved SHA for ${id}`)
            if (sha256CanonicalText(committedBytes) !== snapshot.sha256) fail(scope, `source commit blob drift: ${id}`)
          } catch (error) {
            fail(scope, `source commit blob unavailable for ${id}: ${error.message}`)
          }
        }
      }
    }
    publishedCount += questions.length
  } catch (error) {
    fail(scope, error.message)
  }
}

if (questionIndex.daily_target !== 100) fail('question-index', `daily_target must be 100, found ${questionIndex.daily_target}`)
if (questionIndex.published_question_count !== publishedCount) fail('question-index', `published_question_count ${questionIndex.published_question_count} does not equal ${publishedCount}`)
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`Question batch validation passed: ${questionIndex.batches.length} batch(es), ${publishedCount} published candidate question(s), ${globalIds.size} unique IDs.`)
