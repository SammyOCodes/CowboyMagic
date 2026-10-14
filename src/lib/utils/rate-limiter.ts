const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

class RateLimiter {
  private lastCall = 0;
  private readonly minInterval: number;

  constructor(minInterval: number) {
    this.minInterval = minInterval;
  }

  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const wait = Math.max(0, this.minInterval - (now - this.lastCall));
    if (wait > 0) await delay(wait);
    this.lastCall = Date.now();
    return fn();
  }
}

// Scryfall's documented hard limits (https://scryfall.com/docs/api/rate-limits):
//   /cards/search, /cards/named, /cards/random, /cards/collection: 2 requests/second
//   everything else: 10 requests/second
// Intervals carry a little headroom. Exceeding them yields HTTP 429 and, if ignored, a ban.
export const scryfallLimiter = new RateLimiter(110);
export const scryfallSearchLimiter = new RateLimiter(550);
