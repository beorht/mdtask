const secret = Number(input());
let tries = 0;
let won = false;
while (tries < 7) {
  const g = Number(input());
  tries++;
  if (g === secret) { won = true; break; }
  console.log(g < secret ? 'больше' : 'меньше');
}
console.log(won ? 'Угадано за ' + tries + ' попыток' : 'Попытки закончились, было загадано ' + secret);
