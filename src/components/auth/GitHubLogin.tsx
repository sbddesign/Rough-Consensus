import React, { useState } from "react";
import { Github } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import type { OAuthProvider } from "../../types";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M21.81 12.23c0-.71-.06-1.39-.2-2.05H12v3.88h5.5a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.05-4.41 3.05-7.47Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.08-.91 6.77-2.47l-3.3-2.56c-.91.61-2.09.98-3.47.98-2.66 0-4.92-1.8-5.73-4.21H2.86v2.64A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.27 13.74a5.95 5.95 0 0 1 0-3.48V7.62H2.86a10 10 0 0 0 0 8.76l3.4-2.64Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.05c1.5 0 2.84.52 3.9 1.54l2.92-2.92C17.07 3.03 14.75 2 12 2a10 10 0 0 0-9.14 5.62l3.4 2.64C7.08 7.85 9.34 6.05 12 6.05Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubLogin() {
  const { signIn, loading } = useAuth();
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null,
  );
  const isBusy = loading || pendingProvider !== null;

  const handleLogin = async (provider: OAuthProvider) => {
    try {
      setPendingProvider(provider);
      await signIn(provider);
    } catch (error) {
      console.error("Login failed:", error);
      setPendingProvider(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <h2 className="text-xl font-semibold text-white mb-3">
        Join the Discussion
      </h2>
      <p className="text-blue-100/80 mb-6 text-center text-sm">
        Sign in with GitHub or Google to participate in debates and cast your
        votes.
      </p>

      <div className="grid w-full grid-cols-2 gap-3">
        <Button
          onClick={() => handleLogin("github")}
          disabled={isBusy}
          icon={<Github className="h-5 w-5" />}
          className="min-h-12 justify-center gap-2 bg-white/90 px-4 text-sm text-gray-900 transition-colors hover:bg-white hover:text-black"
          aria-label="Sign in with GitHub"
        >
          {pendingProvider === "github" ? "Signing in..." : "GitHub"}
        </Button>
        <Button
          onClick={() => handleLogin("google")}
          disabled={isBusy}
          icon={<GoogleIcon />}
          className="min-h-12 justify-center gap-2 bg-white/90 px-4 text-sm text-gray-900 transition-colors hover:bg-white hover:text-black"
          aria-label="Sign in with Google"
        >
          {pendingProvider === "google" ? "Signing in..." : "Google"}
        </Button>
      </div>
    </div>
  );
}

export default GitHubLogin;
