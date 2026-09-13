const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
})

function cacheControl(pathname, contentType) {
  if (pathname === '/' || pathname.endsWith('.html') || contentType.includes('text/html')) {
    return 'public, max-age=0, must-revalidate'
  }
  if (pathname.startsWith('/data/')) return 'public, max-age=300, stale-while-revalidate=86400'
  return 'public, max-age=3600'
}

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    const headers = new Headers(response.headers)
    const pathname = new URL(request.url).pathname
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value)
    if (pathname.endsWith('.jsonl')) headers.set('Content-Type', 'application/x-ndjson; charset=utf-8')
    headers.set('Cache-Control', cacheControl(pathname, headers.get('Content-Type') || ''))
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  },
}
