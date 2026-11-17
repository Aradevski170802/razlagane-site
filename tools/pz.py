# -*- coding: utf-8 -*-
"""Малък многочленен апарат: парсване на изрази като '(2x-3)^2-(x+1)(x-1)', проверка и LaTeX в нормален вид."""
import re
from fractions import Fraction as F

VARS = 'abmnpqxyz'


class P:
    def __init__(s, d=None):
        s.d = {k: v for k, v in (d or {}).items() if v != 0}

    @staticmethod
    def c(v): return P({(): F(v)})

    @staticmethod
    def v(n): return P({((n, 1),): F(1)})

    def __add__(s, o):
        o = o if isinstance(o, P) else P.c(o)
        d = dict(s.d)
        for k, v in o.d.items(): d[k] = d.get(k, 0) + v
        return P(d)
    __radd__ = __add__

    def __neg__(s): return P({k: -v for k, v in s.d.items()})
    def __sub__(s, o): return s + (-(o if isinstance(o, P) else P.c(o)))
    def __rsub__(s, o): return P.c(o) - s

    def __mul__(s, o):
        o = o if isinstance(o, P) else P.c(o)
        d = {}
        for k1, v1 in s.d.items():
            for k2, v2 in o.d.items():
                e = dict(k1)
                for n, p in k2: e[n] = e.get(n, 0) + p
                k = tuple(sorted(e.items()))
                d[k] = d.get(k, 0) + v1 * v2
        return P(d)
    __rmul__ = __mul__

    def __truediv__(s, o):
        assert not isinstance(o, P) or set(o.d) <= {()}
        o = o.d.get((), 0) if isinstance(o, P) else o
        return s * (F(1) / F(o))

    def __pow__(s, n):
        r = P.c(1)
        for _ in range(int(n)): r = r * s
        return r

    def __eq__(s, o):
        o = o if isinstance(o, P) else P.c(o)
        return not (s - o).d

    def at(s, **kw):
        tot = F(0)
        for k, v in s.d.items():
            t = v
            for n, p in k: t *= F(kw[n]) ** p
            tot += t
        return tot

    def deg(s): return max((sum(p for _, p in k) for k in s.d), default=0)


def ev(expr):
    s = expr.replace(' ', '').replace(',', '.').replace('^', '~')
    toks = re.findall(r'\d+\.\d+|\d+|[%s]|~|[-+*/()]' % VARS, s)
    assert ''.join(toks) == s, (s, toks)
    out, prev = [], None
    for t in toks:
        kind = 'n' if t[0].isdigit() else ('v' if t in VARS else t)
        if prev in ('n', 'v', ')') and kind in ('v', '(') or (prev in ('v', ')') and kind == 'n'):
            out.append('*')
        if kind == 'n':
            out.append(t if prev == '~' else "F('%s')" % t)
        elif kind == '~':
            out.append('**')
        else:
            out.append(t)
        prev = kind
    env = {'F': F}
    for v in VARS: env[v] = P.v(v)
    r = eval(''.join(out), env)
    return r if isinstance(r, P) else P.c(r)


def num(c):
    c = F(c)
    if c.denominator == 1: return str(c.numerator)
    return '\\frac{%d}{%d}' % (c.numerator, c.denominator)


def tex(p, order=None):
    """нормален вид, по степени (низходящо), после по азбучен ред"""
    if not p.d: return '0'
    def key(k):
        dg = sum(e for _, e in k)
        return (-dg, [(-dict(k).get(v, 0)) for v in (order or VARS)])
    out = ''
    for i, k in enumerate(sorted(p.d, key=key)):
        c = p.d[k]
        mono = ''.join(n + ('^{%d}' % e if e > 1 else '') for n, e in k)
        a = abs(c)
        cs = '' if (a == 1 and mono) else num(a)
        sign = '-' if c < 0 else ('+' if i else '')
        out += sign + cs + mono
    return out


if __name__ == '__main__':
    assert ev('(a+b)^2') == ev('a^2+2ab+b^2')
    assert ev('(2x-3)^2') == ev('4x^2-12x+9')
    assert ev('(a+2)(a^2-2a+4)') == ev('a^3+8')
    assert ev('(1/2x-4)^2') == ev('1/4x^2-4x+16')
    print(tex(ev('(3a-2b)^3')), tex(ev('(0,2a+5)^2')))
