import { useEffect, useState } from "react";
import { fetchProviders, loginURL } from "./api.ts";
import { useT } from "./i18n.tsx";
import type { Providers } from "./wire.ts";

export function Login() {
  const { t } = useT();
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
        <p className="login-sub">{t("login.sub")}</p>

        {authError && <p className="error">{t("login.failed", { error: authError })}</p>}

        <div className="login-buttons">
          {providers?.providers.includes("google") && (
            <a className="oauth google" href={loginURL("google")}>
              <span className="oauth-icon">G</span> {t("login.google")}
            </a>
          )}
          {providers?.providers.includes("github") && (
            <a className="oauth github" href={loginURL("github")}>
              <span className="oauth-icon">GH</span> {t("login.github")}
            </a>
          )}
        </div>

        {providers && !providers.providers.includes("google") && !providers.providers.includes("github") && (
          <p className="hint">{t("login.noProviders")}</p>
        )}

        {providers?.dev && (
          <form
            className="dev-login"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = loginURL("dev", devName || "guest");
            }}
          >
            <div className="or">{t("login.orGuest")}</div>
            <div className="dev-row">
              <input
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                placeholder={t("login.pickName")}
                aria-label="dev display name"
              />
              <button type="submit">{t("login.enter")}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
