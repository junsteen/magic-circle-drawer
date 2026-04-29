import '@testing-library/jest-dom';

// Canvas API のモック（jsdom は canvas をサポートしないため）
HTMLCanvasElement.prototype.getContext = () => null;
HTMLCanvasElement.prototype.toDataURL = () => '';

// IndexedDB のモック
const indexedDB = {
  open: () => ({ result: {}, onupgradeneeded: null, onsuccess: null, onerror: null }),
};
Object.defineProperty(window, 'indexedDB', { value: indexedDB, writable: true });

// performance.now のモック
if (typeof performance === 'undefined') {
  Object.defineProperty(window, 'performance', {
    value: { now: () => Date.now() },
    writable: true,
  });
}
