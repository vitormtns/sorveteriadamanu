"use client";
import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
export default function ResetPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setMessage("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    const { error } = await createBrowserSupabaseClient()!.auth.updateUser({
      password,
    });
    setMessage(
      error
        ? "Não foi possível atualizar a senha."
        : "Senha atualizada. Você já pode entrar.",
    );
  }
  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Nova senha</h1>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {message && <p className="notice">{message}</p>}
        <button className="btn">Atualizar senha</button>
      </form>
    </main>
  );
}
