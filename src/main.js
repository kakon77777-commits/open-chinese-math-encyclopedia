const $ = (selector, root = document) => root.querySelector(selector)
const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')

const state = {
  index: null,
  currentId: null,
  cache: new Map(),
  evidenceIndex: null,
  evidenceCache: new Map(),
}

async function loadJson(url, message) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(message)
  return response.json()
}

async function loadObject(id) {
  if (state.cache.has(id)) return state.cache.get(id)
  const entry = state.index.objects.find(object => object.id === id)
  if (!entry) throw new Error(`未知數學物件：${id}`)
  const object = await loadJson(entry.path, `無法讀取數學知識物件：${id}`)
  state.cache.set(id, object)
  return object
}

async function loadEvidence(id) {
  if (state.evidenceCache.has(id)) return state.evidenceCache.get(id)
  const entry = state.evidenceIndex.objects.find(object => object.id === id)
  if (!entry) throw new Error(`未知證據物件：${id}`)
  const evidence = await loadJson(entry.path, `無法讀取證據物件：${id}`)
  state.evidenceCache.set(id, evidence)
  return evidence
}

async function loadReferencedEvidence(mko) {
  return Promise.all((mko.verification?.evidence_refs || []).map(ref => loadEvidence(ref.id)))
}

function statusLabel(value) {
  const labels = {
    human_proof_available: '人工證明可用',
    not_applicable: '不適用',
    not_formalized: '尚未形式化',
    mapped_not_evidenced: '已映射、尚無形式證據',
    formalized_equivalent_vector_form: '等價向量形式已形式化',
    formalized_declared_side_model: '宣告的邊長模型已形式化',
    formalized_lean_set_semantics: 'Lean 集合語義已形式化',
    formalized_total_function_core: '總函數核心已形式化',
    formalized_filter_tendsto_core: 'Filter.Tendsto 核心已形式化',
    finite_cases_passed: '有限案例通過',
    finite_cases_passed_and_formal_vector_proof_available: '有限案例通過，向量形式證據可用',
    finite_cases_and_declared_side_model_formalized: '有限案例與宣告邊長模型均有證據',
    formal_lean_set_semantics_available: 'Lean 集合形式證據可用',
    formal_total_function_core_available: '總函數形式證據可用',
    formal_filter_tendsto_core_available: 'Filter.Tendsto 形式證據可用',
    not_run: '尚未執行',
    reference_only: '僅供參考',
    active: '已啟用',
    configured: '已設定',
    unavailable: '不可用',
  }
  return labels[value] || value || '未標記'
}

function typeLabel(value) {
  const labels = {
    definition: '定義', theorem: '定理', concept: '概念', lemma: '引理',
    proposition: '命題', conjecture: '猜想',
  }
  return labels[value] || value
}

function renderFormula(formula) {
  const compiler = formula.compiler || {}
  const hash = compiler.source_sha256 ? compiler.source_sha256.slice(0, 16) : '未記錄'
  return `<div class="mathml" aria-label="${escapeHtml(formula.tex)}">${formula.mathml}</div>
    <code class="tex-source">${escapeHtml(formula.tex)}</code>
    <div class="formula-provenance">由 <code>${escapeHtml(compiler.id || '未標記')}</code> v${escapeHtml(compiler.version || '?')} 編譯 · SHA-256 <code>${escapeHtml(hash)}…</code></div>`
}

function renderCompanions(companions = []) {
  if (!companions.length) return '<div class="notice">此物件目前沒有計算伴隨。</div>'
  return companions.map(companion => `<section class="companion-card">
    <h3>${escapeHtml(companion.language)} · ${escapeHtml(companion.id)}</h3>
    <div class="notice warning"><strong>非同一性聲明：</strong>${escapeHtml(companion.warning)}</div>
    <pre><code>${escapeHtml(companion.source)}</code></pre>
    <dl class="definition-list">
      <div><dt>關係</dt><dd>${escapeHtml(companion.relation)}</dd></div>
      <div><dt>保存</dt><dd>${(companion.non_identity?.preserved || []).map(escapeHtml).join('、') || '未標記'}</dd></div>
      <div><dt>近似</dt><dd>${(companion.non_identity?.approximated || []).map(escapeHtml).join('、') || '無'}</dd></div>
      <div><dt>遺漏</dt><dd>${(companion.non_identity?.omitted || []).map(escapeHtml).join('、') || '無'}</dd></div>
    </dl>
  </section>`).join('')
}

function renderProducers(mko, evidenceObjects) {
  const evidenceProducerIds = new Set(evidenceObjects.map(evidence => evidence.producer.id))
  return (mko.verification?.producers || []).map(producer => {
    const hasEvidence = evidenceProducerIds.has(producer.id)
    return `<article class="producer-card">
      <div><strong>${escapeHtml(producer.id)}</strong> · ${escapeHtml(producer.adapter)}</div>
      <span class="producer-status ${producer.status}">${escapeHtml(statusLabel(producer.status))}</span>
      <p><code>${escapeHtml(producer.config_path)}</code></p>
      <small>${hasEvidence ? '已有被 MKO 引用的證據' : '尚無被 MKO 引用的證據'}</small>
    </article>`
  }).join('') || '<p>沒有宣告證據生產者。</p>'
}

function renderEvidenceObjects(evidenceObjects = []) {
  if (!evidenceObjects.length) return '<div class="notice">此 MKO 目前沒有引用 Evidence Object。</div>'
  return evidenceObjects.map(evidence => {
    const checks = evidence.checks.map(check => `<tr><td><code>${escapeHtml(check.id)}</code></td><td>${escapeHtml(check.status)}</td></tr>`).join('')
    const sources = evidence.sources.map(source => `<li><strong>${escapeHtml(source.role)}</strong>：<code>${escapeHtml(source.path)}</code><br><small>SHA-256 ${escapeHtml(source.sha256)}</small></li>`).join('')
    return `<section class="evidence-card">
      <div class="evidence-header">
        <span class="evidence-status ${evidence.status === 'passed' ? 'passed' : ''}">${escapeHtml(evidence.status)}</span>
        <span class="type-chip">${escapeHtml(evidence.evidence_type)}</span>
        <code class="evidence-id">${escapeHtml(evidence.id)}</code>
      </div>
      <p><strong>聲明範圍：</strong>${escapeHtml(evidence.claim_scope.statement_zh)}</p>
      <dl class="definition-list">
        <div><dt>量化範圍</dt><dd>${escapeHtml(evidence.claim_scope.quantification)}</dd></div>
        <div><dt>普遍證明</dt><dd>${evidence.claim_scope.universal_proof ? '是，僅限上述精確形式聲明' : '否'}</dd></div>
        <div><dt>產生器</dt><dd>${escapeHtml(evidence.producer.id)} v${escapeHtml(evidence.producer.version)}</dd></div>
        <div><dt>執行環境</dt><dd>${escapeHtml(evidence.producer.runtime)}</dd></div>
        <div><dt>重播</dt><dd><code>${escapeHtml(evidence.replay.command)}</code></dd></div>
      </dl>
      <h3>檢查項目</h3>
      <table><thead><tr><th>檢查</th><th>狀態</th></tr></thead><tbody>${checks}</tbody></table>
      <h3>限制</h3><ul>${evidence.limitations.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      <h3>來源</h3><ul class="evidence-sources">${sources}</ul>
      <p class="evidence-digest">內容地址：<code>${escapeHtml(evidence.digest.canonical_payload_sha256)}</code></p>
    </section>`
  }).join('')
}

function renderObjectList(currentId, query = '') {
  const q = query.trim().toLowerCase()
  const entries = state.index.objects.filter(entry => {
    const haystack = `${entry.id} ${entry.title} ${entry.type} ${(entry.tags || []).join(' ')}`.toLowerCase()
    return !q || haystack.includes(q)
  })
  if (!entries.length) return '<p class="empty">找不到符合的數學物件。</p>'
  return entries.map(entry => `<button class="object-link ${entry.id === currentId ? 'active' : ''}" data-object-id="${escapeHtml(entry.id)}">
    <span>${escapeHtml(entry.title)}</span><small>${escapeHtml(typeLabel(entry.type))}</small>
  </button>`).join('')
}

function bindObjectLinks() {
  document.querySelectorAll('[data-object-id]').forEach(button => {
    button.addEventListener('click', () => selectObject(button.dataset.objectId))
  })
}

function bindObjectNavigation() {
  bindObjectLinks()
  const search = $('#object-search')
  if (!search) return
  search.addEventListener('input', () => {
    $('#object-list').innerHTML = renderObjectList(state.currentId, search.value)
    bindObjectLinks()
  })
}

function renderObject(mko, evidenceObjects = []) {
  const tabs = [
    ['math', '數學'], ['explain', '解釋'], ['code', '程式碼'],
    ['evidence', '證據'], ['formal', '形式化'], ['ai', 'AI 結構'],
  ]
  const symbols = (mko.symbols || []).map(symbol => `<tr><td><code>${escapeHtml(symbol.token)}</code></td><td>${escapeHtml(symbol.role_zh)}</td><td>${escapeHtml(symbol.scope)}</td></tr>`).join('')
  const deps = (mko.dependencies || []).length
    ? mko.dependencies.map(dep => `<li><button class="dep-link" data-object-id="${escapeHtml(dep.id)}"><strong>${escapeHtml(dep.title_zh)}</strong></button><span>：${escapeHtml(dep.reason_zh)}</span></li>`).join('')
    : '<li class="empty">此物件沒有已宣告的前置依賴。</li>'
  const proofs = mko.proofs || []
  const proofStatus = proofs[0]?.status ?? 'not_applicable'
  const proofBlock = proofs.length
    ? `<h3>人工證明摘要</h3>${proofs.map(proof => `<p>${escapeHtml(proof.summary_zh)}</p>`).join('')}`
    : `<div class="notice">此物件類型為「${escapeHtml(typeLabel(mko.type))}」，目前沒有獨立證明物件。</div>`
  const formalTargets = mko.formalization?.target_systems || []
  const formalEvidence = evidenceObjects.filter(evidence => evidence.evidence_type === 'formal_proof')
  const statementHeading = mko.type === 'definition' ? '定義敘述' : mko.type === 'theorem' ? '定理敘述' : '數學敘述'

  document.title = `${mko.titles['zh-Hant']} · 開源中文數學百科`
  $('#app').innerHTML = `
    <header class="hero"><div class="hero-inner">
      <p class="eyebrow">OPEN CHINESE MATHEMATICAL ENCYCLOPEDIA · MVP 0.8</p>
      <div class="type-chip">${escapeHtml(typeLabel(mko.type))}</div>
      <h1>${escapeHtml(mko.titles['zh-Hant'])}</h1>
      <p class="lead">${escapeHtml(mko.summary?.['zh-Hant'] || '')}</p>
      <div class="status-row">
        <span>${statusLabel(proofStatus)}</span>
        <span>${statusLabel(mko.verification?.computational_status)}</span>
        <span>${statusLabel(mko.formalization?.status)}</span>
        <span>形式聲明 ${formalEvidence.length}</span>
        <span>版本 ${escapeHtml(mko.version)}</span>
      </div>
    </div></header>
    <main class="shell">
      <aside class="toc">
        <div class="brand">數學知識物件</div><code>${escapeHtml(mko.id)}</code>
        <label class="search-label" for="object-search">物件目錄</label>
        <input id="object-search" class="object-search" type="search" placeholder="搜尋標題、類型或標籤" autocomplete="off" />
        <div id="object-list" class="object-list">${renderObjectList(mko.id)}</div>
        <hr /><strong>前置知識</strong><ul class="dependency-list">${deps}</ul>
        <hr /><strong>來源</strong><p>${escapeHtml(mko.provenance?.note_zh || '未標記')}</p>
      </aside>
      <article class="article">
        <nav class="tabs" aria-label="知識層切換">${tabs.map(([id, label], i) => `<button class="tab ${i === 0 ? 'active' : ''}" data-tab="${id}">${label}</button>`).join('')}</nav>
        <section class="panel active" data-panel="math">
          <h2>${statementHeading}</h2><p>${escapeHtml(mko.statement['zh-Hant'])}</p>
          <div class="formula-card">${renderFormula(mko.formula)}</div>
          <h3>成立條件</h3><ul>${(mko.assumptions || []).map(x => `<li>${escapeHtml(x['zh-Hant'])}</li>`).join('')}</ul>
          <h3>符號表</h3><table><thead><tr><th>符號</th><th>角色</th><th>作用域</th></tr></thead><tbody>${symbols}</tbody></table>
          ${proofBlock}
        </section>
        <section class="panel" data-panel="explain">
          <h2>直觀解釋</h2>${(mko.explanation?.paragraphs_zh || []).map(p => `<p>${escapeHtml(p)}</p>`).join('')}
          <div class="notice"><strong>常見誤解：</strong>${escapeHtml(mko.explanation?.common_misconception_zh || '未標記')}</div>
        </section>
        <section class="panel" data-panel="code"><h2>計算伴隨</h2>${renderCompanions(mko.computational_companions)}</section>
        <section class="panel" data-panel="evidence">
          <h2>證據生產者</h2><div class="producer-grid">${renderProducers(mko, evidenceObjects)}</div>
          <div class="notice warning"><strong>重要：</strong>${escapeHtml(mko.verification?.warning_zh || '尚無驗證聲明。')}</div>
          <h2>引用的 Evidence Object</h2>${renderEvidenceObjects(evidenceObjects)}
        </section>
        <section class="panel" data-panel="formal">
          <h2>形式化狀態</h2><dl class="definition-list">
            <div><dt>狀態</dt><dd>${statusLabel(mko.formalization?.status)}</dd></div>
            <div><dt>目標系統</dt><dd>${escapeHtml(formalTargets.join('、') || '尚未指定')}</dd></div>
            <div><dt>精確形式聲明數</dt><dd>${formalEvidence.length}</dd></div>
            <div><dt>下一個語義義務</dt><dd>${escapeHtml(mko.formalization?.next_obligation_zh || '尚未指定')}</dd></div>
          </dl>
          <p>形式證據只證明其精確機器聲明；百科中文敘述與形式模型之間的映射仍是獨立可審查層。</p>
          <h2>精確形式 Evidence</h2>${renderEvidenceObjects(formalEvidence)}
        </section>
        <section class="panel" data-panel="ai">
          <h2>AI 原始結構</h2><p>MKO 透過 evidence_refs 明確引用內容定址證據。</p>
          <pre><code>${escapeHtml(JSON.stringify({ object: mko, evidence: evidenceObjects }, null, 2))}</code></pre>
        </section>
      </article>
    </main>
    <footer>數學、程式、有限證據與精確形式證明彼此分離。開源中文數學百科 MVP v0.8。</footer>`

  document.querySelectorAll('.tab').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'))
      document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'))
      button.classList.add('active')
      $(`[data-panel="${button.dataset.tab}"]`).classList.add('active')
    })
  })
  bindObjectNavigation()
}

async function selectObject(id, { replace = false } = {}) {
  const object = await loadObject(id)
  const evidenceObjects = await loadReferencedEvidence(object)
  state.currentId = id
  const url = new URL(window.location.href)
  url.searchParams.set('id', id)
  window.history[replace ? 'replaceState' : 'pushState']({ id }, '', url)
  renderObject(object, evidenceObjects)
  window.scrollTo({ top: 0, behavior: replace ? 'auto' : 'smooth' })
}

async function init() {
  ;[state.index, state.evidenceIndex] = await Promise.all([
    loadJson('/data/index.json', '無法讀取數學物件索引'),
    loadJson('/data/evidence/index.json', '無法讀取證據物件索引'),
  ])
  const requested = new URLSearchParams(window.location.search).get('id')
  const fallback = state.index.objects.find(entry => entry.type === 'theorem')?.id || state.index.objects[0]?.id
  const id = state.index.objects.some(entry => entry.id === requested) ? requested : fallback
  await selectObject(id, { replace: true })
}

window.addEventListener('popstate', event => {
  const id = event.state?.id || new URLSearchParams(window.location.search).get('id')
  if (id && id !== state.currentId) loadObject(id).then(async object => {
    state.currentId = id
    renderObject(object, await loadReferencedEvidence(object))
  }).catch(showError)
})

function showError(error) {
  $('#app').innerHTML = `<main class="error"><h1>載入失敗</h1><pre>${escapeHtml(error.stack || error.message)}</pre></main>`
}

init().catch(showError)
