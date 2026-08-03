import type { Theme } from './Theme';
import type { HandState, Point3D } from '../gestureEngine';

interface Stroke {
  points: { x: number, y: number }[];
  color: string;
}

export class WhiteboardTheme implements Theme {
  name = 'Whiteboard';
  private strokes: Stroke[] = [];
  private currentStroke: Stroke | null = null;
  private pickedColor = '#FFFFFF';

  init() {
    this.strokes = [];
    this.currentStroke = null;
  }

  update(width: number, height: number) {
    // No physics to update for persistent paint
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 10;

    const drawStroke = (s: Stroke) => {
      if (s.points.length < 2) return;
      ctx.strokeStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    this.strokes.forEach(drawStroke);
    if (this.currentStroke) {
      drawStroke(this.currentStroke);
    }
  }

  handleGesture(hand: HandState, ctx: CanvasRenderingContext2D, width: number, height: number, getX: (x: number) => number, getY: (y: number) => number, timestamp: number, getColor?: (x: number, y: number) => string | null) {
    const indexTip = hand.landmarks[8];
    const indexX = getX(indexTip.x);
    const indexY = getY(indexTip.y);

    if (hand.currentGesture === 'Point') {
      if (!this.currentStroke) {
        this.currentStroke = { points: [], color: this.pickedColor };
      }
      this.currentStroke.points.push({ x: indexX, y: indexY });
      
      // Draw indicator
      ctx.fillStyle = this.pickedColor;
      ctx.beginPath();
      ctx.arc(indexX, indexY, 8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      if (this.currentStroke) {
        this.strokes.push(this.currentStroke);
        this.currentStroke = null;
      }
    }

    if (hand.currentGesture === 'Fist') {
      // Erase nearby strokes
      const pX = getX(hand.landmarks[0].x);
      const pY = getY(hand.landmarks[0].y);
      
      // Draw eraser indicator
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.arc(pX, pY, 50, 0, Math.PI * 2);
      ctx.fill();

      for (let i = this.strokes.length - 1; i >= 0; i--) {
        const s = this.strokes[i];
        const keepPoints = s.points.filter(pt => {
          const dx = pt.x - pX;
          const dy = pt.y - pY;
          return Math.sqrt(dx * dx + dy * dy) > 50;
        });

        if (keepPoints.length < 2) {
           this.strokes.splice(i, 1);
        } else {
           s.points = keepPoints; // Crude erase, breaks line but works for MVP
        }
      }
    } else if (hand.currentGesture === 'Swipe') {
      // Clear all
      this.strokes = [];
    } else if (hand.currentGesture === 'Pinch') {
      // Pick color!
      if (getColor) {
         const newColor = getColor(indexTip.x, indexTip.y);
         if (newColor) {
           this.pickedColor = newColor;
         }
      }
      // Draw color picker indicator
      ctx.fillStyle = this.pickedColor;
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(indexX, indexY, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}
