import { useState } from 'react';
import { audio } from '../lib/AudioEngine';

interface Props {
  isPlaying: boolean;
  onToggle: () => void;
  timerMinutes: number;
  setTimerMinutes: (m: number) => void;
  onDismiss?: () => void;
}

export const ControlPanel: React.FC<Props> = ({ isPlaying, onToggle, timerMinutes, setTimerMinutes, onDismiss }) => {
  const [bgVol, setBgVol] = useState(1);
  const [cueVol, setCueVol] = useState(1);
  const [noiseType, setNoiseType] = useState<'zen' | 'campfire' | 'ocean'>('zen');

  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setBgVol(v);
    audio.setVolumes(v, cueVol);
  };

  const handleCueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setCueVol(v);
    audio.setVolumes(bgVol, v);
  };

  const handleNoiseChange = (type: 'zen' | 'campfire' | 'ocean') => {
    setNoiseType(type);
    audio.setNoiseType(type);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPlaying && e.target === e.currentTarget && onDismiss) {
      onDismiss();
    }
  };

  return (
    <div 
      onClick={handleOverlayClick}
      className={`absolute inset-0 flex flex-col items-center justify-center z-10 text-white ${isPlaying ? 'bg-black/10 backdrop-blur-sm' : 'bg-black/40 backdrop-blur-md'}`}
    >
      
      <div className={`mb-12 flex flex-col items-center transition-all duration-500 ${isPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <p className="text-white/40 text-sm font-light tracking-[0.2em] mb-2 uppercase">Somnus</p>
        <p className="text-white/80 text-xl font-light tracking-widest">
          4-7-8 Deep Relaxation
        </p>
      </div>

      <button 
        onClick={onToggle}
        className="px-10 py-4 mb-12 bg-white/5 border border-white/10 rounded-2xl text-white/70 hover:bg-white/10 hover:text-white transition-all tracking-widest font-light cursor-pointer shadow-lg backdrop-blur-md"
      >
        {isPlaying ? 'Pause' : 'Start'}
      </button>

      <div className="flex flex-col gap-6 w-72 p-6 bg-white/5 border border-white/5 rounded-2xl max-h-[50vh] overflow-y-auto no-scrollbar">
        
        <div className="flex flex-col gap-3">
          <label className="text-xs text-white/50 tracking-wider">Sleep Timer</label>
          <div className="flex bg-white/10 p-1 rounded-lg">
            {[0, 15, 30, 60].map(t => (
              <button
                key={t}
                onClick={() => setTimerMinutes(t)}
                className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${timerMinutes === t ? 'bg-white/20 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
              >
                {t === 0 ? '∞' : `${t}m`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs text-white/50 tracking-wider">Background Type</label>
          <div className="flex bg-white/10 p-1 rounded-lg">
            {(['zen', 'campfire', 'ocean'] as const).map(t => (
              <button
                key={t}
                onClick={() => handleNoiseChange(t)}
                className={`flex-1 text-xs py-1.5 rounded-md transition-colors capitalize ${noiseType === t ? 'bg-white/20 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs text-white/50 tracking-wider flex justify-between">
            <span>Background Sound</span>
            <span>{Math.round(bgVol * 100)}%</span>
          </label>
          <input 
            type="range" min="0" max="1.5" step="0.05" 
            value={bgVol} onChange={handleBgChange}
            className="w-full accent-white/30 h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white/70 [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
        
        <div className="flex flex-col gap-3">
          <label className="text-xs text-white/50 tracking-wider flex justify-between">
            <span>Transition Cues</span>
            <span>{Math.round(cueVol * 100)}%</span>
          </label>
          <input 
            type="range" min="0" max="1.5" step="0.05" 
            value={cueVol} onChange={handleCueChange}
            className="w-full accent-white/30 h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white/70 [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
      </div>
    </div>
  );
};
