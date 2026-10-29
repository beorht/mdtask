function button({ text, color = 'серый', size = 'M', disabled = false }) {
  return '[' + size + '] ' + text + ' (' + color + ')' + (disabled ? ' — недоступна' : '');
}
while (true) {
  const line = input();
  if (line === 'конец') break;
  console.log(button(JSON.parse(line)));
}
