/**
 * CPython-compatible MT19937 (random.Random).
 * Matches Python 3 for int seeds and version=2 str/bytes seeds.
 */
import { sha512 } from "js-sha512";

const N = 624;
const M = 397;
const MATRIX_A = 0x9908b0df;
const UPPER_MASK = 0x80000000;
const LOWER_MASK = 0x7fffffff;

export class PythonRandom {
  private mt: number[] = new Array(N).fill(0);
  private mti = N + 1;

  constructor(seed?: number | string) {
    if (seed === undefined) {
      this.seed(Date.now());
    } else {
      this.seed(seed);
    }
  }

  seed(a: number | string): void {
    if (typeof a === "string") {
      // Python 3 random.seed(str, version=2)
      const enc = new TextEncoder().encode(a);
      const digest = sha512.array(enc);
      const combined = new Uint8Array(enc.length + digest.length);
      combined.set(enc, 0);
      combined.set(digest, enc.length);
      let hex = "";
      for (const b of combined) hex += b.toString(16).padStart(2, "0");
      this.seedFromBigInt(BigInt("0x" + hex));
      return;
    }
    // Python seeds all ints via init_by_array (not init_genrand alone)
    this.seedFromBigInt(BigInt(a));
  }

  private seedFromBigInt(n: bigint): void {
    if (n < 0n) n = -n;
    const key: number[] = [];
    if (n === 0n) {
      key.push(0);
    } else {
      while (n > 0n) {
        key.push(Number(n & 0xffffffffn));
        n >>= 32n;
      }
    }
    this.initByArray(key);
  }

  private initGenrand(s: number): void {
    this.mt[0] = s >>> 0;
    for (this.mti = 1; this.mti < N; this.mti++) {
      const prev = this.mt[this.mti - 1] >>> 0;
      this.mt[this.mti] =
        (Math.imul(1812433253, prev ^ (prev >>> 30)) + this.mti) >>> 0;
    }
  }

  private initByArray(initKey: number[]): void {
    this.initGenrand(19650218);
    let i = 1;
    let j = 0;
    let k = N > initKey.length ? N : initKey.length;
    for (; k > 0; k--) {
      const prev = this.mt[i - 1] >>> 0;
      this.mt[i] =
        ((this.mt[i] ^
          Math.imul(prev ^ (prev >>> 30), 1664525)) +
          (initKey[j] >>> 0) +
          j) >>>
        0;
      i++;
      j++;
      if (i >= N) {
        this.mt[0] = this.mt[N - 1];
        i = 1;
      }
      if (j >= initKey.length) j = 0;
    }
    for (k = N - 1; k > 0; k--) {
      const prev = this.mt[i - 1] >>> 0;
      this.mt[i] =
        ((this.mt[i] ^
          Math.imul(prev ^ (prev >>> 30), 1566083941)) -
          i) >>>
        0;
      i++;
      if (i >= N) {
        this.mt[0] = this.mt[N - 1];
        i = 1;
      }
    }
    this.mt[0] = 0x80000000;
  }

  private genrandInt32(): number {
    let y: number;
    const mag01 = [0, MATRIX_A];
    if (this.mti >= N) {
      let kk: number;
      for (kk = 0; kk < N - M; kk++) {
        y = (this.mt[kk]! & UPPER_MASK) | (this.mt[kk + 1]! & LOWER_MASK);
        this.mt[kk] = (this.mt[kk + M]! ^ (y >>> 1) ^ mag01[y & 1]!) >>> 0;
      }
      for (; kk < N - 1; kk++) {
        y = (this.mt[kk]! & UPPER_MASK) | (this.mt[kk + 1]! & LOWER_MASK);
        this.mt[kk] =
          (this.mt[kk + (M - N)]! ^ (y >>> 1) ^ mag01[y & 1]!) >>> 0;
      }
      y = (this.mt[N - 1]! & UPPER_MASK) | (this.mt[0]! & LOWER_MASK);
      this.mt[N - 1] = (this.mt[M - 1]! ^ (y >>> 1) ^ mag01[y & 1]!) >>> 0;
      this.mti = 0;
    }
    y = this.mt[this.mti++]! >>> 0;
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  /** Python random.random() — [0.0, 1.0) */
  random(): number {
    const a = this.genrandInt32() >>> 5;
    const b = this.genrandInt32() >>> 6;
    return (a * 67108864.0 + b) / 9007199254740992.0;
  }

  getrandbits(k: number): number {
    if (k <= 0) return 0;
    if (k <= 32) return this.genrandInt32() >>> (32 - k);
    // Multi-word for larger k (not needed for dungeon gen)
    let result = 0;
    while (k > 0) {
      const take = Math.min(k, 32);
      result = (result * 2 ** take) + (this.genrandInt32() >>> (32 - take));
      k -= take;
    }
    return result;
  }

  private randbelow(n: number): number {
    if (n <= 0) throw new Error("randbelow requires n > 0");
    let bits = 0;
    let t = n;
    while (t > 0) {
      bits++;
      t >>>= 1;
    }
    let r = this.getrandbits(bits);
    while (r >= n) r = this.getrandbits(bits);
    return r;
  }

  randint(a: number, b: number): number {
    return a + this.randbelow(b - a + 1);
  }

  choice<T>(arr: readonly T[]): T {
    return arr[this.randbelow(arr.length)]!;
  }

  /** In-place Fisher–Yates matching Python random.shuffle */
  shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.randbelow(i + 1);
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
  }
}
