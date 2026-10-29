const original = JSON.parse(input());
let updated = original;
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [key, value] = line.split('=');
  updated = { ...updated, [key]: value };
}
console.log(original);
console.log(updated);
