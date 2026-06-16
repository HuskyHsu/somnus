# Somnus - Minimalist 4-7-8 Sleep Aid & Breathing PWA

Somnus is a premium, minimalist, and ultra-low stimulation web application designed to help users transition into deep sleep using the **4-7-8 breathing method**. Built with React, TypeScript, Tailwind CSS, and the Web Audio API, it offers a seamless and non-disruptive audio-visual environment that respects sleep hygiene.

## 🌙 Why Somnus?
Sleep environments require extremely low sensory stimulation. Somnus addresses this through carefully researched auditory and visual designs:
- **Pink Noise**: Unlike harsh white noise, pink noise has a power spectral density inversely proportional to frequency ($1/f$). It mimics deep rustling leaves or wind, making it more natural and soothing for the human ear.
- **Deep Red Lighting**: Using color psychology, the visual cue is restricted to a very deep red (`#200000` / HSL: Hue 0, Saturation 100%, Lightness < 15%) on a pitch-black background. This minimizes blue light exposure and prevents the suppression of melatonin, the sleep hormone.
- **Distraction-Free**: Once the exercise starts, all buttons, sliders, and text fade out completely, leaving only the gentle visual pulse to guide your breathing.

---

## 🧘 The 4-7-8 Breathing Technique
Originating from pranayama yoga and popularized by Dr. Andrew Weil, the 4-7-8 technique is a natural tranquilizer for the nervous system:
1. **Inhale (4 seconds)**: Breathe in quietly through your nose.
2. **Hold (7 seconds)**: Hold your breath.
3. **Exhale (8 seconds)**: Exhale completely through your mouth with a soft whoosh sound.

---

## 🛠 Tech Stack
- **Framework**: React 19 (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Audio Synthesis**: Web Audio API
- **Persistence & Lock**: Screen Wake Lock API
- **App Format**: Progressive Web App (PWA) via `vite-plugin-pwa`

---

## 🏗 Component Architecture
The codebase is structured modularly for clean segregation of concerns:

- [`src/lib/AudioEngine.ts`](file:///Users/shihchi/Developer/somnus/src/lib/AudioEngine.ts)
  - Implements the Web Audio API nodes.
  - Dynamically synthesizes pink noise, manages dual oscillators (producing a deep 110Hz - 220Hz binaural drone), and schedules auditory cues for phase transitions.
  - Employs smooth parameter ramping (`exponentialRampToValueAtTime`) to eliminate clicking sounds and pops.
- [`src/components/BreathingCircle.tsx`](file:///Users/shihchi/Developer/somnus/src/components/BreathingCircle.tsx)
  - Controls the visual guidance using CSS transitions.
  - Renders the deep red glow that scales and fades in sync with the current breathing phase (inhale, hold, exhale).
- [`src/components/ControlPanel.tsx`](file:///Users/shihchi/Developer/somnus/src/components/ControlPanel.tsx)
  - Houses the user settings, including the **Sleep Timer** (15m, 30m, 60m, or infinity), **Background Sound Type** (Zen, Campfire, Ocean), and individual volume sliders for background noise and transition cues.
- [`src/hooks/useWakeLock.ts`](file:///Users/shihchi/Developer/somnus/src/hooks/useWakeLock.ts)
  - Custom hook wrapping the **Screen Wake Lock API**.
  - Prevents the device screen from turning off or locking during active practice, re-requesting the lock automatically when the app regains focus.

---

## 🔊 Audio Engine Details
Audio starts only after a direct **user gesture** (clicking the Start button) to comply with browser autoplay policies.
- **Pink Noise Generator**: Connects a looping audio buffer or synthesized noise source through a `GainNode` linked directly to the breathing cycle.
- **Binaural Drone (LFO Sine Wave)**: Uses two oscillators detuned slightly to create a calming binaural beat.
  - **Inhale**: Frequency ramps from 110Hz to 220Hz; Pink Noise volume rises from `0.05` to `0.3`.
  - **Hold**: Frequency remains at 220Hz; volume remains constant.
  - **Exhale**: Frequency ramps down from 220Hz to 110Hz; Pink Noise volume fades to `0.0` or near silence.

---

## 📱 PWA Support & Fullscreen
Configured via `vite-plugin-pwa`, the manifest enables:
- `display: standalone` orientation to hide browser navigation bars and status bars, keeping the experience immersive.
- Offline support and precaching of visual and audio assets for reliability anywhere.

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
Build the optimized production assets and PWA files:
```bash
npm run build
```

The output files will be in the `dist` directory.

