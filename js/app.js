// Задачите идват от data/tasks.js (генерира се от tools/build_tasks.py)
const DATA = window.TASKS;

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

// ---------- състояние
let done = new Set();
try { done = new Set(JSON.parse(localStorage.getItem('razlagane-done') || '[]')); } catch(e){}
function saveDone(){ try { localStorage.setItem('razlagane-done', JSON.stringify([...done])); } catch(e){} }
let pi = 0, si = 0, chain = [], seen = new Set(), locked = false;

const $ = id => document.getElementById(id);
function chips(){
  const groups = {};
  DATA.forEach((p, k) => (groups[p.g] = groups[p.g] || []).push(k));
  $('chips').innerHTML = Object.entries(groups).map(([g, ks]) =>
    '<div class="chipgroup"><span>' + g + '</span>' + ks.map(k =>
      '<button type="button" class="chip' + (k === pi ? ' on' : '') + (done.has(k) ? ' done' : '') + '" data-k="' + k + '" aria-label="Задача ' + (k+1) + '">' + (k+1) + '</button>').join('') + '</div>').join('');
  $('chips').querySelectorAll('.chip').forEach(b => b.onclick = () => load(+b.dataset.k));
}
function flow(node){
  document.querySelectorAll('#fc .nd').forEach(g => {
    const id = g.id.slice(2);
    g.classList.toggle('now', id === node);
    g.classList.toggle('seen', seen.has(id) && id !== node);
  });
}
function load(k){
  pi = k; si = 0; locked = false;
  const p = DATA[pi];
  chain = [{e: p.t, n: 'условие'}];
  seen = new Set(['START']);
  $('lbl').textContent = 'Задача ' + (pi+1) + ' · ' + p.g;
  $('big').innerHTML = fm(p.t);
  chips(); render();
}
function render(){
  const p = DATA[pi];
  $('chain').innerHTML = chain.map((c, k) => '<div class="row">' + (k ? '<span class="m">=</span>' : '') + fm(c.e) +
    (c.n ? '<span class="hand">' + rich(c.n) + '</span>' : '') + '</div>').join('');
  if (si >= p.steps.length){ finish(); return; }
  const s = p.steps[si];
  seen.add(s.node); flow(s.node);
  $('prog').textContent = 'Стъпка ' + (si+1) + ' от ' + p.steps.length;
  $('stage').innerHTML = '<div class="q">' + rich(s.q) + '</div><div class="opts">' +
    s.opts.map((o, k) => '<button type="button" class="opt" data-k="' + k + '">' + rich(o) + '</button>').join('') +
    '</div><div class="fb" id="fb" aria-live="polite"></div>';
  $('stage').querySelectorAll('.opt').forEach(b => b.onclick = () => answer(+b.dataset.k, b));
  locked = false;
}
function answer(k, btn){
  if (locked) return;
  const s = DATA[pi].steps[si], fb = $('fb');
  if (k !== s.ok){
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
  const p = DATA[pi];
  seen.add('END'); flow('END'); done.add(pi); saveDone(); chips();
  $('prog').textContent = 'Готово: ' + p.steps.length + ' стъпки';
  const ok = p.fin !== 'не се разлага';
  $('stage').innerHTML = '<div class="final"><div class="hand" style="color:var(--ok)">Разложено!</div>' +
    (ok ? fm(p.t + '=' + p.fin) : fm(p.t) + ' <b>не се разлага</b>') +
    '<div class="check">' + (ok ? 'Проверка: ако умножим обратно, получаваме пак ' + fm(p.t) + '.' : 'Сбор на квадрати няма формула за разлагане.') + '</div></div>' +
    '<div style="margin-top:14px">' + (pi + 1 < DATA.length ? '<button class="btn" id="next" type="button">Следваща задача</button>' : '<span class="hand">Решихте всички задачи!</span>') + '</div>';
  const n = $('next'); if (n) n.onclick = () => load(pi + 1);
}
$('restart').onclick = () => load(pi);

const start = st => load(Math.min(Math.max(+(st && st.pi) || 0, 0), DATA.length - 1));
window.claude?.hot?.snapshot?.(() => ({pi}));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
