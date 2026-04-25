import "@testing-library/jest-dom";
import { afterEach } from "vitest";

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock IndexedDB for Dexie
import "fake-indexeddb/auto";

// Clean up after each test
afterEach(() => {
  localStorage.clear();
});
