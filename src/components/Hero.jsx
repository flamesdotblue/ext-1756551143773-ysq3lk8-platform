import Spline from '@splinetool/react-spline';

export default function Hero() {
  return (
    <section className="relative w-full h-[60vh] md:h-[70vh] lg:h-[80vh] overflow-hidden">
      <div className="absolute inset-0">
        <Spline scene="https://prod.spline.design/EFlEghJH3qCmzyRi/scene.splinecode" style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />
      <div className="relative z-10 h-full flex items-end">
        <div className="max-w-6xl mx-auto px-4 pb-10">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight drop-shadow-lg">Retro Platformer: World 1-1</h1>
          <p className="mt-3 text-slate-200/90 max-w-2xl text-sm md:text-base">
            A lovingly-crafted, original pixel platformer inspired by the classics. Run, jump, stomp enemies, and reach the flag!
          </p>
          <div className="mt-6 flex gap-3">
            <a href="#play" className="inline-flex items-center rounded-lg bg-amber-500 text-slate-950 font-semibold px-5 py-2.5 shadow hover:bg-amber-400 transition">Play Now</a>
            <a href="#controls" className="inline-flex items-center rounded-lg bg-slate-800/70 backdrop-blur text-white font-semibold px-5 py-2.5 hover:bg-slate-700 transition">Controls</a>
          </div>
        </div>
      </div>
    </section>
  );
}
