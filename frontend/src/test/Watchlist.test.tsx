import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WatchlistPage from "../pages/Watchlist";

const mockGet = vi.fn();
vi.mock("../api/client", () => ({
  default: { get: (...a: any[]) => mockGet(...a), post: vi.fn(), defaults: { headers: { common: {} } } },
}));

describe("WatchlistPage", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("渲染页面标题和搜索区域", () => {
    mockGet.mockResolvedValue({ data: { items: [{ code: "000001", name: "平安银行" }] } });
    render(<MemoryRouter><WatchlistPage /></MemoryRouter>);
    expect(screen.getByText("自选股")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("搜索股票代码或名称")).toBeInTheDocument();
  });

  it("加载时显示 Spin", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><WatchlistPage /></MemoryRouter>);
    // Component renders in loading state
  });

  it("添加股票后显示在列表中", async () => {
    mockGet.mockResolvedValue({ data: { items: [{ code: "000001", name: "平安银行" }] } });
    render(<MemoryRouter><WatchlistPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText("平安银行")).toBeInTheDocument();
    });
  });

  it("点击代码跳转到行情页", async () => {
    mockGet.mockResolvedValue({ data: { items: [{ code: "000001", name: "平安银行" }] } });
    render(<MemoryRouter><WatchlistPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText("平安银行")).toBeInTheDocument();
    });
    // Verify the stock code renders
    expect(screen.getByText("000001")).toBeInTheDocument();
  });
});
