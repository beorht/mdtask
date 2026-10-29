async function getJSON(url, options) {
  const r = await fetch(url, options);
  const data = await r.json();
  if (!r.ok) throw new Error('HTTP ' + r.status + ': ' + data.error);
  return data;
}
while (true) {
  const path = input();
  if (path === 'конец') break;
  try {
    console.log(JSON.stringify(await getJSON('http://api.edu' + path)));
  } catch (e) {
    console.log('ошибка: ' + e.message);
  }
}
