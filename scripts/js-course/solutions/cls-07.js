class Vector {
  constructor(x, y) { this.x = x; this.y = y; }
  add(v) { return new Vector(this.x + v.x, this.y + v.y); }
  sub(v) { return new Vector(this.x - v.x, this.y - v.y); }
  scale(k) { return new Vector(this.x * k, this.y * k); }
  dot(v) { return this.x * v.x + this.y * v.y; }
  get length() { return Math.hypot(this.x, this.y); }
  toString() { return '(' + this.x + ', ' + this.y + ')'; }
  static fromString(s) {
    const [x, y] = s.split(',').map(Number);
    return new Vector(x, y);
  }
}
const n = Number(input());
const vs = Array.from({ length: n }, () => Vector.fromString(input()));
const sum = vs.reduce((a, v) => a.add(v), new Vector(0, 0));
console.log(sum.toString());
console.log(sum.length.toFixed(2));
console.log(vs.reduce((b, v) => (v.length > b.length ? v : b)).toString());
let any = false;
for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (vs[i].dot(vs[j]) === 0) { console.log(i + 1, j + 1); any = true; }
if (!any) console.log('перпендикулярных нет');
