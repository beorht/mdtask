const a = input().split(' ').map(Number);
let swaps = 0;
let passes = 0;
let swapped = true;
while (swapped) {
  swapped = false;
  passes++;
  for (let i = 0; i + 1 < a.length; i++) {
    if (a[i] > a[i + 1]) {
      [a[i], a[i + 1]] = [a[i + 1], a[i]];
      swaps++;
      swapped = true;
    }
  }
}
console.log(a.join(' '));
console.log('обменов: ' + swaps + ', проходов: ' + passes);
