function calc(a, op, b) {
  if (op === '/' && b === 0) throw new Error('деление на ноль');
  const ops = { '+': a + b, '-': a - b, '*': a * b, '/': a / b };
  if (!(op in ops)) throw new Error('неизвестная операция ' + op);
  return ops[op];
}
let done = 0;
let errors = 0;
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [a, op, b] = line.split(' ');
  try {
    console.log('= ' + calc(Number(a), op, Number(b)));
  } catch (e) {
    errors++;
    console.log('! ' + e.message);
  } finally {
    done++;
  }
}
console.log('обработано: ' + done + ', ошибок: ' + errors);
