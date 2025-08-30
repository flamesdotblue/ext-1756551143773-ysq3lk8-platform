export default function HUD({ score, coins, lives, timeLeft, world, status }) {
  return (
    <div className="mt-6 mb-4 grid grid-cols-2 md:grid-cols-5 items-center gap-3 text-xs md:text-sm font-mono" aria-label="HUD">
      <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-3 flex items-center justify-between">
        <span className="text-slate-300">SCORE</span>
        <span className="font-bold text-amber-400">{String(score).padStart(6, '0')}</span>
      </div>
      <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-3 flex items-center justify-between">
        <span className="text-slate-300">COINS</span>
        <span className="font-bold text-amber-300">× {String(coins).padStart(2, '0')}</span>
      </div>
      <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-3 hidden md:flex items-center justify-between">
        <span className="text-slate-300">WORLD</span>
        <span className="font-bold text-sky-300">{world}</span>
      </div>
      <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-3 flex items-center justify-between">
        <span className="text-slate-300">TIME</span>
        <span className="font-bold text-emerald-300">{String(Math.max(0, Math.floor(timeLeft))).padStart(3, '0')}</span>
      </div>
      <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-3 flex items-center justify-between">
        <span className="text-slate-300">LIVES</span>
        <span className="font-bold text-rose-300">❤ {lives}</span>
      </div>
      <div className="md:col-span-5 col-span-2 text-center text-slate-300/90 mt-1">
        Status: <span className="font-semibold text-white">{status}</span>
      </div>
    </div>
  );
}
