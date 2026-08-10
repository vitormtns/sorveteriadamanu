"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("erro");
    const message = reason === "conta"
      ? "Esta conta não está configurada para acessar o sistema."
      : reason === "configuracao"
        ? "O serviço de autenticação não está configurado neste ambiente."
        : "";
    if (!message) return;
    const timer = window.setTimeout(() => setError(message), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const supabase = createClient();
    if (!supabase) { setError("O Supabase não está configurado neste ambiente."); setLoading(false); return; }
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError("E-mail ou senha inválidos."); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("role, active").eq("id", user?.id ?? "").maybeSingle();
    if (!profile || !profile.active || profile.role !== "owner") {
      await supabase.auth.signOut();
      setError("Esta conta não está configurada para acessar o sistema.");
      setLoading(false);
      return;
    }
    const requestedPath = new URLSearchParams(window.location.search).get("retorno");
    const returnTo = requestedPath?.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/sistema";
    router.replace(returnTo);
  }

  return <main className="grid min-h-screen place-items-center bg-[var(--purple-dark)] p-4">
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(0,0,0,.2)] sm:p-8">
      <div className="mb-7 text-center"><div className="flex justify-center"><BrandLogo compact /></div><h1 className="mt-4 text-2xl font-bold text-[var(--purple-dark)]">Sorveteria da Manu</h1><p className="mt-1 text-sm font-normal text-[var(--muted)]">Acesso ao caixa</p></div>
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="E-mail"><Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" /></Field>
        <Field label="Senha"><Input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" /></Field>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <Button className="mt-2 w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
      </form>
      <Link href="/recuperar-senha" className="mt-5 block text-center text-sm font-semibold text-[var(--purple)]">Esqueci minha senha</Link>
    </div>
  </main>;
}
