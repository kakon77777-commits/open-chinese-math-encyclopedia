import { createHash } from 'node:crypto'

const COMMAND_SYMBOLS = {
  gamma: { type: 'symbol', name: 'gamma', glyph: 'γ' },
  pi: { type: 'constant', name: 'pi', glyph: 'π' },
  theta: { type: 'symbol', name: 'theta', glyph: 'θ' },
  alpha: { type: 'symbol', name: 'alpha', glyph: 'α' },
  beta: { type: 'symbol', name: 'beta', glyph: 'β' },
}

export class FormulaSyntaxError extends Error {
  constructor(message, position, source) {
    super(`${message} at position ${position} in ${JSON.stringify(source)}`)
    this.name = 'FormulaSyntaxError'
    this.position = position
  }
}

function tokenize(source) {
  const tokens = []
  let i = 0
  while (i < source.length) {
    const ch = source[i]
    if (/\s/.test(ch)) { i += 1; continue }
    if (ch === '\\') {
      const start = i
      i += 1
      let name = ''
      while (i < source.length && /[A-Za-z]/.test(source[i])) name += source[i++]
      if (!name) throw new FormulaSyntaxError('Expected command name after backslash', start, source)
      tokens.push({ type: 'command', value: name, position: start })
      continue
    }
    if (/[A-Za-z]/.test(ch)) {
      const start = i
      let value = ''
      while (i < source.length && /[A-Za-z]/.test(source[i])) value += source[i++]
      tokens.push({ type: 'identifier', value, position: start })
      continue
    }
    if (/[0-9]/.test(ch)) {
      const start = i
      let value = ''
      while (i < source.length && /[0-9.]/.test(source[i])) value += source[i++]
      if (!/^\d+(?:\.\d+)?$/.test(value)) throw new FormulaSyntaxError('Invalid number', start, source)
      tokens.push({ type: 'number', value, position: start })
      continue
    }
    if ('+-=^_(),{}'.includes(ch)) {
      tokens.push({ type: ch, value: ch, position: i })
      i += 1
      continue
    }
    throw new FormulaSyntaxError(`Unsupported character ${JSON.stringify(ch)}`, i, source)
  }
  tokens.push({ type: 'eof', value: '', position: source.length })
  return tokens
}

class Parser {
  constructor(source) {
    this.source = source
    this.tokens = tokenize(source)
    this.index = 0
  }

  current() { return this.tokens[this.index] }
  match(type) {
    if (this.current().type !== type) return false
    this.index += 1
    return true
  }
  expect(type) {
    const token = this.current()
    if (token.type !== type) throw new FormulaSyntaxError(`Expected ${type}, found ${token.type}`, token.position, this.source)
    this.index += 1
    return token
  }

  parse() {
    const node = this.parseEquation()
    this.expect('eof')
    return node
  }

  parseEquation() {
    const lhs = this.parseAdditive()
    if (this.match('=')) return { type: 'equation', lhs, rhs: this.parseAdditive() }
    return lhs
  }

  parseAdditive() {
    let node = this.parsePostfix()
    const additions = [node]
    while (true) {
      if (this.match('+')) {
        additions.push(this.parsePostfix())
      } else if (this.match('-')) {
        const left = additions.length === 1 ? additions[0] : { type: 'addition', operands: [...additions] }
        node = { type: 'subtraction', left, right: this.parsePostfix() }
        additions.length = 0
        additions.push(node)
      } else break
    }
    return additions.length === 1 ? additions[0] : { type: 'addition', operands: additions }
  }

  parsePostfix() {
    let node = this.parsePrimary()
    while (true) {
      if (this.match('(')) {
        const args = []
        if (!this.match(')')) {
          do { args.push(this.parseEquation()) } while (this.match(','))
          this.expect(')')
        }
        node = { type: 'function_call', callee: node, arguments: args }
      } else if (this.match('_')) {
        node = { type: 'subscript', base: node, subscript: this.parseScriptAtom() }
      } else if (this.match('^')) {
        node = { type: 'power', base: node, exponent: this.parseScriptAtom() }
      } else break
    }
    return node
  }

  parseScriptAtom() {
    if (this.match('{')) {
      const body = this.parseEquation()
      this.expect('}')
      return body
    }
    return this.parsePrimary()
  }

  parsePrimary() {
    const token = this.current()
    if (this.match('number')) return { type: 'number', value: Number(token.value) }
    if (this.match('identifier')) return { type: 'symbol', name: token.value, glyph: token.value }
    if (this.match('command')) {
      if (token.value === 'frac') {
        return {
          type: 'fraction',
          numerator: this.parseRequiredGroup(),
          denominator: this.parseRequiredGroup(),
        }
      }
      if (token.value === 'sqrt') return { type: 'square_root', radicand: this.parseRequiredGroup() }
      const symbol = COMMAND_SYMBOLS[token.value]
      if (symbol) return { ...symbol }
      throw new FormulaSyntaxError(`Unsupported command \\${token.value}`, token.position, this.source)
    }
    if (this.match('(')) {
      const body = this.parseEquation()
      this.expect(')')
      return { type: 'group', body }
    }
    if (this.match('{')) {
      const body = this.parseEquation()
      this.expect('}')
      return { type: 'group', body }
    }
    throw new FormulaSyntaxError(`Expected formula atom, found ${token.type}`, token.position, this.source)
  }

  parseRequiredGroup() {
    const token = this.current()
    if (!this.match('{')) throw new FormulaSyntaxError('Expected {...} group', token.position, this.source)
    const body = this.parseEquation()
    this.expect('}')
    return body
  }
}

const xmlEscape = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

function renderNode(node) {
  switch (node.type) {
    case 'number': return `<mn>${xmlEscape(node.value)}</mn>`
    case 'symbol': return `<mi>${xmlEscape(node.glyph || node.name)}</mi>`
    case 'constant': return `<mi mathvariant="normal">${xmlEscape(node.glyph || node.name)}</mi>`
    case 'equation': return `<mrow>${renderNode(node.lhs)}<mo>=</mo>${renderNode(node.rhs)}</mrow>`
    case 'addition': return `<mrow>${node.operands.map(renderNode).join('<mo>+</mo>')}</mrow>`
    case 'subtraction': return `<mrow>${renderNode(node.left)}<mo>−</mo>${renderNode(node.right)}</mrow>`
    case 'power': return `<msup>${renderNode(node.base)}${renderNode(node.exponent)}</msup>`
    case 'subscript': return `<msub>${renderNode(node.base)}${renderNode(node.subscript)}</msub>`
    case 'fraction': return `<mfrac>${renderNode(node.numerator)}${renderNode(node.denominator)}</mfrac>`
    case 'square_root': return `<msqrt>${renderNode(node.radicand)}</msqrt>`
    case 'group': return `<mrow><mo>(</mo>${renderNode(node.body)}<mo>)</mo></mrow>`
    case 'function_call': return `<mrow>${renderNode(node.callee)}<mo>(</mo>${node.arguments.map(renderNode).join('<mo>,</mo>')}<mo>)</mo></mrow>`
    default: throw new Error(`Unknown AST node type: ${node.type}`)
  }
}

export function compileFormula(tex) {
  if (typeof tex !== 'string' || !tex.trim()) throw new TypeError('tex must be a non-empty string')
  const semanticAst = new Parser(tex).parse()
  return {
    tex,
    mathml: `<math xmlns="http://www.w3.org/1998/Math/MathML">${renderNode(semanticAst)}</math>`,
    semantic_ast: semanticAst,
    compiler: {
      id: 'ocme-formula-core',
      version: '0.3.0',
      source_sha256: createHash('sha256').update(tex, 'utf8').digest('hex'),
    },
  }
}
