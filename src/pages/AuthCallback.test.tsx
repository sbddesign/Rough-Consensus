import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AuthCallback from "./AuthCallback";

const { mockGetSession, mockNavigate } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock("../services/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

describe("AuthCallback", () => {
  it("redirects home once a session is present", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: "user-1" },
        },
      },
    });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });
});
