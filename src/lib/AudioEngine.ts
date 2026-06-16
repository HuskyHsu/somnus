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

  private bgVolume: number = 1.0;
  private cueVolume: number = 1.0;

  setVolumes(bg: number, cue: number) {
    this.bgVolume = bg;
    this.cueVolume = cue;
    if (this.ctx && this.masterBgGain && this.masterCueGain) {
      this.masterBgGain.gain.setTargetAtTime(bg, this.ctx.currentTime, 0.1);
      this.masterCueGain.gain.setTargetAtTime(cue, this.ctx.currentTime, 0.1);
    }
  }

  private noiseBuffers: Record<'pink' | 'brown', AudioBuffer | null> = { pink: null, brown: null };
  private activeNoiseType: 'zen' | 'wind' | 'ocean' = 'zen';
  private oceanFilter: BiquadFilterNode | null = null;
  private oceanLfo: OscillatorNode | null = null;
  private noiseProfileGain: GainNode | null = null;
  private osc2: OscillatorNode | null = null;

  setNoiseType(type: 'zen' | 'wind' | 'ocean') {
    this.activeNoiseType = type;
    if (this.ctx && this.noiseGain) {
      this.switchNoiseSource();
      this.applyProfileInstantly();
    }
  }

  private applyProfileInstantly() {
    if (!this.osc || !this.osc2 || !this.noiseProfileGain || !this.ctx) return;
    
    const now = this.ctx.currentTime;

    if (this.activeNoiseType === 'zen') {
      this.osc.detune.setTargetAtTime(-400, now, 0.1); 
      this.osc2.detune.setTargetAtTime(-361, now, 0.1); 
      this.noiseProfileGain.gain.setTargetAtTime(0.001, now, 0.1);
    } else if (this.activeNoiseType === 'ocean') {
      this.osc.detune.setTargetAtTime(-900, now, 0.1); 
      this.osc2.detune.setTargetAtTime(-874, now, 0.1); 
      this.noiseProfileGain.gain.setTargetAtTime(0.5, now, 0.1);
    } else {
      this.osc.detune.setTargetAtTime(0, now, 0.1); 
      this.osc2.detune.setTargetAtTime(52, now, 0.1); 
      this.noiseProfileGain.gain.setTargetAtTime(0.2, now, 0.1);
    }
  }

  private switchNoiseSource() {
    if (!this.ctx || !this.noiseGain) return;
    
    // Cleanup previous nodes safely
    try {
      if (this.pinkNoiseSource) {
        this.pinkNoiseSource.stop();
        this.pinkNoiseSource.disconnect();
      }
    } catch(e) {}
    try {
      if (this.oceanFilter) {
        this.oceanFilter.disconnect();
      }
    } catch(e) {}
    try {
      if (this.oceanLfo) {
        this.oceanLfo.stop();
        this.oceanLfo.disconnect();
      }
    } catch(e) {}

    if (this.activeNoiseType === 'zen') {
      return;
    }

    const buffer = this.activeNoiseType === 'ocean' ? this.noiseBuffers.brown : this.noiseBuffers.pink;
    
    if (buffer) {
      this.pinkNoiseSource = this.ctx.createBufferSource();
      this.pinkNoiseSource.buffer = buffer;
      this.pinkNoiseSource.loop = true;

      if (this.activeNoiseType === 'ocean') {
        this.oceanFilter = this.ctx.createBiquadFilter();
        this.oceanFilter.type = 'lowpass';
        this.oceanFilter.frequency.value = 400; 

        this.oceanLfo = this.ctx.createOscillator();
        this.oceanLfo.type = 'sine';
        this.oceanLfo.frequency.value = 0.1; 
        
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 250; 
        
        this.oceanLfo.connect(lfoGain);
        lfoGain.connect(this.oceanFilter.frequency);
        
        this.pinkNoiseSource.connect(this.oceanFilter);
        this.oceanFilter.connect(this.noiseGain);
        this.oceanLfo.start();
      } else {
        // Wind: Add a soft bandpass to make it sound airy and natural
        this.oceanFilter = this.ctx.createBiquadFilter();
        this.oceanFilter.type = 'bandpass';
        this.oceanFilter.frequency.value = 600;
        this.oceanFilter.Q.value = 0.4;
        
        this.pinkNoiseSource.connect(this.oceanFilter);
        this.oceanFilter.connect(this.noiseGain);
      }
      
      this.pinkNoiseSource.start();
    }
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const bufferSize = this.ctx.sampleRate * 2; 

    // 1. Pink Noise (Wind)
    const pinkBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const pinkOut = pinkBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pinkOut[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    this.noiseBuffers.pink = pinkBuffer;

    // 2. Brown Noise (Ocean/Deep Waterfall)
    const brownBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const brownOut = brownBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + (0.02 * white)) / 1.02;
      brownOut[i] = lastOut * 3.5;
    }
    this.noiseBuffers.brown = brownBuffer;

    // Setup Master Gains
    this.masterBgGain = this.ctx.createGain();
    this.masterBgGain.gain.value = this.bgVolume;
    this.masterBgGain.connect(this.ctx.destination);

    this.masterCueGain = this.ctx.createGain();
    this.masterCueGain.gain.value = this.cueVolume;
    this.masterCueGain.connect(this.ctx.destination);

    // Setup Profile Noise Gain (static volume per profile)
    this.noiseProfileGain = this.ctx.createGain();
    this.noiseProfileGain.gain.value = 0.15; // default Wind
    this.noiseProfileGain.connect(this.masterBgGain);

    // Setup Noise Breathing Envelope
    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0;
    this.noiseGain.connect(this.noiseProfileGain);
    
    this.switchNoiseSource();

    // Setup Dual Oscillators (Binaural Drone)
    this.oscGain = this.ctx.createGain();
    this.oscGain.gain.value = 0; 
    this.oscGain.connect(this.masterBgGain);

    this.osc = this.ctx.createOscillator();
    this.osc.type = 'sine';
    this.osc.frequency.value = 164.81;
    this.osc.connect(this.oscGain);
    this.osc.start();

    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'sine';
    this.osc2.frequency.value = 164.81;
    this.osc2.connect(this.oscGain);
    this.osc2.start();
    
    // Apply initial profile detuning to oscillators
    this.applyProfileInstantly();
  }

  startCycle() {
    if (!this.ctx || !this.noiseGain || !this.osc || !this.oscGain) return;
    this.isPlaying = true;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    const now = this.ctx.currentTime;
    this.noiseGain.gain.cancelScheduledValues(now);
    this.oscGain.gain.cancelScheduledValues(now);
    this.osc.frequency.cancelScheduledValues(now);
    if (this.osc2) this.osc2.frequency.cancelScheduledValues(now);

    this.oscGain.gain.setValueAtTime(0.5, now);
    this.nextEventTime = now;
    this.scheduleNextCycle();
  }

  stop() {
    this.isPlaying = false;
    if (this.timeoutId) clearTimeout(this.timeoutId);
    
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
    
    osc.type = 'triangle';
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.8, t + 0.05); 
    gain.gain.exponentialRampToValueAtTime(0.001, t + 3); 
    
    osc.connect(gain);
    if (this.masterCueGain) {
      gain.connect(this.masterCueGain);
    } else {
      gain.connect(this.ctx.destination);
    }
    
    osc.start(t);
    osc.stop(t + 3);
  }

  private scheduleNextCycle() {
    if (!this.isPlaying || !this.ctx || !this.noiseGain || !this.osc) return;

    const t = this.nextEventTime;
    const TIME_EPSILON = 0.01; 
    
    // Base frequencies are scheduled constantly. Profile switching handles the pitch shift!
    const minFreq = 164.81; // Base E3
    const maxFreq = 246.94; // Base B3

    // --- 1. Inhale 4s ---
    this.playCue(t, 432); 
    this.osc.frequency.setValueAtTime(minFreq, t);
    this.osc.frequency.exponentialRampToValueAtTime(maxFreq, t + 4);
    this.osc2.frequency.setValueAtTime(minFreq, t);
    this.osc2.frequency.exponentialRampToValueAtTime(maxFreq, t + 4);
    
    this.noiseGain.gain.setValueAtTime(Math.max(this.noiseGain.gain.value, 0.001), t);
    this.noiseGain.gain.exponentialRampToValueAtTime(0.1, t + TIME_EPSILON);
    this.noiseGain.gain.exponentialRampToValueAtTime(1.0, t + 4);

    // --- 2. Hold 7s ---
    this.playCue(t + 4, 864); 
    this.osc.frequency.setValueAtTime(maxFreq, t + 4);
    this.osc.frequency.exponentialRampToValueAtTime(maxFreq + 0.5, t + 11); 
    this.osc2.frequency.setValueAtTime(maxFreq, t + 4);
    this.osc2.frequency.exponentialRampToValueAtTime(maxFreq + 0.5, t + 11); 
    
    this.noiseGain.gain.setValueAtTime(1.0, t + 4);
    this.noiseGain.gain.exponentialRampToValueAtTime(1.001, t + 11);

    // --- 3. Exhale 8s ---
    this.playCue(t + 11, 432); 
    this.osc.frequency.setValueAtTime(maxFreq, t + 11);
    this.osc.frequency.exponentialRampToValueAtTime(minFreq, t + 19);
    this.osc2.frequency.setValueAtTime(maxFreq, t + 11);
    this.osc2.frequency.exponentialRampToValueAtTime(minFreq, t + 19);
    
    this.noiseGain.gain.setValueAtTime(1.0, t + 11);
    this.noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 19);

    this.nextEventTime += 19; 
    
    const timeToNextSchedule = (this.nextEventTime - this.ctx.currentTime - 0.5) * 1000;
    this.timeoutId = window.setTimeout(() => this.scheduleNextCycle(), timeToNextSchedule);
  }
}

export const audio = new AudioEngine();
