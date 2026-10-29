while (true) {
  const line = input();
  if (line === 'конец') break;
  if (line === 'list') {
    const notes = await (await fetch('http://api.edu/notes')).json();
    if (!notes.length) console.log('заметок нет');
    notes.forEach((n) => console.log('#' + n.id + ' ' + n.text));
    continue;
  }
  const r = await fetch('http://api.edu/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: line.slice(2) }),
  });
  const data = await r.json();
  console.log(r.ok ? 'создана #' + data.id : 'ошибка: ' + data.error);
}
