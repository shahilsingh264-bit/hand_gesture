import type { Theme } from './Theme';
import type { HandState } from '../gestureEngine';

export interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export class CosmicTheme implements Theme {
  name = 'Cosmic';
  private stars: Star[] = [];
  private lastSpawnTime = 0;

  init() {
    this.stars = [];
  }

  update(width: number, height: number) {
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const p = this.stars[i];
      p.x += p.vx;
      p.y += p.vy;
      // Slight drag
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life--;
      if (p.life <= 0) {
        this.stars.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.stars.forEach(p => {
      ctx.save();
      const alpha = Math.min(1, p.life / 50);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 15;
      
      ctx.translate(p.x, p.y);
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    });
  }

  handleGesture(hand: HandState, ctx: CanvasRenderingContext2D, width: number, height: number, getX: (x: number) => number, getY: (y: number) => number, timestamp: number) {
    const indexTip = hand.landmarks[8];
    const indexX = getX(indexTip.x);
    const indexY = getY(indexTip.y);

    const palmCenter = {
      x: (hand.landmarks[0].x + hand.landmarks[5].x + hand.landmarks[17].x) / 3,
      y: (hand.landmarks[0].y + hand.landmarks[5].y + hand.landmarks[17].y) / 3
    };
    const pX = getX(palmCenter.x);
    const pY = getY(palmCenter.y);

    if (hand.currentGesture === 'Point') {
      // Draw comet tip
      ctx.fillStyle = '#FFF';
      ctx.shadowColor = '#FF00FF';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(indexX, indexY, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Spawn stardust
      if (timestamp - this.lastSpawnTime > 50) {
        this.lastSpawnTime = timestamp;
        for (let i = 0; i < 3; i++) {
          this.stars.push({
            x: indexX + (Math.random() - 0.5) * 20,
            y: indexY + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 150 + Math.random() * 100,
            maxLife: 250,
            size: 1 + Math.random() * 3
          });
        }
      }
    } else if (hand.currentGesture === 'Fist') {
      // Vacuum effect
      // Draw black hole at palm
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.shadowColor = '#8A2BE2';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(pX, pY, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      this.stars.forEach(p => {
        const dx = pX - p.x;
        const dy = pY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 400 && dist > 10) {
          const pull = 500 / (dist * dist);
          p.vx += (dx / dist) * pull;
          p.vy += (dy / dist) * pull;
          
          if (dist < 30) {
             p.life = 0; // Suck in
          }
        }
      });
    } else if (hand.currentGesture === 'OpenPalm') {
      // Supernova scatter
      this.stars.forEach(p => {
        const dx = p.x - pX;
        const dy = p.y - pY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 300) {
          const push = 300 / Math.max(dist, 10);
          p.vx += (dx / dist) * push;
          p.vy += (dy / dist) * push;
        }
      });
    }
  }
}
