// Тест: 10 нови въпроса всеки път. Резултатът, оценката и верните отговори излизат накрая.
(function(){
  const N = 10;
  const box = document.getElementById('quiz');
  const TOPICS = GEN.TOPICS;
  let qtopic = store.get('razlagane-test-topic', 'mix');
  if (!TOPICS[qtopic]) qtopic = 'mix';
  let items = [], answers = [], qi = 0, t0 = 0, timer = null;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const clock = secs => Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
  function grade(score, total){
    const r = score / total;
    if (r >= .9) return {n: 6, name: 'Отличен'};
    if (r >= .7) return {n: 5, name: 'Много добър'};
    if (r >= .5) return {n: 4, name: 'Добър'};
    if (r >= .3) return {n: 3, name: 'Среден'};
    return {n: 2, name: 'Слаб'};
  }
  function stopTimer(){ if (timer){ clearInterval(timer); timer = null; } }

  function setup(){
    stopTimer();
    const hist = store.get('razlagane-tests', []);
    const best = {};
    hist.forEach(h => { if (!best[h.t] || h.s / h.n > best[h.t].s / best[h.t].n) best[h.t] = h; });
    box.innerHTML =
      '<p class="lead">' + N + ' въпроса, всеки път различни. Верните отговори, оценката и обясненията излизат накрая.</p>' +
      '<div class="lbl">Тема на теста</div>' +
      '<div class="chips" role="group" aria-label="Тема на теста">' + Object.entries(TOPICS).map(([k, tp]) =>
        '<button type="button" class="chip topic' + (k === qtopic ? ' on' : '') + '" data-t="' + k + '" aria-pressed="' + (k === qtopic) + '">' + tp.name +
        (best[k] ? '<small title="най-добър резултат">' + best[k].s + '/' + best[k].n + '</small>' : '') + '</button>').join('') + '</div>' +
      '<div style="margin-top:18px"><button class="btn" id="qstart" type="button">Започни теста</button></div>' +
      (hist.length ? '<div class="hist"><div class="lbl">Последни тестове</div><table>' +
        hist.slice(-5).reverse().map(h => {
          const g = grade(h.s, h.n);
          return '<tr><td>' + new Date(h.d).toLocaleDateString('bg-BG', {day: 'numeric', month: 'short'}) + '</td><td>' + esc((TOPICS[h.t] || {}).name || '') +
            '</td><td><b>' + h.s + '/' + h.n + '</b></td><td>' + g.name + ' ' + g.n + '</td><td>' + clock(h.secs) + '</td></tr>';
        }).join('') + '</table></div>' : '');
    box.querySelectorAll('.chip').forEach(b => b.onclick = () => { qtopic = b.dataset.t; store.set('razlagane-test-topic', qtopic); setup(); });
    document.getElementById('qstart').onclick = start;
  }

  function start(){
    items = []; for (let i = 0; i < N; i++) items.push(GEN.quizItem(qtopic));
    answers = Array(N).fill(null); qi = 0; t0 = Date.now();
    stopTimer();
    timer = setInterval(() => { const el = document.getElementById('qtime'); if (el) el.textContent = clock(Math.round((Date.now() - t0) / 1000)); }, 1000);
    show();
    box.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  function show(){
    const it = items[qi];
    box.innerHTML =
      '<div class="qhead"><span>Въпрос ' + (qi + 1) + ' от ' + N + ' · ' + esc(TOPICS[qtopic].name) + '</span><span id="qtime">' + clock(Math.round((Date.now() - t0) / 1000)) + '</span></div>' +
      '<div class="bar" aria-hidden="true"><i style="width:' + (qi / N * 100) + '%"></i></div>' +
      '<div class="q">' + rich(it.q) + '</div><div class="big">' + fm(it.expr) + '</div>' +
      '<div class="opts">' + it.opts.map((o, k) => '<button type="button" class="opt' + (answers[qi] === k ? ' sel' : '') + '" data-k="' + k + '" aria-pressed="' + (answers[qi] === k) + '">' + rich(o) + '</button>').join('') + '</div>' +
      '<div class="qnav"><button type="button" class="btn ghost" id="qprev"' + (qi ? '' : ' disabled') + '>Назад</button>' +
      '<button type="button" class="btn" id="qnext"' + (answers[qi] === null ? ' disabled' : '') + '>' + (qi === N - 1 ? 'Предай теста' : 'Напред') + '</button></div>';
    box.querySelectorAll('.opt').forEach(b => b.onclick = () => { answers[qi] = +b.dataset.k; show(); document.getElementById('qnext').focus({preventScroll: true}); });
    document.getElementById('qprev').onclick = () => { qi--; show(); };
    document.getElementById('qnext').onclick = () => { if (qi < N - 1){ qi++; show(); } else results(); };
  }

  function results(){
    stopTimer();
    const secs = Math.round((Date.now() - t0) / 1000);
    const score = answers.filter((a, i) => a === items[i].ok).length;
    const g = grade(score, N);
    const hist = store.get('razlagane-tests', []);
    hist.push({d: Date.now(), t: qtopic, s: score, n: N, secs});
    store.set('razlagane-tests', hist.slice(-30));
    box.innerHTML =
      '<div class="result"><div class="score">' + score + ' / ' + N + '</div>' +
      '<div class="hand grade g' + g.n + '">' + g.name + ' ' + g.n + '</div>' +
      '<div class="muted">Време ' + clock(secs) + ' · ' + esc(TOPICS[qtopic].name) + '</div></div>' +
      '<div class="pdfbox"><div><b>PDF с пълните решения</b><div class="muted">Кои отговори са верни, решение на всяка задача стъпка по стъпка, какво да упражняваш и нови задачи с отговори.</div></div>' +
        '<div class="pdfrow"><label for="qname">Име (по желание)</label><input id="qname" type="text" maxlength="60" autocomplete="name" value="' + esc(store.get('razlagane-name', '')) + '">' +
        '<button class="btn" id="qpdf" type="button">Изтегли PDF</button></div><div class="muted" id="qpdfmsg" aria-live="polite"></div></div>' +
      '<div class="qnav" style="justify-content:flex-start"><button class="btn" id="qagain" type="button">Нов тест</button><button class="btn ghost" id="qback" type="button">Друга тема</button></div>' +
      '<h3 class="revh">Отговорите</h3><ol class="review">' + items.map((it, i) => {
        const a = answers[i], ok = a === it.ok;
        return '<li class="' + (ok ? 'ok' : 'bad') + '"><div class="rq">' + rich(it.q) + ' ' + fm(it.expr) + '</div>' +
          '<div>' + (ok ? '✓ ' : '✗ ') + 'Твоят отговор: ' + rich(it.opts[a]) + '</div>' +
          (it.notes[a] ? '<div class="why">' + rich(it.notes[a]) + '</div>' : '') +
          (ok ? '' : '<div>Верен отговор: ' + rich(it.opts[it.ok]) + '</div>') +
          '<div class="why">' + rich(it.why) + '</div></li>';
      }).join('') + '</ol>';
    const report = {items, answers: answers.slice(), secs, topic: qtopic, date: Date.now()};
    const btn = document.getElementById('qpdf'), msg = document.getElementById('qpdfmsg');
    btn.onclick = async () => {
      const name = document.getElementById('qname').value.trim();
      store.set('razlagane-name', name);
      btn.disabled = true; msg.textContent = 'Подготвям PDF…';
      try {
        await REPORT.download(Object.assign({}, report, {name}));
        msg.textContent = 'Готово: файлът е в изтеглените файлове.';
      } catch(e){
        console.error(e);
        msg.textContent = 'Не успях да направя PDF. Провери интернет връзката и опитай пак.';
      }
      btn.disabled = false;
    };
    window.lastTestReport = report;   // за проверка от конзолата
    document.getElementById('qagain').onclick = start;
    document.getElementById('qback').onclick = () => { setup(); box.scrollIntoView({behavior: 'smooth', block: 'start'}); };
    box.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  setup();
})();
