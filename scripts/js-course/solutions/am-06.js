console.log(input().split(' ').map(Number).filter((x) => x % 2 !== 0).map((x) => x * x).reduce((s, x) => s + x, 0));
