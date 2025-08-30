import { useState } from 'react';
import Hero from './components/Hero';
import HUD from './components/HUD';
import GameCanvas from './components/GameCanvas';
import ControlsHelp from './components/ControlsHelp';

export default function App() {
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(400);
  const [world, setWorld] = useState('1-1');
  const [status, setStatus] = useState('Ready');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <Hero />
      <div className="max-w-6xl mx-auto px-4">
        <HUD score={score} coins={coins} lives={lives} timeLeft={timeLeft} world={world} status={status} />
      </div>
      <div className="max-w-6xl mx-auto px-4 pb-10">
        <GameCanvas
          onScore={setScore}
          onCoins={setCoins}
          onLives={setLives}
          onTime={setTimeLeft}
          onWorld={setWorld}
          onStatus={setStatus}
        />
        <ControlsHelp />
      </div>
    </div>
  );
}
