import type { Theme } from './Theme';
import type { HandState } from '../gestureEngine';

interface Mole {
  x: number;
  y: number;
  active: boolean;
  timeLeft: number;
  isHit: boolean;
}

export class WhackAMoleTheme implements Theme {
  name = 'WhackAMole';
  private score = 0;
  private moles: Mole[] = [];
  private particles: {x: number, y: number, vx: number, vy: number, life: number}[] = [];
  private lastHitTime = 0;
  
  init() {
    this.score = 0;
    this.moles = [];
    this.particles = [];
  }

  private setupMoles(width: number, height: number) {
    if (this.moles.length > 0) return;
    const cols = 3;
    const rows = 2;
    const paddingX = width / 4;
    const paddingY = height / 3;
    
    for (let r = 0; r < rows; r++) {
       for (let c = 0; c < cols; c++) {
          this.moles.push({
             x: paddingX + c * (width - 2*paddingX) / 2,
             y: paddingY + r * (height - 2*paddingY),
             active: false,
             timeLeft: 0,
             isHit: false
          });
       }
    }
  }

  handleGesture(hand: HandState, ctx: CanvasRenderingContext2D, width: number, height: number, getX: (x: number) => number, getY: (y: number) => number, timestamp: number): void {
    const { currentGesture: gesture, landmarks } = hand;
    
    // Use Fist or Point to whack
    if (gesture === 'Fist' || gesture === 'Point') {
       // Use index finger tip or wrist as center
       const tip = landmarks[8]; // Index finger
       const px = getX(tip.x);
       const py = getY(tip.y);
       
       for (let mole of this.moles) {
          if (mole.active && !mole.isHit) {
             const dist = Math.hypot(mole.x - px, mole.y - py);
             if (dist < 80) { // Hit radius
                mole.isHit = true;
                mole.timeLeft = 0.5; // Show hit state briefly
                this.score += 10;
                
                // Haptic feedback
                if (window && (window as any).triggerHaptic) (window as any).triggerHaptic();
                
                // Particles
                for(let i=0; i<15; i++) {
                   this.particles.push({
                      x: mole.x, y: mole.y,
                      vx: (Math.random()-0.5)*10,
                      vy: (Math.random()-0.5)*10,
                      life: 1.0
                   });
                }
             }
          }
       }
    }
  }

  update(width: number, height: number) {
    this.setupMoles(width, height);
    
    let anyActive = false;
    for (let mole of this.moles) {
       if (mole.active) {
          anyActive = true;
          mole.timeLeft -= 0.02; // Roughly 60fps, so 1.2 sec per 1.0
          if (mole.timeLeft <= 0) {
             mole.active = false;
          }
       }
    }
    
    // Spawn new mole occasionally if none are active, or random chance
    if (!anyActive || Math.random() < 0.01) {
       const inactive = this.moles.filter(m => !m.active);
       if (inactive.length > 0 && Math.random() < 0.05) {
          const target = inactive[Math.floor(Math.random() * inactive.length)];
          target.active = true;
          target.isHit = false;
          target.timeLeft = 1.0 + Math.random(); // 1 to 2 seconds
       }
    }

    // Update particles
    this.particles.forEach(p => {
       p.x += p.vx;
       p.y += p.vy;
       p.vy += 0.5; // gravity
       p.life -= 0.05;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);

    // Draw holes and moles
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let mole of this.moles) {
       // Draw hole
       ctx.fillStyle = 'rgba(0,0,0,0.5)';
       ctx.beginPath();
       ctx.ellipse(mole.x, mole.y + 20, 50, 20, 0, 0, Math.PI*2);
       ctx.fill();
       
       if (mole.active) {
          ctx.font = '80px sans-serif';
          if (mole.isHit) {
             ctx.fillText('💥', mole.x, mole.y);
          } else {
             // Mole popping up animation based on timeLeft
             ctx.save();
             // Simple bounce effect
             const yOffset = Math.sin(mole.timeLeft * Math.PI) * -20;
             ctx.fillText('👾', mole.x, mole.y + yOffset);
             ctx.restore();
          }
       }
    }

    // Draw particles
    ctx.fillStyle = '#ffaa00';
    for (let p of this.particles) {
       ctx.globalAlpha = Math.max(0, p.life);
       ctx.beginPath();
       ctx.arc(p.x, p.y, p.life * 6, 0, Math.PI*2);
       ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Draw Score
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${this.score}`, 20, 40);
  }
}
