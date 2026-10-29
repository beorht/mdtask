const rect = {
  width: Number(input()),
  height: Number(input()),
  area() { return this.width * this.height; },
  perimeter() { return 2 * (this.width + this.height); },
  isSquare() { return this.width === this.height; },
  scale(k) {
    this.width *= k;
    this.height *= k;
  },
};
console.log(rect.area());
console.log(rect.perimeter());
console.log(rect.isSquare() ? 'квадрат' : 'не квадрат');
rect.scale(Number(input()));
console.log(rect.area());
