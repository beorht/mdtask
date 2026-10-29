function divide(a, b) {
  if (Number.isNaN(a) || Number.isNaN(b)) throw new TypeError('не число');
  if (b === 0) throw new Error('деление на ноль');
  return a / b;
}
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [a, b] = line.split(' ').map(Number);
  try {
    console.log(divide(a, b));
  } catch (e) {
    console.log('ошибка: ' + e.message);
  }
}
