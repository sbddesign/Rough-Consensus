import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GitHubLogin from "./GitHubLogin";

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("GitHubLogin", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
  });

  it("renders GitHub and Google sign-in buttons side by side", () => {
    render(<GitHubLogin />);

    expect(
      screen.getByRole("button", { name: "Sign in with GitHub" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign in with Google" }),
    ).toBeInTheDocument();
  });

  it("passes the selected provider to signIn", async () => {
    const user = userEvent.setup();
    const signIn = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: false,
      signIn,
      signOut: vi.fn(),
    });

    render(<GitHubLogin />);

    await user.click(screen.getByRole("button", { name: "Sign in with Google" }));

    expect(signIn).toHaveBeenCalledWith("google");
  });
});
