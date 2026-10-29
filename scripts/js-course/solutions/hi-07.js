const n = Number(input());
for (let i = 0; i < n; i++) {
  const line = input();
  const space = line.indexOf(' ');
  const ms = Number(line.slice(0, space));
  const text = line.slice(space + 1);
  setTimeout(() => console.log(text), ms);
}
console.log('запланировано: ' + n);
