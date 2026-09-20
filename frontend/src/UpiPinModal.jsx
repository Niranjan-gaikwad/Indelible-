import React, { useState, useEffect } from 'react';

// Demo PINs, same idea as sandbox test card numbers: one succeeds, one deliberately
// fails, so the "wrong PIN" path is demoable without a real bank behind it.
const CORRECT_PIN = "1234";
const WRONG_PIN = "0000";

export default function UpiPinModal({ amount, onSuccess, onCancel }) {
  const [pin, setPin] = useState("");
  const [stage, setStage] = useState("entry"); // entry | verifying | error
  const [error, setError] = useState("");

  useEffect(() => {
    if (pin.length === 4) {
      setStage("verifying");
      const t = setTimeout(() => {
        if (pin === WRONG_PIN) {
          setError("Incorrect UPI PIN");
          setStage("error");
          setTimeout(() => { setPin(""); setStage("entry"); setError(""); }, 1200);
        } else {
          onSuccess();
        }
      }, 700);
      return () => clearTimeout(t);
    }
  }, [pin]);

  const press = (d) => {
    if (stage !== "entry") return;
    if (pin.length < 4) setPin(pin + d);
  };
  const backspace = () => { if (stage === "entry") setPin(pin.slice(0, -1)); };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-xs p-6 text-center shadow-2xl">
        <button onClick={onCancel} className="absolute mt-[-8px] ml-[-8px] text-slate-400 text-lg">✕</button>

        <p className="text-xs text-slate-400 font-semibold uppercase mt-2">Confirm Payment</p>
        <p className="text-3xl font-light text-slate-800 mt-1 mb-5">${amount}</p>
        <p className="text-sm text-slate-500 mb-4">Enter your UPI PIN</p>

        <div className="flex justify-center gap-3 mb-2 h-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i}
              className={`w-4 h-4 rounded-full border-2 ${
                i < pin.length
                  ? stage === "error" ? "bg-red-500 border-red-500" : "bg-indigo-600 border-indigo-600"
                  : "border-slate-300"
              }`} />
          ))}
        </div>

        <div className="h-5 mb-3">
          {stage === "verifying" && <p className="text-xs text-slate-400 animate-pulse">Verifying with bank...</p>}
          {stage === "error" && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {["1","2","3","4","5","6","7","8","9"].map(d => (
            <button key={d} onClick={() => press(d)}
              className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-lg font-semibold text-slate-700 active:scale-95 transition-transform">
              {d}
            </button>
          ))}
          <div />
          <button onClick={() => press("0")}
            className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-lg font-semibold text-slate-700 active:scale-95 transition-transform">
            0
          </button>
          <button onClick={backspace} className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500">⌫</button>
        </div>

        <p className="text-[10px] text-slate-300 mt-4">Demo PIN: 1234 (correct) · 0000 (incorrect)</p>
      </div>
    </div>
  );
}
