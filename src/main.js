const $ = (selector, root = document) => root.querySelector(selector)
const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')

async function loadObject() {
  const indexResponse = await fetch('/data/index.json')
  if (!indexResponse.ok) throw new Error('無法讀取數學物件索引')
  const index = await indexResponse.json()
  const first = index.objects[0]
  const objectResponse = await fetch(first.path)
  if (!objectResponse.ok) throw new Error('無法讀取數學知識物件')
  return objectResponse.json()
}

function statusLabel(value) {
  const labels = {
    human_proof_available: '人工證明可用',
    not_formalized: '尚未形式化',
    finite_cases_passed: '有限案例通過',
    reference_only: '僅供參考',
  }
  return labels[value] || value
}

function renderFormula(formula) {
  return `<div class="mathml" aria-label="${escapeHtml(formula.tex)}">${formula.mathml}</div><code class="tex-source">${escapeHtml(formula.tex)}</code>`
}

function renderCode(companion) {
  return `<div class="notice warning"><strong>非同一性聲明：</strong>${escapeHtml(companion.warning)}</div>
    <pre><code>${escapeHtml(companion.source)}</code></pre>
    <dl class="definition-list">
      <div><dt>關係</dt><dd>${escapeHtml(companion.relation)}</dd></div>
      <div><dt>保存</dt><dd>${companion.non_identity.preserved.map(escapeHtml).join('、')}</dd></div>
      <div><dt>近似</dt><dd>${companion.non_identity.approximated.map(escapeHtml).join('、') || '無'}</dd></div>
      <div><dt>遺漏</dt><dd>${companion.non_identity.omitted.map(escapeHtml).join('、')}</dd></div>
    </dl>`
}

function renderObject(mko) {
  const tabs = [
    ['math', '數學'], ['explain', '解釋'], ['code', '程式碼'],
    ['evidence', '計算證據'], ['formal', '形式化'], ['ai', 'AI 結構']
  ]
  const symbols = mko.symbols.map(symbol => `
    <tr><td><code>${escapeHtml(symbol.token)}</code></td><td>${escapeHtml(symbol.role_zh)}</td><td>${escapeHtml(symbol.scope)}</td></tr>`).join('')
  const deps = mko.dependencies.map(dep => `<li><strong>${escapeHtml(dep.title_zh)}</strong>：${escapeHtml(dep.reason_zh)}</li>`).join('')
  const tests = mko.verification.evidence.tests.map(test => `
    <tr><td>${escapeHtml(test.name_zh)}</td><td>${escapeHtml(test.method)}</td><td>${escapeHtml(test.result)}</td></tr>`).join('')

  $('#app').innerHTML = `
    <header class="hero">
      <div class="hero-inner">
        <p class="eyebrow">OPEN CHINESE MATHEMATICAL ENCYCLOPEDIA · MVP 0.1</p>
        <h1>${escapeHtml(mko.titles['zh-Hant'])}</h1>
        <p class="lead">${escapeHtml(mko.summary['zh-Hant'])}</p>
        <div class="status-row">
          <span>${statusLabel(mko.proofs[0].status)}</span>
          <span>${statusLabel(mko.verification.computational_status)}</span>
          <span>${statusLabel(mko.formalization.status)}</span>
          <span>版本 ${escapeHtml(mko.version)}</span>
        </div>
      </div>
    </header>
    <main class="shell">
      <aside class="toc">
        <div class="brand">數學知識物件</div>
        <code>${escapeHtml(mko.id)}</code>
        <hr />
        <strong>前置知識</strong>
        <ul>${deps}</ul>
        <hr />
        <strong>來源</strong>
        <p>${escapeHtml(mko.provenance.note_zh)}</p>
      </aside>
      <article class="article">
        <nav class="tabs" aria-label="知識層切換">
          ${tabs.map(([id, label], i) => `<button class="tab ${i === 0 ? 'active' : ''}" data-tab="${id}">${label}</button>`).join('')}
        </nav>

        <section class="panel active" data-panel="math">
          <h2>定理敘述</h2>
          <p>${escapeHtml(mko.statement['zh-Hant'])}</p>
          <div class="formula-card">${renderFormula(mko.formula)}</div>
          <h3>成立條件</h3>
          <ul>${mko.assumptions.map(x => `<li>${escapeHtml(x['zh-Hant'])}</li>`).join('')}</ul>
          <h3>符號表</h3>
          <table><thead><tr><th>符號</th><th>角色</th><th>作用域</th></tr></thead><tbody>${symbols}</tbody></table>
          <h3>人工證明摘要</h3>
          <p>${escapeHtml(mko.proofs[0].summary_zh)}</p>
        </section>

        <section class="panel" data-panel="explain">
          <h2>直觀解釋</h2>
          ${mko.explanation.paragraphs_zh.map(p => `<p>${escapeHtml(p)}</p>`).join('')}
          <div class="notice"><strong>常見誤解：</strong>${escapeHtml(mko.explanation.common_misconception_zh)}</div>
        </section>

        <section class="panel" data-panel="code">
          <h2>Python 計算伴隨</h2>
          ${renderCode(mko.computational_companions[0])}
        </section>

        <section class="panel" data-panel="evidence">
          <h2>有限計算證據</h2>
          <div class="notice warning"><strong>重要：</strong>${escapeHtml(mko.verification.warning_zh)}</div>
          <table><thead><tr><th>檢查</th><th>方法</th><th>結果</th></tr></thead><tbody>${tests}</tbody></table>
          <h3>重播</h3>
          <pre><code>npm run verify:python\nnpm run verify:felra</code></pre>
          <p>FELRA 專案：<code>${escapeHtml(mko.verification.felra_project)}</code></p>
        </section>

        <section class="panel" data-panel="formal">
          <h2>形式化狀態</h2>
          <dl class="definition-list">
            <div><dt>狀態</dt><dd>${statusLabel(mko.formalization.status)}</dd></div>
            <div><dt>目標系統</dt><dd>${escapeHtml(mko.formalization.target_systems.join('、'))}</dd></div>
            <div><dt>待辦</dt><dd>${escapeHtml(mko.formalization.next_obligation_zh)}</dd></div>
          </dl>
          <p>人工證明存在，不代表本專案已完成機器可檢查的形式證明。</p>
        </section>

        <section class="panel" data-panel="ai">
          <h2>AI 原始結構</h2>
          <p>下列資料與 MCP 回傳使用同一份 Canonical MKO。</p>
          <pre><code>${escapeHtml(JSON.stringify(mko, null, 2))}</code></pre>
        </section>
      </article>
    </main>
    <footer>資料層、程式層、證據層與證明層彼此分離。開源中文數學百科 MVP。</footer>`

  document.querySelectorAll('.tab').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'))
      document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'))
      button.classList.add('active')
      $(`[data-panel="${button.dataset.tab}"]`).classList.add('active')
    })
  })
}

loadObject().then(renderObject).catch(error => {
  $('#app').innerHTML = `<main class="error"><h1>載入失敗</h1><pre>${escapeHtml(error.stack || error.message)}</pre></main>`
})
