class Animal {
  constructor(name) { this.name = name; }
  sound() { return '…'; }
  move() { return 'ходит'; }
  describe() { return this.name + ': ' + this.sound() + ', ' + this.move(); }
}
class Dog extends Animal { sound() { return 'гав'; } }
class Cat extends Animal { sound() { return 'мяу'; } }
class Bird extends Animal {
  sound() { return 'чирик'; }
  move() { return 'летает'; }
}
class Fish extends Animal { move() { return 'плавает'; } }
const kinds = { собака: Dog, кошка: Cat, птица: Bird, рыба: Fish };
const count = { ходит: 0, летает: 0, плавает: 0 };
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [kind, name] = line.split(' ');
  const a = new kinds[kind](name);
  console.log(a.describe());
  count[a.move()]++;
}
for (const [m, n] of Object.entries(count)) if (n) console.log(m + ': ' + n);
