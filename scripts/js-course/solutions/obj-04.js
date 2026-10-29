const n = Number(input());
const cities = {};
for (let i = 0; i < n; i++) {
  const u = JSON.parse(input());
  const city = u.address?.city;
  console.log(u.name + ': ' + (city ?? 'город не указан'));
  if (city) cities[city] = true;
}
console.log(Object.keys(cities).length);
