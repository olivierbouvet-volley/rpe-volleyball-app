/**
 * @file setup.ts
 * @description Vitest test setup - provides localStorage mock
 */

import { afterEach } from 'vitest';

// Mock localStorage for Zustand persist middleware
class LocalStorageMock {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }
}

// Setup localStorage mock IMMEDIATELY (before any module imports)
if (typeof global !== 'undefined') {
  global.localStorage = new LocalStorageMock() as Storage;
}

afterEach(() => {
  // Clear localStorage after each test
  if (global.localStorage) {
    global.localStorage.clear();
  }
});
