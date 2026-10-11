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
    setError(""); 
    setLoading(true);
    
    const path = mode === "login" ? "/auth/login" : "/auth/register";
    const body = mode === "login" ? { username, password } : { username, email, password };
    
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      
      if (!res.ok) { 
        setError(data.error || "Something went wrong"); 
        return; 
      }
      
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
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 relative overflow-hidden font-sans">
      
      {/* Background glowing blobs for a modern cloud aesthetic */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-[128px] opacity-20"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-[128px] opacity-20"></div>

      <div className="flex flex-col md:flex-row w-full max-w-5xl bg-[#0f0f11] rounded-3xl shadow-2xl border border-gray-800 z-10 overflow-hidden">
        
        {/* Left Side: Enterprise Branding (Hidden on mobile) */}
        <div className="hidden md:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-[#0f0f11] to-black relative border-r border-gray-800">
          <div className="z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-[0_0_20px_rgba(79,70,229,0.5)]">
                IN
              </div>
              <span className="text-2xl font-bold tracking-widest text-white">INDELIBLE</span>
            </div>
            
            <h2 className="text-4xl font-bold leading-tight text-white mt-16 mb-6">
              Durable.<br/>
              Resilient.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Unstoppable.</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-sm">
              Enterprise-grade workflow execution. Never lose a transaction to a server crash again.
            </p>
          </div>
          
          <div className="z-10 text-sm text-gray-600 font-medium tracking-wide">
            SE_IT_A1 CAPSTONE PROJECT
          </div>
        </div>

        {/* Right Side: The Dynamic Form (Login/Register) */}
        <div className="w-full md:w-1/2 p-8 md:p-14 flex flex-col justify-center relative bg-[#0f0f11]">
          <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">
            {mode === "login" ? "Welcome back" : "Create an account"}
          </h3>
          <p className="text-gray-400 mb-8">
            {mode === "login" ? "Sign in to the Admin Dashboard" : "Register to access the Durable Workflow Engine"}
          </p>

          {/* Upgraded Error Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 uppercase tracking-wider text-xs">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3.5 bg-black/50 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="admin_user"
                required
              />
            </div>

            {/* Email Field - Only shows during Registration */}
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 uppercase tracking-wider text-xs">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 bg-black/50 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="admin@indelible.com"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 uppercase tracking-wider text-xs">
                Password {mode === "register" && <span className="text-gray-600 lowercase normal-case ml-1">(6+ characters)</span>}
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-black/50 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
                minLength={mode === "register" ? 6 : undefined}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? "Processing..." : mode === "login" ? "Secure Login" : "Create Account"}
            </button>
          </form>

          {/* Toggle between Login and Register */}
          <p className="mt-8 text-center text-sm text-gray-500">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button 
              type="button"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer outline-none"
            >
              {mode === "login" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}