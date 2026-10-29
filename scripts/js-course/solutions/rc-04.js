let moves = 0;
function hanoi(n, from, to, via) {
  if (n === 0) return;
  hanoi(n - 1, from, via, to);
  console.log('диск ' + n + ': ' + from + ' → ' + to);
  moves++;
  hanoi(n - 1, via, to, from);
}
hanoi(Number(input()), 1, 3, 2);
console.log('ходов: ' + moves);
