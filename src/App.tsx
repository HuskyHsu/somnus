import { useState, useEffect, useRef, useCallback } from 'react';
import { BreathingCircle } from './components/BreathingCircle';
import { ControlPanel } from './components/ControlPanel';
import { audio } from './lib/AudioEngine';
import { useWakeLock } from './hooks/useWakeLock';

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [timerMinutes, setTimerMinutes] = useState<number>(15);
  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  
  const idleTimeout = useRef<number | null>(null);
  const sleepTimeout = useRef<number | null>(null);

  const stopPractice = useCallback(() => {
    audio.stop();
    setIsPlaying(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  const handleDismissUI = useCallback(() => {
    setShowUI(false);
    if (idleTimeout.current) {
      window.clearTimeout(idleTimeout.current);
      idleTimeout.current = null;
    }
  }, []);

  const handleTogglePlay = async () => {
    if (isPlaying) {
      stopPractice();
    } else {
      audio.init();
      audio.startCycle();
      setIsPlaying(true);
      await requestWakeLock();
    }
  };

  // Handle auto-stop timer
  useEffect(() => {
    if (sleepTimeout.current) window.clearTimeout(sleepTimeout.current);
    
    if (isPlaying && timerMinutes > 0) {
      sleepTimeout.current = window.setTimeout(() => {
        stopPractice();
      }, timerMinutes * 60 * 1000);
    }

    return () => {
      if (sleepTimeout.current) window.clearTimeout(sleepTimeout.current);
    };
  }, [isPlaying, timerMinutes, stopPractice]);

  useEffect(() => {
    const handleActivity = () => {
      setShowUI(true);
      if (idleTimeout.current) window.clearTimeout(idleTimeout.current);
      if (isPlaying) {
        idleTimeout.current = window.setTimeout(() => setShowUI(false), 3000);
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    if (isPlaying) {
      handleActivity();
    } else {
      setShowUI(true);
      if (idleTimeout.current) window.clearTimeout(idleTimeout.current);
    }

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      if (idleTimeout.current) window.clearTimeout(idleTimeout.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      audio.stop();
    };
  }, []);

  return (
    <main className="w-full h-screen bg-black overflow-hidden relative selection:bg-transparent">
      <BreathingCircle isActive={isPlaying} />
      
      <div className={`absolute inset-0 transition-opacity duration-1000 ${showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <ControlPanel 
          isPlaying={isPlaying} 
          onToggle={handleTogglePlay} 
          timerMinutes={timerMinutes}
          setTimerMinutes={setTimerMinutes}
          onDismiss={handleDismissUI}
        />
      </div>
    </main>
  );
}

export default App;

