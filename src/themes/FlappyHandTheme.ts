import type { Theme } from './Theme';
import type { HandState } from '../gestureEngine';

interface Pipe {
  x: number;
  gapTop: number;
  gapSize: number;
  passed: boolean;
}

export class FlappyHandTheme implements Theme {
  name = 'FlappyHand';
  
  private score = 0;
  private gameOver = false;
  
  private birdY = 300;
  private targetY = 300;
  private birdVelocity = 0;
  
  private pipes: Pipe[] = [];
  
  private lastHandActiveTime = 0;

  init() {
    this.score = 0;
    this.gameOver = false;
    this.birdY = 300;
    this.targetY = 300;
    this.birdVelocity = 0;
    this.pipes = [];
    this.lastHandActiveTime = performance.now();
  }

  handleGesture(hand: HandState, ctx: CanvasRenderingContext2D, width: number, height: number, getX: (x: number) => number, getY: (y: number) => number, timestamp: number): void {
    if (this.gameOver) {
       if (hand.currentGesture === 'ThumbsUp') {
          this.init(); // Restart
       }
       return;
    }

    const { landmarks } = hand;
    
    // Always track index finger Y, regardless of gesture
    const tip = landmarks[8]; 
    this.targetY = getY(tip.y);
    this.lastHandActiveTime = timestamp;
  }

  update(width: number, height: number) {
    if (this.gameOver) return;

    // Smooth bird movement
    const now = performance.now();
    if (now - this.lastHandActiveTime < 500) {
       // Hand is active, pull bird towards hand
       this.birdVelocity = (this.targetY - this.birdY) * 0.1;
    } else {
       // Gravity
       this.birdVelocity += 0.5;
    }
    
    this.birdY += this.birdVelocity;
    
    // Floor/Ceiling collision
    if (this.birdY > height || this.birdY < 0) {
       this.gameOver = true;
       if (window && (window as any).triggerHaptic) (window as any).triggerHaptic();
    }

    // Pipe generation
    if (this.pipes.length === 0 || this.pipes[this.pipes.length - 1].x < width - 400) {
       const gapSize = 250;
       const gapTop = Math.random() * (height - gapSize - 100) + 50;
       this.pipes.push({ x: width + 100, gapTop, gapSize, passed: false });
    }

    const birdX = 200; // Fixed bird X
    const birdRadius = 25;

    // Update pipes
    for (let i = this.pipes.length - 1; i >= 0; i--) {
       let p = this.pipes[i];
       p.x -= 6; // Move left
       
       // Score
       if (!p.passed && p.x + 80 < birdX) {
          p.passed = true;
          this.score++;
       }
       
       // Collision
       if (
          birdX + birdRadius > p.x && birdX - birdRadius < p.x + 80 &&
          (this.birdY - birdRadius < p.gapTop || this.birdY + birdRadius > p.gapTop + p.gapSize)
       ) {
          this.gameOver = true;
          if (window && (window as any).triggerHaptic) (window as any).triggerHaptic();
       }
       
       // Remove offscreen
       if (p.x < -100) {
          this.pipes.splice(i, 1);
       }
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);
    
    // Draw Pipes
    ctx.fillStyle = '#2ecc71';
    for (let p of this.pipes) {
       // Top pipe
       ctx.fillRect(p.x, 0, 80, p.gapTop);
       // Bottom pipe
       ctx.fillRect(p.x, p.gapTop + p.gapSize, 80, height - (p.gapTop + p.gapSize));
       
       // Borders
       ctx.strokeStyle = '#27ae60';
       ctx.lineWidth = 4;
       ctx.strokeRect(p.x, 0, 80, p.gapTop);
       ctx.strokeRect(p.x, p.gapTop + p.gapSize, 80, height - (p.gapTop + p.gapSize));
    }
    
    // Draw Bird
    const birdX = 200;
    ctx.font = '50px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Rotate bird based on velocity
    ctx.save();
    ctx.translate(birdX, this.birdY);
    ctx.rotate(Math.max(-Math.PI/4, Math.min(Math.PI/4, this.birdVelocity * 0.05)));
    ctx.fillText(this.gameOver ? '😵' : '🐦', 0, 0);
    ctx.restore();
    
    // HUD
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.score.toString(), width/2, 80);
    
    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ff3333';
      ctx.textAlign = 'center';
      ctx.font = 'bold 64px sans-serif';
      ctx.fillText('GAME OVER', width/2, height/2 - 20);
      ctx.fillStyle = 'white';
      ctx.font = '32px sans-serif';
      ctx.fillText(`Score: ${this.score}`, width/2, height/2 + 40);
      ctx.fillText('👍 Thumbs Up to restart!', width/2, height/2 + 100);
    }
  }
}
