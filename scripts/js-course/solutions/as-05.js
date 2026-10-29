const load = (name, ms, ok = true) => new Promise((resolve, reject) => setTimeout(() => (ok ? resolve(name) : reject(new Error('не загрузилось: ' + name))), ms));
const tasks = [];
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [name, ms, status] = line.split(' ');
  tasks.push([name, Number(ms), status === 'ок']);
}
const settled = await Promise.allSettled(tasks.map((t) => load(...t)));
for (const r of settled) console.log(r.status === 'fulfilled' ? '✓ ' + r.value : '✗ ' + r.reason.message);
console.log('успешно: ' + settled.filter((r) => r.status === 'fulfilled').length + ' из ' + tasks.length);
try {
  await Promise.all(tasks.map((t) => load(...t)));
  console.log('all: ок');
} catch (e) {
  console.log('all: ' + e.message);
}
