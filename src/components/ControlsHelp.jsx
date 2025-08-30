export default function ControlsHelp() {
  return (
    <div id="controls" className="mt-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 md:p-5">
        <h3 className="text-lg font-semibold">Controls</h3>
        <ul className="mt-2 grid gap-1 text-sm text-slate-300">
          <li>Move: Arrow Keys or A / D</li>
          <li>Jump: Space or K</li>
          <li>Run / Hold: Shift (longer jumps)</li>
          <li>Restart from checkpoint: R</li>
          <li>Mute/Unmute SFX: M</li>
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          This is an original homage with custom pixel art and code, inspired by classic platformers.
        </p>
      </div>
    </div>
  );
}
