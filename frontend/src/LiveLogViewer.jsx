import React, { useEffect, useRef } from 'react';

export default function LiveLogViewer({ logs }) {
  const bottomRef = useRef(null);

  // Auto-scroll to the bottom whenever a new log is added
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="w-full mt-8 bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
      {/* Terminal Header */}
      <div className="bg-[#111] px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
        </div>
        <span className="text-gray-500 text-xs font-mono uppercase tracking-widest">Network_Telemetry // Live</span>
      </div>
      
      {/* Terminal Output Area */}
      <div className="p-4 h-64 overflow-y-auto font-mono text-xs md:text-sm bg-black/50">
        {logs.length === 0 && <div className="text-gray-600 italic">Awaiting network telemetry...</div>}
        
        {logs.map((log, index) => (
          <div key={index} className="mb-1.5 flex gap-3 leading-relaxed">
            <span className="text-gray-600 shrink-0">[{log.time}]</span>
            <span className={`
              ${log.type === 'ERROR' ? 'text-red-500 font-semibold' : ''}
              ${log.type === 'WARN' ? 'text-yellow-400' : ''}
              ${log.type === 'SUCCESS' ? 'text-green-400 font-semibold' : ''}
              ${log.type === 'INFO' ? 'text-indigo-300' : ''}
              ${log.type === 'POLL' ? 'text-gray-400' : ''}
            `}>
              {log.message}
            </span>
          </div>
        ))}
        {/* Invisible div to force scroll to bottom */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}