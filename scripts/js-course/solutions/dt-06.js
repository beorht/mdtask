let seed = Number(input());
const random = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const words = input().split(' ');
for (let i = words.length - 1; i > 0; i--) {
  const j = Math.floor(random() * (i + 1));
  [words[i], words[j]] = [words[j], words[i]];
}
console.log(words.join(' '));
