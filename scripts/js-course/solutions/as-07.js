const outcomes = input().split(' ');
let call = 0;
const request = () => new Promise((resolve, reject) => {
  const ok = outcomes[call++] === 'ок';
  setTimeout(() => (ok ? resolve('данные') : reject(new Error('сбой сервера'))), 100);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function retry(fn, attempts, pause) {
  for (let k = 1; ; k++) {
    console.log('попытка ' + k);
    try {
      return await fn();
    } catch (e) {
      if (k === attempts) throw e;
      console.log('ошибка: ' + e.message + ', жду ' + pause + ' мс');
      await sleep(pause);
    }
  }
}
const attempts = Number(input());
const pause = Number(input());
try {
  console.log('результат: ' + (await retry(request, attempts, pause)));
} catch (e) {
  console.log('сдаёмся: ' + e.message);
}
