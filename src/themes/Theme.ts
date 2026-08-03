import type { HandState } from '../gestureEngine';

export interface Theme {
  name: string;
  init(ctx: CanvasRenderingContext2D, _width: number, _height: number): void;
  update(_width: number, _height: number): void;
  render(ctx: CanvasRenderingContext2D, _width: number, _height: number): void;
  handleGesture(hand: HandState, ctx: CanvasRenderingContext2D, _width: number, _height: number, getX: (x: number) => number, getY: (y: number) => number, timestamp: number, getColor?: (x: number, y: number) => string | null): void;
}
