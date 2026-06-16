export class AudioEngine {
  private ctx: AudioContext | null = null;
  private pinkNoiseSource: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private osc: OscillatorNode | null = null;
  private oscGain: GainNode | null = null;
  private masterBgGain: GainNode | null = null;
  private masterCueGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private nextEventTime: number = 0;
  private timeoutId: number | null = null;
  private activeCueOscillators: { osc: OscillatorNode; gain: GainNode; stopTime: number }[] = [];

  private bgVolume: number = (() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('somnus_bg_volume');
      return saved !== null ? parseFloat(saved) : 1.0;
    }
    return 1.0;
  })();

  private cueVolume: number = (() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('somnus_cue_volume');
      return saved !== null ? parseFloat(saved) : 1.0;
    }
    return 1.0;
  })();

  setVolumes(bg: number, cue: number) {
    this.bgVolume = bg;
    this.cueVolume = cue;
    localStorage.setItem('somnus_bg_volume', bg.toString());
    localStorage.setItem('somnus_cue_volume', cue.toString());
    if (this.ctx && this.masterBgGain && this.masterCueGain) {
      this.masterBgGain.gain.setTargetAtTime(bg, this.ctx.currentTime, 0.1);
      this.masterCueGain.gain.setTargetAtTime(cue, this.ctx.currentTime, 0.1);
    }
  }

  private externalAudioBuffers: Record<'campfire' | 'ocean', AudioBuffer | null> = {
    campfire: null,
    ocean: null,
  };
  private activeNoiseType: 'zen' | 'campfire' | 'ocean' = (() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('somnus_noise_type');
      if (saved === 'zen' || saved === 'campfire' || saved === 'ocean') {
        return saved;
      }
    }
    return 'zen';
  })();
  private noiseProfileGain: GainNode | null = null;
  private osc2: OscillatorNode | null = null;
  private panner1: StereoPannerNode | null = null;
  private panner2: StereoPannerNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;
  private isLoadingAudio = false;
  private compressor: DynamicsCompressorNode | null = null;

  setNoiseType(type: 'zen' | 'campfire' | 'ocean') {
    this.activeNoiseType = type;
    localStorage.setItem('somnus_noise_type', type);
    if (this.ctx && this.noiseGain) {
      this.switchNoiseSource();
      this.applyProfileInstantly();
    }
  }

  private applyProfileInstantly() {
    if (!this.osc || !this.osc2 || !this.noiseProfileGain || !this.ctx || !this.oscGain) return;

    const now = this.ctx.currentTime;

    // Cancel any previous ramps to avoid clicks when sliding values
    this.noiseProfileGain.gain.cancelScheduledValues(now);
    this.oscGain.gain.cancelScheduledValues(now);

    if (this.activeNoiseType === 'zen') {
      this.osc.detune.setTargetAtTime(0, now, 0.1); // Grounding base E2
      this.osc2.detune.setTargetAtTime(8, now, 0.1); // 8 cents difference = ~0.38Hz Delta wave binaural beat
      this.oscGain.gain.setTargetAtTime(0.5, now, 0.1); // Strong prominent drone
      this.noiseProfileGain.gain.setTargetAtTime(0.04, now, 0.1); // Gentle breathing noise
      if (this.lowpassFilter) {
        this.lowpassFilter.frequency.setTargetAtTime(180, now, 0.1); // Base cutoff for drone
      }
    } else {
      if (this.lowpassFilter) {
        this.lowpassFilter.frequency.setTargetAtTime(10000, now, 0.1); // Open fully for ocean/campfire
      }
      if (this.activeNoiseType === 'ocean') {
        this.osc.detune.setTargetAtTime(-900, now, 0.1);
        this.osc2.detune.setTargetAtTime(-874, now, 0.1);
        this.oscGain.gain.setTargetAtTime(0.1, now, 0.1); // Very subtle deep rumble
        this.noiseProfileGain.gain.setTargetAtTime(3.0, now, 0.1); // Boost ocean wave strongly
      } else {
        // Campfire
        this.osc.detune.setTargetAtTime(0, now, 0.1);
        this.osc2.detune.setTargetAtTime(52, now, 0.1);
        this.oscGain.gain.setTargetAtTime(0.02, now, 0.1); // Barely a whisper of drone
        this.noiseProfileGain.gain.setTargetAtTime(25.0, now, 0.1); // Campfire recording is EXTREMELY quiet, boost massively
      }
    }
  }

  private createWhiteNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not initialized');
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  private switchNoiseSource() {
    if (!this.ctx || !this.noiseGain) return;

    // Cleanup previous nodes safely
    try {
      if (this.pinkNoiseSource) {
        this.pinkNoiseSource.stop();
        this.pinkNoiseSource.disconnect();
      }
    } catch (e) {}

    if (this.activeNoiseType === 'zen') {
      const buffer = this.createWhiteNoiseBuffer();
      this.pinkNoiseSource = this.ctx.createBufferSource();
      this.pinkNoiseSource.buffer = buffer;
      this.pinkNoiseSource.loop = true;
      this.pinkNoiseSource.connect(this.noiseGain);
      this.pinkNoiseSource.start();
      return;
    }

    const buffer =
      this.activeNoiseType === 'ocean'
        ? this.externalAudioBuffers.ocean
        : this.externalAudioBuffers.campfire;

    if (buffer) {
      this.pinkNoiseSource = this.ctx.createBufferSource();
      this.pinkNoiseSource.buffer = buffer;
      this.pinkNoiseSource.loop = true;
      this.pinkNoiseSource.connect(this.noiseGain);
      this.pinkNoiseSource.start();
    }
  }

  private async loadExternalAudio() {
    if (!this.ctx || this.isLoadingAudio) return;
    this.isLoadingAudio = true;
    try {
      const loadFile = async (name: 'campfire' | 'ocean') => {
        if (this.externalAudioBuffers[name]) return;
        const response = await fetch(`${import.meta.env.BASE_URL}audio/${name}.ogg`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
        this.externalAudioBuffers[name] = audioBuffer;

        // If the user selected this mode and we are playing, switch to it immediately
        if (this.activeNoiseType === name && this.isPlaying) {
          this.switchNoiseSource();
        }
      };

      await Promise.all([loadFile('campfire'), loadFile('ocean')]);
    } catch (e) {
      console.error('Failed to load external audio', e);
    }
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Start fetching MP3 files asynchronously in the background
    this.loadExternalAudio();

    // Setup Master Gains
    this.masterBgGain = this.ctx.createGain();
    this.masterBgGain.gain.value = this.bgVolume;
    this.masterBgGain.connect(this.ctx.destination);

    this.masterCueGain = this.ctx.createGain();
    this.masterCueGain.gain.value = this.cueVolume;
    this.masterCueGain.connect(this.ctx.destination);

    // Setup Compressor to prevent clipping from aggressive boosts
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -12; // Allow more volume through
    this.compressor.knee.value = 15;
    this.compressor.ratio.value = 4; // Gentler compression
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    this.compressor.connect(this.masterBgGain);

    // Setup Profile Noise Gain (static volume per profile)
    this.noiseProfileGain = this.ctx.createGain();
    this.noiseProfileGain.gain.value = 0.15; // default Wind
    this.noiseProfileGain.connect(this.compressor);

    // Setup Noise Breathing Envelope
    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0;
    this.noiseGain.connect(this.noiseProfileGain);

    this.switchNoiseSource();

    // Setup Dual Oscillators (Binaural Drone) with Stereo Panning (Static Left & Right)
    this.oscGain = this.ctx.createGain();
    this.oscGain.gain.value = 0;
    this.oscGain.connect(this.masterBgGain);

    // Setup Lowpass filter to keep triangle waves warm and eliminate high-frequency buzz
    this.lowpassFilter = this.ctx.createBiquadFilter();
    this.lowpassFilter.type = 'lowpass';
    this.lowpassFilter.frequency.value = 350; // Keep the warm low-to-mid harmonic texture
    this.lowpassFilter.connect(this.oscGain);

    this.panner1 = this.ctx.createStereoPanner();
    this.panner1.pan.value = -1; // Static full left for true binaural beats
    this.panner1.connect(this.lowpassFilter);

    this.panner2 = this.ctx.createStereoPanner();
    this.panner2.pan.value = 1; // Static full right for true binaural beats
    this.panner2.connect(this.lowpassFilter);

    // Use Triangle waves to introduce warm harmonics that are much easier to localize in space
    this.osc = this.ctx.createOscillator();
    this.osc.type = 'triangle';
    this.osc.frequency.value = 164.81;
    this.osc.connect(this.panner1);
    this.osc.start();

    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.value = 164.81;
    this.osc2.connect(this.panner2);
    this.osc2.start();

    // Apply initial profile detuning to oscillators
    this.applyProfileInstantly();
  }

  startCycle() {
    if (!this.ctx || !this.noiseGain || !this.osc || !this.oscGain) return;

    // Stop any existing cycle first to clean up completely
    this.stop();

    this.isPlaying = true;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    this.noiseGain.gain.cancelScheduledValues(now);
    this.oscGain.gain.cancelScheduledValues(now);
    this.osc.frequency.cancelScheduledValues(now);
    if (this.osc2) this.osc2.frequency.cancelScheduledValues(now);

    this.applyProfileInstantly();
    this.nextEventTime = now;
    this.scheduleNextCycle();
  }

  stop() {
    this.isPlaying = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Stop and disconnect all active/scheduled cue oscillators
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.activeCueOscillators.forEach((item) => {
      try {
        item.gain.gain.cancelScheduledValues(now);
        // Ramp down to prevent pops/clicks
        item.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        item.osc.stop(now + 0.05);
      } catch (e) {
        // Already stopped or context closed
      }
    });
    this.activeCueOscillators = [];

    if (this.ctx && this.noiseGain && this.oscGain) {
      const now = this.ctx.currentTime;
      this.noiseGain.gain.cancelScheduledValues(now);
      this.oscGain.gain.cancelScheduledValues(now);
      if (this.osc) this.osc.frequency.cancelScheduledValues(now);
      if (this.osc2) this.osc2.frequency.cancelScheduledValues(now);

      this.noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1);
      this.oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1);
    }
  }

  private playCue(t: number, freq: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Use low-frequency warm bell tones instead of high beeps for all modes
    osc.frequency.value = freq === 432 ? 110.0 : 164.81;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.25); // slow, gentle attack to prevent startle
    gain.gain.exponentialRampToValueAtTime(0.001, t + 4.5); // long decay

    osc.connect(gain);
    if (this.masterCueGain) {
      gain.connect(this.masterCueGain);
    } else {
      gain.connect(this.ctx.destination);
    }

    const stopTime = t + 4.5;
    osc.start(t);
    osc.stop(stopTime);

    // Clean up finished cue oscillators
    const now = this.ctx.currentTime;
    this.activeCueOscillators = this.activeCueOscillators.filter((item) => item.stopTime > now);

    this.activeCueOscillators.push({ osc, gain, stopTime });
  }

  private scheduleNextCycle() {
    if (!this.isPlaying || !this.ctx || !this.noiseGain || !this.osc || !this.osc2) return;

    const t = this.nextEventTime;
    const TIME_EPSILON = 0.01;
    const isZen = this.activeNoiseType === 'zen';

    // Base frequencies: Zen uses deep E2, others use E3
    const minFreq = isZen ? 82.41 : 164.81;
    const maxFreq = isZen ? 123.47 : 246.94;

    // --- 1. Inhale 4s ---
    this.playCue(t, 432);
    this.osc.frequency.setValueAtTime(minFreq, t);
    this.osc.frequency.exponentialRampToValueAtTime(maxFreq, t + 4);
    this.osc2.frequency.setValueAtTime(minFreq, t);
    this.osc2.frequency.exponentialRampToValueAtTime(maxFreq, t + 4);

    this.noiseGain.gain.setValueAtTime(Math.max(this.noiseGain.gain.value, 0.001), t);
    this.noiseGain.gain.exponentialRampToValueAtTime(0.1, t + TIME_EPSILON);
    this.noiseGain.gain.exponentialRampToValueAtTime(1.0, t + 4);

    if (isZen && this.lowpassFilter) {
      this.lowpassFilter.frequency.setValueAtTime(180, t);
      this.lowpassFilter.frequency.exponentialRampToValueAtTime(350, t + 4);
    }

    // --- 2. Hold 7s ---
    this.playCue(t + 4, 864);
    this.osc.frequency.setValueAtTime(maxFreq, t + 4);
    this.osc.frequency.exponentialRampToValueAtTime(maxFreq + 0.5, t + 11);
    this.osc2.frequency.setValueAtTime(maxFreq, t + 4);
    this.osc2.frequency.exponentialRampToValueAtTime(maxFreq + 0.5, t + 11);

    this.noiseGain.gain.setValueAtTime(1.0, t + 4);
    this.noiseGain.gain.exponentialRampToValueAtTime(1.001, t + 11);

    if (isZen && this.lowpassFilter) {
      this.lowpassFilter.frequency.setValueAtTime(350, t + 4);
      this.lowpassFilter.frequency.exponentialRampToValueAtTime(350.5, t + 11);
    }

    // --- 3. Exhale 8s ---
    this.playCue(t + 11, 432);
    this.osc.frequency.setValueAtTime(maxFreq, t + 11);
    this.osc.frequency.exponentialRampToValueAtTime(minFreq, t + 19);
    this.osc2.frequency.setValueAtTime(maxFreq, t + 11);
    this.osc2.frequency.exponentialRampToValueAtTime(minFreq, t + 19);

    this.noiseGain.gain.setValueAtTime(1.0, t + 11);
    this.noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 19);

    if (isZen && this.lowpassFilter) {
      this.lowpassFilter.frequency.setValueAtTime(350, t + 11);
      this.lowpassFilter.frequency.exponentialRampToValueAtTime(140, t + 19);
    }

    this.nextEventTime += 19;

    const timeToNextSchedule = (this.nextEventTime - this.ctx.currentTime - 0.5) * 1000;
    this.timeoutId = window.setTimeout(() => this.scheduleNextCycle(), timeToNextSchedule);
  }
}

export const audio = new AudioEngine();
