class Temperature {
  #celsius = 0;
  get celsius() { return this.#celsius; }
  set celsius(c) {
    if (c < -273.15) throw new RangeError('ниже абсолютного нуля');
    this.#celsius = c;
  }
  get fahrenheit() { return this.#celsius * 9 / 5 + 32; }
  set fahrenheit(f) { this.celsius = (f - 32) * 5 / 9; }
}
const t = new Temperature();
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [k, v] = line.split(' ');
  try {
    if (k === 'C') t.celsius = Number(v);
    else if (k === 'F') t.fahrenheit = Number(v);
    else console.log('C: ' + t.celsius.toFixed(1) + ', F: ' + t.fahrenheit.toFixed(1));
  } catch (e) {
    console.log('ошибка: ' + e.message);
  }
}
