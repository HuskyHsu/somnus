# Somnus - Premium 4-7-8 Sleep Aid & Neuro-Acoustic Breathing PWA

Somnus is a premium, minimalist, and ultra-low stimulation Progressive Web App (PWA) designed to guide users into deep, restful sleep using the **4-7-8 breathing method**. Built with React, TypeScript, and the Web Audio API, Somnus features a scientifically optimized, non-disruptive audio-visual environment that respects sleep hygiene and accelerates parasympathetic nervous system activation.

---

## 🌙 Scientific Design Philosophy

Sleep onset requires the mitigation of cognitive arousal and the reduction of stress hormones like **Cortisol**. Somnus achieves this through evidence-based visual and auditory neuro-acoustic engineering:

### 1. Neuro-Acoustic Zen Sound Design
The default **Zen Mode** is custom-designed using the Web Audio API to act as a somatic sleep-induction drone:
* **Deep Grounding Frequencies**: Anchored around a low **E2 fundamental pitch (82.41 Hz)** rather than higher, stimulating frequencies. This encourages deep physical resonance and relaxation.
* **0.38 Hz Delta Binaural Beat**: Synthesized dynamically by detuning dual triangle wave oscillators by exactly **8 cents** (~0.38 Hz detune) and mapping them to static stereo panning (**Full Left (-1) and Full Right (1)**). When wearing headphones, this encourages brainwave entrainment towards the deep Delta wave sleep range.
* **Respiratory lowpass Filter Sweeps**: A Biquad lowpass filter sweeps warm harmonics in sync with breathing:
  * **Inhale (4s)**: Filter cutoff opens from 180 Hz to 350 Hz, mimicking the acoustic opening of the airway.
  * **Hold (7s)**: Filter remains stable at 350 Hz.
  * **Exhale (8s)**: Filter sweeps down to 140 Hz, easing the user into a warm, grounded release.
* **Resonant Respiratory White Noise**: A custom-generated white noise buffer simulates the gentle friction of breathing, fading in and out organically without clicking or pop artifacts.

### 2. Slow-Attack Temple Chimes
To transition between breathing phases without triggering the startle reflex:
* Somnus replaces sudden high-pitched beeps with low, resonant **Zen temple gongs (110 Hz / 164.8 Hz)**.
* Features a **250ms slow-attack envelope** to prevent cortisol spikes, fading into a long **4.5-second exponential decay**.

### 3. Ultra-Low Stimulation Visual Aura
Visual guides are limited to a pitch-black background with subtle dark-red glows to prevent melatonin suppression:
* **Base Aura Color**: `#4d0000` (Deep Dark Red, `blur(40px)`) that expands on inhalation and fades on exhalation.
* **Transition Ripple**: `#991b1b` (Muted Red, `blur(30px)`) that pulses briefly during the 7-second hold phase to reinforce rhythmic pacing without requiring visual focus.

---

## 🧘 The 4-7-8 Breathing Technique
Popularized by Dr. Andrew Weil, this yogic pranayama technique acts as a natural nervous system tranquilizer:
1. **Inhale (4 seconds)**: Breathe in quietly through the nose (Deepening drone, rising filter, glowing aura).
2. **Hold (7 seconds)**: Hold your breath (Static drone, ripple visual cue).
3. **Exhale (8 seconds)**: Exhale completely with a whoosh sound (Gently fading drone, dropping filter, dark display).

---

## 🔒 Smart Sleep Hygiene & Usability
Somnus is built specifically for bedside environments:
* **Two-Phase Accidental Touch Protection**: When breathing, the controls fade out. To make changes, the first tap anywhere simply wakes the UI. Only after a **400ms delay** does the panel become interactive. This ensures that accidental touch during a drowsy state does not interrupt your cycle or adjust settings.
* **Dismissable Overlay**: Tapping on the empty blurred overlay immediately dismisses the panel back into breathing mode.
* **Settings Persistence**: All user preferences—including **Sleep Timer** (15m, 30m, 60m, or ∞), **Background Sound Type** (Zen, Campfire, Ocean), and individual volume levels—are saved to `localStorage` and restored upon open.
* **Screen Wake Lock**: Uses the Screen Wake Lock API to prevent the device screen from sleeping or locking during active breathing exercises, auto-restoring locks upon window refocus.

---

## 🛠 Tech Stack
* **Core**: React 19 (Vite) & TypeScript
* **Styling**: Tailwind CSS 4
* **Audio Synthesis**: Web Audio API (Multi-channel routing with master compression)
* **API Integrations**: Screen Wake Lock API, LocalStorage API
* **Deployment Format**: Progressive Web App (PWA) with complete offline caching support

---

## 🏗 Directory Structure & Components

* [`src/lib/AudioEngine.ts`](file:///Users/shihchi/Developer/somnus/src/lib/AudioEngine.ts)
  * Implements custom audio buffers, dual oscillators, stereo panners, Biquad lowpass sweeps, dynamics compressors, volume ramping, and scheduling algorithms.
* [`src/components/BreathingCircle.tsx`](file:///Users/shihchi/Developer/somnus/src/components/BreathingCircle.tsx)
  * Visualizes the breathing guide using CSS scaling transitions, CSS keyframe animations, and deep-red radial aura filters.
* [`src/components/ControlPanel.tsx`](file:///Users/shihchi/Developer/somnus/src/components/ControlPanel.tsx)
  * Implements PWA control interface, slide adjustments, sleep timer selection, background sound toggling, and dim overlay controls.
* [`src/hooks/useWakeLock.ts`](file:///Users/shihchi/Developer/somnus/src/hooks/useWakeLock.ts)
  * Standard hook interface requesting and releasing screen wake locks.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development
Start the development server:
```bash
npm run dev
```

### Production Build
Build the optimized production PWA assets:
```bash
npm run build
```
The compiled, ready-to-deploy static assets will be output in the `dist` directory.
