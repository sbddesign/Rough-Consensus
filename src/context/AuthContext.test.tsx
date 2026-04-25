import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";
import type { SessionUser } from "../types";

const {
  mockCheckIsAdmin,
  mockGetSession,
  mockOnAuthStateChange,
  mockSignInWithOAuth,
  mockSignOut,
  mockUnsubscribe,
} = vi.hoisted(() => ({
  mockCheckIsAdmin: vi.fn(),
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockSignInWithOAuth: vi.fn(),
  mockSignOut: vi.fn(),
  mockUnsubscribe: vi.fn(),
}));

vi.mock("../services/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
  checkIsAdmin: (...args: unknown[]) => mockCheckIsAdmin(...args),
}));

function makeSessionUser(
  overrides: Partial<SessionUser> & {
    user_metadata?: Record<string, unknown>;
  } = {},
): SessionUser {
  return {
    id: "user-1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-04-24T00:00:00.000Z",
    email: "alex@example.com",
    role: "authenticated",
    ...overrides,
  } as SessionUser;
}

function AuthConsumer() {
  const { currentUser, loading, signIn, signOut } = useAuth();

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="user-name">{currentUser?.displayName ?? "none"}</div>
      <div data-testid="is-admin">{String(currentUser?.isAdmin ?? false)}</div>
      <button onClick={() => void signIn()}>sign in</button>
      <button onClick={() => void signOut()}>sign out</button>
    </div>
  );
}

describe("AuthContext", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockCheckIsAdmin.mockResolvedValue(false);
    mockOnAuthStateChange.mockImplementation((callback) => ({
      data: {
        subscription: {
          unsubscribe: mockUnsubscribe,
        },
      },
      callback,
    }));
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });
  });

  it("hydrates the current user from the initial session and checks admin status", async () => {
    const sessionUser = makeSessionUser({
      id: "user-42",
      user_metadata: { full_name: "Alex Example" },
    });
    mockGetSession.mockResolvedValue({
      data: { session: { user: sessionUser } },
    });
    mockCheckIsAdmin.mockResolvedValue(true);

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(mockCheckIsAdmin).toHaveBeenCalledWith("user-42");
    expect(screen.getByTestId("user-name")).toHaveTextContent("Alex Example");
    expect(screen.getByTestId("is-admin")).toHaveTextContent("true");
  });

  it("responds to auth changes and unsubscribes on unmount", async () => {
    let authChangeCallback:
      | ((event: string, session: { user: SessionUser } | null) => void)
      | undefined;

    mockOnAuthStateChange.mockImplementation((callback) => {
      authChangeCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      };
    });

    const { unmount } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    authChangeCallback?.("SIGNED_IN", {
      user: makeSessionUser({
        id: "user-99",
        user_metadata: {},
        email: "fallback@example.com",
      }),
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent(
        "fallback@example.com",
      );
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("calls the Supabase auth helpers for sign in and sign out", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await user.click(screen.getByRole("button", { name: "sign in" }));
    await user.click(screen.getByRole("button", { name: "sign out" }));

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "github",
      options: {
        redirectTo: "http://localhost:3000/auth/callback",
      },
    });
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
