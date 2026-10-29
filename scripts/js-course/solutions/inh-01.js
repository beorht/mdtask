class Shape {
  constructor(name) { this.name = name; }
  area() { return 0; }
  perimeter() { return 0; }
  describe() { return this.name + ': площадь ' + this.area().toFixed(2) + ', периметр ' + this.perimeter().toFixed(2); }
}
class Circle extends Shape {
  constructor(r) { super('круг'); this.r = r; }
  area() { return Math.PI * this.r ** 2; }
  perimeter() { return 2 * Math.PI * this.r; }
}
class Rect extends Shape {
  constructor(w, h, name = 'прямоугольник') { super(name); this.w = w; this.h = h; }
  area() { return this.w * this.h; }
  perimeter() { return 2 * (this.w + this.h); }
}
class Square extends Rect {
  constructor(a) { super(a, a, 'квадрат'); }
}
class Triangle extends Shape {
  constructor(a, b, c) { super('треугольник'); this.s = [a, b, c]; }
  perimeter() { return this.s[0] + this.s[1] + this.s[2]; }
  area() {
    const p = this.perimeter() / 2;
    return Math.sqrt(p * (p - this.s[0]) * (p - this.s[1]) * (p - this.s[2]));
  }
}
const make = { circle: Circle, rect: Rect, square: Square, triangle: Triangle };
const shapes = [];
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [type, ...args] = line.split(' ');
  shapes.push(new make[type](...args.map(Number)));
}
shapes.forEach((s) => console.log(s.describe()));
console.log('наибольшая: ' + shapes.reduce((b, s) => (s.area() > b.area() ? s : b)).name);
