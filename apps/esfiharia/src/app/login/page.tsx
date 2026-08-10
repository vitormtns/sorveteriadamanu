"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useStore } from "@/components/store-provider";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="auth-page">Carregando...</main>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const query = useSearchParams();
  const { snapshot } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reason = query.get("erro");
  const redirectError =
    reason === "loja_inativa"
      ? "Loja ainda não ativada."
      : reason === "acesso"
        ? "Sua conta não possui acesso à Esfiharia."
        : "";
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const client = createBrowserSupabaseClient();
    if (!client || !snapshot) {
      setError("Não foi possível validar a loja.");
      setLoading(false);
      return;
    }
    const { error: authError } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }
    const {
      data: { user },
    } = await client.auth.getUser();
    const [profile, membership] = await Promise.all([
      client
        .from("profiles")
        .select("role, active")
        .eq("id", user?.id ?? "")
        .maybeSingle(),
      client
        .from("profile_stores")
        .select("store_id")
        .eq("profile_id", user?.id ?? "")
        .eq("store_id", snapshot.store.id)
        .maybeSingle(),
    ]);
    if (
      !profile.data?.active ||
      profile.data.role !== "owner" ||
      !membership.data
    ) {
      await client.auth.signOut();
      setError("Sua conta não possui acesso à Esfiharia.");
      setLoading(false);
      return;
    }
    if (!snapshot.store.active) {
      await client.auth.signOut();
      setError("Loja ainda não ativada.");
      setLoading(false);
      return;
    }
    location.href = "/sistema";
  }
  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">Acesso interno</span>
        <h1>Esfiharia da Manu</h1>
        <p className="muted">
          Entre com a conta autorizada para esta operação.
        </p>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {(error || redirectError) && (
          <p className="notice" role="alert">
            {error || redirectError}
          </p>
        )}
        <button className="btn" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <p style={{ textAlign: "center" }}>
          <Link href="/recuperar-senha" className="muted">
            Esqueci minha senha
          </Link>
        </p>
      </form>
    </main>
  );
}
