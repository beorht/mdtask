function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
const ms = Number(input());
const search = debounce((t) => console.log('поиск: ' + t), ms);
const n = Number(input());
for (let i = 0; i < n; i++) {
  const line = input();
  const space = line.indexOf(' ');
  const at = Number(line.slice(0, space));
  const text = line.slice(space + 1);
  setTimeout(() => search(text), at);
}
