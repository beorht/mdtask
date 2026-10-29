const letter = input();
const r = await fetch('http://api.edu/cities');
const cities = await r.json();
const list = letter ? cities.filter((c) => c.startsWith(letter)) : cities;
console.log('городов: ' + list.length);
if (!list.length) console.log('нет городов на букву ' + letter);
list.forEach((c, i) => console.log(i + 1 + '. ' + c));
