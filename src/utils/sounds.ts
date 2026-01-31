// Enhanced Web Audio API sound effects for the lottery wheel
// More musical, harmonious, and pleasant sounds

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
};

// Create a simple reverb effect
const createReverb = (ctx: AudioContext, duration: number = 1): ConvolverNode => {
  const convolver = ctx.createConvolver();
  const rate = ctx.sampleRate;
  const length = rate * duration;
  const impulse = ctx.createBuffer(2, length, rate);

  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
    }
  }

  convolver.buffer = impulse;
  return convolver;
};

// Casino roulette tick sound - sharp click like ball hitting dividers
export const playTickSound = (volume: number = 0.2) => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Sharp transient click using very short noise burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.008); // 8ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Very fast exponential decay for sharp click
      const envelope = Math.exp(-i / (bufferSize * 0.08));
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // High-pass filter for crisp, clicky sound
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(2000, now);
    highpass.Q.setValueAtTime(1, now);

    // Bandpass for the "clack" resonance
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(3500 + Math.random() * 500, now);
    bandpass.Q.setValueAtTime(5, now);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume * 0.8, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    // Add a subtle pitched component for the "tic" character
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(4000 + Math.random() * 800, now);
    osc.frequency.exponentialRampToValueAtTime(2000, now + 0.01);

    oscGain.gain.setValueAtTime(volume * 0.15, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

    noise.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    noise.start(now);
    osc.start(now);
    osc.stop(now + 0.02);
  } catch (e) {
    // Silently fail
  }
};

// Gentle whoosh for spin start
export const playSpinStartSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Layered whoosh with filtered noise
    const bufferSize = ctx.sampleRate * 0.6;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      // Bell curve envelope
      const envelope = Math.sin(t * Math.PI) * (1 - t * 0.5);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Sweeping filter for whoosh effect
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(800, now + 0.2);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.5);
    filter.Q.setValueAtTime(1, now);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start(now);

    // Add a subtle rising tone
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.3);

    oscGain.gain.setValueAtTime(0.05, now);
    oscGain.gain.linearRampToValueAtTime(0.08, now + 0.1);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {
    // Silently fail
  }
};

// Casino roulette tick for final approach - deeper, more dramatic click
export const playSlowTick = (pitch: number = 1) => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Longer noise burst for more dramatic click
    const bufferSize = Math.floor(ctx.sampleRate * 0.025); // 25ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const envelope = Math.exp(-i / (bufferSize * 0.15));
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Lower frequency bandpass for deeper "clunk"
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(2000 * pitch, now);
    bandpass.Q.setValueAtTime(3, now);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    // Add resonant "ping" for dramatic effect
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 600 * pitch;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.1);

    oscGain.gain.setValueAtTime(0.2, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    // Sub-click for weight
    const osc2 = ctx.createOscillator();
    const osc2Gain = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 0.5, now);

    osc2Gain.gain.setValueAtTime(0.12, now);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.connect(oscGain);
    osc2.connect(osc2Gain);
    oscGain.connect(ctx.destination);
    osc2Gain.connect(ctx.destination);

    noise.start(now);
    osc.start(now);
    osc2.start(now);

    osc.stop(now + 0.2);
    osc2.stop(now + 0.15);
  } catch (e) {
    // Silently fail
  }
};

// Celebration sound - Yeah!!! with confetti and firecrackers
export const playWinnerSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Create reverb for space
    const reverb = createReverb(ctx, 1.2);
    const reverbGain = ctx.createGain();
    reverbGain.gain.setValueAtTime(0.25, now);
    reverb.connect(reverbGain);
    reverbGain.connect(ctx.destination);

    // === Layer 1: "Yeah~~~!" excited voice sound ===
    // Multiple voices saying "Yeah" at slightly different times
    for (let v = 0; v < 5; v++) {
      const delay = v * 0.08;
      const voiceDur = 0.8 + Math.random() * 0.3;
      const baseFreq = 250 + v * 30 + Math.random() * 50;

      // Main voice oscillator
      const voice = ctx.createOscillator();
      const voiceGain = ctx.createGain();
      const voiceFilter = ctx.createBiquadFilter();

      voice.type = 'sawtooth';
      // "Ye-" part (quick rise)
      voice.frequency.setValueAtTime(baseFreq, now + delay);
      voice.frequency.linearRampToValueAtTime(baseFreq * 1.6, now + delay + 0.1);
      // "-ah~~~" part (sustained with slight vibrato)
      voice.frequency.linearRampToValueAtTime(baseFreq * 1.5, now + delay + 0.15);
      voice.frequency.setValueAtTime(baseFreq * 1.5, now + delay + voiceDur * 0.7);
      voice.frequency.linearRampToValueAtTime(baseFreq * 1.3, now + delay + voiceDur);

      // Formant filter for voice-like quality
      voiceFilter.type = 'bandpass';
      voiceFilter.frequency.setValueAtTime(800, now + delay);
      voiceFilter.frequency.linearRampToValueAtTime(1200, now + delay + 0.1);
      voiceFilter.frequency.setValueAtTime(1000, now + delay + voiceDur);
      voiceFilter.Q.setValueAtTime(4, now + delay);

      voiceGain.gain.setValueAtTime(0, now + delay);
      voiceGain.gain.linearRampToValueAtTime(0.12, now + delay + 0.05);
      voiceGain.gain.setValueAtTime(0.1, now + delay + voiceDur * 0.6);
      voiceGain.gain.exponentialRampToValueAtTime(0.001, now + delay + voiceDur);

      voice.connect(voiceFilter);
      voiceFilter.connect(voiceGain);
      voiceGain.connect(ctx.destination);
      voiceGain.connect(reverb);

      voice.start(now + delay);
      voice.stop(now + delay + voiceDur);

      // Add harmonics for richer voice
      const harmonic = ctx.createOscillator();
      const harmGain = ctx.createGain();
      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(baseFreq * 2, now + delay);
      harmonic.frequency.linearRampToValueAtTime(baseFreq * 3, now + delay + 0.1);
      harmGain.gain.setValueAtTime(0.03, now + delay);
      harmGain.gain.exponentialRampToValueAtTime(0.001, now + delay + voiceDur * 0.5);
      harmonic.connect(harmGain);
      harmGain.connect(reverb);
      harmonic.start(now + delay);
      harmonic.stop(now + delay + voiceDur * 0.5);
    }

    // === Layer 2: Confetti / Streamer sounds (sparkly flutter) ===
    const confettiDur = 2.5;
    const confettiSize = Math.floor(ctx.sampleRate * confettiDur);
    const confettiBuffer = ctx.createBuffer(2, confettiSize, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = confettiBuffer.getChannelData(ch);
      for (let i = 0; i < confettiSize; i++) {
        const t = i / confettiSize;
        // Envelope: burst then gradual fade
        const env = t < 0.05 ? t * 20 : Math.exp(-(t - 0.05) * 2);
        // Sparkly texture with random bursts
        const sparkle = Math.random() < 0.1 ? Math.random() : Math.random() * 0.3;
        data[i] = sparkle * env * (Math.random() * 2 - 1);
      }
    }

    const confetti = ctx.createBufferSource();
    confetti.buffer = confettiBuffer;

    const confettiFilter = ctx.createBiquadFilter();
    confettiFilter.type = 'highpass';
    confettiFilter.frequency.setValueAtTime(4000, now);

    const confettiGain = ctx.createGain();
    confettiGain.gain.setValueAtTime(0.2, now);

    confetti.connect(confettiFilter);
    confettiFilter.connect(confettiGain);
    confettiGain.connect(ctx.destination);
    confetti.start(now);

    // === Layer 3: Firecrackers (multiple pops and crackles) ===
    const firecrackerTimes = [0, 0.12, 0.28, 0.5, 0.65, 0.9, 1.1, 1.4, 1.7];

    firecrackerTimes.forEach(delay => {
      // Main pop
      const popSize = Math.floor(ctx.sampleRate * 0.05);
      const popBuffer = ctx.createBuffer(1, popSize, ctx.sampleRate);
      const popData = popBuffer.getChannelData(0);

      for (let i = 0; i < popSize; i++) {
        const env = Math.exp(-i / (popSize * 0.05));
        popData[i] = (Math.random() * 2 - 1) * env;
      }

      const pop = ctx.createBufferSource();
      pop.buffer = popBuffer;

      const popFilter = ctx.createBiquadFilter();
      popFilter.type = 'bandpass';
      popFilter.frequency.setValueAtTime(1500 + Math.random() * 1000, now + delay);
      popFilter.Q.setValueAtTime(2, now + delay);

      const popGain = ctx.createGain();
      popGain.gain.setValueAtTime(0.3 + Math.random() * 0.2, now + delay);

      pop.connect(popFilter);
      popFilter.connect(popGain);
      popGain.connect(ctx.destination);
      pop.start(now + delay);

      // Crackle tail
      const crackleSize = Math.floor(ctx.sampleRate * 0.15);
      const crackleBuffer = ctx.createBuffer(1, crackleSize, ctx.sampleRate);
      const crackleData = crackleBuffer.getChannelData(0);

      for (let i = 0; i < crackleSize; i++) {
        const t = i / crackleSize;
        const env = Math.exp(-t * 6);
        const crackle = Math.random() < 0.3 ? 1 : 0.2;
        crackleData[i] = (Math.random() * 2 - 1) * env * crackle;
      }

      const crackleNode = ctx.createBufferSource();
      crackleNode.buffer = crackleBuffer;

      const crackleFilter = ctx.createBiquadFilter();
      crackleFilter.type = 'highpass';
      crackleFilter.frequency.setValueAtTime(2500, now + delay + 0.02);

      const crackleGain = ctx.createGain();
      crackleGain.gain.setValueAtTime(0.15, now + delay + 0.02);

      crackleNode.connect(crackleFilter);
      crackleFilter.connect(crackleGain);
      crackleGain.connect(ctx.destination);
      crackleNode.start(now + delay + 0.02);
    });

    // === Layer 4: Joyful rising melody ===
    const notes = [
      { freq: 523, delay: 0.1, dur: 0.15 },  // C5
      { freq: 659, delay: 0.2, dur: 0.15 },  // E5
      { freq: 784, delay: 0.3, dur: 0.2 },   // G5
      { freq: 1047, delay: 0.45, dur: 0.4 }, // C6 (triumphant!)
    ];

    notes.forEach(({ freq, delay, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.1, now + delay + 0.02);
      gain.gain.setValueAtTime(0.08, now + delay + dur * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.connect(reverb);

      osc.start(now + delay);
      osc.stop(now + delay + dur);
    });

  } catch (e) {
    // Silently fail
  }
};

// Tension building pulse
export const playTensionPulse = (intensity: number = 0.5) => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Lower frequency, more ominous
    const freq = 80 + intensity * 40;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.1 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) {
    // Silently fail
  }
};

// Resume audio context (needed for browsers that suspend audio)
export const resumeAudioContext = async () => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  } catch (e) {
    // Silently fail
  }
};
