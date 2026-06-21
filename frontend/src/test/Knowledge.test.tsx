import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import KnowledgePage from "../pages/Knowledge";

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock("../api/client", () => ({
  default: { get: (...a: any[]) => mockGet(...a), post: (...a: any[]) => mockPost(...a), defaults: { headers: { common: {} } } },
}));

describe("KnowledgePage", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it("渲染分类侧边栏、搜索框、文章列表和空状态", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { items: [{ id: 1, name: "基础" }, { id: 2, name: "技术分析" }] } })
      .mockResolvedValueOnce({ data: { items: [] } });

    render(<MemoryRouter><KnowledgePage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText("基础")).toBeInTheDocument();
      expect(screen.getByText("技术分析")).toBeInTheDocument();
    });
    expect(screen.getByText("暂无文章")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("搜索文章...")).toBeInTheDocument();
  });

  it("有文章时渲染文章列表", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { items: [{ id: 1, name: "基础" }] } })
      .mockResolvedValueOnce({ data: { items: [{ id: 1, title: "K线入门", summary: "K线基础知识", tags: "基础,k线", read_count: 42 }] } });

    render(<MemoryRouter><KnowledgePage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText("K线入门")).toBeInTheDocument();
      expect(screen.getByText("阅读 42")).toBeInTheDocument();
    });
  });

  it("点击文章打开内容侧栏", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { items: [{ id: 1, name: "基础" }] } })
      .mockResolvedValueOnce({ data: { items: [{ id: 1, title: "K线入门", summary: "K线知识", tags: "", read_count: 10 }] } });
    mockGet.mockResolvedValueOnce({ data: { content: "# K线\n\n这是内容" } }); // article detail

    render(<MemoryRouter><KnowledgePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("K线入门")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByText("K线入门"));

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/v1/articles/1");
      expect(screen.getByText("关闭")).toBeInTheDocument();
    });
  });
});
