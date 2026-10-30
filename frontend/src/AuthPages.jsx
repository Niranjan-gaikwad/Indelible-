import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

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
  // Add this inside your AuthPages function, right below your existing submit function
  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // We send the Google Access Token to your Java backend
        // Your Java backend should verify it with Google and return your own JWT
        const res = await fetch(`${API_BASE}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenResponse.access_token }),
        });
        const data = await res.json();
        
        if (!res.ok) { setError(data.error || "Google login failed"); return; }
        
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        onAuthed(data.token, data.username);
      } catch (e) {
        setError("Backend unreachable.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Google Login Failed"),
  });

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
          

          {/* --- PASTE THIS NEW SECTION --- */}
          <div className="mt-8 flex items-center justify-between">
            <span className="w-1/5 border-b border-gray-800 lg:w-1/4"></span>
            <span className="text-xs text-center text-gray-500 uppercase tracking-widest font-semibold">
              Or continue with
            </span>
            <span className="w-1/5 border-b border-gray-800 lg:w-1/4"></span>
          </div>

          <button
            type="button"
            onClick={() => loginWithGoogle()}
            className="w-full mt-6 py-3.5 bg-transparent border border-gray-700 hover:bg-gray-900 hover:border-gray-600 text-white font-semibold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {/* Google G Logo SVG */}
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
          {/* --- END NEW SECTION --- */}

          {/* Toggle between Login and Register remains below this */}
          <p className="mt-8 text-center text-sm text-gray-500"></p>

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