let [a, b, c] = [input(), input(), input()];
[a, b] = [b, a];
console.log('a = ' + a + ', b = ' + b);
[a, b, c] = [b, c, a];
console.log(a, b, c);
