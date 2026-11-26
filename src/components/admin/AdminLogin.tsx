"use client";

import { useState } from "react";
import { BackButton } from "@/components/BackButton";

export function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const requested = new URLSearchParams(window.location.search).get("next") || "/admin";
    const next = requested.startsWith("/admin") && requested !== "/admin/login" ? requested : "/admin";
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Could not sign in.");
    window.location.assign(next);
  }

  return (
    <div className="grid min-h-screen place-items-center px-5">
      <BackButton />
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 border border-white/10 bg-[#161412] p-8">
        <p className="wordmark text-sm text-gold">Double Zero</p>
        <p className="display text-[0.68rem] tracking-[0.24em] text-cream/50">Management</p>
        <h1 className="serif pt-2 text-4xl text-cream">Staff sign in</h1>
        <p className="text-sm text-cream/55">Separate from the customer website.</p>
        <label className="text-cream/70">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        <label className="text-cream/70">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        {error ? <p className="text-sm text-ember">{error}</p> : null}
        <button className="btn btn-ember w-full" type="submit">
          Enter dashboard
        </button>
      </form>
    </div>
  );
}
