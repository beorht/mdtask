function once(fn) {
  let done = false;
  let result;
  return (...args) => {
    if (!done) {
      result = fn(...args);
      done = true;
    }
    return result;
  };
}
const x = Number(input());
const k = Number(input());
const setup = once((v) => {
  console.log('настройка…');
  return v * 10;
});
for (let i = 0; i < k; i++) console.log(setup(x));
