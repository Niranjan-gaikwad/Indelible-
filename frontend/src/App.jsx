import React, { useState, useEffect } from 'react';
import AuthPages from './AuthPages.jsx';
import UpiPinModal from './UpiPinModal.jsx';

const API_BASE = "/api";

const STEPS = [
  { key: "reserve_stock", label: "Verifying Account" },
  { key: "charge_card", label: "Bank Transfer" },
  { key: "create_invoice", label: "Generating Receipt" },
  { key: "send_notification", label: "Dispatching SMS" },
];

// Mock external users for the selection dashboard
const MOCK_RECIPIENTS = [
  { id: 101, name: "Alex Smith", handle: "@alexs", initials: "AS", color: "bg-blue-100 text-blue-700" },
  { id: 102, name: "Priya Sharma", handle: "@priya", initials: "PS", color: "bg-purple-100 text-purple-700" },
  { id: 103, name: "David Chen", handle: "@davidc", initials: "DC", color: "bg-emerald-100 text-emerald-700" },
];

// Vector Icons replacing emojis
const Icons = {
  Home: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  History: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Cards: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  Profile: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Settings: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
};

async function authFetch(path, opts = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    localStorage.removeItem("token"); localStorage.removeItem("username");
    window.location.reload(); 
  }
  return res;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState(localStorage.getItem("username"));

  if (!token) return <AuthPages onAuthed={(t, u) => { setToken(t); setUsername(u); }} />;
  return <Dashboard username={username} onLogout={() => { localStorage.removeItem("token"); localStorage.removeItem("username"); setToken(null); setUsername(null); }} />;
}

function Dashboard({ username, onLogout }) {
  const [tab, setTab] = useState("home"); 
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [amount, setAmount] = useState("0.00");
  const [activeWorkflowId, setActiveWorkflowId] = useState(null);
  const [events, setEvents] = useState([]);
  const [serverDead, setServerDead] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [newCard, setNewCard] = useState({ nickname: "", cardNumber: "", expiry: "" });
  const [showDevTools, setShowDevTools] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const refreshOrders = () => authFetch("/orders/my").then(r => r.ok ? r.json() : []).then(setMyOrders).catch(() => {});
  const refreshCards = () => authFetch("/payment-methods").then(r => r.ok ? r.json() : []).then(data => {
    setCards(data); if (!selectedCardId && data.length) setSelectedCardId(data[0].ID || data[0].id);
  }).catch(() => {});

  useEffect(() => {
    refreshOrders(); refreshCards();
    const fromUrl = new URLSearchParams(window.location.search).get("wf");
    if (fromUrl) { setActiveWorkflowId(fromUrl); return; }
    authFetch("/workflows/latest").then(r => r.json()).then(d => { if (d.workflowId) setActiveWorkflowId(d.workflowId); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeWorkflowId) {
      const url = new URL(window.location); url.searchParams.set("wf", activeWorkflowId); window.history.replaceState({}, "", url);
    }
  }, [activeWorkflowId]);

  useEffect(() => {
    if (!activeWorkflowId) return;
    const interval = setInterval(async () => {
      try {
        const res = await authFetch(`/workflows/${activeWorkflowId}/events`);
        if (!res.ok) throw new Error("down");
        const fetchedEvents = await res.json();
        setEvents(fetchedEvents); setServerDead(false);
        const isDone = fetchedEvents.some(e => 
          ((e.STEP_NAME || e.step_name) === "send_notification" && (e.STATUS || e.status) === "COMPLETED") ||
          ((e.STEP_NAME || e.step_name) === "reserve_stock" && (e.STATUS || e.status) === "COMPENSATED")
        );
        if (isDone) clearInterval(interval);
      } catch (err) { setServerDead(true); }
    }, 500);
    return () => clearInterval(interval);
  }, [activeWorkflowId]);

  const handleTransfer = async () => {
    if (!selectedCardId) { alert("Add a payment method first."); return; }
    setEvents([]); setServerDead(false);
    try {
      const res = await authFetch("/orders/checkout", { method: "POST" });
      const data = await res.json();
      setActiveWorkflowId(data.workflowId);
      refreshOrders();
    } catch (e) { alert("Network error: backend unreachable."); }
  };

  const resetDemo = () => {
    setActiveWorkflowId(null); setEvents([]); setSelectedRecipient(null); setAmount("0.00");
    const url = new URL(window.location); url.searchParams.delete("wf"); window.history.replaceState({}, "", url);
  };

  const addCard = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch("/payment-methods", { method: "POST", body: JSON.stringify(newCard) });
      if (res.ok) { setNewCard({ nickname: "", cardNumber: "", expiry: "" }); refreshCards(); } 
      else { const text = await res.text(); try { alert(JSON.parse(text).error); } catch { alert(`Server Error ${res.status}`); } }
    } catch { alert("Network Error"); }
  };

  const deleteCard = async (id) => {
    const res = await authFetch(`/payment-methods/${id}`, { method: "DELETE" });
    if (res.ok) { refreshCards(); if (selectedCardId === id) setSelectedCardId(null); }
  };

  const cancelOrder = async (id) => {
    const res = await authFetch(`/orders/${id}`, { method: "DELETE" });
    if (res.ok) refreshOrders(); else alert("Could not cancel");
  };

  const handleSoftCrash = async () => authFetch(`/workflows/${activeWorkflowId}/crash`, { method: "POST" });
  const handleFailPayment = async () => { await authFetch(`/workflows/${activeWorkflowId}/fail-payment`, { method: "POST" }); refreshOrders(); };
  const handleResume = async () => { await authFetch(`/workflows/${activeWorkflowId}/resume`, { method: "POST" }); refreshOrders(); };
  const handleHardKill = async () => { authFetch("/admin/kill", { method: "POST" }).catch(() => {}); setServerDead(true); };

  const getStepStatus = (stepKey) => {
    const stepEvents = events.filter(e => (e.STEP_NAME || e.step_name) === stepKey);
    if (!stepEvents.length) return "PENDING";
    return stepEvents[stepEvents.length - 1].STATUS || stepEvents[stepEvents.length - 1].status;
  };

  const hasCrashed = events.some(e => (e.STATUS || e.status) === "CRASHED") || serverDead;
  const hasFailed = events.some(e => (e.STATUS || e.status) === "COMPENSATED");
  const isComplete = getStepStatus("send_notification") === "COMPLETED";

  const TAB_LABELS = { home: "Send Money", history: "Transaction History", cards: "Payment Methods", profile: "My Profile", settings: "Account Settings" };

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans">
      
      {showPin && (
        <UpiPinModal amount={amount} onCancel={() => setShowPin(false)} onSuccess={() => { setShowPin(false); handleTransfer(); }} />
      )}

      {/* SIDEBAR NAVIGATION */}
      <div className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-10 fixed h-full">
        <div className="p-6 border-b border-slate-800">
          <span className="text-2xl font-bold tracking-tight">Indelible</span>
          <div className="text-slate-400 text-xs mt-1 font-mono uppercase tracking-widest">Engine Demo</div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {[
            { id: "home", icon: Icons.Home, label: "Send Money" },
            { id: "history", icon: Icons.History, label: "History" },
            { id: "cards", icon: Icons.Cards, label: "Saved Cards" },
            { id: "profile", icon: Icons.Profile, label: "Profile" },
            { id: "settings", icon: Icons.Settings, label: "Settings" },
          ].map(item => (
            <button key={item.id} onClick={() => { setTab(item.id); if(item.id === "home") resetDemo(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${tab === item.id ? "bg-indigo-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800"}`}>
              <div className={tab === item.id ? "text-white" : "text-slate-400"}>{item.icon}</div>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-lg font-bold shadow-inner">
              {username?.[0]?.toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{username}</p>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-700">
            Secure Logout
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 ml-64 flex flex-col h-screen overflow-y-auto bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center sticky top-0 z-0">
          <h1 className="text-2xl font-bold text-slate-800">{TAB_LABELS[tab]}</h1>
          <div className="text-sm font-medium text-slate-500 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 flex items-center gap-2">
            Status: <span className="text-emerald-600 font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>Engine Online</span>
          </div>
        </header>

        <main className="p-8 max-w-5xl mx-auto w-full">
          
          {/* SEND MONEY TAB */}
          {tab === "home" && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              
              {!activeWorkflowId ? (
                // Step 1: Select Recipient OR Enter Amount
                !selectedRecipient ? (
                  <div className="space-y-6">
                    <div className="mb-6">
                      <h2 className="text-lg font-bold text-slate-800">Select Recipient</h2>
                      <p className="text-sm text-slate-500">Choose a user from your network to send funds to.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {MOCK_RECIPIENTS.map(user => (
                        <div key={user.id} onClick={() => setSelectedRecipient(user)} className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all bg-slate-50 hover:bg-white group">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${user.color}`}>
                            {user.initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.handle}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-md mx-auto space-y-8 py-4">
                    <button onClick={() => setSelectedRecipient(null)} className="text-sm text-indigo-600 font-bold hover:underline mb-2 flex items-center gap-1">
                      ← Back to Users
                    </button>
                    
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${selectedRecipient.color}`}>
                        {selectedRecipient.initials}
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sending To</p>
                        <p className="font-bold text-slate-800">{selectedRecipient.name}</p>
                      </div>
                    </div>

                    <div className="text-center">
                      <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Transfer Amount</label>
                      <div className="flex items-center justify-center text-6xl font-light text-slate-800 mt-4">
                        <span className="text-5xl mr-2 text-slate-400">₹</span>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-transparent w-48 text-center outline-none border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-500 transition-colors" min="1.00" step="0.01" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Select Source</label>
                      <select className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-4 text-base focus:ring-2 focus:ring-indigo-500 outline-none" value={selectedCardId || ""} onChange={(e) => setSelectedCardId(Number(e.target.value))}>
                        <option value="" disabled>Choose a payment method...</option>
                        {cards.map(c => <option key={c.id || c.ID} value={c.id || c.ID}>{c.nickname || c.NICKNAME} (•••• {c.card_last4 || c.CARD_LAST4})</option>)}
                      </select>
                    </div>

                    <button onClick={() => selectedCardId ? setShowPin(true) : alert("Select a payment method first.")} disabled={!selectedCardId}
                      className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50">
                      Execute Distributed Transaction
                    </button>
                  </div>
                )
              ) : (
                // Step 2: Engine Orchestration View
                <div className="py-8">
                  <div className="mb-10 text-center">
                    <h3 className="text-2xl font-bold text-slate-800">Orchestration in Progress</h3>
                    <p className="text-sm text-slate-500 font-mono mt-2">Workflow ID: {activeWorkflowId}</p>
                  </div>

                  <div className="flex justify-between items-center max-w-3xl mx-auto mb-12 relative">
                    <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-100 -z-10 -translate-y-1/2"></div>
                    {STEPS.map((s) => {
                      const status = getStepStatus(s.key);
                      let bgColor = "bg-slate-200", textColor = "text-slate-400", pulse = "";
                      if (status === "STARTED") { bgColor = "bg-blue-500"; textColor = "text-blue-700 font-bold"; pulse = "animate-pulse shadow-lg shadow-blue-200"; }
                      if (status === "COMPLETED" || status === "SKIPPED") { bgColor = "bg-emerald-500"; textColor = "text-emerald-700 font-bold"; }
                      if (status === "CRASHED") { bgColor = "bg-red-500"; textColor = "text-red-700 font-bold"; pulse = "shadow-lg shadow-red-200"; }
                      if (status === "COMPENSATING" || status === "COMPENSATED") { bgColor = "bg-amber-500"; textColor = "text-amber-700 font-bold"; }
                      
                      return (
                        <div key={s.key} className="flex flex-col items-center gap-3 bg-white px-2 z-10">
                          <div className={`w-6 h-6 rounded-full border-4 border-white ${bgColor} ${pulse}`}></div>
                          <span className={`text-xs uppercase tracking-wider text-center w-24 ${textColor}`}>{s.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="max-w-xl mx-auto">
                    {hasCrashed && (
                      <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-center">
                        <p className="text-red-700 font-bold text-lg mb-1">Server Process Killed</p>
                        <p className="text-red-600 text-sm">Awaiting external infrastructure restart. State is preserved safely in Postgres.</p>
                      </div>
                    )}
                    {hasFailed && (
                      <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl text-center">
                        <p className="text-amber-700 font-bold text-lg mb-1">Business Failure Detected</p>
                        <p className="text-amber-600 text-sm mb-4">Saga pattern successfully executed compensating transactions to roll back state.</p>
                        <button onClick={resetDemo} className="px-6 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700">Acknowledge & Reset</button>
                      </div>
                    )}
                    {isComplete && (
                      <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl text-center">
                        <p className="text-emerald-800 font-bold text-lg mb-1">Transaction Committed</p>
                        <p className="text-emerald-600 text-sm mb-4">All saga steps completed idempotently.</p>
                        <button onClick={resetDemo} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">Initiate New Transfer</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {tab === "history" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="p-4 pl-6">Workflow ID</th>
                    <th className="p-4">Final Step</th>
                    <th className="p-4">Engine Status</th>
                    <th className="p-4 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myOrders.length === 0 && (<tr><td colSpan="4" className="p-8 text-center text-slate-500">No transactions recorded.</td></tr>)}
                  {myOrders.map(o => (
                    <tr key={o.workflow_id || o.WORKFLOW_ID} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4 pl-6 font-mono text-sm text-slate-700">{o.workflow_id || o.WORKFLOW_ID}</td>
                      <td className="p-4 text-sm text-slate-600">{o.current_step || o.CURRENT_STEP || "INIT"}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${["COMPLETED"].includes(o.status || o.STATUS) ? "bg-emerald-100 text-emerald-700" : ["FAILED", "CANCELLED"].includes(o.status || o.STATUS) ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {o.status || o.STATUS}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-6">
                        {["RUNNING", "COMPENSATING"].includes(o.status || o.STATUS) && (<button onClick={() => cancelOrder(o.workflow_id || o.WORKFLOW_ID)} className="text-sm text-red-600 font-bold hover:underline">Force Cancel</button>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CARDS TAB */}
          {tab === "cards" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">Saved Sources</h3>
              </div>
              <ul className="divide-y divide-slate-100">
                {cards.length === 0 && <li className="p-8 text-center text-slate-500">No payment methods found.</li>}
                {cards.map(c => (
                  <li key={c.id || c.ID} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">{Icons.Cards}</div>
                      <div>
                        <p className="font-bold text-slate-800 text-base">{c.nickname || c.NICKNAME}</p>
                        <p className="text-slate-500 font-mono text-sm">•••• •••• •••• {c.card_last4 || c.CARD_LAST4} <span className="ml-2 text-xs font-semibold uppercase">Exp: {c.expiry || c.EXPIRY}</span></p>
                      </div>
                    </div>
                    <button onClick={() => deleteCard(c.id || c.ID)} className="text-sm text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-lg transition-colors border border-transparent hover:border-red-200">Remove</button>
                  </li>
                ))}
              </ul>
              
              <div className="p-6 border-t border-slate-200 bg-slate-50">
                <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Register New Source</h4>
                <form onSubmit={addCard} className="flex gap-4">
                  <input placeholder="Nickname (e.g. Work Card)" value={newCard.nickname} onChange={e => setNewCard({ ...newCard, nickname: e.target.value })} className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  <input placeholder="0000 0000 0000 0000" required value={newCard.cardNumber} onChange={e => setNewCard({ ...newCard, cardNumber: e.target.value })} className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500" />
                  <input placeholder="MM/YY" value={newCard.expiry} onChange={e => setNewCard({ ...newCard, expiry: e.target.value })} className="w-24 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 text-center" />
                  <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors">Add</button>
                </form>
              </div>
            </div>
          )}

          {/* PROFILE TAB */}
          {tab === "profile" && (
            <div className="max-w-3xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-2xl font-bold shadow-inner">
                  {username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Personal Information</h2>
                  <p className="text-sm text-slate-500">Manage your identity and account details.</p>
                </div>
              </div>
              
              <ul className="divide-y divide-slate-100">
                <li className="px-8 py-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-wider w-48">Username</span>
                  <span className="text-base font-medium text-slate-800 flex-1">{username}</span>
                </li>
                <li className="px-8 py-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-wider w-48">Email Address</span>
                  <span className="text-base font-medium text-slate-800 flex-1">{username.toLowerCase()}@indelible.io</span>
                </li>
                <li className="px-8 py-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-wider w-48">Phone Number</span>
                  <span className="text-base font-medium text-slate-800 flex-1">+91 98765 43210</span>
                </li>
                <li className="px-8 py-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-wider w-48">Account Number</span>
                  <span className="text-base font-mono text-slate-800 flex-1 tracking-widest">IND-8832-1100</span>
                </li>
                <li className="px-8 py-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-wider w-48">Account Role</span>
                  <span className="text-base font-medium text-slate-800 flex-1">System Administrator</span>
                </li>
                <li className="px-8 py-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-wider w-48">Status</span>
                  <span className="text-base font-medium text-emerald-600 flex-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                  </span>
                </li>
              </ul>
            </div>
          )}

          {/* SETTINGS TAB */}
          {tab === "settings" && (
            <div className="max-w-3xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50">
                <h2 className="text-xl font-bold text-slate-800">System Preferences</h2>
                <p className="text-sm text-slate-500">Configure engine behavior and notifications.</p>
              </div>
              <ul className="divide-y divide-slate-100">
                <li className="px-8 py-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800 text-lg">Durable Logging</p>
                    <p className="text-sm text-slate-500 mt-1">Persist all state transitions to the PostgreSQL Event Log.</p>
                  </div>
                  <input type="checkbox" defaultChecked disabled className="w-5 h-5 accent-indigo-600 cursor-not-allowed opacity-60" />
                </li>
                <li className="px-8 py-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800 text-lg">Auto-Recovery</p>
                    <p className="text-sm text-slate-500 mt-1">Automatically resume orphaned workflows on server boot.</p>
                  </div>
                  <input type="checkbox" defaultChecked disabled className="w-5 h-5 accent-indigo-600 cursor-not-allowed opacity-60" />
                </li>
                <li className="px-8 py-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800 text-lg">SMS Alerts</p>
                    <p className="text-sm text-slate-500 mt-1">Receive a text message upon successful saga completion.</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5 accent-indigo-600 cursor-pointer" />
                </li>
              </ul>
            </div>
          )}

        </main>
      </div>

      {/* ADMIN PANEL - Fault Injection Tools */}
      <div className="fixed bottom-0 right-0 p-6 opacity-20 hover:opacity-100 transition-opacity z-50">
        <div className="text-xs text-slate-500 text-right mb-2 font-mono font-bold tracking-widest">HOVER: ENGINE ADMIN</div>
        <div className="bg-slate-900 p-5 rounded-2xl shadow-2xl border border-slate-700 flex flex-col gap-3 w-80">
          <div className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase mb-2 border-b border-slate-800 pb-2">Fault Injection Tools</div>
          <button onClick={handleHardKill} className="w-full py-2.5 bg-red-600/90 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex justify-between px-4 transition-colors"><span>CRASH SERVER (Hard)</span><span>💥</span></button>
          <button onClick={handleSoftCrash} className="w-full py-2.5 bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-bold rounded-lg flex justify-between px-4 transition-colors"><span>INTERRUPT THREAD (Soft)</span><span>⚡</span></button>
          <button onClick={handleFailPayment} className="w-full py-2.5 bg-orange-600/90 hover:bg-orange-500 text-white text-xs font-bold rounded-lg flex justify-between px-4 transition-colors"><span>DECLINE PAYMENT (Saga)</span><span>✗</span></button>
          <button onClick={handleResume} className="w-full py-2.5 bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex justify-between px-4 transition-colors"><span>RESUME ENGINE</span><span>🔄</span></button>
          {events.length > 0 && (
            <div className="mt-2 bg-slate-950 p-3 rounded-lg text-[10px] font-mono h-40 overflow-y-auto border border-slate-800 shadow-inner">
              {events.map((e, i) => (
                <div key={i} className="mb-2 border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                  <span className="text-indigo-400 font-bold">{e.STEP_NAME || e.step_name}</span><br/>
                  <span className={["COMPLETED", "SKIPPED"].includes(e.STATUS || e.status) ? "text-emerald-400" : "text-amber-400"}>[{e.STATUS || e.status}]</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}