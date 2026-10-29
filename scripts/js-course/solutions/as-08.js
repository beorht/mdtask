const load = (name, ms, ok = true) => new Promise((resolve, reject) => setTimeout(() => (ok ? resolve(name) : reject(new Error('не загрузилось: ' + name))), ms));
const limit = Number(input());
const tasks = [];
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [name, ms] = line.split(' ');
  tasks.push([name, Number(ms)]);
}
let next = 0;
async function worker() {
  while (next < tasks.length) {
    const [name, ms] = tasks[next++];
    console.log('старт: ' + name);
    await load(name, ms);
    console.log('готово: ' + name);
  }
}
await Promise.all(Array.from({ length: limit }, worker));
console.log('всё загружено');
