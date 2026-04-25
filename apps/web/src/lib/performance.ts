/**
 * Performance Optimization Utilities
 *
 * Collection of utilities for optimizing React and general application performance.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "./logger";

// ============= DEBOUNCE & THROTTLE =============

/**
 * Debounce function - delays execution until after wait milliseconds
 * since the last time it was invoked.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function - ensures function is called at most once in every wait milliseconds
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      func(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        func(...args);
      }, remaining);
    }
  };
}

// ============= REACT HOOKS =============

/**
 * useDebounce hook - returns debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useThrottle hook - returns throttled value
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastExecuted.current;

    if (elapsed >= interval) {
      lastExecuted.current = now;
      setThrottledValue(value);
    } else {
      const timerId = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, interval - elapsed);

      return () => clearTimeout(timerId);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * useDebouncedCallback hook - returns memoized debounced callback
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    debounce((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }, delay),
    [delay]
  );
}

/**
 * usePrevious hook - returns previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

/**
 * useIsMounted hook - returns whether component is mounted
 */
export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}

// ============= BATCH PROCESSING =============

/**
 * Process array in batches to avoid blocking UI
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => R | Promise<R>,
  batchSize: number = 100,
  onProgress?: (progress: number) => void
): Promise<R[]> {
  const results: R[] = [];
  const total = items.length;

  for (let i = 0; i < total; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, index) => processor(item, i + index))
    );
    results.push(...batchResults);

    // Report progress
    if (onProgress) {
      onProgress(Math.min(100, Math.round(((i + batch.length) / total) * 100)));
    }

    // Yield to main thread
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return results;
}

/**
 * Chunk array into smaller pieces
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// ============= MEMOIZATION =============

/**
 * Simple memoization function with LRU cache
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  func: T,
  maxCacheSize: number = 100
): T {
  const cache = new Map<string, ReturnType<T>>();
  const keys: string[] = [];

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = func(...args) as ReturnType<T>;

    // Manage cache size
    if (keys.length >= maxCacheSize) {
      const oldestKey = keys.shift()!;
      cache.delete(oldestKey);
    }

    cache.set(key, result);
    keys.push(key);

    return result;
  }) as T;
}

/**
 * Create a memoized selector (like reselect)
 */
export function createSelector<S, R>(
  selectors: ((state: S) => unknown)[],
  resultFunc: (...args: unknown[]) => R
): (state: S) => R {
  let lastArgs: unknown[] | null = null;
  let lastResult: R;

  return (state: S): R => {
    const args = selectors.map((selector) => selector(state));

    // Check if arguments changed
    const argsChanged =
      lastArgs === null || args.some((arg, index) => arg !== lastArgs![index]);

    if (argsChanged) {
      lastArgs = args;
      lastResult = resultFunc(...args);
    }

    return lastResult;
  };
}

// ============= LAZY LOADING =============

/**
 * Lazy load a module/component
 */
export function lazyLoad<T>(
  loader: () => Promise<{ default: T }>
): () => Promise<T> {
  let cached: T | null = null;

  return async () => {
    if (cached) return cached;
    const module = await loader();
    cached = module.default;
    return cached;
  };
}

// ============= REQUEST DEDUPLICATION =============

const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * Deduplicate concurrent requests with the same key
 */
export async function dedupeRequest<T>(
  key: string,
  request: () => Promise<T>
): Promise<T> {
  // Return existing request if pending
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  // Create new request
  const promise = request().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// ============= VIRTUAL LIST UTILITIES =============

/**
 * Calculate visible items for virtual scrolling
 */
export function calculateVisibleItems<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  scrollTop: number,
  overscan: number = 3
): {
  visibleItems: T[];
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
} {
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount);

  return {
    visibleItems: items.slice(startIndex, endIndex + 1),
    startIndex,
    endIndex,
    offsetY: startIndex * itemHeight,
    totalHeight,
  };
}

// ============= PERFORMANCE MONITORING =============

/**
 * Measure function execution time
 */
export function measureTime<T>(
  name: string,
  func: () => T
): { result: T; duration: number } {
  const start = performance.now();
  const result = func();
  const duration = performance.now() - start;

  if (process.env.NODE_ENV === "development") {
    logger.debug("Performance measurement", { name, duration });
  }

  return { result, duration };
}

/**
 * Measure async function execution time
 */
export async function measureTimeAsync<T>(
  name: string,
  func: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await func();
  const duration = performance.now() - start;

  if (process.env.NODE_ENV === "development") {
    logger.debug("Performance measurement", { name, duration });
  }

  return { result, duration };
}

/**
 * Create a performance mark and measure
 */
export function createPerfMarker(name: string): {
  start: () => void;
  end: () => number;
} {
  const markStart = `${name}-start`;
  const markEnd = `${name}-end`;

  return {
    start: () => performance.mark(markStart),
    end: () => {
      performance.mark(markEnd);
      performance.measure(name, markStart, markEnd);
      const entries = performance.getEntriesByName(name);
      const duration = entries[entries.length - 1]?.duration || 0;
      performance.clearMarks(markStart);
      performance.clearMarks(markEnd);
      performance.clearMeasures(name);
      return duration;
    },
  };
}
