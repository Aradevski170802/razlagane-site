// Малка библиотека за многочлени с цели коефициенти.
// Чете мини-нотацията ('3x(2x+3)', '(a^2-4)(a^2+4)', 'x^2(x-2)+3(x-2)'),
// разкрива скобите и пише нормален вид. С нея генераторът проверява,
// че всеки междинен израз е равен на началния.
(function(){
  const VARS = 'abcmnpqtuvwxyz';

  // едночлен: ключ 'x2y1' (буквите по реда във VARS), '' за число
  function key(m){
    return Object.keys(m).filter(v => m[v]).sort((a, b) => VARS.indexOf(a) - VARS.indexOf(b)).map(v => v + m[v]).join('');
  }
  function unkey(k){
    const m = {};
    k.replace(/([a-z])(\d+)/g, (_, v, e) => { m[v] = +e; });
    return m;
  }

  class Poly {
    constructor(t){ this.t = {}; for (const k in (t || {})) if (t[k]) this.t[k] = t[k]; }
    static num(c){ return new Poly({'': c}); }
    static v(name){ return new Poly({[name + '1']: 1}); }
    add(o){
      const t = Object.assign({}, this.t);
      for (const k in o.t) t[k] = (t[k] || 0) + o.t[k];
      return new Poly(t);
    }
    neg(){ const t = {}; for (const k in this.t) t[k] = -this.t[k]; return new Poly(t); }
    sub(o){ return this.add(o.neg()); }
    mul(o){
      const t = {};
      for (const k1 in this.t) for (const k2 in o.t){
        const m = unkey(k1), m2 = unkey(k2);
        for (const v in m2) m[v] = (m[v] || 0) + m2[v];
        const k = key(m);
        t[k] = (t[k] || 0) + this.t[k1] * o.t[k2];
      }
      return new Poly(t);
    }
    pow(n){ let r = Poly.num(1); for (let i = 0; i < n; i++) r = r.mul(this); return r; }
    eq(o){ return Object.keys(this.sub(o).t).length === 0; }
    // нормален вид: по степен (низходящо), после по реда на буквите
    terms(){
      const deg = k => Object.values(unkey(k)).reduce((s, e) => s + e, 0);
      const vec = k => { const m = unkey(k); return VARS.split('').map(v => m[v] || 0); };
      return Object.keys(this.t).sort((a, b) => {
        if (deg(a) !== deg(b)) return deg(b) - deg(a);
        const va = vec(a), vb = vec(b);
        for (let i = 0; i < va.length; i++) if (va[i] !== vb[i]) return vb[i] - va[i];
        return 0;
      }).map(k => {
        const m = unkey(k), c = this.t[k];
        const mono = Object.keys(m).sort((a, b) => VARS.indexOf(a) - VARS.indexOf(b)).map(v => v + (m[v] > 1 ? '^' + m[v] : '')).join('');
        if (!mono) return String(c);
        return (c === 1 ? '' : c === -1 ? '-' : String(c)) + mono;
      });
    }
    toString(){
      const ts = this.terms();
      if (!ts.length) return '0';
      return ts.map((s, i) => i && s[0] !== '-' ? '+' + s : s).join('');
    }
  }

  // ---------- парсер на мини-нотацията
  function parse(src){
    const s = String(src).replace(/\s+/g, '').replace(/·/g, '*').replace(/−/g, '-');
    let i = 0;
    const peek = () => s[i];
    function expr(){
      let sign = 1;
      if (peek() === '+' || peek() === '-'){ sign = peek() === '-' ? -1 : 1; i++; }
      let r = term(); if (sign < 0) r = r.neg();
      while (peek() === '+' || peek() === '-'){
        const op = s[i++]; const t = term();
        r = op === '+' ? r.add(t) : r.sub(t);
      }
      return r;
    }
    function term(){
      let r = factor();
      while (i < s.length){
        const c = peek();
        if (c === '*'){ i++; r = r.mul(factor()); }
        else if (c === '(' || /[0-9a-z]/.test(c)) r = r.mul(factor());
        else break;
      }
      return r;
    }
    function factor(){
      let a = atom();
      if (peek() === '^'){
        i++; let n = '';
        while (/[0-9]/.test(peek() || '')) n += s[i++];
        if (!n) throw new Error('степен без число: ' + s);
        a = a.pow(+n);
      }
      return a;
    }
    function atom(){
      const c = peek();
      if (c === '('){
        i++; const r = expr();
        if (s[i++] !== ')') throw new Error('липсва ) в ' + s);
        return r;
      }
      if (/[0-9]/.test(c || '')){
        let n = ''; while (/[0-9]/.test(peek() || '')) n += s[i++];
        return Poly.num(+n);
      }
      if (/[a-z]/.test(c || '')){ i++; return Poly.v(c); }
      throw new Error('неочакван знак „' + c + '“ в ' + s);
    }
    const r = expr();
    if (i !== s.length) throw new Error('излишен текст в ' + s);
    return r;
  }

  window.Poly = Poly;
  window.parsePoly = parse;
  window.expand = src => parse(src).toString();
  window.sameValue = (a, b) => parse(a).eq(parse(b));
})();
