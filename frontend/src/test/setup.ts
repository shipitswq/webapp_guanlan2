import { vi } from "vitest";
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

// Polyfill getComputedStyle for jsdom (some antd components need pseudo-elements)
const origGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
  const style = origGetComputedStyle(elt, pseudoElt);
  return new Proxy(style, {
    get(target, prop) {
      return prop in target ? (target as any)[prop] : "";
    },
  });
};

// ── lightweight-charts mock (jsdom has no Canvas) ──────────
const mockSeries = () => ({
  setData: vi.fn(),
  update: vi.fn(),
  applyOptions: vi.fn(),
  options: vi.fn(() => ({})),
  priceScale: vi.fn(() => ({ applyOptions: vi.fn() })),
});

vi.mock("lightweight-charts", () => {
  const AreaSeries = vi.fn();
  const LineSeries = vi.fn();
  const CandlestickSeries = vi.fn();
  const HistogramSeries = vi.fn();

  return {
    createChart: vi.fn(() => ({
      addSeries: vi.fn(() => mockSeries()),
      addCandlestickSeries: vi.fn(() => mockSeries()),
      addHistogramSeries: vi.fn(() => mockSeries()),
      removeSeries: vi.fn(),
      remove: vi.fn(),
      applyOptions: vi.fn(),
      timeScale: vi.fn(() => ({ fitContent: vi.fn(), setVisibleRange: vi.fn() })),
      priceScale: vi.fn(() => ({ applyOptions: vi.fn() })),
      subscribeCrosshairMove: vi.fn(),
      unsubscribeCrosshairMove: vi.fn(),
      resize: vi.fn(),
    })),
    AreaSeries,
    LineSeries,
    CandlestickSeries,
    HistogramSeries,
    ColorType: { Solid: "solid" },
  };
});
