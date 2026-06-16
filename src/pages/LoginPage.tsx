import { LockKeyhole, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { isSupabaseConfigured } from "../data/supabase";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { session, signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/assemblies" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={onSubmit}>
        <div className="brand login-brand">
          <div className="brand-mark">CM</div>
          <div>
            <h1>Connection Master</h1>
            <span>Validated gas-line builder</span>
          </div>
        </div>
        {!isSupabaseConfigured ? (
          <div className="notice error">Missing Supabase env values in .env.local.</div>
        ) : null}
        <label>
          Email
          <input value={email} type="email" autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input
            value={password}
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <div className="notice error">{error}</div> : null}
        <button className="primary full" disabled={busy || !isSupabaseConfigured} type="submit">
          {mode === "signin" ? <LockKeyhole size={16} /> : <UserPlus size={16} />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button className="ghost full" type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Create account" : "Use existing account"}
        </button>
      </form>
    </main>
  );
}

