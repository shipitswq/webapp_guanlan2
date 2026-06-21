import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppLayout from "../components/AppLayout";

// Mock api
vi.mock("../api/client", () => ({ default: { get: vi.fn(), post: vi.fn(), defaults: { headers: { common: {} } } } }));

describe("AppLayout", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("渲染导航栏、菜单项和 footer", () => {
    render(<MemoryRouter><AppLayout><div>content</div></AppLayout></MemoryRouter>);
    expect(screen.getByText("观澜")).toBeInTheDocument();
    expect(screen.getByText("知识库")).toBeInTheDocument();
    expect(screen.getByText("行情")).toBeInTheDocument();
    expect(screen.getByText("量化回测")).toBeInTheDocument();
    expect(screen.getByText("模拟交易")).toBeInTheDocument();
    expect(screen.getByText("自选股")).toBeInTheDocument();
    expect(screen.getByText("观澜 · 股票知识学习与演练平台")).toBeInTheDocument();
  });

  it("未登录状态显示导航栏（无需登录即可浏览）", () => {
    render(<MemoryRouter><AppLayout><div>content</div></AppLayout></MemoryRouter>);
    expect(screen.getByText("观澜")).toBeInTheDocument();
    expect(screen.getByText("知识库")).toBeInTheDocument();
  });

  it("渲染子元素", () => {
    render(<MemoryRouter><AppLayout><div>test-child</div></AppLayout></MemoryRouter>);
    expect(screen.getByText("test-child")).toBeInTheDocument();
  });
});
