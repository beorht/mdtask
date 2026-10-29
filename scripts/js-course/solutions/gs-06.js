const games = Number(input());
let best = Infinity;
let total = 0;
for (let i = 1; i <= games; i++) {
  const secret = Number(input());
  let tries = 0;
  while (true) {
    tries++;
    if (Number(input()) === secret) break;
  }
  console.log('Игра ' + i + ': ' + tries + ' попыток');
  if (tries < best) best = tries;
  total += tries;
}
console.log('Лучший результат: ' + best);
console.log('Средний: ' + (total / games).toFixed(1));
