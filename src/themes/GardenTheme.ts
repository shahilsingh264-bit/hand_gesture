import type { Theme } from './Theme';
import type { HandState } from '../gestureEngine';
import { dist } from '../gestureEngine';
import { loadAssets, svgDataUrls } from '../assets';

export type FlowerState = 'planted' | 'scattering';

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  scale: number;
  alpha: number;
  assetIndex: number;
  state: FlowerState;
  life: number;
}

const PLANT_COOLDOWN_MS = 150;
const SCATTER_RADIUS = 250;

export class GardenTheme implements Theme {
  name = 'Garden';
  private particles: Particle[] = [];
  private particleIdCounter = 0;
  private assets: HTMLImageElement[] = [];
  private lastPlantTime = 0;
  
  constructor() {
    loadAssets().then(imgs => {
      this.assets = imgs;
    });
  }

  init() {
    this.particles = [];
  }

  update(width: number, height: number) {
    const now = performance.now();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (p.state === 'scattering') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5; // Gravity
        p.vx *= 0.95; // Drag
        p.vy *= 0.95; // Drag
        p.rotation += p.vx * 0.05;
        p.life -= 16;
        p.alpha = Math.max(0, p.life / 1500);
        
        if (p.life <= 0 || p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      } else {
        // Planted: gentle bobbing
        p.y += Math.sin(now * 0.005 + p.id) * 0.2;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.particles.forEach(p => {
      const img = this.assets[p.assetIndex];
      if (!img) return;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(p.scale, p.scale);
      ctx.globalAlpha = p.alpha;
      
      const imgW = 60;
      const imgH = 60;
      ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
      
      ctx.restore();
    });
  }

  handleGesture(hand: HandState, ctx: CanvasRenderingContext2D, width: number, height: number, getX: (x: number) => number, getY: (y: number) => number, timestamp: number) {
    if (hand.currentGesture === 'Point') {
      const indexTip = hand.landmarks[8];
      const indexX = getX(indexTip.x);
      const indexY = getY(indexTip.y);

      // Draw sparkle
      ctx.fillStyle = '#FFF';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(indexX, indexY, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Plant
      if (timestamp - this.lastPlantTime > PLANT_COOLDOWN_MS) {
        this.lastPlantTime = timestamp;
        const flowerAssetsCount = Math.max(1, this.assets.length - 1);
        this.particles.push({
          id: this.particleIdCounter++,
          x: indexX,
          y: indexY,
          vx: 0,
          vy: 0,
          rotation: Math.random() * Math.PI * 2,
          scale: 0.5 + Math.random() * 0.5,
          alpha: 1,
          assetIndex: Math.floor(Math.random() * flowerAssetsCount),
          state: 'planted',
          life: 0
        });
      }
    } else if (hand.currentGesture === 'OpenPalm') {
      const palmCenter = {
        x: (hand.landmarks[0].x + hand.landmarks[5].x + hand.landmarks[17].x) / 3,
        y: (hand.landmarks[0].y + hand.landmarks[5].y + hand.landmarks[17].y) / 3
      };
      const pX = getX(palmCenter.x);
      const pY = getY(palmCenter.y);

      this.particles.forEach(p => {
        if (p.state === 'planted') {
          const dx = p.x - pX;
          const dy = p.y - pY;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < SCATTER_RADIUS) {
            p.state = 'scattering';
            p.life = 1500;
            const force = (SCATTER_RADIUS - d) / SCATTER_RADIUS;
            const angle = Math.atan2(dy, dx);
            const speed = 10 + force * 20;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
          }
        }
      });
    }
  }
}
