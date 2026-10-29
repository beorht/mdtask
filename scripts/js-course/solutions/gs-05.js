let lo = 1;
let hi = 100;
let tries = 0;
while (true) {
  const mid = Math.floor((lo + hi) / 2);
  tries++;
  console.log(mid);
  const answer = input();
  if (answer === 'да') { console.log('Число ' + mid + ' угадано за ' + tries + ' попыток'); break; }
  if (answer === 'больше') lo = mid + 1;
  else hi = mid - 1;
}
