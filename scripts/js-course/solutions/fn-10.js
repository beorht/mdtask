function frame(text, ch) {
  const line = ch.repeat(text.length + 4);
  return line + '\n' + ch + ' ' + text + ' ' + ch + '\n' + line;
}
const text = input();
const ch = input();
console.log(frame(text, ch));
