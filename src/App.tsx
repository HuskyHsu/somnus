import { useState, useEffect, useRef, useCallback } from 'react';
import { BreathingCircle } from './components/BreathingCircle';
import { ControlPanel } from './components/ControlPanel';
import { audio } from './lib/AudioEngine';
import { useWakeLock } from './hooks/useWakeLock';

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [isInteractive, setIsInteractive] = useState(true);
  const [timerMinutes, setTimerMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('somnus_timer_minutes');
    return saved !== null ? parseInt(saved, 10) : 15;
  });
  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  
  const idleTimeout = useRef<number | null>(null);
  const sleepTimeout = useRef<number | null>(null);
  const lastShowTime = useRef<number>(0);
  const interactiveTimeout = useRef<number | null>(null);

  const stopPractice = useCallback(() => {
    audio.stop();
    setIsPlaying(false);
    setShowUI(true);
    setIsInteractive(true);
    if (interactiveTimeout.current) {
      window.clearTimeout(interactiveTimeout.current);
      interactiveTimeout.current = null;
    }
    releaseWakeLock();
  }, [releaseWakeLock]);

  const handleDismissUI = useCallback(() => {
    // Prevent dismissing if it was just opened within the last 400ms (to avoid touchstart/click ghost triggers on mobile)
    if (Date.now() - lastShowTime.current < 400) {
      return;
    }
    setShowUI(false);
    setIsInteractive(false);
    if (idleTimeout.current) {
      window.clearTimeout(idleTimeout.current);
      idleTimeout.current = null;
    }
    if (interactiveTimeout.current) {
      window.clearTimeout(interactiveTimeout.current);
      interactiveTimeout.current = null;
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

  // Save timerMinutes to localStorage
  useEffect(() => {
    localStorage.setItem('somnus_timer_minutes', timerMinutes.toString());
  }, [timerMinutes]);

  useEffect(() => {
    const handleActivity = () => {
      setShowUI(prev => {
        if (!prev) {
          lastShowTime.current = Date.now();
          if (interactiveTimeout.current) window.clearTimeout(interactiveTimeout.current);
          interactiveTimeout.current = window.setTimeout(() => {
            setIsInteractive(true);
          }, 400);
        }
        return true;
      });
      if (idleTimeout.current) window.clearTimeout(idleTimeout.current);
      if (isPlaying) {
        idleTimeout.current = window.setTimeout(() => {
          setShowUI(false);
          setIsInteractive(false);
        }, 3000);
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('mousedown', handleActivity);

    if (isPlaying) {
      handleActivity();
    } else {
      setShowUI(true);
      setIsInteractive(true);
      if (idleTimeout.current) window.clearTimeout(idleTimeout.current);
    }

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      if (idleTimeout.current) window.clearTimeout(idleTimeout.current);
      if (interactiveTimeout.current) window.clearTimeout(interactiveTimeout.current);
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
          isInteractive={isInteractive}
        />
      </div>
    </main>
  );
}

export default App;

