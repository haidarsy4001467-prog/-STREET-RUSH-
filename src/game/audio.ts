import type { SoundSettings } from './types';

/**
 * 100% Offline Procedural Web Audio Engine for STREET RUSH.
 * Synthesizes engine hum, acceleration surge, nitro roar, coin chimes,
 * near-miss whooshes, collision impacts, UI clicks, and dynamic synthwave music.
 */
class StreetRushAudio {
  private ctx: AudioContext | null = null;
  private masterMusicGain: GainNode | null = null;
  private masterSfxGain: GainNode | null = null;

  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineRunning = false;

  private nitroGain: GainNode | null = null;
  private nitroSource: AudioBufferSourceNode | null = null;

  private musicTimer: number | null = null;
  private musicStep = 0;

  private settings: SoundSettings = {
    musicEnabled: true,
    sfxEnabled: true,
    musicVolume: 0.45,
    sfxVolume: 0.75,
  };

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.masterMusicGain = this.ctx.createGain();
      this.masterSfxGain = this.ctx.createGain();
      this.masterMusicGain.connect(this.ctx.destination);
      this.masterSfxGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && this.settings.musicEnabled && this.musicTimer === null) {
      this.startMusic();
    }
  }

  public updateSettings(next: SoundSettings): void {
    this.settings = { ...next };
    this.applyVolumes();

    if (this.settings.musicEnabled) {
      if (this.ctx && this.musicTimer === null) {
        this.startMusic();
      }
    } else {
      this.stopMusic();
    }

    if (!this.settings.sfxEnabled) {
      this.stopEngine();
    }
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterMusicGain || !this.masterSfxGain) return;
    const now = this.ctx.currentTime;
    this.masterMusicGain.gain.setTargetAtTime(
      this.settings.musicEnabled ? this.settings.musicVolume * 0.4 : 0,
      now,
      0.04
    );
    this.masterSfxGain.gain.setTargetAtTime(
      this.settings.sfxEnabled ? this.settings.sfxVolume : 0,
      now,
      0.04
    );
  }

  public startMusic(): void {
    if (!this.settings.musicEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || this.musicTimer !== null) return;

    // 132 BPM 16th-note synthwave racing groove
    const stepMs = 113;
    const bassNotes = [55, 55, 110, 55, 65.41, 65.41, 130.81, 65.41, 73.42, 73.42, 146.83, 73.42, 65.41, 65.41, 82.41, 98];
    const arpNotes = [220, 261.63, 329.63, 440, 261.63, 329.63, 392, 523.25];

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.masterMusicGain || !this.settings.musicEnabled || this.ctx.state !== 'running') {
        return;
      }
      const now = this.ctx.currentTime;
      const step = this.musicStep % 16;

      // Driving sub bass pulse
      const bassFreq = bassNotes[step];
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(bassFreq, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(step % 4 === 0 ? 520 : 320, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterMusicGain);
      osc.start(now);
      osc.stop(now + 0.105);

      // Lead arp shimmer on off-beats
      if (step % 2 === 0) {
        const arpFreq = arpNotes[(this.musicStep / 2) % arpNotes.length];
        const aOsc = this.ctx.createOscillator();
        const aGain = this.ctx.createGain();
        aOsc.type = 'triangle';
        aOsc.frequency.setValueAtTime(arpFreq, now);
        aGain.gain.setValueAtTime(0.001, now);
        aGain.gain.linearRampToValueAtTime(0.08, now + 0.01);
        aGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        aOsc.connect(aGain);
        aGain.connect(this.masterMusicGain);
        aOsc.start(now);
        aOsc.stop(now + 0.19);
      }

      // Kick on quarter beats
      if (step % 4 === 0) {
        const kOsc = this.ctx.createOscillator();
        const kGain = this.ctx.createGain();
        kOsc.type = 'sine';
        kOsc.frequency.setValueAtTime(125, now);
        kOsc.frequency.exponentialRampToValueAtTime(40, now + 0.09);
        kGain.gain.setValueAtTime(0.32, now);
        kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
        kOsc.connect(kGain);
        kGain.connect(this.masterMusicGain);
        kOsc.start(now);
        kOsc.stop(now + 0.1);
      }

      this.musicStep++;
    }, stepMs);
  }

  public stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public startEngine(): void {
    if (!this.settings.sfxEnabled || this.engineRunning) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterSfxGain) return;

    const now = ctx.currentTime;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.001, now);
    this.engineGain.gain.linearRampToValueAtTime(0.11, now + 0.25);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, now);

    this.engineOsc1 = ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(62, now);

    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(124, now);

    this.engineOsc1.connect(filter);
    this.engineOsc2.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.masterSfxGain);

    this.engineOsc1.start(now);
    this.engineOsc2.start(now);
    this.engineRunning = true;
  }

  public updateEngine(speedRatio: number, isNitro: boolean): void {
    if (!this.engineRunning || !this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineGain) {
      return;
    }
    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1.5, speedRatio));
    const baseFreq = 58 + clamped * 95 + (isNitro ? 35 : 0);
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.06);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.98, now, 0.06);
    this.engineGain.gain.setTargetAtTime(isNitro ? 0.16 : 0.08 + clamped * 0.05, now, 0.08);
  }

  public stopEngine(): void {
    if (!this.engineRunning) return;
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      this.engineOsc1?.disconnect();
      this.engineOsc2?.disconnect();
      this.engineGain?.disconnect();
    } catch {
      // ignore already stopped
    }
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.engineRunning = false;
    this.setNitroSound(false);
  }

  public setNitroSound(active: boolean): void {
    if (!this.ctx || !this.masterSfxGain) return;
    const now = this.ctx.currentTime;

    if (active && this.settings.sfxEnabled) {
      if (!this.nitroGain) {
        const bufferSize = this.ctx.sampleRate * 1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(950, now);
        filter.Q.setValueAtTime(1.4, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.24, now + 0.08);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterSfxGain);
        source.start(now);

        this.nitroSource = source;
        this.nitroGain = gain;
      }
    } else if (this.nitroGain) {
      try {
        this.nitroGain.gain.setTargetAtTime(0.0001, now, 0.05);
        const oldSource = this.nitroSource;
        const oldGain = this.nitroGain;
        window.setTimeout(() => {
          try {
            oldSource?.stop();
            oldSource?.disconnect();
            oldGain?.disconnect();
          } catch {
            // ignore
          }
        }, 120);
      } catch {
        // ignore
      }
      this.nitroGain = null;
      this.nitroSource = null;
    }
  }

  public playClick(): void {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterSfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.045);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.masterSfxGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playCoin(): void {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterSfxGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.055); // E6
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(gain);
    gain.connect(this.masterSfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playNearMiss(): void {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterSfxGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.22);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
    osc.connect(gain);
    gain.connect(this.masterSfxGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playNitroBurst(): void {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterSfxGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.22);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.masterSfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playCrash(): void {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterSfxGain) return;
    const now = ctx.currentTime;

    // Low impact punch
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.35);
    oscGain.gain.setValueAtTime(0.45, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    osc.connect(oscGain);
    oscGain.connect(this.masterSfxGain);
    osc.start(now);
    osc.stop(now + 0.37);

    // Metallic crunch noise
    const bufferSize = Math.floor(ctx.sampleRate * 0.32);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.42, now);
    nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.masterSfxGain);
    noise.start(now);
  }

  public playVictoryOrLevelUp(): void {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterSfxGain) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.masterSfxGain!);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }
}

export const soundEngine = new StreetRushAudio();
