// PDF с резултатите от теста: кои отговори са верни, пълно решение на всяка задача,
// какво да упражнява ученикът и нови задачи за упражнение с отговори.
// Библиотеката pdfmake се зарежда чак когато ученикът натисне бутона.
(function(){
  const LIB = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/';
  const C = {ink: '#1b2740', muted: '#5a6780', pen: '#2350b5', soft: '#e4ecfb', ok: '#1d7a4b', bad: '#c2362b', line: '#c9d4e4'};
  let loading = null;

  function loadLib(){
    if (window.pdfMake && window.pdfMake.vfs) return Promise.resolve();
    if (loading) return loading;
    const add = src => new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('не се зареди ' + src));
      document.head.appendChild(s);
    });
    loading = add(LIB + 'pdfmake.min.js').then(() => add(LIB + 'vfs_fonts.min.js')).catch(e => { loading = null; throw e; });
    return loading;
  }

  // ---------- мини-нотация -> парчета текст за pdfmake (степените като горен индекс)
  function mathRuns(s, base){
    const out = [], put = (text, extra) => out.push(Object.assign({text}, base || {}, extra || {}));
    let prev = null, i = 0;
    while (i < s.length){
      const c = s[i];
      if (c === '^'){
        let j = i + 1, sup = '';
        while (j < s.length && /[0-9]/.test(s[j])) sup += s[j++];
        if (!sup){ sup = s[j]; j++; }
        put(sup, {sup: true}); i = j; prev = 'v'; continue;
      }
      if (/[a-z]/.test(c)){ put(c, {italics: true}); prev = 'v'; }
      else if (/[0-9]/.test(c)){ put(c); prev = 'v'; }
      else if (c === '#'){ put('A', {bold: true}); prev = 'v'; }
      else if (c === '@'){ put('B', {bold: true}); prev = 'v'; }
      else if (c === '-' || c === '+' || c === '±'){
        const sym = c === '-' ? '−' : c;
        put(prev === 'v' || prev === ')' ? ' ' + sym + ' ' : sym); prev = 'o';
      }
      else if (c === '*' || c === '·'){ put('·'); prev = 'o'; }
      else if (c === '='){ put(' = '); prev = 'o'; }
      else if (c === ')' || c === '('){ put(c); prev = c; }
      else if (c !== ' '){ put(c); prev = 'o'; }
      i++;
    }
    return out;
  }
  // текст с $формули$ и <b>…</b> -> парчета; ▢ и ◯ стават A и B
  function richRuns(t, base){
    const out = [];
    String(t).split('$').forEach((part, k) => {
      if (k % 2){ out.push(...mathRuns(part, base)); return; }
      part.split(/(<b>.*?<\/b>)/).forEach(seg => {
        if (!seg) return;
        const bold = /^<b>/.test(seg);
        const text = seg.replace(/<[^>]+>/g, '').replace(/▢/g, 'A').replace(/◯/g, 'B');
        if (text) out.push(Object.assign({text}, base || {}, bold ? {bold: true} : {}));
      });
    });
    return out;
  }
  const answerRuns = (it, k, base) => k === null || k === undefined ? [{text: 'без отговор', italics: true}] : richRuns(it.opts[k], base);

  // ---------- оценка и съвети
  function grade(score, total){
    const r = score / total;
    if (r >= .9) return 'Отличен 6';
    if (r >= .7) return 'Много добър 5';
    if (r >= .5) return 'Добър 4';
    if (r >= .3) return 'Среден 3';
    return 'Слаб 2';
  }
  const TIPS = {
    cf: 'Намери НОД на числата и най-малката степен на всяка буква, която е във всички членове. След изнасянето провери: в скобата не трябва да остава общ множител. Ако общият множител е цяла скоба, изнеси я като една буква.',
    dsq: 'Два члена, и двата са квадрати, а между тях има минус: A² − B² = (A − B)(A + B). Първо намери A и B (на какво е квадрат всеки член), а не самите квадрати.',
    psq: 'Три члена: крайните са квадрати A² и B², а средният е 2·A·B. Тогава A² ± 2AB + B² = (A ± B)². Знакът в скобата е знакът на средния член.',
    cube: 'A³ + B³ = (A + B)(A² − AB + B²) и A³ − B³ = (A − B)(A² + AB + B²). Знакът в първата скоба е знакът от условието, а втората скоба не се разлага.',
    group: 'Раздели четирите члена на две групи по два, изнеси общ множител от всяка група и гледай скобите да станат еднакви. Ако втората група започва с минус, изнеси минус: знаците в скобата се сменят.',
    none: 'Сборът на квадрати A² + B² не се разлага. Формулата е само за разлика A² − B².',
  };
  const TRAINER = {cf: 'Общ множител', dsq: 'Формули', psq: 'Формули', cube: 'Формули', group: 'Групиране', none: 'Формули'};

  function advice(items, answers){
    const miss = {}, out = [];
    let partial = 0, method = 0, combined = 0;
    items.forEach((it, i) => {
      if (answers[i] === it.ok) return;
      it.p.path.forEach(k => { miss[k] = (miss[k] || 0) + 1; });
      if (it.p.path.length > 1) combined++;
      if (it.notes[answers[i]]) partial++;
      if (it.kind === 'method') method++;
    });
    Object.entries(miss).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => {
      out.push({stack: [
        {text: [{text: GEN.METHOD[k], bold: true}, {text: '  (грешки: ' + n + ')', color: C.muted}]},
        {text: TIPS[k], margin: [0, 2, 0, 0]},
        {text: 'Упражнявай в тренажора, тема „' + TRAINER[k] + '“.', color: C.pen, margin: [0, 2, 0, 0]},
      ], margin: [0, 0, 0, 8], unbreakable: true});
    });
    if (combined) out.push({text: [{text: 'Задачи с няколко стъпки. ', bold: true}, 'След всяка стъпка питай: „Разлага ли се още нещо?“. Упражнявай темата „Комбинирани“.'], margin: [0, 0, 0, 8]});
    if (partial) out.push({text: [{text: 'Не спирай по средата. ', bold: true}, 'Избра отговор, който е верен, но не е разложен докрай. Провери всяка скоба дали не е формула.'], margin: [0, 0, 0, 8]});
    if (method) out.push({text: [{text: 'Редът е винаги един и същ: ', bold: true}, '1) общ множител, 2) брой на членовете, 3) формула (2 или 3 члена) или групиране (4 члена), 4) разлага ли се още нещо.'], margin: [0, 0, 0, 8]});
    return {list: out, weak: miss};
  }

  // ---------- решение на една задача по стъпките на блок-схемата
  function solution(p){
    const rows = [];
    p.steps.forEach((s, n) => {
      const stack = [
        {text: [{text: (n + 1) + '. ', bold: true}, ...richRuns(s.q, {bold: true}), {text: '  '}, ...richRuns(s.opts[s.ok], {color: C.ok, bold: true})]},
      ];
      if (s.hint) stack.push({text: richRuns(s.hint), color: C.muted, margin: [12, 1, 0, 0]});
      if (s.e) stack.push({text: [{text: '= ', bold: true}, ...mathRuns(s.e, {bold: true})], fontSize: 12, margin: [12, 2, 0, 0]});
      else if (s.note) stack.push({text: richRuns(s.note), color: C.pen, margin: [12, 1, 0, 0]});
      rows.push({stack, margin: [0, 0, 0, 5], unbreakable: true});
    });
    const ok = p.fin !== GEN.NOFACT;
    rows.push({stack: [{text: [{text: 'Отговор: ', bold: true}, ...(ok ? mathRuns(p.t + '=' + p.fin, {bold: true}) : [...mathRuns(p.t, {bold: true}), {text: ' не се разлага', bold: true}])],
      fontSize: 12},
    {text: ok ? 'Проверка: умножи скобите обратно и ще получиш пак началния израз.' : 'Сборът на квадрати няма формула за разлагане.', color: C.muted, margin: [0, 1, 0, 0]}], margin: [0, 4, 0, 0], unbreakable: true});
    return rows;
  }

  function practice(items, answers, topic){
    const kinds = [];
    items.forEach((it, i) => { if (answers[i] !== it.ok && !kinds.includes(it.p.kind)) kinds.push(it.p.kind); });
    const probs = [];
    kinds.forEach(k => { for (let j = 0; j < 2 && probs.length < 8; j++) probs.push(GEN.make(null, k)); });
    const fill = kinds.length ? (topic === 'mix' ? 'mix' : topic) : 'comb';
    while (probs.length < 6) probs.push(GEN.make(fill));
    return probs;
  }

  // ---------- целият документ
  function build(r){
    const {items, answers, secs, topic, date, name} = r;
    const N = items.length, score = answers.filter((a, i) => a === items[i].ok).length;
    const d = new Date(date);
    const dateText = d.toLocaleDateString('bg-BG', {day: 'numeric', month: 'long', year: 'numeric'});
    const topicName = GEN.TOPICS[topic] ? GEN.TOPICS[topic].name : '';
    const time = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
    const adv = advice(items, answers);
    const probs = practice(items, answers, topic);
    const mark = ok => ({text: ok ? 'вярно' : 'грешно', bold: true, color: ok ? C.ok : C.bad});

    const overview = {
      table: {
        headerRows: 1, widths: [16, '*', '*', '*', 42],
        body: [[
          {text: '№', style: 'th'}, {text: 'Задача', style: 'th'}, {text: 'Твоят отговор', style: 'th'}, {text: 'Верен отговор', style: 'th'}, {text: '', style: 'th'},
        ]].concat(items.map((it, i) => {
          const ok = answers[i] === it.ok;
          return [String(i + 1), {text: mathRuns(it.expr)}, {text: answerRuns(it, answers[i]), color: ok ? C.ink : C.bad}, {text: answerRuns(it, it.ok)}, mark(ok)];
        })),
      },
      layout: {hLineColor: () => C.line, vLineColor: () => C.line, hLineWidth: () => .6, vLineWidth: () => 0, paddingTop: () => 4, paddingBottom: () => 4},
      fontSize: 9.5,
    };

    const solutions = [];
    items.forEach((it, i) => {
      const a = answers[i], ok = a === it.ok;
      const block = [
        {text: [{text: 'Задача ' + (i + 1) + '  '}, {text: ok ? 'вярно' : 'грешно', color: ok ? C.ok : C.bad}], style: 'h3'},
        {text: richRuns(it.q)}, {text: mathRuns(it.expr), fontSize: 14, margin: [0, 1, 0, 4]},
        {text: [{text: 'Твоят отговор: ', bold: true}, ...answerRuns(it, a, {color: ok ? C.ok : C.bad})]},
      ];
      if (!ok) block.push({text: [{text: 'Верен отговор: ', bold: true}, ...answerRuns(it, it.ok, {color: C.ok})]});
      if (it.notes[a]) block.push({text: richRuns(it.notes[a]), color: C.bad, margin: [0, 1, 0, 0]});
      if (it.kind === 'check' && it.ok === 1) block.push({text: 'Даденото разлагане е грешно. Ето как се решава правилно:', color: C.muted, margin: [0, 2, 0, 0]});
      block.push({text: 'Решение стъпка по стъпка', style: 'label', margin: [0, 6, 0, 3]});
      // заглавието остава на една страница с първата стъпка; останалите стъпки могат да минат на следващата
      const rows = solution(it.p);
      block.push(rows.shift());
      solutions.push({stack: [{stack: block, unbreakable: true}, ...rows], margin: [0, 0, 0, 14]});
      if (i < N - 1) solutions.push({canvas: [{type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: .6, lineColor: C.line}], margin: [0, 0, 0, 12]});
    });

    return {
      pageSize: 'A4', pageMargins: [40, 46, 40, 50],
      info: {title: 'Тест: разлагане на множители', subject: 'Резултати и решения'},
      defaultStyle: {font: 'Roboto', fontSize: 10.5, color: C.ink, lineHeight: 1.2},
      styles: {
        eyebrow: {fontSize: 9, color: C.muted, characterSpacing: .5},
        h1: {fontSize: 22, bold: true, margin: [0, 2, 0, 6]},
        h2: {fontSize: 15, bold: true, color: C.pen, margin: [0, 16, 0, 8]},
        h3: {fontSize: 12.5, bold: true, margin: [0, 0, 0, 3]},
        label: {fontSize: 9.5, bold: true, color: C.muted, characterSpacing: .4},
        th: {bold: true, color: C.muted, fontSize: 9},
      },
      pageBreakBefore: (node, after) => node.headlineLevel === 1 && after.length === 0,
      footer: (page, pages) => ({text: 'Разлагане на множители · ' + page + ' от ' + pages, alignment: 'center', fontSize: 8, color: C.muted, margin: [0, 18, 0, 0]}),
      content: [
        {text: 'МАТЕМАТИКА · 7. КЛАС · РАЗЛАГАНЕ НА МНОЖИТЕЛИ', style: 'eyebrow'},
        {text: 'Резултати от теста', style: 'h1'},
        {text: [name ? {text: name + '   ·   ', bold: true} : '', dateText + '   ·   тема „' + topicName + '“   ·   време ' + time], color: C.muted},
        {table: {widths: ['auto', '*'], body: [[
          {text: score + ' / ' + N, fontSize: 30, bold: true, color: C.pen, margin: [12, 8, 16, 8]},
          {stack: [{text: grade(score, N), fontSize: 16, bold: true, color: score / N >= .5 ? C.ok : C.bad}, {text: 'верни отговори: ' + score + ', грешни: ' + (N - score), color: C.muted}], margin: [0, 12, 0, 8]},
        ]]}, layout: {fillColor: () => C.soft, hLineWidth: () => 0, vLineWidth: () => 0}, margin: [0, 12, 0, 4]},

        {text: 'Преглед на отговорите', style: 'h2', headlineLevel: 1},
        overview,

        {text: 'Какво да упражняваш', style: 'h2', headlineLevel: 1},
        ...(adv.list.length ? adv.list : [{text: 'Нямаш нито една грешка. Браво! Пробвай тест с тема „Комбинирани“: там задачите са с по няколко стъпки.'}]),

        {text: 'Пълни решения', style: 'h2', headlineLevel: 1},
        {text: 'Всяка задача е решена по блок-схемата от сайта. Буквите A и B заместват квадратчето и кръгчето от сайта, например A² − B² = (A − B)(A + B).', color: C.muted, margin: [0, 0, 0, 12]},
        ...solutions,

        {text: 'Задачи за упражнение', style: 'h2', pageBreak: 'before'},
        {text: adv.list.length ? 'Задачите са от същия вид като тези, на които сгреши. Реши ги в тетрадка, после провери отговорите на следващата страница.' : 'Реши ги в тетрадка, после провери отговорите на следващата страница.', color: C.muted, margin: [0, 0, 0, 12]},
        {ol: probs.map(p => ({text: [{text: 'Разложи на множители:  ', fontSize: 10.5}, ...mathRuns(p.t)], fontSize: 13, margin: [0, 0, 0, 34]})), markerColor: C.pen},

        {text: 'Отговори на задачите за упражнение', style: 'h2', pageBreak: 'before'},
        {ol: probs.map(p => ({text: p.fin === GEN.NOFACT ? [...mathRuns(p.t), {text: ' — не се разлага'}] : mathRuns(p.t + '=' + p.fin), margin: [0, 0, 0, 6]}))},
        {text: 'Ако не си сигурен как се стига до отговора, реши същия вид задача в тренажора на сайта: там всяка стъпка има подсказка.', color: C.muted, margin: [0, 10, 0, 0]},
      ],
    };
  }

  function fileName(r){
    const d = new Date(r.date);
    return 'razlagane-test-' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '.pdf';
  }

  window.REPORT = {
    build,
    async download(r){
      await loadLib();
      pdfMake.createPdf(build(r)).download(fileName(r));
    },
    async blob(r){
      await loadLib();
      return new Promise(res => pdfMake.createPdf(build(r)).getBlob(res));
    },
  };
})();
