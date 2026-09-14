const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const state = {
  atlas: null,
  index: null,
  evidenceIndex: null,
  domains: [],
  methods: [],
  paths: [],
  curricula: null,
  questions: null,
  objectCache: new Map(),
  evidenceCache: new Map(),
  questionBatchCache: new Map(),
  renderToken: 0,
}

const groupMeta = {
  numbers: ['數與運算', '01'],
  sets_logic: ['集合與邏輯', '02'],
  algebra: ['代數與方程', '03'],
  geometry: ['幾何與向量', '04'],
  functions: ['函數與圖形', '05'],
  calculus: ['微積分基礎', '06'],
  probability: ['機率與統計', '07'],
  discrete: ['離散數學', '08'],
}

const statusLabels = {
  canonical_mko: '完整知識物件',
  atlas_seed: '規劃中',
  canonical: '已物化',
  P1: '優先建置',
  P2: '核心擴展',
  P3: '進階擴展',
  reviewed: '已審查',
  candidate: '候選',
  candidate_validated: '機械驗證候選',
  passed: '通過',
  active: '運作中',
  configured: '已設定',
  unavailable: '不可用',
  not_formalized: '尚未形式化',
  human_proof_available: '人工證明可用',
  not_applicable: '不適用',
  mapped_not_evidenced: '已映射、尚無形式證據',
  formalized_equivalent_vector_form: '等價向量形式已形式化',
  formalized_declared_side_model: '邊長模型已形式化',
  formalized_lean_set_semantics: 'Lean 集合語義已形式化',
  formalized_total_function_core: '總函數核心已形式化',
  formalized_filter_tendsto_core: 'Filter.Tendsto 已形式化',
  finite_cases_passed: '有限案例通過',
  not_evaluated_no_computational_claim: '未提出計算宣稱',
}

const typeLabels = {
  concept: '概念',
  definition: '定義',
  theorem: '定理',
  relation: '關係',
  operation: '運算',
  method: '方法',
  notation: '記號',
  function: '函數',
  representation: '表示',
  property: '性質',
  proposition: '命題',
  axiom: '公理',
}

const label = value => statusLabels[value] || typeLabels[value] || value || '未標記'

async function loadJson(url, optional = false) {
  const response = await fetch(url)
  if (!response.ok) {
    if (optional) return null
    throw new Error(`無法讀取 ${url}（HTTP ${response.status}）`)
  }
  return response.json()
}

async function loadText(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`無法讀取 ${url}（HTTP ${response.status}）`)
  return response.text()
}

async function loadObject(id) {
  if (state.objectCache.has(id)) return state.objectCache.get(id)
  const entry = state.index.objects.find(item => item.id === id)
  if (!entry) throw new Error(`找不到數學知識物件：${id}`)
  const object = await loadJson(entry.path)
  state.objectCache.set(id, object)
  return object
}

async function loadEvidence(id) {
  if (state.evidenceCache.has(id)) return state.evidenceCache.get(id)
  const entry = state.evidenceIndex.objects.find(item => item.id === id)
  if (!entry) throw new Error(`找不到證據物件：${id}`)
  const evidence = await loadJson(entry.path)
  state.evidenceCache.set(id, evidence)
  return evidence
}

function currentRoute() {
  const raw = window.location.hash.replace(/^#\/?/, '') || 'home'
  const [page, ...rest] = raw.split('/').filter(Boolean)
  return { page, rest }
}

function routeTitle(page) {
  return {
    home: '開源中文數學百科',
    atlas: '數學地圖',
    knowledge: '知識物件',
    object: '數學知識物件',
    paths: '學習路徑',
    methods: '方法與領域',
    practice: '每日題庫',
    about: '可信任的數學出版',
  }[page] || '開源中文數學百科'
}

function renderShell() {
  $('#app').innerHTML = `
    <header class="site-header">
      <a class="site-brand" href="#home" aria-label="OCME 首頁">
        <span class="brand-symbol" aria-hidden="true">∴</span>
        <span><b>OCME</b><small>開源中文數學百科</small></span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav">選單</button>
      <nav id="primary-nav" class="primary-nav" aria-label="主要導覽">
        <a href="#atlas" data-nav="atlas">數學地圖</a>
        <a href="#knowledge" data-nav="knowledge">知識物件</a>
        <a href="#paths" data-nav="paths">學習路徑</a>
        <a href="#methods" data-nav="methods">方法與領域</a>
        <a href="#practice" data-nav="practice">每日題庫</a>
        <a class="nav-about" href="#about" data-nav="about">關於 OCME</a>
      </nav>
    </header>
    <main id="view" tabindex="-1"></main>
    <footer class="site-footer">
      <div>
        <a class="site-brand footer-brand" href="#home"><span class="brand-symbol" aria-hidden="true">∴</span><span><b>OCME</b><small>Open Chinese Mathematical Encyclopedia</small></span></a>
        <p>讓數學知識可以閱讀、追溯、重播，也可以誠實地說「尚未證明」。</p>
      </div>
      <div class="footer-links">
        <a href="#atlas">80 節點 Atlas</a>
        <a href="#about">證據邊界</a>
        <a href="https://github.com/kakon77777-commits/open-chinese-math-encyclopedia" target="_blank" rel="noreferrer">GitHub ↗</a>
      </div>
      <p class="footer-meta">內容 CC BY-SA 4.0 · 程式 MIT · EveMissLab</p>
    </footer>`

  $('.nav-toggle').addEventListener('click', event => {
    const open = event.currentTarget.getAttribute('aria-expanded') === 'true'
    event.currentTarget.setAttribute('aria-expanded', String(!open))
    $('.primary-nav').classList.toggle('open', !open)
  })
}

function setActiveNavigation(page) {
  $$('[data-nav]').forEach(link => link.classList.toggle('active', link.dataset.nav === page))
  $('.primary-nav')?.classList.remove('open')
  $('.nav-toggle')?.setAttribute('aria-expanded', 'false')
}

function statCard(value, title, note) {
  return `<article class="stat-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(title)}</span><small>${escapeHtml(note)}</small></article>`
}

function sectionIntro(kicker, title, copy, action = '') {
  return `<header class="section-intro">
    <p class="kicker">${escapeHtml(kicker)}</p>
    <div><h1>${escapeHtml(title)}</h1>${action}</div>
    <p>${escapeHtml(copy)}</p>
  </header>`
}

function portalCard(number, title, copy, href, meta) {
  return `<a class="portal-card" href="${href}">
    <span class="portal-number">${number}</span>
    <div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></div>
    <span class="portal-meta">${escapeHtml(meta)} <b aria-hidden="true">↗</b></span>
  </a>`
}

function renderHome() {
  const canonicalCount = state.atlas.entries.filter(item => item.maturity === 'canonical_mko').length
  const seedCount = state.atlas.entries.length - canonicalCount
  const proofCount = state.evidenceIndex.objects.filter(item => item.evidence_type === 'formal_proof').length
  const featured = state.index.objects.slice(0, 6)

  $('#view').innerHTML = `
    <section class="home-hero">
      <div class="hero-copy">
        <p class="kicker light">OPEN · TRACEABLE · REPLAYABLE</p>
        <h1>看見數學之間的<br><em>關係</em>。</h1>
        <p class="hero-lead">一座為中文讀者與 AI 共同建造的數學知識系統。每個概念有位置，每項證據有邊界，每條路徑都能被重新檢查。</p>
        <div class="hero-actions">
          <a class="button primary" href="#atlas">展開數學地圖</a>
          <a class="button ghost" href="#knowledge">閱讀知識物件</a>
        </div>
      </div>
      <div class="hero-graph" aria-label="數學知識關係示意圖">
        <div class="graph-orbit orbit-a"></div><div class="graph-orbit orbit-b"></div>
        <a href="#object/mko-natural-number" class="graph-node node-a"><span>ℕ</span><small>自然數</small></a>
        <a href="#object/mko-set" class="graph-node node-b"><span>∈</span><small>集合</small></a>
        <a href="#object/mko-proposition" class="graph-node node-c"><span>P</span><small>命題</small></a>
        <a href="#object/mko-function-mapping" class="graph-node node-d"><span>f</span><small>函數</small></a>
        <a href="#object/mko-euclid-pythagorean-theorem" class="graph-node node-e"><span>a²+b²</span><small>定理</small></a>
        <div class="graph-center"><span>80</span><small>核心節點</small></div>
      </div>
    </section>

    <section class="stats-band" aria-label="目前資料規模">
      ${statCard(state.atlas.entries.length, '核心數學節點', '第一版可導航宇宙')}
      ${statCard(canonicalCount, 'Canonical MKO', '完整且通過結構驗證')}
      ${statCard(state.evidenceIndex.objects.length, 'Evidence Objects', `${proofCount} 個形式證明`)}
      ${statCard(seedCount, '待物化項目', '依依賴分批推進')}
    </section>

    <section class="content-section portals-section">
      ${sectionIntro('六個入口', '不是目錄，是一張可以行走的地圖。', '從程度、領域、方法或證據切入，同一個物件會在不同路徑上呈現不同角色。')}
      <div class="portal-grid">
        ${portalCard('01', '現代通識數學', '從自然數、集合、命題與幾何出發，重建日常數學語言。', '#paths', '6 條路徑')}
        ${portalCard('02', '大學核心數學', '沿集合、函數與趨近的前置鏈，進入分析與形式結構。', '#atlas', '依賴可見')}
        ${portalCard('03', '數學領域地圖', '從算術、代數、幾何到機率與離散數學，查看 80 個核心位置。', '#atlas', '8 大群組')}
        ${portalCard('04', '數學方法地圖', '直接證明、構造、反證、形式驗證：問題不只屬於一個學科。', '#methods', '20 種方法')}
        ${portalCard('05', '學習路徑', '前置關係不是唯一教學順序；選擇符合任務與程度的入口。', '#paths', '多重順序')}
        ${portalCard('06', 'AI 與可信任證據', '清楚分離生成、審查、有限計算、形式證明與人工決定。', '#about', 'R1–R7 runtime')}
      </div>
    </section>

    <section class="content-section featured-section">
      <div class="split-heading"><div><p class="kicker">已物化內容</p><h2>先從 ${state.index.objects.length} 個知識物件開始</h2></div><a class="text-link" href="#knowledge">查看全部 →</a></div>
      <div class="featured-strip">
        ${featured.map((entry, index) => `<a class="feature-card" href="#object/${entry.id}">
          <span class="feature-index">0${index + 1}</span><span class="status-dot"></span>
          <h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(typeLabels[entry.type] || entry.type)} · ${entry.evidence_ref_count} 項證據</p>
          <div class="tag-row">${(entry.tags || []).slice(0, 3).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
        </a>`).join('')}
      </div>
    </section>

    <section class="trust-statement">
      <div><span class="trust-symbol">≠</span><h2>有限計算證據<br>不等於普遍證明。</h2></div>
      <p>OCME 不把「看起來正確」包裝成「已被證明」。每個物件都分開記錄中文敘述、公式來源、計算伴隨、Evidence Object 與形式化狀態。</p>
      <a class="button ink" href="#about">理解證據架構</a>
    </section>`
}

function atlasCard(entry) {
  const [groupTitle, groupNumber] = groupMeta[entry.group] || [entry.group, '--']
  const canonical = entry.maturity === 'canonical_mko'
  return `<a class="atlas-card ${canonical ? 'is-canonical' : ''}" href="#atlas/${entry.id}">
    <div class="atlas-card-top"><span class="group-code">${groupNumber}</span><span class="maturity ${entry.maturity}">${label(entry.maturity)}</span></div>
    <h3>${escapeHtml(entry.title_zh)}</h3>
    <p>${escapeHtml(entry.summary_zh)}</p>
    <div class="atlas-card-meta"><span>${escapeHtml(groupTitle)}</span><span>${escapeHtml(typeLabels[entry.object_kind] || entry.object_kind)}</span></div>
  </a>`
}

function renderAtlas() {
  $('#view').innerHTML = `<section class="page-shell">
    ${sectionIntro('CORE MATHEMATICAL ATLAS', '八十個位置，一張數學世界的骨架。', 'Canonical 節點可以進入完整條目；Atlas seed 顯示既定位置、前置與物化優先級，但不假裝成已完成內容。', '<span class="section-count">80 nodes</span>')}
    <div class="atlas-toolbar" role="search">
      <label class="search-box"><span aria-hidden="true">⌕</span><input id="atlas-search" type="search" placeholder="搜尋概念、摘要或 ID" autocomplete="off"></label>
      <label>群組<select id="atlas-group"><option value="">全部群組</option>${Object.entries(groupMeta).map(([id, meta]) => `<option value="${id}">${meta[0]}</option>`).join('')}</select></label>
      <label>成熟度<select id="atlas-maturity"><option value="">全部</option><option value="canonical_mko">完整知識物件</option><option value="atlas_seed">規劃中</option></select></label>
      <label>優先級<select id="atlas-priority"><option value="">全部</option><option value="P1">P1 優先</option><option value="P2">P2 核心</option><option value="P3">P3 進階</option></select></label>
    </div>
    <div class="result-line"><span id="atlas-result-count">80</span> 個節點</div>
    <div id="atlas-grid" class="atlas-grid"></div>
  </section>`

  const controls = ['atlas-search', 'atlas-group', 'atlas-maturity', 'atlas-priority'].map(id => $(`#${id}`))
  const update = () => {
    const query = $('#atlas-search').value.trim().toLowerCase()
    const group = $('#atlas-group').value
    const maturity = $('#atlas-maturity').value
    const priority = $('#atlas-priority').value
    const matches = state.atlas.entries.filter(entry => {
      const haystack = `${entry.id} ${entry.title_zh} ${entry.summary_zh}`.toLowerCase()
      return (!query || haystack.includes(query))
        && (!group || entry.group === group)
        && (!maturity || entry.maturity === maturity)
        && (!priority || entry.materialization_priority === priority)
    })
    $('#atlas-result-count').textContent = matches.length
    $('#atlas-grid').innerHTML = matches.length ? matches.map(atlasCard).join('') : '<div class="empty-state"><b>沒有符合的節點</b><p>調整搜尋文字或篩選條件後再試一次。</p></div>'
  }
  controls.forEach(control => control.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', update))
  update()
}

function renderAtlasDetail(atlasId) {
  const entry = state.atlas.entries.find(item => item.id === atlasId)
  if (!entry) throw new Error(`找不到 Atlas 節點：${atlasId}`)
  const [groupTitle, groupNumber] = groupMeta[entry.group] || [entry.group, '--']
  const dependencies = entry.prerequisites.map(id => state.atlas.entries.find(item => item.id === id)).filter(Boolean)
  const downstream = state.atlas.entries.filter(item => item.prerequisites.includes(entry.id))
  const canonical = entry.maturity === 'canonical_mko'
  const difficulty = Object.entries(entry.difficulty).map(([key, value]) => `<div><span>${escapeHtml(key.replaceAll('_', ' '))}</span><b>${value}</b><i><span class="level-${value}"></span></i></div>`).join('')

  $('#view').innerHTML = `<section class="detail-hero group-${entry.group}">
    <a class="back-link" href="#atlas">← 返回數學地圖</a>
    <p class="kicker">ATLAS ${groupNumber} · ${escapeHtml(groupTitle)}</p>
    <div class="detail-title"><div><span class="maturity ${entry.maturity}">${label(entry.maturity)}</span><h1>${escapeHtml(entry.title_zh)}</h1></div><code>${escapeHtml(entry.id)}</code></div>
    <p>${escapeHtml(entry.summary_zh)}</p>
    ${canonical ? `<a class="button primary" href="#object/${entry.canonical_mko_id}">閱讀完整知識物件</a>` : `<span class="planned-notice">此節點已排入 ${escapeHtml(entry.materialization_priority)} 物化佇列</span>`}
  </section>
  <section class="page-shell detail-grid">
    <article class="detail-panel"><p class="kicker">POSITION</p><h2>結構位置</h2><dl class="clean-list">
      <div><dt>主要領域</dt><dd>${escapeHtml(entry.primary_domain)}</dd></div>
      <div><dt>物件類型</dt><dd>${escapeHtml(typeLabels[entry.object_kind] || entry.object_kind)}</dd></div>
      <div><dt>課程帶</dt><dd>${escapeHtml(entry.curriculum_band)}</dd></div>
      <div><dt>預定 MKO</dt><dd><code>${escapeHtml(entry.target_mko_id)}</code></dd></div>
      <div><dt>方法</dt><dd>${entry.methods.map(method => `<a href="#methods">${escapeHtml(method)}</a>`).join('、')}</dd></div>
    </dl></article>
    <article class="detail-panel"><p class="kicker">DEPENDENCY</p><h2>前置與下游</h2>
      <h3>前置節點</h3><div class="relation-links">${dependencies.length ? dependencies.map(item => `<a href="#atlas/${item.id}">${escapeHtml(item.title_zh)} <span>←</span></a>`).join('') : '<span class="quiet">無已宣告前置</span>'}</div>
      <h3>直接下游</h3><div class="relation-links">${downstream.length ? downstream.map(item => `<a href="#atlas/${item.id}">${escapeHtml(item.title_zh)} <span>→</span></a>`).join('') : '<span class="quiet">目前沒有直接下游</span>'}</div>
    </article>
    <article class="detail-panel full"><p class="kicker">DIFFICULTY VECTOR</p><h2>十二維難度 seed</h2><p class="panel-note">這是供排序與規劃使用的候選向量，不是對所有學習者都成立的單一難度真值。</p><div class="difficulty-grid">${difficulty}</div></article>
  </section>`
}

function renderKnowledge() {
  const formalized = state.index.objects.filter(entry => entry.tags?.includes('Lean')).length
  $('#view').innerHTML = `<section class="page-shell">
    ${sectionIntro('CANONICAL MKO', '知識不只是一篇文章。', '每個 MKO 同時保存敘述、可編譯公式、符號作用域、依賴、計算伴隨、Evidence 引用與形式化義務。', `<span class="section-count">${state.index.objects.length} objects</span>`)}
    <div class="knowledge-summary"><span>${state.index.objects.length} 個物件</span><span>${state.evidenceIndex.objects.length} 個證據</span><span>${formalized} 個含 Lean 對齊</span></div>
    <div class="knowledge-grid">${state.index.objects.map(entry => `<a class="knowledge-card" href="#object/${entry.id}">
      <div><span class="type-pill">${escapeHtml(typeLabels[entry.type] || entry.type)}</span><span class="version-pill">v${escapeHtml(entry.version)}</span></div>
      <h2>${escapeHtml(entry.title)}</h2><code>${escapeHtml(entry.id)}</code>
      <div class="tag-row">${(entry.tags || []).slice(0, 4).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
      <footer><span>${entry.evidence_ref_count} Evidence refs</span><b>開啟 →</b></footer>
    </a>`).join('')}</div>
  </section>`
}

function renderFormula(formula) {
  const compiler = formula.compiler || {}
  return `<div class="formula-stage" aria-label="${escapeHtml(formula.tex)}">
    <div class="mathml">${formula.mathml}</div>
    <code>${escapeHtml(formula.tex)}</code>
    <small>${escapeHtml(compiler.id || '未記錄')} · v${escapeHtml(compiler.version || '?')} · ${escapeHtml((compiler.source_sha256 || '').slice(0, 16))}…</small>
  </div>`
}

function evidenceCard(evidence) {
  const universal = evidence.claim_scope?.universal_proof
  return `<article class="evidence-card">
    <header><span class="status-badge passed">${escapeHtml(label(evidence.status))}</span><span>${escapeHtml(evidence.evidence_type)}</span></header>
    <h3>${escapeHtml(evidence.producer?.id || 'unknown producer')}</h3>
    <p>${escapeHtml(evidence.claim_scope?.statement_zh || '')}</p>
    <dl class="micro-list"><div><dt>量化</dt><dd>${escapeHtml(evidence.claim_scope?.quantification || '未標記')}</dd></div><div><dt>普遍證明</dt><dd>${universal ? '是，只限精確聲明' : '否'}</dd></div><div><dt>重播</dt><dd><code>${escapeHtml(evidence.replay?.command || '未提供')}</code></dd></div></dl>
    <details><summary>內容地址與限制</summary><code class="digest">${escapeHtml(evidence.digest?.canonical_payload_sha256 || '')}</code><ul>${(evidence.limitations || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></details>
  </article>`
}

async function renderObject(objectId, token) {
  const object = await loadObject(objectId)
  const evidence = await Promise.all((object.verification?.evidence_refs || []).map(ref => loadEvidence(ref.id)))
  if (token !== state.renderToken) return
  document.title = `${object.titles['zh-Hant']} · OCME`
  const dependencyLinks = object.dependencies?.length
    ? object.dependencies.map(dep => `<a href="#object/${dep.id}">${escapeHtml(dep.title_zh)} <span>${escapeHtml(dep.reason_zh)}</span></a>`).join('')
    : '<span class="quiet">沒有已宣告的 MKO 前置依賴</span>'
  const formalEvidence = evidence.filter(item => item.evidence_type === 'formal_proof')
  const producers = (object.verification?.producers || []).map(producer => `<article><span class="status-badge ${producer.status}">${label(producer.status)}</span><h3>${escapeHtml(producer.id)}</h3><p>${escapeHtml(producer.adapter)}</p><code>${escapeHtml(producer.config_path)}</code></article>`).join('')

  $('#view').innerHTML = `<section class="object-hero">
    <a class="back-link" href="#knowledge">← 全部知識物件</a>
    <div class="object-hero-grid"><div><p class="kicker light">${escapeHtml(typeLabels[object.type] || object.type)} · MKO v${escapeHtml(object.version)}</p><h1>${escapeHtml(object.titles['zh-Hant'])}</h1><p>${escapeHtml(object.summary?.['zh-Hant'] || '')}</p></div>${renderFormula(object.formula)}</div>
    <div class="object-status"><span>${evidence.length} Evidence</span><span>${label(object.formalization?.status)}</span><span>${escapeHtml(object.id)}</span></div>
  </section>
  <section class="object-layout">
    <aside class="object-sidebar">
      <p class="kicker">KNOWLEDGE LAYERS</p>
      <nav class="object-tabs" aria-label="知識層切換">
        <button class="active" data-tab="statement">01　數學敘述</button>
        <button data-tab="explanation">02　解釋與邊界</button>
        <button data-tab="evidence">03　證據</button>
        <button data-tab="formal">04　形式化</button>
        <button data-tab="structure">05　AI 結構</button>
      </nav>
      <div class="sidebar-meta"><b>前置知識</b><div class="dependency-stack">${dependencyLinks}</div></div>
    </aside>
    <article class="object-content">
      <section class="object-panel active" data-panel="statement"><p class="kicker">STATEMENT</p><h2>${object.type === 'theorem' ? '定理敘述' : object.type === 'definition' ? '定義敘述' : '數學敘述'}</h2><p class="large-copy">${escapeHtml(object.statement?.['zh-Hant'] || '')}</p>
        <h3>成立條件</h3><ol class="assumption-list">${(object.assumptions || []).map(item => `<li><span>${escapeHtml(item.id)}</span>${escapeHtml(item['zh-Hant'])}</li>`).join('')}</ol>
        <h3>符號作用域</h3><div class="symbol-table">${(object.symbols || []).map(item => `<div><code>${escapeHtml(item.token)}</code><span><b>${escapeHtml(item.role_zh)}</b><small>${escapeHtml(item.scope)}</small></span></div>`).join('')}</div>
      </section>
      <section class="object-panel" data-panel="explanation"><p class="kicker">EXPLANATION</p><h2>直觀、定義與常見誤解</h2>${(object.explanation?.paragraphs_zh || []).map(text => `<p class="large-copy">${escapeHtml(text)}</p>`).join('')}<aside class="boundary-callout"><b>常見誤解</b><p>${escapeHtml(object.explanation?.common_misconception_zh || '')}</p></aside></section>
      <section class="object-panel" data-panel="evidence"><p class="kicker">EVIDENCE OBJECTS</p><h2>可重播的證據，以及它沒證明什麼</h2><aside class="boundary-callout amber"><b>驗證界線</b><p>${escapeHtml(object.verification?.warning_zh || '')}</p></aside><div class="producer-grid">${producers || '<p class="quiet">尚未設定生產者</p>'}</div><div class="evidence-grid">${evidence.length ? evidence.map(evidenceCard).join('') : '<div class="empty-state"><b>目前沒有 Evidence Object</b><p>這不表示內容錯誤；只表示尚未登錄可重播的計算或形式證據。</p></div>'}</div></section>
      <section class="object-panel" data-panel="formal"><p class="kicker">FORMALIZATION</p><h2>${escapeHtml(label(object.formalization?.status))}</h2><dl class="clean-list"><div><dt>目標系統</dt><dd>${escapeHtml((object.formalization?.target_systems || []).join('、') || '尚未指定')}</dd></div><div><dt>精確形式 Evidence</dt><dd>${formalEvidence.length}</dd></div><div><dt>下一個義務</dt><dd>${escapeHtml(object.formalization?.next_obligation_zh || '')}</dd></div></dl><p class="panel-note">形式證明只封閉其精確機器聲明；中文百科敘述與形式模型的語義橋仍須獨立審查。</p>${formalEvidence.map(evidenceCard).join('')}</section>
      <section class="object-panel" data-panel="structure"><p class="kicker">MACHINE-READABLE</p><h2>完整 MKO 結構</h2><p>這是網站所讀取的同一份 Canonical Object，沒有第二套隱藏資料。</p><pre><code>${escapeHtml(JSON.stringify({ object, evidence }, null, 2))}</code></pre></section>
    </article>
  </section>`

  $$('.object-tabs button').forEach(button => button.addEventListener('click', () => {
    $$('.object-tabs button').forEach(item => item.classList.remove('active'))
    $$('.object-panel').forEach(item => item.classList.remove('active'))
    button.classList.add('active')
    $(`[data-panel="${button.dataset.tab}"]`).classList.add('active')
  }))
}

function renderPaths() {
  const entryById = new Map(state.index.objects.map(item => [item.id, item]))
  $('#view').innerHTML = `<section class="page-shell">
    ${sectionIntro('LEARNING PATHS', '學習順序，不等於邏輯依賴。', '同一個概念可以出現在通識、形式化或證據素養的不同路徑。路徑明示受眾、必要程度與審查狀態。', `<span class="section-count">${state.paths.length} paths</span>`)}
    <div class="path-list">${state.paths.map((path, pathIndex) => `<article class="path-card">
      <header><div><span class="path-number">${String(pathIndex + 1).padStart(2, '0')}</span><span class="status-badge ${path.review.status}">${label(path.review.status)}</span></div><h2>${escapeHtml(path.title_zh)}</h2><p>${escapeHtml(path.goal_zh)}</p><div class="tag-row">${path.audience.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div></header>
      <div class="path-steps">${[...path.nodes].sort((a, b) => a.position - b.position).map(node => { const object = entryById.get(node.object_id); return `<a href="#object/${node.object_id}"><span>${node.position}</span><div><b>${escapeHtml(object?.title || node.object_id)}</b><small>${escapeHtml(node.requirement)} · ${escapeHtml(node.rationale_zh)}</small></div></a>` }).join('')}</div>
    </article>`).join('')}</div>
  </section>`
}

function renderMethods() {
  const categoryLabels = { proof: '證明方法', problem_solving: '問題解決', structural: '結構方法', analysis_computation: '分析與計算', formal: '形式驗證' }
  $('#view').innerHTML = `<section class="page-shell">
    ${sectionIntro('METHODS & DOMAINS', '數學由領域組織，也由方法穿透。', '領域回答「這個對象在哪裡」；方法回答「遇到這類問題可以怎麼做」。兩種分類彼此獨立。', `<span class="section-count">${state.methods.length} methods</span>`)}
    <div class="domain-cloud">${state.domains.map((domain, index) => { const entries = state.atlas.entries.filter(entry => entry.primary_domain === domain.id); const canonical = entries.filter(entry => entry.maturity === 'canonical_mko').length; return `<article class="${entries.length === 0 ? 'is-empty' : ''}"><div><span>${String(index + 1).padStart(2, '0')}</span><small>${canonical}/${entries.length} canonical</small></div><h3>${escapeHtml(domain.title_zh)}</h3><p>${escapeHtml(domain.description_zh)}</p></article>` }).join('')}</div>
    <div class="method-heading"><p class="kicker">METHOD TOOLKIT</p><h2>二十種核心方法</h2></div>
    <div class="method-grid">${state.methods.map(method => `<article class="method-card"><header><span>${escapeHtml(categoryLabels[method.category] || method.category)}</span><code>${escapeHtml(method.id.replace('method-', ''))}</code></header><h3>${escapeHtml(method.title_zh)}</h3><p>${escapeHtml(method.description_zh)}</p><details><summary>適用訊號與步驟</summary><b>適用訊號</b><ul>${method.signals.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul><b>基本步驟</b><ol>${method.steps.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol><b>常見失敗</b><ul>${method.failure_modes.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></details></article>`).join('')}</div>
  </section>`
}

function renderPractice() {
  const batches = state.questions?.batches || []
  const publishedTotal = state.questions?.published_question_count || 0
  const latestDate = state.questions?.last_published_at
  const published = batches.filter(batch => batch.date === latestDate).reduce((sum, batch) => sum + batch.question_count, 0)
  const target = state.questions?.daily_target || 100
  $('#view').innerHTML = `<section class="practice-hero"><div><p class="kicker light">QUESTION FACTORY</p><h1>每日一百題，<br>先覆蓋，再逐步加密。</h1><p>變種題由使用者手動啟動專責模型生產；主架構者選題、定義合約與驗收。100 題是目前的品質與成本基線，不是永久上限。</p></div><div class="factory-meter"><span>最近一日已發布</span><strong>${published.toLocaleString('zh-TW')}</strong><small>/ ${target} 題</small><progress value="${Math.min(100, published / target * 100)}" max="100" aria-label="最近一日題目完成比例" aria-valuetext="${published} / ${target} 題"></progress></div></section>
  <section class="page-shell practice-layout">
    <article class="detail-panel"><p class="kicker">PRODUCTION CONTRACT</p><h2>題目如何進入網站</h2><ol class="factory-steps"><li><span>1</span><div><b>主架構者選題</b><p>只從已指定的 MKO 與學習目標建立每日 brief。</p></div></li><li><span>2</span><div><b>出題模型產生變種</b><p>每題保留參數、答案、解釋、來源 MKO 與生成資訊。</p></div></li><li><span>3</span><div><b>機械檢查</b><p>驗證 Schema、ID、重複、答案一致性與可重現參數。</p></div></li><li><span>4</span><div><b>候選批次發布</b><p>尚未審查的題目必須明示 candidate，不冒充 Canonical MKO。</p></div></li></ol></article>
    <article class="detail-panel"><p class="kicker">BATCHES</p><h2>已發布候選批次</h2><p class="panel-note">累計 ${publishedTotal.toLocaleString('zh-TW')} 題；機械驗證不等於人工審定。</p>${batches.length ? `<div class="batch-list">${batches.map(batch => `<a href="#practice/${batch.id}"><b>${escapeHtml(batch.title_zh || batch.id)}</b><span>${batch.question_count} 題</span><small>${escapeHtml(batch.date)} · ${escapeHtml(batch.status)}</small></a>`).join('')}</div>` : '<div class="empty-state"><b>第一批尚未發布</b><p>題庫合約已建立；專責出題任務啟動後，通過驗收的批次才會出現在這裡。</p></div>'}</article>
    <article class="detail-panel solution-mode-panel">
      <header><div><p class="kicker">SOLUTION MODES</p><h2>先快速理解，完整過程稍後登場。</h2></div><span>目前模式 · 快速</span></header>
      <div class="solution-mode-grid">
        <div><b>現階段</b><p>每題提供可核對的答案與關鍵解釋，讓我們先用較低成本完成跨領域覆蓋。</p></div>
        <div><b>詳細推導模式</b><p>未來會逐步加入定義、假設、使用定理、中間步驟、替代解法與驗證邊界。</p></div>
      </div>
      <p class="solution-mode-note">請等待我們未來的詳細推導模式。現階段我們只提供快速解答及解釋。想先展開完整過程？請使用擴充模式，問你喜歡的任何一個 AI <span aria-label="歪臉笑">😏</span></p>
    </article>
  </section>`
}

function questionCard(question, index) {
  return `<article class="question-card" data-question-haystack="${escapeHtml(`${question.title_zh} ${question.stem_zh} ${question.variant.family_id} ${question.source_mko_ids.join(' ')}`.toLowerCase())}">
    <header><span>${String(index + 1).padStart(3, '0')}</span><span class="status-badge candidate">${escapeHtml(question.verification.status)}</span></header>
    <p class="question-family">${escapeHtml(question.variant.family_id)}</p>
    <h3>${escapeHtml(question.title_zh)}</h3>
    <p class="question-stem">${escapeHtml(question.stem_zh)}</p>
    <div class="question-meta"><span>難度 ${question.difficulty.level}</span><span>${escapeHtml(question.difficulty.band)}</span></div>
    <div class="tag-row">${question.source_mko_ids.map(id => `<a href="#object/${id}">${escapeHtml(id)}</a>`).join('')}</div>
    <details><summary>查看答案與解釋</summary><strong>${escapeHtml(question.answer.value)}</strong><p>${escapeHtml(question.answer.explanation_zh)}</p><small>Seed ${question.variant.seed}</small></details>
  </article>`
}

async function renderQuestionBatch(batchId, token) {
  const batch = state.questions.batches.find(item => item.id === batchId)
  if (!batch) throw new Error(`找不到題目批次：${batchId}`)
  let questions = state.questionBatchCache.get(batchId)
  if (!questions) {
    questions = (await loadText(batch.path)).trimEnd().split(/\r?\n/).map(JSON.parse)
    state.questionBatchCache.set(batchId, questions)
  }
  if (token !== state.renderToken) return
  const familyCounts = questions.reduce((counts, question) => {
    counts[question.variant.family_id] = (counts[question.variant.family_id] || 0) + 1
    return counts
  }, {})
  $('#view').innerHTML = `<section class="detail-hero">
    <a class="back-link" href="#practice">← 返回題庫</a>
    <p class="kicker">QUESTION BATCH · ${escapeHtml(batch.date)}</p>
    <div class="detail-title"><div><span class="maturity atlas_seed">${escapeHtml(batch.status)}</span><h1>${escapeHtml(batch.title_zh || batch.id)}</h1></div><code>${escapeHtml(batch.id)}</code></div>
    <p>${batch.question_count} 道已通過 Schema、去重、來源快照與獨立答案重算的候選題；仍未標記為人工審定。</p>
  </section>
  <section class="page-shell question-browser">
    <div class="question-summary">${Object.entries(familyCounts).map(([family, count]) => `<span><b>${count}</b>${escapeHtml(family)}</span>`).join('')}</div>
    <label class="search-box question-search"><span aria-hidden="true">⌕</span><input id="question-search" type="search" placeholder="搜尋題幹、題族或來源 MKO" autocomplete="off"></label>
    <p class="result-line"><span id="question-result-count">${questions.length}</span> 道題目</p>
    <div id="question-grid" class="question-grid">${questions.map(questionCard).join('')}</div>
  </section>`
  $('#question-search').addEventListener('input', event => {
    const query = event.currentTarget.value.trim().toLowerCase()
    let visible = 0
    $$('.question-card').forEach(card => {
      const match = !query || card.dataset.questionHaystack.includes(query)
      card.hidden = !match
      if (match) visible += 1
    })
    $('#question-result-count').textContent = visible
  })
}

function renderAbout() {
  const stages = [
    ['R1', '狀態與事件', '把物件、主張與轉移保存成可驗證事件。'],
    ['R2', '物化佇列', '從 Atlas 推導依賴安全的工作批次。'],
    ['R3', '設計／建造／驗證', '角色輸出遵循明確合約，不直接改 Canonical。'],
    ['R4', '機械信任', '把測試結果綁定到候選 revision。'],
    ['R5', '風險與分歧', '高風險、同源偏誤與未解異議不被壓平。'],
    ['R6', '真實 Provider', '以憑證邊界連接外部模型，保存實際模型版本。'],
    ['R7', '高階裁決', '保留給跨領域整合與嚴格數學審查。'],
  ]
  $('#view').innerHTML = `<section class="about-hero"><p class="kicker light">AI-NATIVE, EVIDENCE-AWARE</p><h1>可信任，不是因為<br>AI 說它正確。</h1><p>可信任來自可見的範圍、可重播的程序、未被刪除的異議，以及人類仍然保有的決定權。</p></section>
  <section class="page-shell">
    <div class="runtime-flow">${stages.map(([code, title, copy]) => `<article><span>${code}</span><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p></div></article>`).join('')}</div>
    <section class="role-section"><p class="kicker">OPERATING MODEL</p><h2>三層分工，權限不混淆</h2><div class="role-grid"><article><span>01</span><h3>日常主架構</h3><p>網站、選題、研究包、MKO、人工觸發批次、發布與跨角色整合。</p><small>高頻 · 主責</small></article><article><span>02</span><h3>高階數學審查</h3><p>由 GPT‑6 等高階模型低頻進行全庫嚴證與架構整合，完成前先討論。</p><small>低頻 · 高風險審查</small></article><article><span>03</span><h3>批量出題</h3><p>由 GPT‑5.6 Terra 或經核准的高速模型在使用者啟動後，依 brief 生產每批 100 道候選題。</p><small>手動啟動 · 候選生產</small></article></div></section>
    <section class="principle-grid"><article><b>Atlas seed</b><span>≠</span><b>Canonical MKO</b></article><article><b>有限計算</b><span>≠</span><b>普遍證明</b></article><article><b>模型共識</b><span>≠</span><b>獨立驗證</b></article><article><b>大量生成</b><span>≠</span><b>已審定內容</b></article></section>
  </section>`
}

function renderLoading() {
  $('#view').innerHTML = '<section class="loading-state"><span></span><p>正在讀取知識物件……</p></section>'
}

function renderError(error) {
  $('#view').innerHTML = `<section class="error-state"><p class="kicker">LOAD ERROR</p><h1>這個頁面沒有成功展開。</h1><p>${escapeHtml(error.message || String(error))}</p><a class="button ink" href="#home">返回首頁</a></section>`
}

async function renderRoute() {
  const token = ++state.renderToken
  const { page, rest } = currentRoute()
  setActiveNavigation(page)
  document.title = `${routeTitle(page)} · OCME`
  window.scrollTo({ top: 0, behavior: 'auto' })

  try {
    if (page === 'home') renderHome()
    else if (page === 'atlas' && rest[0]) renderAtlasDetail(rest[0])
    else if (page === 'atlas') renderAtlas()
    else if (page === 'knowledge') renderKnowledge()
    else if (page === 'object' && rest[0]) { renderLoading(); await renderObject(rest[0], token) }
    else if (page === 'paths') renderPaths()
    else if (page === 'methods') renderMethods()
    else if (page === 'practice' && rest[0]) { renderLoading(); await renderQuestionBatch(rest[0], token) }
    else if (page === 'practice') renderPractice()
    else if (page === 'about') renderAbout()
    else window.location.hash = '#home'
  } catch (error) {
    if (token === state.renderToken) renderError(error)
  }
}

async function init() {
  const [index, evidenceIndex, atlas, domains, methods, paths, curricula, questions] = await Promise.all([
    loadJson('/data/index.json'),
    loadJson('/data/evidence/index.json'),
    loadJson('/data/atlas/core-atlas.json'),
    loadJson('/data/architecture/domains.json'),
    loadJson('/data/architecture/methods.json'),
    loadJson('/data/architecture/learning-paths.json'),
    loadJson('/data/architecture/curricula.json'),
    loadJson('/data/questions/index.json', true),
  ])
  Object.assign(state, {
    index,
    evidenceIndex,
    atlas,
    domains: domains.domains,
    methods: methods.methods,
    paths: paths.paths,
    curricula,
    questions: questions || { daily_target: 100, published_question_count: 0, batches: [] },
  })
  renderShell()
  window.addEventListener('hashchange', renderRoute)
  await renderRoute()
}

init().catch(error => {
  $('#app').innerHTML = `<main class="error-state"><h1>OCME 無法啟動</h1><p>${escapeHtml(error.message || String(error))}</p></main>`
})
