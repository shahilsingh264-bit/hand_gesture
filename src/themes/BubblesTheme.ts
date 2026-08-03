import type { Theme } from './Theme';
import type { HandState } from '../gestureEngine';
import { dist } from '../gestureEngine';

interface Bubble {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  phase: number;
  popped: boolean;
  popFrames: number; // for animation
}

export class BubblesTheme implements Theme {
  name = 'Bubbles';
  private bubbles: Bubble[] = [];

  init(_ctx: CanvasRenderingContext2D, _width: number, _height: number): void {
    this.bubbles = [];
  }

  update(_width: number, _height: number): void {
    const time = Date.now() / 1000;
    
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (b.popped) {
        b.popFrames++;
        if (b.popFrames > 15) {
          this.bubbles.splice(i, 1);
        }
        continue;
      }
      
      // Floating up
      b.y += b.vy;
      // Drift sideways using sine wave
      b.x += Math.sin(time * 2 + b.phase) * b.vx;
      
      if (b.y < -50) {
        this.bubbles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, _width: number, _height: number): void {
    ctx.lineWidth = 2;
    for (const b of this.bubbles) {
      if (b.popped) {
        // Draw splash/pop
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - b.popFrames / 15})`;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const r1 = b.r + b.popFrames;
          const r2 = b.r + b.popFrames + 5;
          ctx.moveTo(b.x + Math.cos(angle) * r1, b.y + Math.sin(angle) * r1);
          ctx.lineTo(b.x + Math.cos(angle) * r2, b.y + Math.sin(angle) * r2);
        }
        ctx.stroke();
      } else {
        // Draw soap bubble
        // Add a slight shimmer gradient
        const grad = ctx.createRadialGradient(b.x - b.r*0.3, b.y - b.r*0.3, b.r*0.1, b.x, b.y, b.r);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        grad.addColorStop(0.2, 'rgba(200, 240, 255, 0.4)');
        grad.addColorStop(0.8, 'rgba(255, 200, 255, 0.2)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.5)');

        ctx.fillStyle = grad;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Highlight reflection
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.ellipse(b.x - b.r*0.4, b.y - b.r*0.4, b.r*0.2, b.r*0.1, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  handleGesture(hand: HandState, _ctx: CanvasRenderingContext2D, width: number, height: number, getX: (x: number) => number, getY: (y: number) => number, _timestamp: number): void {
    if (hand.currentGesture === 'Swipe') {
      this.bubbles = []; // Clear
      return;
    }

    const ix = getX(hand.landmarks[8].x);
    const iy = getY(hand.landmarks[8].y);

    if (hand.currentGesture === 'Point' && Math.random() > 0.6) { // Don't spawn too fast
      this.bubbles.push({
        x: ix + (Math.random() - 0.5) * 20,
        y: iy + (Math.random() - 0.5) * 20,
        r: 10 + Math.random() * 20,
        vx: 1 + Math.random() * 2,
        vy: -2 - Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
        popped: false,
        popFrames: 0
      });
    }

    if (hand.currentGesture === 'OpenPalm') {
      // Pop bubbles near palm center
      const px = getX(hand.landmarks[9].x);
      const py = getY(hand.landmarks[9].y);
      const radius = width * 0.15; // 15% of screen width

      for (const b of this.bubbles) {
        if (!b.popped) {
          const d = Math.sqrt((b.x - px) ** 2 + (b.y - py) ** 2);
          if (d < radius) {
            b.popped = true;
          }
        }
      }
    }
    
    if (hand.currentGesture === 'Rock') {
      // Burst spawn a ton of bubbles
      for(let i=0; i<5; i++) {
         this.bubbles.push({
          x: ix + (Math.random() - 0.5) * 100,
          y: iy + (Math.random() - 0.5) * 100,
          r: 5 + Math.random() * 15,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5 - 2,
          phase: Math.random() * Math.PI * 2,
          popped: false,
          popFrames: 0
        });
      }
    }
  }
}
