"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button, Field, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [checking, setChecking] = useState(() => Boolean(createClient()));
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const client = createClient();
    if (!client) return;
    void client.auth.getSession().then(({ data }) => { setValid(Boolean(data.session)); setChecking(false); });
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setValid(true);
      setChecking(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (password.length < 8) { setError("A nova senha deve ter pelo menos 8 caracteres."); return; }
    if (password !== confirmation) { setError("As senhas não coincidem."); return; }
    setLoading(true); setError("");
    const { error: updateError } = await createClient()!.auth.updateUser({ password });
    if (updateError) setError("O link expirou ou não foi possível atualizar a senha.");
    else setSuccess(true);
    setLoading(false);
  }

  return <main className="grid min-h-screen place-items-center bg-[var(--purple-dark)] p-4"><div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-6 sm:p-8">
    <div className="mb-6 flex justify-center"><BrandLogo compact /></div><h1 className="text-2xl font-bold">Redefinir senha</h1>
    {checking ? <p className="mt-5 text-sm text-[var(--muted)]">Validando link...</p> : success ? <div className="mt-5"><p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Senha atualizada com sucesso.</p><Link href="/sistema" className="mt-4 block text-center font-semibold text-[var(--purple)]">Ir para o sistema</Link></div> : !valid ? <div className="mt-5"><p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Este link é inválido ou expirou.</p><Link href="/recuperar-senha" className="mt-4 block text-center font-semibold text-[var(--purple)]">Solicitar novo link</Link></div> :
      <form onSubmit={submit} className="mt-5 grid gap-4"><Field label="Nova senha"><Input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></Field><Field label="Confirmar nova senha"><Input type="password" required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></Field>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<Button disabled={loading}>{loading ? "Atualizando..." : "Atualizar senha"}</Button></form>}
  </div></main>;
}
