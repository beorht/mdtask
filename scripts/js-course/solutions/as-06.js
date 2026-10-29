const load = (name, ms, ok = true) => new Promise((resolve, reject) => setTimeout(() => (ok ? resolve(name) : reject(new Error('не загрузилось: ' + name))), ms));
function withTimeout(promise, ms) {
  const timer = new Promise((_, reject) => setTimeout(() => reject(new Error('тайм-аут ' + ms + ' мс')), ms));
  return Promise.race([promise, timer]);
}
const limit = Number(input());
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [name, ms] = line.split(' ');
  try {
    await withTimeout(load(name, Number(ms)), limit);
    console.log(name + ': загружено');
  } catch (e) {
    console.log(name + ': ' + e.message);
  }
}
