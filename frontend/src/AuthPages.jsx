import React, { useState } from 'react';

const API_BASE = "/api";

export default function AuthPages({ onAuthed }) {
  const [mode, setMode] = useState("login"); // login | register
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const path = mode === "login" ? "/auth/login" : "/auth/register";
    const body = mode === "login" ? { username, password } : { username, email, password };
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); return; }
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      onAuthed(data.token, data.username);
    } catch (e) {
      setError("Backend unreachable. Check the API is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-6">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border-4 border-slate-200">
        <div className="bg-indigo-600 px-6 pt-12 pb-8 text-white rounded-b-3xl shadow-lg text-center">
          <span className="text-2xl font-bold tracking-tight">Indelible</span>
          <p className="text-indigo-200 text-sm mt-1">{mode === "login" ? "Welcome back" : "Create your account"}</p>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-semibold uppercase">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required
              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {mode === "register" && (
            <div>
              <label className="text-xs text-slate-400 font-semibold uppercase">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          )}
          <div>
            <label className="text-xs text-slate-400 font-semibold uppercase">Password{mode === "register" && " (6+ characters)"}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === "register" ? 6 : undefined}
              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50">
            {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="text-xs text-slate-400 pb-6 text-center">
          {mode === "login" ? "No account yet?" : "Already have an account?"}{" "}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            className="text-indigo-600 font-semibold underline">
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
