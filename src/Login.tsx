import { useEffect, useState } from "react";
import { fetchProviders, loginURL } from "./api.ts";
import type { Providers } from "./wire.ts";

export function Login() {
  const [providers, setProviders] = useState<Providers | null>(null);
  const [devName, setDevName] = useState("");
  const authError = new URLSearchParams(window.location.search).get("auth_error");

  useEffect(() => {
    fetchProviders()
      .then(setProviders)
      .catch(() => setProviders({ providers: [], dev: true }));
  }, []);

  return (
    <div className="login">
      <div className="login-card">
        <img className="login-mark" src="/bordiko-icon.svg" alt="Bordiko" />
        <h1>Bordiko</h1>
        <p className="login-sub">Sign in to play. Every game is ranked.</p>

        {authError && <p className="error">Sign-in failed: {authError}</p>}

        <div className="login-buttons">
          {providers?.providers.includes("google") && (
            <a className="oauth google" href={loginURL("google")}>
              <span className="oauth-icon">G</span> Continue with Google
            </a>
          )}
          {providers?.providers.includes("github") && (
            <a className="oauth github" href={loginURL("github")}>
              <span className="oauth-icon">GH</span> Continue with GitHub
            </a>
          )}
        </div>

        {providers && !providers.providers.includes("google") && !providers.providers.includes("github") && (
          <p className="hint">
            OAuth providers aren't configured yet. Set GOOGLE_/GITHUB_CLIENT_ID on the
            gateway to enable them.
          </p>
        )}

        {providers?.dev && (
          <form
            className="dev-login"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = loginURL("dev", devName || "guest");
            }}
          >
            <div className="or">or continue as a guest (dev)</div>
            <div className="dev-row">
              <input
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                placeholder="pick a name"
                aria-label="dev display name"
              />
              <button type="submit">Enter</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
