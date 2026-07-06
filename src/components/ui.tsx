import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Button({ className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "bg-[var(--yellow)] text-[var(--purple-dark)] shadow-[0_6px_18px_rgba(248,185,0,.16)] hover:-translate-y-0.5 hover:bg-[#e8ad00]",
    secondary: "bg-[var(--purple)] text-white shadow-[0_6px_18px_rgba(58,10,77,.12)] hover:-translate-y-0.5 hover:bg-[var(--purple-dark)]",
    danger: "bg-red-50 text-red-700 hover:bg-red-100",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
  };
  return <button className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`} {...props} />;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`min-h-12 w-full rounded-xl border border-[var(--border)] bg-white/90 px-4 text-base outline-none transition placeholder:text-slate-400 focus:border-[#a36bb0] focus:bg-white focus:ring-4 focus:ring-[#3a0a4d0d] ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`min-h-12 w-full rounded-xl border border-[var(--border)] bg-white/90 px-4 text-base outline-none transition focus:border-[#a36bb0] focus:bg-white focus:ring-4 focus:ring-[#3a0a4d0d] ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`w-full rounded-xl border border-[var(--border)] bg-white/90 p-4 text-base outline-none transition focus:border-[#a36bb0] focus:bg-white focus:ring-4 focus:ring-[#3a0a4d0d] ${className}`} {...props} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-[var(--border)] bg-white/95 p-5 shadow-[0_8px_32px_rgba(36,0,47,.035)] ${className}`}>{children}</div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>;
}
