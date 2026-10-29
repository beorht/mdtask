const city = input();
const id = input();
const get = async (url, options) => {
  const r = await fetch(url, options);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
};
const [weather, rates, student] = await Promise.allSettled([
  get('http://api.edu/weather?city=' + encodeURIComponent(city)),
  get('http://api.edu/rates?base=USD', { headers: { 'X-API-Key': 'edu-key-2026' } }),
  get('http://api.edu/students/' + id),
]);
console.log(weather.status === 'fulfilled' ? 'Погода: ' + weather.value.city + ' ' + weather.value.temp + '°, ' + weather.value.sky : 'нет данных: погода');
console.log(rates.status === 'fulfilled' ? 'Курс: 1 USD = ' + rates.value.rates.UZS + ' UZS' : 'нет данных: курс');
console.log(student.status === 'fulfilled' ? 'Студент: ' + student.value.name + ', ' + student.value.group : 'нет данных: студент');
