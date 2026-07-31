import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from '../lib/store.js'

const errors = []
const leanRoot = path.join(ROOT, 'formal', 'lean')
const toolchainPath = path.join(leanRoot, 'lean-toolchain')
const lakefilePath = path.join(leanRoot, 'lakefile.toml')
const pythagoreanPath = path.join(leanRoot, 'OCMEFormal', 'Pythagorean.lean')
const foundationsPath = path.join(leanRoot, 'OCMEFormal', 'Foundations.lean')
const rootModulePath = path.join(leanRoot, 'OCMEFormal.lean')

const [toolchain, lakefile, pythagorean, foundations, rootModule] = await Promise.all([
  fs.readFile(toolchainPath, 'utf8'),
  fs.readFile(lakefilePath, 'utf8'),
  fs.readFile(pythagoreanPath, 'utf8'),
  fs.readFile(foundationsPath, 'utf8'),
  fs.readFile(rootModulePath, 'utf8'),
])

if (toolchain.trim() !== 'leanprover/lean4:v4.30.0') errors.push('Lean toolchain drifted from v4.30.0')
if (!lakefile.includes('rev = "v4.30.0"')) errors.push('Mathlib revision is not pinned to v4.30.0')

const requiredPythagoreanDeclarations = [
  'theorem pythagorean_vector',
  'def IsRightTriangleSideModel',
  'theorem pythagorean_side_lengths',
  "norm_add_sq_eq_norm_sq_add_norm_sq'",
]
for (const declaration of requiredPythagoreanDeclarations) {
  if (!pythagorean.includes(declaration)) errors.push(`Pythagorean Lean declaration is missing: ${declaration}`)
}

const requiredFoundationDeclarations = [
  'theorem set_membership_semantics',
  'theorem function_total_unique',
  'theorem tendsTo_filter_semantics',
  'Filter.Tendsto f l₁ l₂ ↔ Filter.map f l₁ ≤ l₂',
]
for (const declaration of requiredFoundationDeclarations) {
  if (!foundations.includes(declaration)) errors.push(`Foundation Lean declaration is missing: ${declaration}`)
}

if (!rootModule.includes('import OCMEFormal.Foundations')) errors.push('OCMEFormal root module does not import Foundations')
if (!rootModule.includes('import OCMEFormal.Pythagorean')) errors.push('OCMEFormal root module does not import Pythagorean')

for (const [label, source] of [
  ['Pythagorean.lean', pythagorean],
  ['Foundations.lean', foundations],
  ['OCMEFormal.lean', rootModule],
]) {
  if (/\b(sorry|admit)\b/.test(source)) errors.push(`Lean proof placeholder detected in ${label}`)
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('Lean source gate passed: pinned toolchain, six semantic declarations, root imports and no placeholders.')
