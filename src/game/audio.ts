class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private echoIn: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private sfxEnabled = true;
  private musicEnabled = true;
  private musicTimer: number | null = null;
  private step = 0;
  private isBossMusic = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx = new AudioCtx();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(ctx.destination);
      this.masterGain = master;

      // SNES S-DSP echo processor for dramatic 16-bit Final Fight / Castlevania depth
      const delay = ctx.createDelay(0.5);
      delay.delayTime.value = 0.135;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1850;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.25;
      const wet = ctx.createGain();
      wet.gain.value = 0.24;

      const echoIn = ctx.createGain();
      echoIn.gain.value = 1.0;
      echoIn.connect(delay);
      delay.connect(lp);
      lp.connect(feedback);
      feedback.connect(delay);
      lp.connect(wet);
      wet.connect(master);
      this.echoIn = echoIn;

      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopMusic();
    }
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  private tone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'sawtooth',
    volume = 0.08,
    delay = 0,
    cutoff = 2400
  ): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(35, freq), now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(35, endFreq), now + duration);
    }

    filter.type = 'lowpass';
    filter.frequency.value = cutoff;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private noise(duration: number, volume = 0.09, bandpass = 700, delay = 0): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = bandpass;
    filter.Q.value = 1.1;

    const gain = ctx.createGain();
    const now = ctx.currentTime + delay;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + duration + 0.01);
  }

  public playSwing(): void {
    this.noise(0.07, 0.07, 1650);
    this.tone(360, 130, 0.06, 'triangle', 0.05);
  }

  public playHit(heavy = false): void {
    // Punchy Capcom Final Fight SNES impact thud + smack
    if (heavy) {
      this.noise(0.17, 0.17, 450);
      this.tone(155, 45, 0.16, 'sawtooth', 0.13, 0, 1400);
      this.tone(240, 70, 0.1, 'square', 0.07, 0, 1100);
    } else {
      this.noise(0.08, 0.11, 880);
      this.tone(200, 68, 0.08, 'sawtooth', 0.08, 0, 1500);
    }
  }

  public playPlayerHurt(): void {
    this.noise(0.12, 0.1, 520);
    this.tone(195, 85, 0.17, 'sawtooth', 0.09, 0, 1200);
  }

  public playJump(): void {
    this.tone(190, 420, 0.1, 'triangle', 0.06, 0, 2200);
  }

  public playDash(): void {
    this.noise(0.09, 0.07, 1950);
    this.tone(260, 460, 0.08, 'triangle', 0.05);
  }

  public playSpecial(): void {
    this.noise(0.28, 0.14, 650);
    this.tone(220, 660, 0.16, 'sawtooth', 0.1, 0, 2600);
    this.tone(440, 140, 0.24, 'sawtooth', 0.08, 0.06, 1800);
  }

  public playThrow(): void {
    this.tone(240, 115, 0.11, 'triangle', 0.08);
    this.noise(0.13, 0.12, 480, 0.07);
  }

  public playBreak(): void {
    this.noise(0.16, 0.14, 720);
    this.tone(170, 62, 0.12, 'sawtooth', 0.08, 0, 1100);
  }

  public playExplosion(): void {
    this.noise(0.36, 0.2, 260);
    this.tone(120, 36, 0.34, 'sawtooth', 0.13, 0, 800);
  }

  public playFoodPickup(): void {
    this.tone(440, 440, 0.07, 'triangle', 0.07, 0);
    this.tone(554.37, 554.37, 0.07, 'triangle', 0.07, 0.06);
    this.tone(659.25, 880, 0.16, 'sawtooth', 0.06, 0.12, 2200);
  }

  public playTreasurePickup(): void {
    this.tone(659.25, 659.25, 0.06, 'triangle', 0.07, 0);
    this.tone(987.77, 987.77, 0.14, 'sawtooth', 0.06, 0.06, 2600);
  }

  public playBossAlert(): void {
    for (let i = 0; i < 3; i++) {
      this.tone(146.83, 196, 0.18, 'sawtooth', 0.09, i * 0.24, 1500);
      this.noise(0.12, 0.08, 900, i * 0.24);
    }
  }

  public playShot(): void {
    this.noise(0.11, 0.12, 1450);
    this.tone(420, 95, 0.09, 'sawtooth', 0.07, 0, 1800);
  }

  public playUiSelect(): void {
    this.tone(440, 659.25, 0.08, 'triangle', 0.06);
  }

  public playStageClear(): void {
    const notes = [293.66, 349.23, 440, 523.25, 440, 587.33];
    const times = [0, 0.12, 0.24, 0.36, 0.5, 0.64];
    notes.forEach((n, idx) => {
      this.tone(n, n, idx === notes.length - 1 ? 0.45 : 0.11, 'sawtooth', 0.07, times[idx], 2200);
    });
  }

  public playGameOver(): void {
    const notes = [293.66, 261.63, 233.08, 220];
    notes.forEach((n, idx) => {
      this.tone(n, n * 0.97, 0.32, 'sawtooth', 0.065, idx * 0.26, 1100);
    });
  }

  // ---- DRAMATIC 16-BIT SNES (SPC700) FINAL FIGHT / ORCHESTRAL-ROCK SOUNDTRACK ----
  public startMusic(bossMode = false): void {
    this.isBossMusic = bossMode;
    if (!this.musicEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.musicTimer !== null) return;

    this.step = 0;
    const tickMs = 135;

    // Dramatic D-minor Final Fight / Independence street-brawl brass & strings
    const stageLead = [
      293.66, 0, 349.23, 440, 440, 0, 466.16, 440,
      392.0, 0, 349.23, 329.63, 293.66, 0, 261.63, 293.66,
      233.08, 0, 293.66, 349.23, 349.23, 0, 392.0, 349.23,
      329.63, 0, 392.0, 440, 523.25, 0, 440, 0,
      392.0, 0, 466.16, 587.33, 523.25, 0, 466.16, 440,
      392.0, 349.23, 329.63, 293.66, 349.23, 0, 293.66, 0,
      329.63, 0, 440, 415.3, 440, 0, 554.37, 0,
      587.33, 554.37, 440, 349.23, 329.63, 0, 277.18, 0,
    ];

    const stageBass = [
      73.42, 146.83, 73.42, 73.42, 73.42, 146.83, 73.42, 110.0,
      73.42, 146.83, 73.42, 73.42, 87.31, 0, 98.0, 0,
      58.27, 116.54, 58.27, 58.27, 65.41, 130.81, 65.41, 65.41,
      65.41, 130.81, 65.41, 65.41, 73.42, 0, 82.41, 0,
      98.0, 196.0, 98.0, 98.0, 87.31, 174.61, 87.31, 87.31,
      73.42, 146.83, 73.42, 73.42, 87.31, 0, 73.42, 0,
      55.0, 110.0, 55.0, 55.0, 55.0, 110.0, 69.3, 82.41,
      55.0, 110.0, 82.41, 69.3, 55.0, 0, 69.3, 0,
    ];

    const stagePad = [
      146.83, 0, 0, 0, 0, 0, 0, 0, 174.61, 0, 0, 0, 0, 0, 0, 0,
      116.54, 0, 0, 0, 0, 0, 0, 0, 130.81, 0, 0, 0, 0, 0, 0, 0,
      196.0, 0, 0, 0, 0, 0, 0, 0, 174.61, 0, 0, 0, 0, 0, 0, 0,
      164.81, 0, 0, 0, 0, 0, 0, 0, 138.59, 0, 0, 0, 0, 0, 0, 0,
    ];

    const bossLead = [
      329.63, 349.23, 415.3, 440, 493.88, 0, 440, 415.3,
      349.23, 329.63, 293.66, 329.63, 349.23, 0, 293.66, 0,
      329.63, 415.3, 493.88, 523.25, 659.25, 0, 587.33, 523.25,
      493.88, 440, 415.3, 349.23, 329.63, 415.3, 493.88, 0,
    ];

    const bossBass = [
      82.41, 82.41, 164.81, 82.41, 87.31, 87.31, 174.61, 87.31,
      82.41, 82.41, 164.81, 82.41, 73.42, 146.83, 77.78, 82.41,
      82.41, 82.41, 164.81, 82.41, 98.0, 98.0, 196.0, 98.0,
      87.31, 87.31, 82.41, 73.42, 82.41, 123.47, 164.81, 82.41,
    ];

    this.musicTimer = window.setInterval(() => {
      if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;

      const s = this.step;
      const lead = this.isBossMusic ? bossLead : stageLead;
      const bass = this.isBossMusic ? bossBass : stageBass;

      const leadNote = lead[s % lead.length];
      const bassNote = bass[s % bass.length];

      if (bassNote > 0) {
        this.playFilteredSynth(bassNote, 0.115, 'sawtooth', 0.048, 540, false);
      }

      if (leadNote > 0) {
        const dur = this.isBossMusic ? 0.12 : 0.15;
        this.playDramaticLead(leadNote, dur, this.isBossMusic ? 0.036 : 0.03);
      }

      if (!this.isBossMusic) {
        const padNote = stagePad[s % stagePad.length];
        if (padNote > 0) {
          this.playFilteredSynth(padNote, 0.85, 'sawtooth', 0.022, 950, true);
        }
      }

      const beatStep = s % 8;
      if (beatStep === 0 || (this.isBossMusic && beatStep === 3) || (!this.isBossMusic && beatStep === 6)) {
        this.playDrumKick();
      }
      if (beatStep === 4 || (this.isBossMusic && beatStep === 7)) {
        this.playDrumSnare();
      }
      if (s % 2 === 1) {
        this.playDrumHat();
      }

      this.step++;
    }, tickMs);
  }

  public setBossMusic(boss: boolean): void {
    this.isBossMusic = boss;
  }

  public stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private playFilteredSynth(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    cutoff: number,
    sendToEcho: boolean
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    if (sendToEcho && this.echoIn) {
      gain.connect(this.echoIn);
    }
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playDramaticLead(freq: number, duration: number, volume: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 1.004, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2150, now);
    filter.frequency.exponentialRampToValueAtTime(920, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    if (this.echoIn) {
      gain.connect(this.echoIn);
    }

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.02);
    osc2.stop(now + duration + 0.02);
  }

  private playDrumKick(): void {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.09);
    gain.gain.setValueAtTime(0.095, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  private playDrumSnare(): void {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1100;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.1);
  }

  private playDrumHat(): void {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5500;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.018, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.04);
  }
}

export const audio = new RetroAudioEngine();
