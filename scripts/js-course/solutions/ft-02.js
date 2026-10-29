while (true) {
  const city = input();
  if (city === 'конец') break;
  const r = await fetch('http://api.edu/weather?city=' + encodeURIComponent(city));
  if (r.status === 404) {
    console.log(city + ': город не найден');
    continue;
  }
  const w = await r.json();
  console.log(w.city + ': ' + w.temp + '°, ' + w.sky + ', ветер ' + w.wind + ' м/с');
}
