import "@testing-library/jest-dom/vitest";

// Polyfill ResizeObserver for jsdom (required by Ant Design v5+)
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill matchMedia for jsdom (required by Ant Design Row/Col responsive)
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

// Mock lightweight-charts (jsdom has no Canvas support)
vi.mock("lightweight-charts", () => ({
  createChart: vi.fn(() => ({
    addCandlestickSeries: vi.fn(() => ({ setData: vi.fn() })),
    addHistogramSeries: vi.fn(() => ({ setData: vi.fn(), priceScale: vi.fn(() => ({ applyOptions: vi.fn() })) })),
    addLineSeries: vi.fn(() => ({ setData: vi.fn(), priceScale: vi.fn(() => ({ applyOptions: vi.fn() })) })),
    addAreaSeries: vi.fn(() => ({ setData: vi.fn() })),
    removeSeries: vi.fn(),
    remove: vi.fn(),
    applyOptions: vi.fn(),
    timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
  })),
}));
