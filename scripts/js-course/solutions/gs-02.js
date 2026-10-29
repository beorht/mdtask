const secret = Number(input());
let tries = 0;
while (true) {
  const g = Number(input());
  tries++;
  if (g === secret) break;
  console.log(g < secret ? 'больше' : 'меньше');
}
console.log('Угадано за ' + tries + ' попыток');
