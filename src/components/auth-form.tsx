"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowUpRight, CircleDollarSign, Eye, EyeOff } from "lucide-react";

type AuthFormProps = { mode: "login" | "register" };

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(isRegister ? { name } : {}), email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to continue.");
      router.replace("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-side">
        <Link className="brand auth-brand" href="/"><span className="brand-mark"><CircleDollarSign size={20} /></span>pennywise</Link>
        <div className="auth-pitch">
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR MONEY, IN FOCUS</div>
          <h1>Make room for<br /><em>what matters.</em></h1>
          <p>A calmer, clearer way to understand your spending and make your money go further.</p>
          <div className="pitch-stat"><span className="pitch-stat-icon"><ArrowUpRight size={19} /></span><span><strong>Small steps add up.</strong><small>See your progress, one month at a time.</small></span></div>
        </div>
        <div className="auth-footer">A little more clarity, every day.</div>
        <div className="auth-decoration decoration-one" /><div className="auth-decoration decoration-two" />
      </div>
      <section className="auth-main">
        <Link href="/" className="back-link"><ArrowLeft size={16} /> Back to home</Link>
        <div className="auth-card">
          <div className="auth-mobile-brand"><span className="brand-mark"><CircleDollarSign size={20} /></span>pennywise</div>
          <div className="auth-card-heading"><span className="eyebrow">{isRegister ? "A FRESH START" : "WELCOME BACK"}</span><h2>{isRegister ? "Create your account" : "Good to see you."}</h2><p>{isRegister ? "Your financial reset starts right here." : "Your money dashboard is waiting for you."}</p></div>
          <form onSubmit={handleSubmit} className="auth-form">
            {isRegister && <label>Your name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" required minLength={2} maxLength={80} /></label>}
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
            <label>Password<div className="password-wrap"><input type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? "At least 8 characters" : "Enter your password"} required minLength={isRegister ? 8 : 1} maxLength={72} /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button type="submit" className="button button-primary auth-submit" disabled={loading}>{loading ? "One moment…" : isRegister ? "Create account" : "Sign in"} {!loading && <ArrowUpRight size={17} />}</button>
          </form>
          <p className="auth-switch">{isRegister ? "Already have an account?" : "New to Pennywise?"} <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link></p>
          <p className="auth-privacy">Your financial data is private and only visible to you.</p>
        </div>
      </section>
    </main>
  );
}
