// Тренажор „Детектив“: всяка задача идва нова от генератора (js/gen.js)

// ---------- мини-нотация -> HTML: x^2, *, #=▢, @=◯
function fm(s){
  let out = '', prev = null, i = 0;
  while (i < s.length){
    const c = s[i];
    if (c === '^'){
      let j = i + 1, sup = '';
      while (j < s.length && /[0-9]/.test(s[j])) sup += s[j++];
      if (!sup){ sup = s[j]; j++; }
      out += '<sup>' + sup + '</sup>'; i = j; prev = 'v'; continue;
    }
    if (/[a-z]/.test(c)){ out += '<i>' + c + '</i>'; prev = 'v'; }
    else if (/[0-9]/.test(c)){ out += c; prev = 'v'; }
    else if (c === '#'){ out += '<span class="bx"></span>'; prev = 'v'; }
    else if (c === '@'){ out += '<span class="ci"></span>'; prev = 'v'; }
    else if (c === '-' || c === '+' || c === '±'){
      const sym = c === '-' ? '−' : c;
      out += (prev === 'v' || prev === ')') ? '<span class="op">' + sym + '</span>' : sym; prev = 'o';
    }
    else if (c === '*' || c === '·'){ out += '·'; prev = 'o'; }
    else if (c === '=' || c === ':'){ out += '<span class="op">' + c + '</span>'; prev = 'o'; }
    else if (c === ')'){ out += ')'; prev = ')'; }
    else if (c === '('){ out += '('; prev = '('; }
    else if (c === ' '){ i++; continue; }
    else { out += c; prev = 'o'; }
    i++;
  }
  return '<span class="m">' + out + '</span>';
}
function rich(t){
  const parts = String(t).split('$');
  return parts.map((p, k) => k % 2 ? fm(p) : p.replace(/▢/g, '<span class="bx"></span>').replace(/◯/g, '<span class="ci"></span>')).join('');
}
document.querySelectorAll('.wrap p, .tool .f, .tool div, .cheat td, .cheat li').forEach(el => {
  if (el.innerHTML.includes('$')) el.innerHTML = rich(el.innerHTML);
});

const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} },
};

(function(){
  const $ = id => document.getElementById(id);
  const TOPICS = GEN.TOPICS;
  let topic = store.get('razlagane-topic', 'mix');
  if (!TOPICS[topic]) topic = 'mix';
  const solved = store.get('razlagane-solved', {});
  let P = null, si = 0, chain = [], seen = new Set(), locked = false, count = 0, wrongs = 0;

  function topicChips(){
    const total = Object.values(solved).reduce((s, n) => s + n, 0);
    $('chips').innerHTML = Object.entries(TOPICS).map(([k, tp]) => {
      const n = k === 'mix' ? total : (solved[k] || 0);
      return '<button type="button" class="chip topic' + (k === topic ? ' on' : '') + '" data-t="' + k + '" aria-pressed="' + (k === topic) + '">' +
        tp.name + (n ? '<small title="решени задачи">' + n + '</small>' : '') + '</button>';
    }).join('');
    $('chips').querySelectorAll('.chip').forEach(b => b.onclick = () => {
      topic = b.dataset.t; store.set('razlagane-topic', topic); newTask();
    });
  }
  function flow(node){
    document.querySelectorAll('#fc .nd').forEach(g => {
      const id = g.id.slice(2);
      g.classList.toggle('now', id === node);
      g.classList.toggle('seen', seen.has(id) && id !== node);
    });
  }
  function begin(){
    si = 0; locked = false; wrongs = 0;
    chain = [{e: P.t, n: 'условие'}];
    seen = new Set(['START']);
    $('lbl').textContent = 'Задача ' + count + ' · ' + P.g;
    $('big').innerHTML = fm(P.t);
    topicChips(); render();
  }
  function newTask(){ P = GEN.make(topic); count++; begin(); }

  function render(){
    $('chain').innerHTML = chain.map((c, k) => '<div class="row">' + (k ? '<span class="m">=</span>' : '') + fm(c.e) +
      (c.n ? '<span class="hand">' + rich(c.n) + '</span>' : '') + '</div>').join('');
    if (si >= P.steps.length){ finish(); return; }
    const s = P.steps[si];
    seen.add(s.node); flow(s.node);
    $('prog').textContent = 'Стъпка ' + (si + 1) + ' от ' + P.steps.length;
    $('stage').innerHTML = '<div class="q">' + rich(s.q) + '</div><div class="opts">' +
      s.opts.map((o, k) => '<button type="button" class="opt" data-k="' + k + '">' + rich(o) + '</button>').join('') +
      '</div><div class="fb" id="fb" aria-live="polite"></div>';
    $('stage').querySelectorAll('.opt').forEach(b => b.onclick = () => answer(+b.dataset.k, b));
    locked = false;
  }
  function answer(k, btn){
    if (locked) return;
    const s = P.steps[si], fb = $('fb');
    if (k !== s.ok){
      wrongs++;
      btn.classList.add('bad'); btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake');
      fb.className = 'fb bad'; fb.innerHTML = 'Не съвсем. ' + rich(s.hint);
      return;
    }
    locked = true;
    btn.classList.add('good');
    $('stage').querySelectorAll('.opt').forEach(b => b.disabled = true);
    fb.className = 'fb good'; fb.innerHTML = 'Точно! ' + (s.note ? rich(s.note) : '');
    if (s.e) chain.push({e: s.e, n: s.note || ''});
    setTimeout(() => { si++; render(); }, s.e ? 1100 : 750);
  }
  function finish(){
    seen.add('END'); flow('END');
    solved[P.topic] = (solved[P.topic] || 0) + 1; store.set('razlagane-solved', solved); topicChips();
    $('prog').textContent = 'Готово: ' + P.steps.length + ' стъпки' + (wrongs ? ', грешки: ' + wrongs : ', без грешка!');
    const ok = P.fin !== GEN.NOFACT;
    $('stage').innerHTML = '<div class="final"><div class="hand" style="color:var(--ok)">' + (ok ? 'Разложено!' : 'Хвана капана!') + '</div>' +
      (ok ? fm(P.t + '=' + P.fin) : fm(P.t) + ' <b>не се разлага</b>') +
      '<div class="check">' + (ok ? 'Проверка: ако умножим обратно, получаваме пак ' + fm(P.t) + '.' : 'Сбор на квадрати няма формула за разлагане.') + '</div></div>' +
      '<div style="margin-top:14px"><button class="btn" id="next" type="button">Нова задача</button></div>';
    $('next').onclick = newTask;
    $('next').focus({preventScroll: true});
  }
  $('restart').onclick = () => { if (P) begin(); };
  $('newtask').onclick = newTask;

  newTask();
})();
