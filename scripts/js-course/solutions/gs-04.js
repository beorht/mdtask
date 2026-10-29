const secret = Number(input());
let tries = 0;
while (true) {
  const g = Number(input());
  if (!Number.isInteger(g) || g < 1 || g > 100) {
    console.log('введите число от 1 до 100');
    continue;
  }
  tries++;
  if (g === secret) break;
  console.log(g < secret ? 'больше' : 'меньше');
}
console.log('Угадано за ' + tries + ' попыток');
