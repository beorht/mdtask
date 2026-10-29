const load = (name, ms, ok = true) => new Promise((resolve, reject) => setTimeout(() => (ok ? resolve(name) : reject(new Error('не загрузилось: ' + name))), ms));
const tasks = [];
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [name, ms] = line.split(' ');
  tasks.push([name, Number(ms)]);
}
const results = await Promise.all(tasks.map(([name, ms]) => load(name, ms).then((v) => {
  console.log('готово: ' + v);
  return v;
})));
console.log('результаты: ' + results.join(', '));
console.log('время: ' + Math.max(...tasks.map((t) => t[1])) + ' мс');
