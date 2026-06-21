import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import MarketPage from "../pages/Market";

const mockGet = vi.fn();
vi.mock("../api/client", () => ({
  default: { get: (...a: any[]) => mockGet(...a), post: vi.fn(), defaults: { headers: { common: {} } } },
}));

describe("MarketPage", () => {
  beforeEach(() => {
    mockGet.mockReset();
    // MarketPage calls api.get('/api/v1/stocks/000001/kline') on mount via renderChart()
    // and api.get('/api/v1/stocks/000001/indicators') for active indicators
    mockGet.mockResolvedValue({ data: { dates: [], open: [], high: [], low: [], close: [], volume: [] } });
  });

  it("渲染搜索框和技术指标区域", async () => {
    render(<MemoryRouter><MarketPage /></MemoryRouter>);
    expect(screen.getByPlaceholderText("输入股票代码或名称")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("技术指标")).toBeInTheDocument();
      expect(screen.getByText("MA5")).toBeInTheDocument();
      expect(screen.getByText("MACD")).toBeInTheDocument();
      expect(screen.getByText("布林带")).toBeInTheDocument();
    });
  });

  it("选中/取消选中指标 pill-tab", async () => {
    render(<MemoryRouter><MarketPage /></MemoryRouter>);
    const user = userEvent.setup();
    await user.click(screen.getByText("MA5"));
    expect(screen.getByText("RSI")).toBeInTheDocument();
  });
});
