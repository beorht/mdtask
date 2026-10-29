const cities = await (await fetch('http://api.edu/cities')).json();
const all = await Promise.all(cities.map((c) => fetch('http://api.edu/weather?city=' + encodeURIComponent(c)).then((r) => r.json())));
all.sort((a, b) => b.temp - a.temp || (a.city < b.city ? -1 : 1));
all.forEach((w) => console.log(w.city + ': ' + w.temp + '°'));
console.log('средняя: ' + (all.reduce((s, w) => s + w.temp, 0) / all.length).toFixed(1) + '°');
console.log('ясно в: ' + all.filter((w) => w.sky === 'ясно').map((w) => w.city).join(', '));
