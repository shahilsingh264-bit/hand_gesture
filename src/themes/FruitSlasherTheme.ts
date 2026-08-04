import type { Theme } from './Theme';
import type { HandState, Point3D } from '../gestureEngine';

interface Fruit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  emoji: string;
  isSliced: boolean;
  sliceAngle: number;
  life: number;
  isBomb: boolean;
}

const FRUITS = ['🍎', '🍉', '🍌', '🍍', '🥥'];

export class FruitSlasherTheme implements Theme {
  name = 'FruitSlasher';
  private score = 0;
  private lives = 3;
  private fruits: Fruit[] = [];
  private particles: { x: number, y: number, vx: number, vy: number, life: number, color: string }[] = [];
  private trail: { x: number, y: number, life: number }[] = [];
  
  private lastHandPos: { x: number, y: number } | null = null;
  private gameOver = false;

  init() {
    this.score = 0;
    this.lives = 3;
    this.fruits = [];
    this.particles = [];
    this.gameOver = false;
  }

  private spawnFruit(width: number, height: number) {
    const isBomb = Math.random() < 0.2; // 20% chance of bomb
    const x = Math.random() * (width - 100) + 50;
    const y = height + 50;
    
    this.fruits.push({
      x, y,
      vx: (Math.random() - 0.5) * 8 * (width / 800), // scale velocity by screen size roughly
      vy: -15 - Math.random() * 10,
      radius: 80,
      emoji: isBomb ? '💣' : FRUITS[Math.floor(Math.random() * FRUITS.length)],
      isSliced: false,
      sliceAngle: 0,
      life: 1.0,
      isBomb
    });
  }

  handleGesture(hand: HandState, ctx: CanvasRenderingContext2D, width: number, height: number, getX: (x: number) => number, getY: (y: number) => number, timestamp: number): void {
    if (this.gameOver) return;
    
    const { currentGesture: gesture, landmarks: rawLandmarks } = hand;
    
    // We can slash with Point or OpenPalm
    if (gesture !== 'Point' && gesture !== 'OpenPalm') {
       this.lastHandPos = null;
       return;
    }

    // Use index finger for slashing
    const indexTip = rawLandmarks[8];
    const px = getX(indexTip.x);
    const py = getY(indexTip.y);

    if (this.lastHandPos) {
      // Calculate velocity/distance of the slash
      const dist = Math.hypot(px - this.lastHandPos.x, py - this.lastHandPos.y);
      
      if (dist > 15) {
         // Fast enough to slash!
         
         // Add to visual trail
         this.trail.push({ x: px, y: py, life: 1.0 });

         // Check intersection with fruits using a line segment
         for (let fruit of this.fruits) {
            if (fruit.isSliced) continue;
            
            // Simple distance check from fruit to line segment (lastHandPos -> px,py)
            // For simplicity, just check distance from fruit to current hand pos and last hand pos
            const d1 = Math.hypot(fruit.x - px, fruit.y - py);
            const d2 = Math.hypot(fruit.x - this.lastHandPos.x, fruit.y - this.lastHandPos.y);
            
            if (d1 < fruit.radius || d2 < fruit.radius || (d1 + d2) < dist + fruit.radius) {
               // Sliced!
               fruit.isSliced = true;
               fruit.sliceAngle = Math.atan2(py - this.lastHandPos.y, px - this.lastHandPos.x);
               
               // Try to trigger haptic feedback globally if available
               if (window && (window as any).triggerHaptic) {
                   (window as any).triggerHaptic();
               }

               if (fruit.isBomb) {
                  this.lives--;
                  if (this.lives <= 0) this.gameOver = true;
                  // Bomb particles
                  this.spawnParticles(fruit.x, fruit.y, '#555', 30);
                  this.spawnParticles(fruit.x, fruit.y, '#ff5500', 20);
               } else {
                  this.score += 10;
                  this.spawnParticles(fruit.x, fruit.y, '#00ff00', 15);
               }
            }
         }
      }
    }

    this.lastHandPos = { x: px, y: py };
  }

  private spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 1.0,
        color
      });
    }
  }

  update(width: number, height: number) {
    if (this.gameOver) return;

    // Randomly spawn fruits
    if (Math.random() < 0.02 + (this.score / 10000)) {
       this.spawnFruit(width, height);
    }

    // Update fruits
    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const f = this.fruits[i];
      f.x += f.vx;
      f.y += f.vy;
      f.vy += 0.4; // gravity
      
      if (f.isSliced) {
         f.life -= 0.02; // fade out sliced halves
      }

      // If falls off screen without being sliced, lose a life (unless bomb)
      if (f.y > height + 100) {
         if (!f.isBomb && !f.isSliced) {
            this.lives--;
            if (this.lives <= 0) this.gameOver = true;
         }
         this.fruits.splice(i, 1);
      } else if (f.life <= 0) {
         this.fruits.splice(i, 1);
      }
    }

    // Update particles
    this.particles.forEach(p => {
       p.x += p.vx;
       p.y += p.vy;
       p.vy += 0.2; // gravity
       p.life -= 0.03;
    });
    this.particles = this.particles.filter(p => p.life > 0);

    // Update trail
    this.trail.forEach(t => t.life -= 0.1);
    this.trail = this.trail.filter(t => t.life > 0);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);

    // Render Trail
    if (this.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 15;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Render Fruits
    ctx.font = '120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (const f of this.fruits) {
      if (!f.isSliced) {
        ctx.fillText(f.emoji, f.x, f.y);
      } else {
        // Draw two halves flying apart
        ctx.save();
        ctx.globalAlpha = f.life;
        
        // Offset halves perpendicularly to the slice angle
        const dx = Math.cos(f.sliceAngle + Math.PI/2) * (1 - f.life) * 40;
        const dy = Math.sin(f.sliceAngle + Math.PI/2) * (1 - f.life) * 40;
        
        // This is a simple visual hack for halves: just draw emoji shifted
        ctx.fillText(f.emoji, f.x + dx, f.y + dy);
        ctx.fillText(f.emoji, f.x - dx, f.y - dy);
        
        ctx.restore();
      }
    }

    // Render particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.life * 5, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Render HUD
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${this.score}`, 20, 40);
    ctx.textAlign = 'right';
    ctx.fillText(`Lives: ${'❤️'.repeat(Math.max(0, this.lives))}`, width - 20, 40);

    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ff3333';
      ctx.textAlign = 'center';
      ctx.font = 'bold 64px sans-serif';
      ctx.fillText('GAME OVER', width/2, height/2 - 20);
      ctx.fillStyle = 'white';
      ctx.font = '32px sans-serif';
      ctx.fillText(`Final Score: ${this.score}`, width/2, height/2 + 40);
      ctx.fillText('Point to restart!', width/2, height/2 + 100);
      
      // Allow restart if trailing hand points
      if (this.lastHandPos) {
         this.init();
      }
    }
  }
}
