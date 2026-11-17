// Генератор на задачи. Всяко извикване на GEN.make(тема) дава нова задача
// със стъпки по блок-схемата. Преди да я покажем, проверяваме с poly.js,
// че всеки междинен израз е равен на началния (иначе я хвърляме и правим нова).
(function(){
  // ---------- случайност и числа
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const weighted = list => { let r = Math.random() * list.reduce((s, x) => s + x[1], 0); for (const [it, w] of list){ if ((r -= w) < 0) return it; } return list[list.length - 1][0]; };
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const gcdAll = arr => arr.reduce((g, x) => gcd(g, x), 0);
  const isSq = n => n >= 0 && Number.isInteger(Math.sqrt(n));
  const flip = s => s === '+' ? '-' : '+';
  const ORDER = 'abcmnpqtuvwxyz';
  const LET = ['x', 'y', 'a', 'b', 'm', 'n', 'p'];

  // ---------- низове в мини-нотация
  const pw = (v, e) => !v || e === 0 ? '' : e === 1 ? v : v + '^' + e;
  const co = (c, m) => !m ? String(c) : c === 1 ? m : c === -1 ? '-' + m : c + m;
  const sum = (...ts) => ts.filter(t => t && t !== '0').map((t, i) => i && t[0] !== '-' ? '+' + t : t).join('') || '0';
  const par = s => '(' + s + ')';
  // едночлен c·v^e
  const M = (c, v = '', e = v ? 1 : 0) => ({c, v, e: v ? e : 0});
  const ms = m => co(m.c, pw(m.v, m.e));
  const mpow = (m, k) => M(m.c ** k, m.v, m.e * k);
  // „9x^2 = (3x)^2“: как да запишем ▢^k
  const powEq = (m, k) => { const s = ms(m); return /^([a-z]|\d+)$/.test(s) ? s + '^' + k : par(s) + '^' + k; };
  const eqP = (T, m, k) => /^[a-z]$/.test(ms(m)) ? T : T + '=' + powEq(m, k);
  const terms = s => parsePoly(s).terms();

  // ---------- стъпки
  const YN = ['да', 'не'];
  function choice(node, q, correct, wrongs, extra){
    const opts = [correct];
    for (const w of shuffle(wrongs)) if (w && !opts.includes(w) && opts.length < 4) opts.push(w);
    const sh = shuffle(opts);
    return Object.assign({node, q, opts: sh, ok: sh.indexOf(correct)}, extra || {});
  }
  // избор между изрази: грешните не трябва да са равни на верния
  function exprChoice(node, q, correct, wrongs, extra){
    const good = parsePoly(correct);
    const ws = wrongs.filter(w => { try { return w && !parsePoly(w).eq(good); } catch(e){ return false; } });
    const st = choice(node, q, '$' + correct + '$', ws.map(w => '$' + w + '$'), extra);
    return st;
  }
  const Q1 = (yes, hint, note) => ({node: 'Q1', q: 'Има ли множител, който е във <b>всеки</b> член?', opts: YN, ok: yes ? 0 : 1, hint, note});
  const A1 = (correct, wrongs, e, hint, note) => choice('A1', 'Кой е общият множител?', '$' + correct + '$', wrongs.filter(Boolean).map(w => '$' + w + '$'), {e, hint, note});
  const Q2 = (what, n, hint) => ({node: 'Q2', q: 'Колко члена има ' + what + '?', opts: ['2', '3', '4'], ok: [2, 3, 4].indexOf(n), hint});
  const B2OPTS = ['разлика на квадрати', 'сбор на квадрати', 'разлика на кубове', 'сбор на кубове'];
  const B2type = (ok, hint, note) => ({node: 'B2', q: 'Какво виждаш?', opts: B2OPTS, ok, hint, note});
  const Q5 = (yes, what, hint, note) => ({node: 'Q5', q: 'Разлага ли се още нещо? Погледни ' + what + '.', opts: YN, ok: yes ? 0 : 1, hint, note});
  const pair = (b, c) => '▢ = $' + b + '$, ◯ = $' + c + '$';
  function whichPair(node, q, B, C, wrongPairs, extra){
    let ws = wrongPairs.filter(([b, c]) => !(b === B && c === C)).map(([b, c]) => pair(b, c));
    ws = [...new Set(ws)];
    if (ws.length < 2){
      // при ◯ = 1 повечето грешки съвпадат: добавяме още две правдоподобни
      if (/^\d+$/.test(C)) ws.push(pair(B, String(2 * C)));
      if (/^[a-z]$/.test(B)) ws.push(pair('2' + B, C));
    }
    return choice(node, q, pair(B, C), ws, extra);
  }
  // три стъпки на групирането: как групираме, изнасяме от всяка група, изнасяме общата скоба
  function groupSteps(ts, badGroupHint){
    const [t1, t2, t3, t4] = ts;
    return choice('B4', 'Как да групираме?', '$(' + sum(t1, t2) + ')+(' + sum(t3, t4) + ')$', ['$(' + sum(t1, t4) + ')+(' + sum(t2, t3) + ')$'], {hint: badGroupHint});
  }

  // =====================================================================
  // 1. Общ множител
  function cfMono(){
    const v = pick(['x', 'y', 'a', 'b', 'm', 'n']);
    const d = pick([1, 2, 2, 3, 3, 4, 5, 6, 7]);
    let e = pick([0, 1, 1, 2]);
    if (d === 1 && e === 0) e = 1;
    let inner;
    if (Math.random() < .5){
      const k = pick([1, 1, 2]), p = R(1, 7), q = R(1, 9) * (k === 2 ? 1 : pick([1, -1]));
      if (gcd(p, q) !== 1) return null;
      inner = [M(p, v, k), M(q)];
    } else {
      const p = R(1, 5), q = R(1, 9) * pick([1, -1]), r = R(1, 9) * pick([1, -1]);
      if (gcdAll([p, q, r]) !== 1) return null;
      const D = q * q - 4 * p * r;
      if (isSq(D)) return null;                     // скобата не бива да се разлага още
      inner = [M(p, v, 2), M(q, v, 1), M(r)];
    }
    const G = ms(M(d, v, e)), innerS = sum(...inner.map(ms));
    const fin = G + par(innerS), t = sum(...terms(fin));
    const coefs = inner.map(m => Math.abs(m.c * d));
    const maxC = Math.max(...coefs);
    const wrongInner = [
      sum(...inner.map((m, i) => i === inner.length - 1 ? ms(M(-m.c, m.v, m.e)) : ms(m))),
      d > 1 ? sum(...inner.map((m, i) => i === 0 ? ms(M(m.c * d, m.v, m.e)) : ms(m))) : '',
      sum(...inner.map((m, i) => i === 0 ? ms(M(m.c, m.v, m.e + 1)) : ms(m))),
      Math.abs(inner[inner.length - 1].c) === 1 ? sum(...inner.slice(0, -1).map(ms)) : '',
    ].filter(Boolean);
    return {
      t, fin, path: ['cf'],
      wrong: wrongInner.map(w => G + par(w)),
      steps: [
        Q1(true, d > 1 ? 'Числата ' + coefs.join(', ') + ' се делят на ' + d + (e ? ', а $' + v + '$ има във всеки член.' : '.') : '$' + v + '$ има във всеки член.'),
        A1(G, [
          e && d > 1 ? String(d) : '', e && d > 1 ? pw(v, e) : '', co(d, pw(v, e + 1)),
          maxC !== d ? co(maxC, pw(v, e)) : '', e >= 2 ? co(d, pw(v, e - 1)) : '', !e ? co(d, v) : '', !e ? co(d, pw(v, 2)) : '', !e ? v : '',
        ], fin,
          (d > 1 ? 'НОД(' + coefs.join(', ') + ') = ' + d + '.' : 'Числата нямат общ делител, по-голям от 1.') +
          (e ? ' Буквата $' + v + '$ е във всеки член, най-малката степен е $' + pw(v, e) + '$.' : ' Буквата $' + v + '$ я няма във всеки член, затова изнасяме само числото.') +
          ' Значи $' + G + '$.',
          'делим всеки член на $' + G + '$'),
        Q5(false, 'скобата $(' + innerS + ')$', 'В скобата няма общ множител и тя не е по никоя формула.', 'скобата не се разлага'),
      ],
    };
  }

  function cfBracket(){
    const [L, v] = shuffle(['a', 'b', 'm', 'n', 'x', 'y']).slice(0, 2);
    const c = R(1, 9), s1 = pick(['+', '-']), br = v + s1 + c;
    const p = R(1, 9), q = R(1, 9), s2 = pick(['+', '-']);
    if (gcd(p, q) !== 1) return null;
    const L2 = Math.random() < .3 ? pick(['x', 'y', 'a', 'b'].filter(z => z !== L && z !== v)) : '';
    const A = co(p, L), B = co(q, L2);
    const t = A + par(br) + s2 + (B === '1' ? '' : B) + par(br);
    const fin = par(br) + par(A + s2 + B);
    return {
      t, fin, path: ['cf'],
      wrong: [par(br) + par(A + flip(s2) + B), par(v + flip(s1) + c) + par(A + s2 + B), par(br) + '·' + A + s2 + B],
      steps: [
        Q1(true, 'Виж скобата $(' + br + ')$: тя е и в двата члена!'),
        A1(par(br), [A, B === '1' ? '' : B, L, par(v + flip(s1) + c)], fin, 'Общият множител може да е цяла скоба: $(' + br + ')$ се повтаря.', 'изнасяме скобата като буква'),
        Q5(false, 'двете скоби', 'Нито една от скобите не се разлага.'),
      ],
    };
  }

  // =====================================================================
  // 2. Формули
  function q1NoCommon(box, circ){
    const lt = [box, circ].find(m => m.v), nm = [box, circ].find(m => !m.v);
    const A = box.c ** 2, B = circ.c ** 2;
    let s = nm ? '$' + ms(mpow(nm, 2)) + '$ няма $' + lt.v + '$' : 'Двата члена нямат обща буква';
    if (A > 1 && B > 1) s += ', а ' + A + ' и ' + B + ' нямат общ делител, по-голям от 1';
    return s + '.';
  }

  function dsq(){
    const v = pick(LET), a = pick([1, 1, 2, 3, 4, 5, 6, 7]);
    let box, circ;
    if (Math.random() < .25){
      const w = pick(LET.filter(z => z !== v)), b = R(1, 7);
      if (gcd(a, b) !== 1) return null;
      box = M(a, v); circ = M(b, w);
    } else {
      const b = R(1, 12);
      if (gcd(a, b) !== 1) return null;
      box = M(a, v); circ = M(b);
    }
    if (Math.random() < .15) [box, circ] = [circ, box];
    const B = ms(box), C = ms(circ), T1 = ms(mpow(box, 2)), T2 = ms(mpow(circ, 2));
    const t = T1 + '-' + T2, fin = '(' + B + '-' + C + ')(' + B + '+' + C + ')';
    return {
      t, fin, path: ['dsq'],
      wrong: ['(' + B + '-' + C + ')^2', '(' + B + '+' + C + ')^2', '(' + T1 + '-' + T2 + ')(' + T1 + '+' + T2 + ')', '(' + C + '-' + B + ')(' + C + '+' + B + ')'],
      steps: [
        Q1(false, q1NoCommon(box, circ)),
        Q2('изразът', 2, 'Брои събираемите: $' + T1 + '$ и $-' + T2 + '$.'),
        B2type(0, 'И двата члена са квадрати ($' + eqP(T1, box, 2) + '$, $' + eqP(T2, circ, 2) + '$), а между тях има минус.'),
        whichPair('B2', 'Кои са ▢ и ◯?', B, C, [[T1, T2], [B, T2], [T1, C], [C, B]],
          {e: fin, hint: 'Търсим кое на квадрат дава $' + T1 + '$: това е $' + B + '$. А $' + T2 + '$ е квадрат на $' + C + '$. ▢ е първият член, ◯ е вторият.', note: '▢² − ◯² = (▢ − ◯)(▢ + ◯)'}),
        Q5(false, 'скобите', 'И двете скоби имат по 2 члена, но не са квадрати с минус между тях.'),
      ],
    };
  }

  function psq(){
    const a = pick([1, 1, 1, 2, 3, 4, 5]), s = pick(['+', '-']);
    let box, circ;
    if (Math.random() < .25){
      const [v, w] = shuffle(LET).slice(0, 2).sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y));
      const b = R(1, 5);
      if (gcd(a, b) !== 1) return null;
      box = M(a, v); circ = M(b, w);
    } else {
      const b = R(1, 9);
      if (gcd(a, b) !== 1) return null;
      box = M(a, pick(LET)); circ = M(b);
    }
    const B = ms(box), C = ms(circ), T1 = ms(mpow(box, 2)), T3 = ms(mpow(circ, 2));
    const mid = co(2 * box.c * circ.c, box.v + circ.v), sMid = (s === '-' ? '-' : '') + mid;
    const fin = '(' + B + s + C + ')^2', t = sum(...terms(fin));
    return {
      t, fin, path: ['psq'],
      wrong: ['(' + B + flip(s) + C + ')^2', '(' + B + '-' + C + ')(' + B + '+' + C + ')', '(' + B + s + T3 + ')^2', '(' + T1 + s + T3 + ')^2'],
      steps: [
        Q1(false, circ.v ? 'Няма буква, която е във всеки член, а числата нямат общ делител, по-голям от 1.' : '$' + T3 + '$ няма $' + box.v + '$.'),
        Q2('изразът', 3, '$' + T1 + '$, $' + sMid + '$ и $' + T3 + '$: три члена.'),
        whichPair('B3', 'Крайните членове са квадрати. Кои са ▢ и ◯?', B, C, [[B, T3], [T1, C], [mid, C]],
          {hint: '$' + T1 + '$ е квадрат на $' + B + '$, а $' + T3 + '$ е квадрат на $' + C + '$.'}),
        {node: 'B3', q: 'Средният член равен ли е на $2·' + B + '·' + C + '$?', opts: YN, ok: 0,
          hint: '$2·' + B + '·' + C + '=' + mid + '$. В израза средният е $' + sMid + '$: съвпада (без знака).', note: 'точен квадрат!'},
        exprChoice('B3', 'Кой е отговорът?', fin, ['(' + B + flip(s) + C + ')^2', '(' + B + s + T3 + ')^2', '(' + B + '-' + C + ')(' + B + '+' + C + ')'],
          {e: fin, hint: 'Знакът в скобата е знакът на средния член: $' + sMid + '$, значи ' + (s === '-' ? 'минус' : 'плюс') + '.'}),
        Q5(false, '$' + fin + '$', '$' + B + s + C + '$ не се разлага.'),
      ],
    };
  }

  function cube(){
    const v = pick(LET), a = pick([1, 1, 2, 3, 4]), b = R(1, 5);
    if (gcd(a, b) !== 1) return null;
    const s = pick(['+', '-']), box = M(a, v), circ = M(b);
    const B = ms(box), C = ms(circ), T1 = ms(mpow(box, 3)), T2 = ms(mpow(circ, 3));
    const B2 = ms(mpow(box, 2)), C2 = ms(mpow(circ, 2)), mid = ms(M(a * b, v));
    const second = s === '+' ? B2 + '-' + mid + '+' + C2 : B2 + '+' + mid + '+' + C2;
    const t = T1 + s + T2, fin = '(' + B + s + C + ')(' + second + ')';
    return {
      t, fin, path: ['cube'],
      wrong: ['(' + B + s + C + ')(' + B2 + s + mid + '+' + C2 + ')', '(' + B + flip(s) + C + ')(' + second + ')', '(' + B + s + C + ')^3',
        '(' + B + s + C + ')(' + B2 + flip(s) + ms(M(2 * a * b, v)) + '+' + C2 + ')'],
      steps: [
        Q1(false, '$' + T2 + '$ няма $' + v + '$' + (a > 1 && b > 1 ? ', а ' + a ** 3 + ' и ' + b ** 3 + ' нямат общ делител.' : '.')),
        Q2('изразът', 2, '$' + T1 + '$ и $' + (s === '-' ? '-' : '') + T2 + '$.'),
        B2type(s === '-' ? 2 : 3, '$' + eqP(T1, box, 3) + '$ и $' + eqP(T2, circ, 3) + '$: кубове, с ' + (s === '-' ? 'минус' : 'плюс') + ' между тях.'),
        whichPair('B2', 'Кои са ▢ и ◯?', B, C, [[T1, T2], [B, C2], [B2, C]],
          {e: fin, hint: 'Кое на куб дава $' + T1 + '$? Това е $' + B + '$. А $' + T2 + '$ е куб на $' + C + '$.',
            note: s === '+' ? '▢³ + ◯³ = (▢ + ◯)(▢² − ▢◯ + ◯²)' : '▢³ − ◯³ = (▢ − ◯)(▢² + ▢◯ + ◯²)'}),
        Q5(false, 'втората скоба', '$' + second + '$ е „непълен квадрат“: не се разлага.'),
      ],
    };
  }

  function ssq(){
    const v = pick(LET), a = pick([1, 1, 2, 3, 4, 5]), b = R(1, 10);
    if (gcd(a, b) !== 1) return null;
    const box = M(a, v), circ = M(b);
    const B = ms(box), C = ms(circ), T1 = ms(mpow(box, 2)), T2 = ms(mpow(circ, 2));
    return {
      t: T1 + '+' + T2, fin: 'не се разлага', path: ['none'],
      wrong: ['(' + B + '+' + C + ')^2', '(' + B + '-' + C + ')(' + B + '+' + C + ')', '(' + B + '-' + C + ')^2'],
      steps: [
        Q1(false, '$' + T2 + '$ няма $' + v + '$.'),
        Q2('изразът', 2, '$' + T1 + '$ и $' + T2 + '$.'),
        B2type(1, 'Двата члена са квадрати ($' + eqP(T1, box, 2) + '$, $' + eqP(T2, circ, 2) + '$), но между тях има <b>плюс</b>.', 'сборът на квадрати НЕ се разлага!'),
      ],
    };
  }

  // =====================================================================
  // 3. Групиране
  function gLetters(){
    const [u, w] = pick([['x', 'y'], ['p', 'q'], ['x', 'z'], ['m', 'n']]);
    const L = pick(['a', 'b', 'm', 'n'].filter(z => z !== u && z !== w));
    const c = R(2, 9), s1 = pick(['+', '-']), s2 = pick(['+', '-']);
    const br = u + s1 + w, fin = par(br) + par(L + s2 + c);
    const ts = terms(fin), t = sum(...ts);
    const g1 = L + par(br), g2 = s2 + c + par(br), step2 = g1 + g2;
    return {
      t, fin, path: ['group'],
      wrong: [par(br) + par(L + flip(s2) + c), par(u + flip(s1) + w) + par(L + s2 + c), par(br) + '·' + c + L, par(L + s1 + w) + par(u + s2 + c)],
      steps: [
        Q1(false, 'Няма буква или число, което е във всичките 4 члена.'),
        Q2('изразът', 4, '$' + ts.join('$, $') + '$.'),
        groupSteps(ts, 'Групирай членове, които имат общ множител: $' + ts[0] + '$ и $' + ts[1] + '$ имат $' + L + '$.'),
        exprChoice('B4', 'Изнеси общ множител от всяка група.', step2,
          [g1 + s2 + c + par(u + flip(s1) + w), L + par(u + s1 + L + w) + g2],
          {e: step2, hint: 'От $' + sum(ts[0], ts[1]) + '$ изнасяме $' + L + '$, остава $(' + br + ')$. От $' + sum(ts[2], ts[3]) + '$ изнасяме $' + (s2 === '-' ? '-' : '') + c + '$.',
            note: 'скобите са еднакви: $(' + br + ')$'}),
        exprChoice('B4', 'Изнеси общата скоба.', fin, [par(br) + par(L + flip(s2) + c), par(L + s2 + c) + '+' + par(br)],
          {e: fin, hint: 'Скобата $(' + br + ')$ се повтаря, изнасяме я. Остава $(' + L + s2 + c + ')$.'}),
        Q5(false, 'скобите', 'Нито една скоба не се разлага.'),
      ],
    };
  }

  function gPoly(){
    const v = pick(['x', 'y', 'a', 'm']), k = pick([1, 1, 1, 2, 3]), p = R(1, 9) * pick([1, -1]);
    if (gcd(k, p) !== 1) return null;
    const neg = Math.random() < .35;
    const q = neg ? pick([2, 3, 5, 6, 7, 8, 10, 11]) : R(1, 9);
    const lin = sum(co(k, v), String(p)), quad = v + '^2' + (neg ? '-' : '+') + q;
    const fin = par(lin) + par(quad), ts = terms(fin), t = sum(...ts);
    const qf = co(neg ? -q : q, par(lin));
    const step2 = v + '^2' + par(lin) + (neg ? '' : '+') + qf;
    const linFlip = sum(co(k, v), String(-p));
    return {
      t, fin, path: ['group'],
      wrong: [par(lin) + par(v + '^2' + (neg ? '+' : '-') + q), par(linFlip) + par(quad), par(lin) + '·' + v + '^2' + (neg ? '-' : '+') + q],
      steps: [
        Q1(false, '$' + ts[3] + '$ няма $' + v + '$.'),
        Q2('изразът', 4, '$' + ts.join('$, $') + '$.'),
        groupSteps(ts, 'Така двете скоби няма да станат еднакви. Опитай първите два и последните два члена.'),
        exprChoice('B4', 'Изнеси общ множител от всяка група.', step2,
          [v + par(lin) + (neg ? '' : '+') + qf, v + '^2' + par(lin) + (neg ? '' : '+') + co(neg ? -q : q, par(linFlip))],
          {e: step2, hint: 'От $' + sum(ts[0], ts[1]) + '$ изнасяме $' + v + '^2$ (най-малката степен). От $' + sum(ts[2], ts[3]) + '$ изнасяме $' + (neg ? -q : q) + '$.',
            note: 'еднакви скоби: $(' + lin + ')$'}),
        exprChoice('B4', 'Изнеси общата скоба.', fin, [par(lin) + par(v + '^2' + (neg ? '+' : '-') + q), par(quad) + '+' + par(lin)],
          {e: fin, hint: 'Скобата $(' + lin + ')$ се повтаря. Остава $' + quad + '$.'}),
        Q5(false, 'скобата $(' + quad + ')$', neg ? '$' + quad + '$: ' + q + ' не е квадрат на цяло число, затова не се разлага.' : '$' + quad + '$ е сбор: не се разлага.'),
      ],
    };
  }

  function gTwo(){
    const [u, w] = pick([['a', 'b'], ['m', 'n'], ['x', 'y'], ['a', 'x'], ['b', 'y']]);
    const p = R(1, 9) * pick([1, -1]), q = R(1, 9) * pick([1, -1]);
    if (p === q) return null;
    const wp = sum(w, String(p)), uq = sum(u, String(q));
    const fin = par(wp) + par(uq), ts = terms(fin), t = sum(...ts);
    const step2 = u + par(wp) + (q > 0 ? '+' : '') + co(q, par(wp));
    const wFlip = sum(w, String(-p));
    let factorStep;
    if (q < 0){
      factorStep = choice('B4', 'Какво изнасяме от $' + sum(ts[2], ts[3]) + '$, за да получим същата скоба $(' + wp + ')$?',
        '$' + q + '$, получаваме $' + co(q, par(wp)) + '$',
        ['$' + (-q) + '$, получаваме $' + co(-q, par(sum('-' + w, String(-p)))) + '$', '$' + q + '$, получаваме $' + co(q, par(wFlip)) + '$'],
        {e: step2, hint: 'Изнасяме <b>минус</b> ' + (-q) + ': знаците в скобата се сменят, $' + sum(ts[2], ts[3]) + '=' + co(q, par(wp)) + '$.', note: 'еднакви скоби: $(' + wp + ')$'});
    } else {
      factorStep = exprChoice('B4', 'Изнеси общ множител от всяка група.', step2,
        [u + par(wp) + '+' + co(q, par(wFlip)), u + par(wFlip) + '+' + co(q, par(wp))],
        {e: step2, hint: 'От $' + sum(ts[0], ts[1]) + '$ изнасяме $' + u + '$, а от $' + sum(ts[2], ts[3]) + '$ изнасяме $' + q + '$.', note: 'еднакви скоби: $(' + wp + ')$'});
    }
    return {
      t, fin, path: ['group'],
      wrong: [par(wp) + par(sum(u, String(-q))), par(sum(u, String(p))) + par(sum(w, String(q))), par(wFlip) + par(uq)],
      steps: [
        Q1(false, '$' + ts[3] + '$ няма буква.'),
        Q2('изразът', 4, '$' + ts.join('$, $') + '$.'),
        groupSteps(ts, 'Така няма да се получат еднакви скоби. Вземи първите два и последните два члена.'),
        factorStep,
        exprChoice('B4', 'Изнеси общата скоба.', fin, [par(wp) + par(sum(u, String(-q))), par(sum(u, String(p))) + par(sum(w, String(q)))],
          {e: fin, hint: 'Скобата $(' + wp + ')$ се повтаря. Остава $(' + uq + ')$.'}),
        Q5(false, 'скобите', 'Готово: нищо не се разлага.'),
      ],
    };
  }

  // =====================================================================
  // 4. Комбинирани: няколко начина един след друг
  function commonFactor(k, v, e, coefs){
    const G = ms(M(k, v, e));
    const hintQ1 = k > 1 ? 'Числата ' + coefs.join(', ') + ' се делят на ' + k + (e ? ', а $' + v + '$ има във всеки член.' : '.') : '$' + v + '$ има във всеки член.';
    const hintA1 = (k > 1 ? 'НОД(' + coefs.join(', ') + ') = ' + k + '.' : '') +
      (e ? ' Буквата $' + v + '$ е във всеки член, най-малката степен е $' + pw(v, e) + '$.' : ' Буквата $' + v + '$ я няма във всеки член, затова изнасяме само $' + k + '$.');
    return {G, hintQ1, hintA1};
  }

  function cDsq(){
    const v = pick(LET), k = pick([1, 2, 2, 3, 3, 4, 5, 6]);
    let e = pick([0, 1, 1]); if (k === 1 && e === 0) e = 1;
    const a = pick([1, 1, 1, 2, 3]), b = R(1, 7);
    if (gcd(a, b) !== 1) return null;
    const box = M(a, v), circ = M(b);
    const B = ms(box), C = ms(circ), T1 = ms(mpow(box, 2)), T2 = ms(mpow(circ, 2));
    const inner = T1 + '-' + T2;
    const {G, hintQ1, hintA1} = commonFactor(k, v, e, [k * a * a, k * b * b]);
    const mid = G + par(inner), fin = G + '(' + B + '-' + C + ')(' + B + '+' + C + ')';
    return {
      t: sum(...terms(mid)), fin, partial: mid, path: ['cf', 'dsq'],
      wrong: ['(' + B + '-' + C + ')(' + B + '+' + C + ')', G + '(' + B + '-' + C + ')^2', G + '(' + B + '+' + C + ')^2', G + '(' + T1 + '-' + T2 + ')(' + T1 + '+' + T2 + ')'],
      steps: [
        Q1(true, hintQ1),
        A1(G, [e && k > 1 ? String(k) : '', e && k > 1 ? pw(v, e) : '', co(k, pw(v, e + 1)), a > 1 ? co(k * a * a, pw(v, e)) : '', co(k * b * b, pw(v, e)), co(k, pw(v, e + 2)), e ? '' : v], mid, hintA1),
        Q5(true, 'скобата $(' + inner + ')$', '$' + inner + '$: два квадрата с минус!'),
        Q2('скобата $(' + inner + ')$', 2, '$' + T1 + '$ и $-' + T2 + '$.'),
        B2type(0, '$' + eqP(T1, box, 2) + '$ и $' + eqP(T2, circ, 2) + '$ са квадрати, с минус между тях.'),
        whichPair('B2', 'Кои са ▢ и ◯?', B, C, [[B, T2], [T1, C], [T1, T2]], {e: fin, hint: '$' + eqP(T1, box, 2) + '$ и $' + eqP(T2, circ, 2) + '$.'}),
        Q5(false, 'скобите', 'Всяка скоба е с 2 члена, които не са квадрати с минус.'),
      ],
    };
  }

  function cPsq(){
    const v = pick(LET), k = pick([2, 3, 4, 5]), e = pick([0, 0, 1]);
    const a = pick([1, 1, 2, 3]), b = R(1, 6);
    if (gcd(a, b) !== 1) return null;
    const s = pick(['+', '-']), box = M(a, v), circ = M(b);
    const B = ms(box), C = ms(circ), T1 = ms(mpow(box, 2)), T3 = ms(mpow(circ, 2));
    const midT = ms(M(2 * a * b, v)), sMid = (s === '-' ? '-' : '') + midT;
    const inner = T1 + s + midT + '+' + T3;
    const {G, hintQ1, hintA1} = commonFactor(k, v, e, [k * a * a, k * 2 * a * b, k * b * b]);
    const mid = G + par(inner), fin = G + '(' + B + s + C + ')^2';
    return {
      t: sum(...terms(mid)), fin, partial: mid, path: ['cf', 'psq'],
      wrong: [G + '(' + B + flip(s) + C + ')^2', '(' + B + s + C + ')^2', G + '(' + B + '-' + C + ')(' + B + '+' + C + ')'],
      steps: [
        Q1(true, hintQ1),
        A1(G, [e ? String(k) : co(k, v), co(k, pw(v, e + 1)), a > 1 ? co(k * a * a, pw(v, e)) : '', String(2 * k)], mid, hintA1),
        Q5(true, 'скобата $(' + inner + ')$', 'Три члена, крайните са квадрати: провери средния.'),
        Q2('скобата $(' + inner + ')$', 3, '$' + T1 + '$, $' + sMid + '$, $' + T3 + '$.'),
        whichPair('B3', 'Кои са ▢ и ◯?', B, C, [[B, T3], [T1, C]], {hint: '$' + T1 + '$ е квадрат на $' + B + '$, а $' + eqP(T3, circ, 2) + '$.'}),
        {node: 'B3', q: 'Средният член равен ли е на $2·' + B + '·' + C + '$?', opts: YN, ok: 0, hint: '$2·' + B + '·' + C + '=' + midT + '$. Съвпада.'},
        exprChoice('B3', 'Кой е отговорът?', fin, [G + '(' + B + flip(s) + C + ')^2', '(' + B + s + C + ')^2'],
          {e: fin, hint: 'Средният член е $' + sMid + '$: ' + (s === '-' ? 'минус' : 'плюс') + '. Не забравяй $' + G + '$ отпред!'}),
        Q5(false, 'резултата', 'Готово.'),
      ],
    };
  }

  function cCube(){
    const v = pick(LET), k = pick([2, 3, 4, 5]), e = pick([0, 0, 1]), b = R(1, 4), s = pick(['+', '-']);
    const inner = v + '^3' + s + b ** 3;
    const {G, hintQ1, hintA1} = commonFactor(k, v, e, [k, k * b ** 3]);
    const second = s === '+' ? v + '^2-' + co(b, v) + '+' + b * b : v + '^2+' + co(b, v) + '+' + b * b;
    const mid = G + par(inner), fin = G + '(' + v + s + b + ')(' + second + ')';
    return {
      t: sum(...terms(mid)), fin, partial: mid, path: ['cf', 'cube'],
      wrong: ['(' + v + s + b + ')(' + second + ')', G + '(' + v + flip(s) + b + ')(' + second + ')', G + '(' + v + s + b + ')(' + v + '^2' + s + co(b, v) + '+' + b * b + ')', G + '(' + v + s + b + ')^3'],
      steps: [
        Q1(true, hintQ1),
        A1(G, [e ? String(k) : co(k, v), co(k, pw(v, e + 1)), e ? pw(v, e) : String(k * b ** 3), co(k, pw(v, e + 3)), e ? '' : v], mid, hintA1),
        Q5(true, 'скобата $(' + inner + ')$', '$' + inner + '$: ' + (s === '+' ? 'сбор' : 'разлика') + ' на кубове!'),
        Q2('скобата $(' + inner + ')$', 2, '$' + v + '^3$ и $' + (s === '-' ? '-' : '') + b ** 3 + '$.'),
        B2type(s === '-' ? 2 : 3, '$' + b ** 3 + '=' + b + '^3$: кубове, с ' + (s === '-' ? 'минус' : 'плюс') + ' между тях.'),
        whichPair('B2', 'Кои са ▢ и ◯?', v, String(b), [[v, String(b ** 3)], [v + '^3', String(b)], [v, String(b * b)]],
          {e: fin, hint: 'Кое на куб дава $' + v + '^3$? Това е $' + v + '$. А $' + b + '^3=' + b ** 3 + '$.',
            note: s === '+' ? '▢³ + ◯³ = (▢ + ◯)(▢² − ▢◯ + ◯²)' : '▢³ − ◯³ = (▢ − ◯)(▢² + ▢◯ + ◯²)'}),
        Q5(false, 'втората скоба', '$' + second + '$ е „непълен квадрат“: не се разлага.'),
      ],
    };
  }

  function cGroupDsq(){
    const v = pick(['x', 'y', 'a', 'm']), p = R(1, 6) * pick([1, -1]), r = R(1, 5);
    if (Math.abs(p) === r) return null;
    const lin = sum(v, String(p)), quad = v + '^2-' + r * r, linFlip = sum(v, String(-p));
    const mid = par(lin) + par(quad), ts = terms(mid), t = sum(...ts);
    const fin = par(lin) + '(' + v + '-' + r + ')(' + v + '+' + r + ')';
    const step2 = v + '^2' + par(lin) + co(-r * r, par(lin));
    return {
      t, fin, partial: mid, path: ['group', 'dsq'],
      wrong: ['(' + v + '-' + r + ')(' + v + '+' + r + ')', par(linFlip) + '(' + v + '-' + r + ')(' + v + '+' + r + ')', par(lin) + '(' + v + '-' + r + ')^2', par(lin) + par(v + '^2+' + r * r)],
      steps: [
        Q1(false, '$' + ts[3] + '$ няма $' + v + '$.'),
        Q2('изразът', 4, '$' + ts.join('$, $') + '$.'),
        groupSteps(ts, 'Така двете скоби няма да станат еднакви. Вземи първите два и последните два члена.'),
        exprChoice('B4', 'Изнеси общ множител от всяка група.', step2, [v + '^2' + par(lin) + co(-r * r, par(linFlip)), v + '^2' + par(lin) + '+' + co(r * r, par(lin))],
          {e: step2, hint: 'От $' + sum(ts[2], ts[3]) + '$ изнасяме $' + (-r * r) + '$: получаваме $' + co(-r * r, par(lin)) + '$.', note: 'еднакви скоби: $(' + lin + ')$'}),
        exprChoice('B4', 'Изнеси общата скоба.', mid, [par(lin) + par(v + '^2+' + r * r), par(quad) + '+' + par(lin)],
          {e: mid, hint: 'Скобата $(' + lin + ')$ се повтаря. Остава $' + quad + '$.'}),
        Q5(true, 'скобата $(' + quad + ')$', '$' + quad + '$ е разлика на квадрати!'),
        Q2('скобата $(' + quad + ')$', 2, '$' + v + '^2$ и $-' + r * r + '$.'),
        B2type(0, '$' + v + '^2$ и $' + r * r + '=' + r + '^2$, с минус.'),
        whichPair('B2', 'Кои са ▢ и ◯?', v, String(r), [[v, String(r * r)], [v + '^2', String(r)]], {e: fin, hint: '$' + r + '^2=' + r * r + '$.'}),
        Q5(false, 'скобите', 'Готово: три скоби, всяка с по 2 члена.'),
      ],
    };
  }

  function cFourth(){
    const v = pick(LET), a = pick([1, 1, 2, 3]), b = pick([1, 2, 3]);
    if (gcd(a, b) !== 1) return null;
    const box = M(a * a, v, 2), circ = M(b * b);
    const B = ms(box), C = ms(circ), T1 = ms(mpow(box, 2)), T2 = ms(mpow(circ, 2));
    const B1 = co(a, v), C1 = String(b);
    const mid = '(' + B + '-' + C + ')(' + B + '+' + C + ')';
    const fin = '(' + B1 + '-' + C1 + ')(' + B1 + '+' + C1 + ')(' + B + '+' + C + ')';
    return {
      t: T1 + '-' + T2, fin, partial: mid, path: ['dsq', 'dsq'],
      wrong: ['(' + B1 + '-' + C1 + ')(' + B1 + '+' + C1 + ')(' + B + '-' + C + ')', '(' + B1 + '-' + C1 + ')^2(' + B + '+' + C + ')', '(' + B + '-' + C + ')^2'],
      steps: [
        Q1(false, '$' + T2 + '$ няма $' + v + '$.'),
        Q2('изразът', 2, '$' + T1 + '$ и $-' + T2 + '$.'),
        B2type(0, '$' + eqP(T1, box, 2) + '$ и $' + eqP(T2, circ, 2) + '$.'),
        whichPair('B2', 'Кои са ▢ и ◯?', B, C, [[B1, C], [B, T2], [T1, T2]], {e: mid, hint: '$' + eqP(T1, box, 2) + '$: степента се удвоява.'}),
        Q5(true, 'скобата $(' + B + '-' + C + ')$', '$' + B + '-' + C + '$ отново е разлика на квадрати!', 'а $' + B + '+' + C + '$ е сбор: не се разлага'),
        Q2('скобата $(' + B + '-' + C + ')$', 2, '$' + B + '$ и $-' + C + '$.'),
        B2type(0, '$' + eqP(B, M(a, v), 2) + '$ и $' + C + '=' + b + '^2$, с минус.'),
        whichPair('B2', 'Кои са ▢ и ◯?', B1, C1, [[B1, C], [B, C1]], {e: fin, hint: '$' + eqP(B, M(a, v), 2) + '$, $' + b + '^2=' + C + '$.'}),
        Q5(false, 'скобите', 'Готово.'),
      ],
    };
  }

  // =====================================================================
  const TOPICS = {
    mix:   {name: 'Смесени'},
    cf:    {name: 'Общ множител', gens: [[cfMono, 7], [cfBracket, 3]]},
    form:  {name: 'Формули', gens: [[dsq, 3], [psq, 3], [cube, 2], [ssq, 1]]},
    group: {name: 'Групиране', gens: [[gLetters, 1], [gPoly, 1], [gTwo, 1]]},
    comb:  {name: 'Комбинирани', gens: [[cDsq, 3], [cPsq, 2], [cCube, 2], [cGroupDsq, 2], [cFourth, 1]]},
  };
  const MIX = [['cf', 2], ['form', 3], ['group', 2], ['comb', 3]];
  const NOFACT = 'не се разлага';

  function validate(p){
    try {
      const base = parsePoly(p.t);
      let last = null;
      for (const s of p.steps){
        if (!(s.ok >= 0 && s.ok < s.opts.length) || s.opts.length < 2) return false;
        if (new Set(s.opts).size !== s.opts.length) return false;
        if (s.e){ if (!parsePoly(s.e).eq(base)) return false; last = s.e; }
      }
      if (p.fin !== NOFACT){
        if (!parsePoly(p.fin).eq(base)) return false;
        if (last !== p.fin) return false;
      }
      if (p.partial && !parsePoly(p.partial).eq(base)) return false;
      return true;
    } catch(e){ return false; }
  }

  const recent = [];
  function make(topic){
    for (let tries = 0; tries < 400; tries++){
      const tk = topic === 'mix' || !TOPICS[topic] ? weighted(MIX) : topic;
      let p = null;
      try { p = weighted(TOPICS[tk].gens)(); } catch(e){ p = null; }
      if (!p || recent.includes(p.t)) continue;
      if (!validate(p)){ console.warn('[gen] отхвърлена задача', p.t); continue; }
      p.topic = tk; p.g = TOPICS[tk].name;
      recent.push(p.t); if (recent.length > 80) recent.shift();
      return p;
    }
    throw new Error('генераторът не намери задача');
  }

  // =====================================================================
  // Тест: въпроси с избор от няколко отговора
  const METHOD = {cf: 'Изнасяне на общ множител', dsq: 'Разлика на квадрати', psq: 'Точен квадрат', cube: 'Сбор или разлика на кубове', group: 'Групиране', none: 'Не се разлага'};
  const SHORT = {cf: 'общ множител', dsq: 'разлика на квадрати', psq: 'точен квадрат', cube: 'формула за кубове', group: 'групиране', none: 'сбор на квадрати'};
  const answerText = p => p.fin === NOFACT ? '$' + p.t + '$ е сбор на квадрати и не се разлага.' : '$' + p.t + '=' + p.fin + '$.';
  const pathText = p => p.path[0] === 'none' ? '' : ' Начин: ' + p.path.map(k => SHORT[k]).join(', после ') + '.';

  // мутации: смяна на знак + или − някъде в отговора
  function signFlips(s){
    const out = [];
    for (let i = 1; i < s.length; i++)
      if ((s[i] === '+' || s[i] === '-') && s[i - 1] !== '(') out.push(s.slice(0, i) + flip(s[i]) + s.slice(i + 1));
    return shuffle(out);
  }

  function factorQ(p){
    const base = parsePoly(p.t);
    const opts = [p.fin], vals = [p.fin === NOFACT ? null : parsePoly(p.fin)];
    let partialIn = false;
    const cands = [];
    if (p.partial && Math.random() < .7) cands.push(p.partial);
    if (p.fin !== NOFACT && Math.random() < .3) cands.push(NOFACT);
    cands.push(...shuffle(p.wrong || []));
    if (p.fin !== NOFACT) cands.push(...signFlips(p.fin));
    for (const c of cands){
      if (opts.length >= 4) break;
      if (opts.includes(c)) continue;
      if (c === NOFACT){ opts.push(c); vals.push(null); continue; }
      let v; try { v = parsePoly(c); } catch(e){ continue; }
      const isPartial = c === p.partial;
      if (v.eq(base) && !isPartial) continue;               // би било верен отговор
      if (vals.some((o, i) => o && o.eq(v) && !(isPartial && i === 0))) continue;
      opts.push(c); vals.push(v);
      if (isPartial) partialIn = true;
    }
    const sh = shuffle(opts);
    const show = o => o === NOFACT ? NOFACT : '$' + o + '$';
    const notes = {};
    if (partialIn) notes[sh.indexOf(p.partial)] = 'Равенството е вярно, но не е докрай: една от скобите се разлага още.';
    return {kind: 'factor', q: 'Разложи докрай на множители:', expr: p.t, opts: sh.map(show), ok: sh.indexOf(p.fin),
      why: answerText(p) + pathText(p), notes, topic: p.topic};
  }

  function methodQ(p){
    const correct = METHOD[p.path[0]];
    const others = shuffle(Object.values(METHOD).filter(m => m !== correct)).slice(0, 3);
    const opts = shuffle([correct, ...others]);
    return {kind: 'method', q: 'С какво започваш, за да разложиш:', expr: p.t, opts, ok: opts.indexOf(correct),
      why: 'Първата стъпка е: ' + correct.toLowerCase() + '. ' + answerText(p), notes: {}, topic: p.topic};
  }

  function checkQ(p){
    const base = parsePoly(p.t);
    const wrongs = shuffle([...(p.wrong || []), ...signFlips(p.fin)]).filter(w => { try { return !parsePoly(w).eq(base); } catch(e){ return false; } });
    const truth = !wrongs.length || Math.random() < .5;
    const shown = truth ? p.fin : wrongs[0];
    return {kind: 'check', q: 'Вярно ли е равенството?', expr: p.t + '=' + shown, opts: ['вярно', 'грешно'], ok: truth ? 0 : 1,
      why: (truth ? 'Да. ' : 'Не. Правилно е ') + answerText(p) + (truth ? '' : ' Провери, като умножиш обратно.'), notes: {}, topic: p.topic};
  }

  function quizItem(topic){
    const p = make(topic), r = Math.random();
    if (r < .2) return methodQ(p);
    if (r < .4 && p.fin !== NOFACT) return checkQ(p);
    return factorQ(p);
  }

  window.GEN = {TOPICS, make, quizItem, validate, NOFACT};
})();
