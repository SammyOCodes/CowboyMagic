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

export const scryfallLimiter = new RateLimiter(100);
