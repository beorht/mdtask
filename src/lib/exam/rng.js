// Seeded random numbers for exam variants: the same seed always gives the same variant, so a
// student's data (logs, database, tests) can be rebuilt from exam_variants.seed.
const crypto = require('crypto');

function seedFrom(text) {
  return crypto.createHash('sha256').update(String(text)).digest().readUInt32LE(0);
}

// mulberry32
function createRng(seed) {
  const base = typeof seed === 'number' ? seed >>> 0 : seedFrom(seed);
  let a = base;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (list) => list[Math.floor(next() * list.length)],
    shuffle(list) {
      const out = [...list];
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    sample: (list, n) => rng.shuffle(list).slice(0, n),
    // n distinct integers from [min, max]
    distinct(n, min, max) {
      const seen = new Set();
      while (seen.size < n) seen.add(rng.int(min, max));
      return [...seen];
    },
    // A child generator, so adding draws to one part of a variant doesn't shift the others.
    fork: (label) => createRng(seedFrom(`${base}:${label}`)),
  };
  return rng;
}

module.exports = { createRng, seedFrom };
