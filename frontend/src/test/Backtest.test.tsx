import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import BacktestPage from "../pages/Backtest";

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock("../api/client", () => ({
  default: { get: (...a: any[]) => mockGet(...a), post: (...a: any[]) => mockPost(...a), defaults: { headers: { common: {} } } },
}));

describe("BacktestPage", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    // BacktestPage fetches saved strategies on mount
    mockGet.mockResolvedValue({ data: { items: [] } });
  });

  it("渲染回测参数表单", () => {
    render(<MemoryRouter><BacktestPage /></MemoryRouter>);
    expect(screen.getByText("回测参数")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("如 000001")).toBeInTheDocument();
    expect(screen.getByText("运行回测")).toBeInTheDocument();
    expect(screen.getByText("双均线交叉 (MA)")).toBeInTheDocument();
  });

  it("提交空表单不崩溃", async () => {
    render(<MemoryRouter><BacktestPage /></MemoryRouter>);
    const user = userEvent.setup();
    await user.click(screen.getByText("运行回测"));
    expect(screen.getByText("回测参数")).toBeInTheDocument();
  });

  it("运行回测后提交 API", async () => {
    mockPost.mockResolvedValueOnce({ data: { total_return: 15.2, annual_return: 8.5, max_drawdown: -5.3, sharpe_ratio: 1.2, trade_count: 10, equity_curve: [{ date: "2024-01-01", capital: 100000 }], trades: [] } });

    render(<MemoryRouter><BacktestPage /></MemoryRouter>);
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("如 000001"), "000001");
    await user.click(screen.getByText("运行回测"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });
  });
});
