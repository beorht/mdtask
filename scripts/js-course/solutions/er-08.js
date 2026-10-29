const outcomes = input().split(' ');
let next = 0;
let tries = 0;
const server = () => {
  tries++;
  if (outcomes[next++] === 'сбой') throw new Error('сервер недоступен');
  return 'ок';
};
function retry(fn, attempts) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    } catch (e) {
      last = e;
    }
  }
  throw last;
}
const attempts = Number(input());
const q = Number(input());
for (let i = 1; i <= q; i++) {
  tries = 0;
  try {
    console.log('запрос ' + i + ': ' + retry(server, attempts) + ' с попытки ' + tries);
  } catch (e) {
    console.log('запрос ' + i + ': не удалось (' + e.message + ')');
  }
}
