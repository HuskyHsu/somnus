import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type Phase = 'idle' | 'inhale' | 'hold' | 'exhale';

interface Props {
  isActive: boolean;
}

export const BreathingCircle: React.FC<Props> = ({ isActive }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [rippleKey, setRippleKey] = useState(0);
  
  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      return;
    }

    let isMounted = true;
    
    const runCycle = async () => {
      while (isMounted && isActive) {
        setPhase('inhale');
        await new Promise(r => setTimeout(r, 4000));
        if (!isMounted || !isActive) break;

        setPhase('hold');
        await new Promise(r => setTimeout(r, 7000));
        if (!isMounted || !isActive) break;

        setPhase('exhale');
        await new Promise(r => setTimeout(r, 8000));
      }
    };

    runCycle();
    return () => { isMounted = false; };
  }, [isActive]);

  useEffect(() => {
    if (phase === 'hold') {
      setRippleKey(prev => prev + 1);
    } else if (phase === 'idle') {
      setRippleKey(0);
    }
  }, [phase]);

  let style: React.CSSProperties = {
    transitionProperty: 'all',
    transitionTimingFunction: 'linear',
  };

  switch (phase) {
    case 'idle':
      style = { ...style, transform: 'scale(0.5)', opacity: 0, transitionDuration: '1s' };
      break;
    case 'inhale':
      style = { ...style, transform: 'scale(1.5)', opacity: 0.8, transitionDuration: '4s' };
      break;
    case 'hold':
      style = { ...style, transform: 'scale(1.5)', opacity: 0.8, transitionDuration: '7s' };
      break;
    case 'exhale':
      style = { ...style, transform: 'scale(0.5)', opacity: 0, transitionDuration: '8s' };
      break;
  }

  return (
    <div className="relative flex items-center justify-center w-full h-full overflow-hidden bg-black">
      {/* Ripple wave at transition to hold */}
      {rippleKey > 0 && phase === 'hold' && (
        <div 
          key={rippleKey}
          className="absolute w-64 h-64 rounded-full pointer-events-none animate-ripple"
          style={{ backgroundColor: '#991b1b', filter: 'blur(30px)' }}
        />
      )}

      {/* Main breathing circle */}
      <div className="absolute w-64 h-64 rounded-full flex items-center justify-center" style={style}>
        <div 
          className={cn("w-full h-full rounded-full", phase === 'hold' ? 'animate-breathe' : '')}
          style={{ backgroundColor: '#4d0000', filter: 'blur(40px)' }}
        />
      </div>
    </div>
  );
};
