import type { Theme } from './Theme';
import type { HandState } from '../gestureEngine';

export class StorybookTheme implements Theme {
  name = 'Storybook';
  private page = 0;
  private maxPages = 3;
  private particles: { x: number, y: number, vx: number, vy: number, life: number, color: string }[] = [];
  
  // Debounce page turns
  private lastSwipeTime = 0;

  init() {}

  handleGesture(hand: HandState, ctx: CanvasRenderingContext2D, width: number, height: number, getX: (x: number) => number, getY: (y: number) => number, timestamp: number): void {
    const { gesture, rawLandmarks } = hand;
    const px = getX(rawLandmarks[8].x);
    const py = getY(rawLandmarks[8].y);

    if (gesture === 'Swipe' && timestamp - this.lastSwipeTime > 1000) {
      // Very simple swipe logic: if hand is on left side of screen, go back. If right, go forward.
      if (px > width / 2) {
        this.page = Math.min(this.maxPages - 1, this.page + 1);
      } else {
        this.page = Math.max(0, this.page - 1);
      }
      this.lastSwipeTime = timestamp;
      // Spawn burst of particles on page turn
      for (let i = 0; i < 20; i++) {
        this.particles.push({
          x: width/2, y: height/2,
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          life: 1.0,
          color: ['#ff00ff', '#00ffff', '#ffff00'][Math.floor(Math.random() * 3)]
        });
      }
    }

    if (gesture === 'Point' || gesture === 'Pinch') {
      // Spawn magical interaction particles
      if (Math.random() > 0.5) {
        this.particles.push({
          x: px, y: py,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5 - 2, // float up
          life: 1.0,
          color: this.page === 0 ? '#55ff55' : (this.page === 1 ? '#5555ff' : '#ff5555')
        });
      }
    }
  }

  update(width: number, height: number) {
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);

    // Render "Storybook" background frame and text
    ctx.fillStyle = 'rgba(255, 248, 220, 0.85)'; // parchment color
    ctx.fillRect(50, 50, width - 100, height - 100);
    
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 60, width - 120, height - 120);

    ctx.fillStyle = '#8B4513';
    ctx.textAlign = 'center';
    
    ctx.font = 'bold 48px serif';
    if (this.page === 0) {
      ctx.fillText('The Magical Forest', width/2, height/2 - 50);
      ctx.font = '32px serif';
      ctx.fillText('Point your wand to grow leaves!', width/2, height/2 + 20);
    } else if (this.page === 1) {
      ctx.fillText('The Deep Ocean', width/2, height/2 - 50);
      ctx.font = '32px serif';
      ctx.fillText('Pinch to summon bubbles!', width/2, height/2 + 20);
    } else {
      ctx.fillText('The Dragon\'s Lair', width/2, height/2 - 50);
      ctx.font = '32px serif';
      ctx.fillText('Swipe to escape!', width/2, height/2 + 20);
    }
    
    ctx.font = '24px serif';
    ctx.fillText(`Page ${this.page + 1} of ${this.maxPages} (Swipe to turn)`, width/2, height - 80);

    // Render magic particles
    this.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.life * 10 + 5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
  }
}
