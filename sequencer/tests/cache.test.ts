import { LRUCache } from '../src/dedup/cache';

describe('LRUCache', () => {
  let cache: LRUCache<string, boolean>;

  beforeEach(() => {
    cache = new LRUCache<string, boolean>(5, 1000);
  });

  test('get/set basic operations', () => {
    cache.set('key1', true);
    expect(cache.get('key1')).toBe(true);
  });

  test('get returns undefined for missing key', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  test('set overwrites existing key', () => {
    cache.set('key1', true);
    cache.set('key1', false);
    expect(cache.get('key1')).toBe(false);
  });

  test('has returns true for existing key', () => {
    cache.set('key1', true);
    expect(cache.has('key1')).toBe(true);
  });

  test('has returns false for missing key', () => {
    expect(cache.has('missing')).toBe(false);
  });

  test('delete removes key', () => {
    cache.set('key1', true);
    cache.delete('key1');
    expect(cache.has('key1')).toBe(false);
    expect(cache.get('key1')).toBeUndefined();
  });

  test('LRU eviction removes oldest entry when full', () => {
    const smallCache = new LRUCache<string, number>(3, 10000);
    smallCache.set('a', 1);
    smallCache.set('b', 2);
    smallCache.set('c', 3);

    expect(smallCache.has('a')).toBe(true);

    smallCache.set('d', 4);

    expect(smallCache.has('a')).toBe(false);
    expect(smallCache.has('b')).toBe(true);
    expect(smallCache.has('c')).toBe(true);
    expect(smallCache.has('d')).toBe(true);
  });

  test('get refreshes LRU position', () => {
    const smallCache = new LRUCache<string, number>(3, 10000);
    smallCache.set('a', 1);
    smallCache.set('b', 2);
    smallCache.set('c', 3);

    smallCache.get('a');

    smallCache.set('d', 4);

    expect(smallCache.has('a')).toBe(true);
    expect(smallCache.has('b')).toBe(false);
  });

  test('TTL expiration removes expired entries', async () => {
    const shortTtlCache = new LRUCache<string, boolean>(10, 50);
    shortTtlCache.set('key1', true);
    expect(shortTtlCache.has('key1')).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(shortTtlCache.has('key1')).toBe(false);
    expect(shortTtlCache.get('key1')).toBeUndefined();
  });

  test('has returns false for expired entry', async () => {
    const shortTtlCache = new LRUCache<string, boolean>(10, 50);
    shortTtlCache.set('key1', true);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(shortTtlCache.has('key1')).toBe(false);
  });

  test('size returns correct count', () => {
    expect(cache.size()).toBe(0);
    cache.set('key1', true);
    expect(cache.size()).toBe(1);
    cache.set('key2', true);
    expect(cache.size()).toBe(2);
  });

  test('size excludes expired entries', async () => {
    const shortTtlCache = new LRUCache<string, boolean>(10, 50);
    shortTtlCache.set('key1', true);
    shortTtlCache.set('key2', true);
    expect(shortTtlCache.size()).toBe(2);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(shortTtlCache.size()).toBe(0);
  });

  test('clear empties the cache', () => {
    cache.set('key1', true);
    cache.set('key2', true);
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(false);
  });

  test('different value types', () => {
    const numCache = new LRUCache<string, number>(5, 1000);
    numCache.set('count', 42);
    expect(numCache.get('count')).toBe(42);

    const objCache = new LRUCache<string, object>(5, 1000);
    const obj = { name: 'test' };
    objCache.set('obj', obj);
    expect(objCache.get('obj')).toEqual(obj);
  });
});
