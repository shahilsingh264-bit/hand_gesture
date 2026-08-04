import type { Theme } from './Theme';
import type { HandState } from '../gestureEngine';

interface FallingObject {
  x: number;
  y: number;
  vy: number;
  isBomb: boolean;
}

export class CatchStarsTheme implements Theme {
  name = 'CatchStars';
  
  private score = 0;
  private lives = 3;
  private gameOver = false;
  
  private basketX = 400;
  private basketWidth = 120;
  
  private objects: FallingObject[] = [];
  
  init() {
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.basketX = 400;
    this.objects = [];
  }

  handleGesture(hand: HandState, ctx: CanvasRenderingContext2D, width: number, height: number, getX: (x: number) => number, getY: (y: number) => number, timestamp: number): void {
    if (this.gameOver) {
       if (hand.currentGesture === 'ThumbsUp') {
          this.init();
       }
       return;
    }

    const { currentGesture, landmarks } = hand;
    
    // Use OpenPalm to control the basket
    if (currentGesture === 'OpenPalm') {
       // Use wrist or middle finger base for stable X
       const palmBase = landmarks[0]; 
       // Smooth movement towards palm X
       const targetX = getX(palmBase.x);
       this.basketX += (targetX - this.basketX) * 0.3;
    }
  }

  update(width: number, height: number) {
    if (this.gameOver) return;

    // Spawn objects
    if (Math.random() < 0.03 + (this.score / 5000)) {
       this.objects.push({
          x: Math.random() * (width - 100) + 50,
          y: -50,
          vy: 5 + Math.random() * 5 + (this.score / 10),
          isBomb: Math.random() < 0.3 // 30% bombs
       });
    }

    const basketY = height - 100;
    const basketHeight = 40;

    // Update objects
    for (let i = this.objects.length - 1; i >= 0; i--) {
       let obj = this.objects[i];
       obj.y += obj.vy;
       
       // Collision with basket
       if (
          obj.y + 30 > basketY && obj.y - 30 < basketY + basketHeight &&
          obj.x + 30 > this.basketX - this.basketWidth/2 &&
          obj.x - 30 < this.basketX + this.basketWidth/2
       ) {
          if (obj.isBomb) {
             this.lives--;
             if (this.lives <= 0) this.gameOver = true;
             if (window && (window as any).triggerHaptic) (window as any).triggerHaptic();
          } else {
             this.score += 10;
          }
          this.objects.splice(i, 1);
          continue;
       }
       
       // Missed star penalty (optional, let's just let them drop)
       if (obj.y > height + 100) {
          this.objects.splice(i, 1);
       }
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);
    
    // Draw Basket
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.roundRect(this.basketX - this.basketWidth/2, height - 100, this.basketWidth, 40, 20);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    
    // Draw Objects
    ctx.font = '60px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let obj of this.objects) {
       ctx.fillText(obj.isBomb ? '💣' : '⭐', obj.x, obj.y);
    }
    
    // HUD
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
      ctx.fillText('👍 Thumbs Up to restart!', width/2, height/2 + 100);
    }
  }
}
