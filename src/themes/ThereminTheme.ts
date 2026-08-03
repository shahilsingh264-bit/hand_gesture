import type { Theme } from './Theme';
import type { HandState } from '../gestureEngine';

export class ThereminTheme implements Theme {
  name = 'Theremin';
  private audioCtx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private isPlaying = false;
  private trails: { x: number, y: number, life: number, type: 'left' | 'right' }[] = [];
  private lastUpdate = 0;

  init() {}

  private initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.osc = this.audioCtx.createOscillator();
      this.filter = this.audioCtx.createBiquadFilter();
      this.gain = this.audioCtx.createGain();

      this.osc.type = 'sine';
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 2000;
      
      this.gain.gain.value = 0; // start silent

      this.osc.connect(this.filter);
      this.filter.connect(this.gain);
      this.gain.connect(this.audioCtx.destination);
      this.osc.start();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  handleGesture(hand: HandState, ctx: CanvasRenderingContext2D, width: number, height: number, getX: (x: number) => number, getY: (y: number) => number, timestamp: number): void {
    this.initAudio();

    if (this.osc && this.gain && this.filter) {
      const { currentGesture: gesture, landmarks: rawLandmarks } = hand;
      const indexTip = rawLandmarks[8];
      
      // Calculate screen positions using our getX/getY mappers
      const px = getX(indexTip.x);
      const py = getY(indexTip.y);

      // Theremin logic: Vertical = Pitch, Horizontal = Volume/Filter
      // Pitch range: 100Hz to 1500Hz
      const minFreq = 100;
      const maxFreq = 1500;
      const pitch = minFreq + (1 - indexTip.y) * (maxFreq - minFreq); // higher hand = higher pitch
      
      // Volume: Right side = louder
      const vol = Math.max(0, Math.min(1, 1 - indexTip.x)); 

      // Smooth transition
      this.osc.frequency.setTargetAtTime(pitch, this.audioCtx!.currentTime, 0.05);
      
      if (gesture === 'Pinch') {
        // Pinch adds a "wobble" / vibrato effect and lowers the filter
        this.filter.frequency.setTargetAtTime(400, this.audioCtx!.currentTime, 0.1);
        this.gain.gain.setTargetAtTime(vol * 0.8, this.audioCtx!.currentTime, 0.1);
        this.osc.type = 'triangle';
      } else if (gesture === 'Fist') {
        // Silence
        this.gain.gain.setTargetAtTime(0, this.audioCtx!.currentTime, 0.05);
      } else {
        // Normal play
        this.filter.frequency.setTargetAtTime(3000, this.audioCtx!.currentTime, 0.1);
        this.gain.gain.setTargetAtTime(vol, this.audioCtx!.currentTime, 0.05);
        this.osc.type = 'sine';
      }

      this.isPlaying = gesture !== 'Fist';
      
      if (this.isPlaying) {
        this.trails.push({ x: px, y: py, life: 1.0, type: hand.handedness === 'Right' ? 'right' : 'left' });
      }
    }
  }

  update() {
    // Silence if no update for a short time (handled outside via logic, or just fade trails)
    this.trails.forEach(t => t.life -= 0.02);
    this.trails = this.trails.filter(t => t.life > 0);
    
    // Auto-silence when hands are removed
    if (this.gain && this.audioCtx && this.trails.length === 0) {
      this.gain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.1);
      this.isPlaying = false;
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);

    if (this.trails.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw glowing trails
    ctx.beginPath();
    for (let i = 0; i < this.trails.length; i++) {
      const t = this.trails[i];
      if (i === 0) ctx.moveTo(t.x, t.y);
      else {
        // Add a sine wave wobble to the visual trail based on life
        const wobble = Math.sin(t.life * 20) * 15 * t.life;
        ctx.lineTo(t.x, t.y + wobble);
      }
    }
    
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = `rgba(0, 255, 255, 0.8)`;
    ctx.lineWidth = 6;
    ctx.stroke();
    
    // Draw bright core
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  cleanup() {
    if (this.audioCtx) {
      this.audioCtx.suspend();
    }
    this.trails = [];
  }
}
