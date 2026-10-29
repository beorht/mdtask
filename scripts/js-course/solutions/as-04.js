while (true) {
  const line = input();
  if (line === 'конец') break;
  const [kind, ...rest] = line.split(' ');
  if (kind === 'sync') console.log(rest.join(' '));
  else if (kind === 'micro') {
    const text = rest.join(' ');
    Promise.resolve().then(() => console.log(text));
  } else {
    const text = rest.slice(1).join(' ');
    setTimeout(() => console.log(text), Number(rest[0]));
  }
}
