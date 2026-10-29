const count = [0, 0, 0, 0, 0, 0];
for (const m of input().split(' ').map(Number)) count[m]++;
const out = [];
let best = 5;
for (let m = 1; m <= 5; m++) for (let k = 0; k < count[m]; k++) out.push(m);
for (let m = 5; m >= 1; m--) if (count[m] > count[best]) best = m;
console.log(out.join(' '));
console.log('самая частая: ' + best);
