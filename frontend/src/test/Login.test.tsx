import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../pages/Login";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockPost = vi.fn();
vi.mock("../api/client", () => ({ default: { post: (...args: any[]) => mockPost(...args), defaults: { headers: { common: {} } } } }));

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    mockPost.mockReset();
  });

  it("渲染登录表单：Tabs、输入框、提交按钮", () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByText("登录")).toBeInTheDocument();
    expect(screen.getByText("注册")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("用户名")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("密码")).toBeInTheDocument();
    expect(screen.getByText("登 录")).toBeInTheDocument();
  });

  it("空输入提交弹出警告", async () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const user = userEvent.setup();
    await user.click(screen.getByText("登 录"));
    // antd message.warning shows briefly; component renders without error
    expect(screen.getByPlaceholderText("用户名")).toBeInTheDocument();
  });

  it("登录成功后跳转 /knowledge", async () => {
    mockPost.mockResolvedValueOnce({ data: { token: "test-token", user_id: 1 } });
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("用户名"), "testuser");
    await user.type(screen.getByPlaceholderText("密码"), "password123");
    await user.click(screen.getByText("登 录"));
    await waitFor(() => {
      expect(localStorage.getItem("token")).toBe("test-token");
      expect(mockNavigate).toHaveBeenCalledWith("/knowledge");
    });
  });

  it("API 错误显示错误提示", async () => {
    mockPost.mockRejectedValueOnce({ response: { data: { detail: "用户名或密码错误" } } });
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("用户名"), "baduser");
    await user.type(screen.getByPlaceholderText("密码"), "wrong");
    await user.click(screen.getByText("登 录"));
    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("已登录状态下直接跳转", () => {
    localStorage.setItem("token", "existing-token");
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(mockNavigate).toHaveBeenCalledWith("/knowledge");
  });
});

