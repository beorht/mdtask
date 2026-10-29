let n = Number(input());
const id = setInterval(() => {
  if (n > 0) console.log(n--);
  else {
    console.log('Старт!');
    clearInterval(id);
  }
}, 1000);
console.log('отсчёт пошёл');
