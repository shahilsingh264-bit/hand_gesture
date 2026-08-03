import type { Theme } from './Theme';
import type { HandState } from '../gestureEngine';

export class MeasureTheme implements Theme {
  name = 'Measure';
  private startPoint: { x: number, y: number } | null = null;
  private currentPoint: { x: number, y: number } | null = null;
  private savedLines: { start: {x:number, y:number}, end: {x:number, y:number}, distance: number }[] = [];
  
  // Roughly guess that 1 pixel = X cm depending on camera distance, we use a simple scalar for the toy demo
  private PIXELS_TO_CM = 0.05; 

  init() {}
  update() {}

  handleGesture(hand: HandState, ctx: CanvasRenderingContext2D, width: number, height: number, getX: (x: number) => number, getY: (y: number) => number, timestamp: number): void {
    const { gesture, rawLandmarks } = hand;
    const indexTip = rawLandmarks[8];
    
    const px = getX(indexTip.x);
    const py = getY(indexTip.y);

    if (gesture === 'Pinch') {
      if (!this.startPoint) {
        this.startPoint = { x: px, y: py };
      }
      this.currentPoint = { x: px, y: py };
    } else {
      // Released pinch
      if (this.startPoint && this.currentPoint) {
        const distPx = Math.hypot(this.currentPoint.x - this.startPoint.x, this.currentPoint.y - this.startPoint.y);
        if (distPx > 20) {
           this.savedLines.push({
             start: this.startPoint,
             end: this.currentPoint,
             distance: distPx * this.PIXELS_TO_CM
           });
        }
      }
      this.startPoint = null;
      this.currentPoint = null;
    }

    if (gesture === 'Swipe') {
      this.savedLines = [];
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const drawLine = (start: {x:number, y:number}, end: {x:number, y:number}, dist: number) => {
      ctx.strokeStyle = '#00ffcc';
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // Draw endpoints
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(start.x, start.y, 6, 0, Math.PI * 2);
      ctx.arc(end.x, end.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Draw text in middle
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      const text = `${dist.toFixed(1)} cm`;
      const tWidth = ctx.measureText(text).width;
      ctx.fillRect(midX - tWidth/2 - 10, midY - 30, tWidth + 20, 34);

      ctx.fillStyle = 'white';
      ctx.fillText(text, midX, midY - 5);
    };

    this.savedLines.forEach(l => drawLine(l.start, l.end, l.distance));

    if (this.startPoint && this.currentPoint) {
      const distPx = Math.hypot(this.currentPoint.x - this.startPoint.x, this.currentPoint.y - this.startPoint.y);
      drawLine(this.startPoint, this.currentPoint, distPx * this.PIXELS_TO_CM);
    }
  }
}
