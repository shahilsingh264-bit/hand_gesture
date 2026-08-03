import type { Theme } from './Theme';
import type { HandState } from '../gestureEngine';

interface Ember {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class FireTheme implements Theme {
  name = 'Fire';
  private embers: Ember[] = [];

  init(_ctx: CanvasRenderingContext2D, _width: number, _height: number): void {
    this.embers = [];
  }

  update(_width: number, _height: number): void {
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.life -= 1;
      if (e.life <= 0) {
        this.embers.splice(i, 1);
        continue;
      }
      
      e.x += e.vx;
      e.y += e.vy;
      
      // Turbulence
      e.vx += (Math.random() - 0.5) * 0.5;
      // Tendency to go up
      e.vy -= 0.1;
      
      // Friction
      e.vx *= 0.95;
      e.vy *= 0.95;
    }
  }

  render(ctx: CanvasRenderingContext2D, _width: number, _height: number): void {
    ctx.globalCompositeOperation = 'lighter';
    
    for (const e of this.embers) {
      const lifeRatio = Math.max(0, e.life / e.maxLife);
      const radius = e.size * lifeRatio;
      if (radius <= 0.1) continue;

      const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, radius);
      
      // Heat color mapping based on life
      if (lifeRatio > 0.7) {
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.2, 'rgba(255, 200, 50, 0.8)');
        grad.addColorStop(1, 'rgba(255, 50, 0, 0)');
      } else if (lifeRatio > 0.3) {
        grad.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
        grad.addColorStop(1, 'rgba(200, 20, 0, 0)');
      } else {
        grad.addColorStop(0, 'rgba(100, 100, 100, 0.5)'); // Smoke
        grad.addColorStop(1, 'rgba(50, 50, 50, 0)');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalCompositeOperation = 'source-over';
  }

  handleGesture(hand: HandState, _ctx: CanvasRenderingContext2D, _width: number, _height: number, getX: (x: number) => number, getY: (y: number) => number, _timestamp: number): void {
    if (hand.currentGesture === 'Swipe') {
      this.embers = []; // Clear
      return;
    }

    const ix = getX(hand.landmarks[8].x);
    const iy = getY(hand.landmarks[8].y);

    if (hand.currentGesture === 'Point' || hand.currentGesture === 'Rock') {
      const count = hand.currentGesture === 'Rock' ? 10 : 2;
      for (let i = 0; i < count; i++) {
        this.embers.push({
          x: ix + (Math.random() - 0.5) * 20,
          y: iy + (Math.random() - 0.5) * 20,
          size: 15 + Math.random() * 20,
          vx: (Math.random() - 0.5) * 2,
          vy: -1 - Math.random() * 2,
          maxLife: 60 + Math.random() * 60,
          life: 60 + Math.random() * 60,
        });
      }
    }

    if (hand.currentGesture === 'OpenPalm') {
      // Wind pushes everything right or left depending on palm movement
      // For simplicity, just push everything out from palm center
      const px = getX(hand.landmarks[9].x);
      const py = getY(hand.landmarks[9].y);

      for (const e of this.embers) {
        const dx = e.x - px;
        const dy = e.y - py;
        const distSq = dx*dx + dy*dy;
        if (distSq > 0 && distSq < 90000) { // within 300px
          const dist = Math.sqrt(distSq);
          const force = (300 - dist) / 300;
          e.vx += (dx / dist) * force * 5;
          e.vy += (dy / dist) * force * 5;
        }
      }
    }
    
    if (hand.currentGesture === 'Fist') {
      // Suck them back in
      const px = getX(hand.landmarks[9].x);
      const py = getY(hand.landmarks[9].y);

      for (const e of this.embers) {
        const dx = e.x - px;
        const dy = e.y - py;
        const distSq = dx*dx + dy*dy;
        if (distSq > 0) {
          const dist = Math.sqrt(distSq);
          // Stronger force than wind
          e.vx -= (dx / dist) * 2;
          e.vy -= (dy / dist) * 2;
        }
      }
    }
  }
}
