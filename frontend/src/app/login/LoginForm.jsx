"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error("Email ou mot de passe incorrect");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "linear-gradient(180deg, #FFFFFF 0%, #EBF0F8 100%)",
        padding: 24,
      }}
    >
      <div
        className="iad-card iad-fade-in"
        style={{ width: "100%", maxWidth: 420 }}
        data-testid="login-card"
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "#1B3A6B",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            <span style={{ textTransform: "lowercase" }}>i</span>
            <span style={{ textTransform: "uppercase" }}>AD</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                marginLeft: 8,
                color: "#64748B",
                letterSpacing: "0.18em",
              }}
            >
              IMMOBILIER
            </span>
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#1B3A6B",
              marginTop: 18,
              marginBottom: 4,
            }}
          >
            Bienvenue Betty 👋
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>
            Connecte-toi pour accéder à ton générateur d&apos;annonces ✨
          </p>
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <div>
            <label className="iad-label">Email</label>
            <input
              type="email"
              required
              autoFocus
              className="iad-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              data-testid="login-email"
            />
          </div>
          <div>
            <label className="iad-label">Mot de passe</label>
            <input
              type="password"
              required
              className="iad-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              data-testid="login-password"
            />
          </div>
          <button
            type="submit"
            className="iad-btn-primary"
            disabled={loading}
            data-testid="login-submit"
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <>
                <span className="iad-spinner" /> Connexion...
              </>
            ) : (
              <>
                <LogIn size={18} /> Se connecter
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
