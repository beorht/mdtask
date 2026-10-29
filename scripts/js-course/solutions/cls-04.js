const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
class Fraction {
  constructor(n, d) {
    if (d === 0) throw new RangeError('знаменатель 0');
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d) || 1;
    this.n = n / g;
    this.d = d / g;
  }
  add(f) { return new Fraction(this.n * f.d + f.n * this.d, this.d * f.d); }
  sub(f) { return new Fraction(this.n * f.d - f.n * this.d, this.d * f.d); }
  mul(f) { return new Fraction(this.n * f.n, this.d * f.d); }
  div(f) { return new Fraction(this.n * f.d, this.d * f.n); }
  toString() { return this.d === 1 ? String(this.n) : this.n + '/' + this.d; }
}
const parse = (s) => {
  const [n, d = '1'] = s.split('/');
  return new Fraction(Number(n), Number(d));
};
const ops = { '+': 'add', '-': 'sub', '*': 'mul', ':': 'div' };
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [a, op, b] = line.split(' ');
  console.log(parse(a)[ops[op]](parse(b)).toString());
}
