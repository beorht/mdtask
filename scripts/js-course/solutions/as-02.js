const load = (name, ms, ok = true) => new Promise((resolve, reject) => setTimeout(() => (ok ? resolve(name) : reject(new Error('не загрузилось: ' + name))), ms));
const tasks = [];
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [name, ms] = line.split(' ');
  tasks.push([name, Number(ms)]);
}
let time = 0;
for (const [name, ms] of tasks) {
  console.log('загружено: ' + (await load(name, ms)));
  time += ms;
}
console.log('всего: ' + tasks.length + ', общее время: ' + time + ' мс');
