import { createServer } from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 4173)
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
}

function resolveInside(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0])
  let relative = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '')
  if (relative.startsWith('data/')) relative = path.join('public', relative)
  const target = path.resolve(ROOT, relative)
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) throw new Error('path escape')
  return target
}

createServer(async (req, res) => {
  try {
    const target = resolveInside(req.url || '/')
    const stat = await fs.stat(target).catch(() => null)
    if (!stat?.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('Not found')
      return
    }
    const body = await fs.readFile(target)
    res.writeHead(200, {
      'content-type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    })
    res.end(body)
  } catch (error) {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(String(error?.message || error))
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`OCME MVP: http://127.0.0.1:${PORT}`)
})
