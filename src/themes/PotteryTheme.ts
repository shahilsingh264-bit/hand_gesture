import type { Theme } from './Theme';
import type { HandState } from '../gestureEngine';

export class PotteryTheme implements Theme {
  name = 'Pottery';
  private clayShape: number[] = [];
  private numSegments = 60;
  private maxRadius = 150;
  private wheelSpin = 0;
  private spinSpeed = 0.1;
  private particles: { x: number, y: number, vx: number, vy: number, life: number }[] = [];

  init(ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (this.clayShape.length === 0) {
      // Initialize a basic cylinder of clay
      this.clayShape = new Array(this.numSegments).fill(60);
    }
  }

  handleGesture(hand: HandState, ctx: CanvasRenderingContext2D, width: number, height: number, getX: (x: number) => number, getY: (y: number) => number, timestamp: number): void {
    const { gesture, rawLandmarks } = hand;
    
    // Pottery is typically a two-handed gesture, but we can do it with one hand pinching
    if (gesture === 'Pinch') {
      const indexTip = rawLandmarks[8];
      
      const px = getX(indexTip.x);
      const py = getY(indexTip.y);
      
      // Target radius based on distance of pinch to center of wheel
      const centerX = width / 2;
      const targetRadius = Math.max(10, Math.min(this.maxRadius, Math.abs(px - centerX)));
      
      // Map hand Y to a segment on the clay (bottom of clay is near bottom of screen)
      const clayBottomY = height * 0.8;
      const clayHeight = height * 0.5;
      const clayTopY = clayBottomY - clayHeight;
      
      let segmentIdx = Math.floor(((py - clayTopY) / clayHeight) * this.numSegments);
      // invert segment idx because 0 is bottom
      segmentIdx = this.numSegments - segmentIdx - 1;
      
      if (segmentIdx >= 0 && segmentIdx < this.numSegments) {
        // Mold the clay! Apply a soft-brush deformation using gaussian-like falloff
        for (let i = 0; i < this.numSegments; i++) {
          const dist = Math.abs(i - segmentIdx);
          if (dist < 8) {
            const influence = Math.exp(-(dist * dist) / 10);
            this.clayShape[i] = this.clayShape[i] * (1 - influence * 0.2) + targetRadius * influence * 0.2;
          }
        }

        // Spawn some wet clay particles splashing off
        if (Math.random() < 0.3) {
           this.particles.push({
             x: px, y: py,
             vx: (Math.random() - 0.5) * 10,
             vy: (Math.random() - 1) * 5,
             life: 1.0
           });
        }
      }
    }
  }

  update(width: number, height: number) {
    this.wheelSpin += this.spinSpeed;
    
    // Update particles
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.5; // gravity
      p.life -= 0.02;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const centerX = width / 2;
    const clayBottomY = height * 0.8;
    const clayHeight = height * 0.5;
    const segmentHeight = clayHeight / this.numSegments;

    // Draw the spinning wheel base
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.ellipse(centerX, clayBottomY + 10, this.maxRadius + 50, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Wheel details (spin effect)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 5;
    for (let i = 0; i < 4; i++) {
      const angle = this.wheelSpin + (i * Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(centerX, clayBottomY + 10);
      ctx.lineTo(centerX + Math.cos(angle) * (this.maxRadius + 40), clayBottomY + 10 + Math.sin(angle) * 15);
      ctx.stroke();
    }

    // Draw the clay layer by layer (from bottom to top)
    for (let i = 0; i < this.numSegments; i++) {
      const r = this.clayShape[i];
      const y = clayBottomY - (i * segmentHeight);
      
      // Calculate shading based on radius difference to create pseudo-3D lighting
      const rDiff = i > 0 ? this.clayShape[i] - this.clayShape[i-1] : 0;
      const shade = Math.max(0, Math.min(255, 120 + rDiff * 5));
      
      const gradient = ctx.createLinearGradient(centerX - r, 0, centerX + r, 0);
      gradient.addColorStop(0, `rgb(${Math.max(0, shade-40)}, ${Math.max(0, shade-60)}, ${Math.max(0, shade-80)})`); // dark edge
      gradient.addColorStop(0.3, `rgb(${Math.min(255, shade+40)}, ${Math.min(255, shade+10)}, ${Math.max(0, shade-20)})`); // highlight
      gradient.addColorStop(0.7, `rgb(${shade}, ${Math.max(0, shade-30)}, ${Math.max(0, shade-50)})`); // mid
      gradient.addColorStop(1, `rgb(${Math.max(0, shade-60)}, ${Math.max(0, shade-80)}, ${Math.max(0, shade-90)})`); // shadow
      
      ctx.fillStyle = gradient;
      
      // Draw ellipse slice
      ctx.beginPath();
      ctx.ellipse(centerX, y, Math.max(1, r), Math.max(1, r * 0.3), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Render particles
    ctx.fillStyle = 'rgba(180, 120, 90, 0.8)'; // wet clay color
    this.particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.life * 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
