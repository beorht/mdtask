const w = input();
const mid = Math.floor(w.length / 2);
console.log(w[mid]);
console.log(w.slice(0, mid) + w.slice(mid + 1));
