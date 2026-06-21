import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

// Mock pages to avoid heavy imports
vi.mock("../pages/Login", () => ({ default: () => <div>LoginPage</div> }));
vi.mock("../pages/Knowledge", () => ({ default: () => <div>KnowledgePage</div> }));
vi.mock("../pages/Market", () => ({ default: () => <div>MarketPage</div> }));
vi.mock("../pages/Backtest", () => ({ default: () => <div>BacktestPage</div> }));
vi.mock("../pages/Trading", () => ({ default: () => <div>TradingPage</div> }));
vi.mock("../pages/Watchlist", () => ({ default: () => <div>WatchlistPage</div> }));
vi.mock("../components/AppLayout", () => ({ default: ({ children }: any) => <div>AppLayout{children}</div> }));

describe("App", () => {
  it("默认路由跳转到知识库（/knowledge）", () => {
    render(<App />);
    expect(screen.getByText("KnowledgePage")).toBeInTheDocument();
  });
});
