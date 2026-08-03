import type { Theme } from './Theme';
import type { HandState } from '../gestureEngine';

export class ShadowPuppetTheme implements Theme {
  name = 'ShadowPuppets';
  private currentPuppet: 'Bird' | 'Dog' | null = null;
  private puppetPos = { x: 0, y: 0 };

  init() {}
  update() {}

  handleGesture(hand: HandState, ctx: CanvasRenderingContext2D, width: number, height: number, getX: (x: number) => number, getY: (y: number) => number, timestamp: number): void {
    const { landmarks: rawLandmarks } = hand;
    
    // We can do simple heuristic checks for shadow puppets.
    // Dog: Index and Pinky up (ears), others curled (snout)

    const indexTip = rawLandmarks[8];
    const indexPIP = rawLandmarks[6];
    const middleTip = rawLandmarks[12];
    const ringTip = rawLandmarks[16];
    const pinkyTip = rawLandmarks[20];
    const pinkyPIP = rawLandmarks[18];
    
    const isDog = (indexTip.y < indexPIP.y) && (pinkyTip.y < pinkyPIP.y) && 
                  (middleTip.y > rawLandmarks[9].y) && (ringTip.y > rawLandmarks[13].y);

    const isBird = !isDog && Math.abs(indexTip.y - middleTip.y) < 0.05 && Math.abs(middleTip.y - ringTip.y) < 0.05;

    if (isDog) {
      this.currentPuppet = 'Dog';
    } else if (isBird) {
      this.currentPuppet = 'Bird';
    } else {
      this.currentPuppet = null;
    }

    this.puppetPos = {
      x: getX(rawLandmarks[0].x),
      y: getY(rawLandmarks[0].y)
    };
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.currentPuppet) return;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 10;
    
    ctx.font = '120px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const emoji = this.currentPuppet === 'Dog' ? '🐶' : '🦅';
    
    ctx.fillText(emoji, this.puppetPos.x, this.puppetPos.y - 100);
    ctx.restore();
  }
}
