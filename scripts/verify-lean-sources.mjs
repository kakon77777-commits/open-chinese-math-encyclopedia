import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from '../lib/store.js'

const errors = []
const leanRoot = path.join(ROOT, 'formal', 'lean')
const toolchainPath = path.join(leanRoot, 'lean-toolchain')
const lakefilePath = path.join(leanRoot, 'lakefile.toml')
const theoremPath = path.join(leanRoot, 'OCMEFormal', 'Pythagorean.lean')

const [toolchain, lakefile, theorem] = await Promise.all([
  fs.readFile(toolchainPath, 'utf8'),
  fs.readFile(lakefilePath, 'utf8'),
  fs.readFile(theoremPath, 'utf8')
])

if (toolchain.trim() !== 'leanprover/lean4:v4.30.0') errors.push('Lean toolchain drifted from v4.30.0')
if (!lakefile.includes('rev = "v4.30.0"')) errors.push('Mathlib revision is not pinned to v4.30.0')
if (!theorem.includes('theorem pythagorean_vector')) errors.push('OCME pythagorean_vector theorem is missing')
if (!theorem.includes('norm_add_sq_eq_norm_sq_add_norm_sq\'')) errors.push('Mathlib theorem mapping is missing')
if (/\b(sorry|admit)\b/.test(theorem)) errors.push('Lean proof placeholder detected')

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('Lean source gate passed: pinned toolchain, Mathlib revision, theorem mapping and no placeholders.')
