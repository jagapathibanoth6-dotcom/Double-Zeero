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
    <div className="admin-login">
      <BackButton />
      <form onSubmit={onSubmit} className="admin-login-card">
        <div className="admin-login-brand">
          <span className="admin-mark">DZ</span>
          <div>
            <p className="admin-brand-name">Double Zero</p>
            <p className="admin-brand-sub">Management</p>
          </div>
        </div>
        <div>
          <h1 className="admin-login-title">Staff sign in</h1>
          <p className="admin-login-copy">Separate from the customer website.</p>
        </div>
        <label className="admin-field">
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" type="email" required />
        </label>
        <label className="admin-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error ? (
          <p className="admin-login-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn btn-ember w-full" type="submit">
          Sign in
        </button>
      </form>
    </div>
  );
}
