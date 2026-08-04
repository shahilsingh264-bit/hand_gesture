import { useEffect, useRef } from 'react';
import { HandLandmarker } from '@mediapipe/tasks-vision';
import { GestureEngine } from './gestureEngine';
import type { Theme } from './themes/Theme';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const useGameEngine = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  handLandmarker: HandLandmarker | null,
  isLoaded: boolean,
  activeTheme: Theme,
  sensitivity: number,
  onGestureFire: (gesture: string) => void
) => {
  const engineRef = useRef(new GestureEngine());
  const prevGestures = useRef<Map<string, string>>(new Map());

  // Re-init theme when it changes
  useEffect(() => {
    if (canvasRef.current) {
      activeTheme.init(canvasRef.current.getContext('2d')!, canvasRef.current.width, canvasRef.current.height);
    }
    return () => {
      if (activeTheme.cleanup) {
        activeTheme.cleanup();
      }
    };
  }, [activeTheme, canvasRef]);

  useEffect(() => {
    if (!isLoaded || !handLandmarker || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastVideoTime = -1;

    const renderLoop = () => {
      if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
        activeTheme.init(ctx, canvas.width, canvas.height);
      }

      const w = canvas.width;
      const h = canvas.height;
      const now = performance.now();

      ctx.clearRect(0, 0, w, h);
      activeTheme.update(w, h);

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        
        const results = handLandmarker.detectForVideo(video, now);
        
        if (results.landmarks && results.handednesses) {
          const hands = engineRef.current.processHands(results.landmarks, results.handednesses, sensitivity);
          
          hands.forEach((hand, idx) => {
             const getX = (x: number) => (1.0 - x) * w;
             const getY = (y: number) => y * h;

             // Notify on new distinct gesture
             const handId = `Hand${idx}`;
             const prev = prevGestures.current.get(handId);
             if (hand.currentGesture !== prev && hand.currentGesture !== 'None') {
                onGestureFire(hand.currentGesture);
                // Trigger subtle haptic feedback for sensory polish
                try {
                  Haptics.impact({ style: ImpactStyle.Light });
                } catch (e) {
                  // Ignore if not on a supported device
                }
             }
             prevGestures.current.set(handId, hand.currentGesture);

             // Draw skeleton
             ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
             ctx.lineWidth = 1;
             const connections = [[0,1,2,3,4], [0,5,6,7,8], [5,9,13,17], [9,10,11,12], [13,14,15,16], [0,17,18,19,20]];
             connections.forEach(path => {
               ctx.beginPath();
               ctx.moveTo(getX(hand.landmarks[path[0]].x), getY(hand.landmarks[path[0]].y));
               for (let i = 1; i < path.length; i++) {
                 ctx.lineTo(getX(hand.landmarks[path[i]].x), getY(hand.landmarks[path[i]].y));
               }
               ctx.stroke();
             });
             ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
             hand.landmarks.forEach(lm => {
               ctx.beginPath();
               ctx.arc(getX(lm.x), getY(lm.y), 2, 0, 2 * Math.PI);
               ctx.fill();
             });

             const getColor = (nx: number, ny: number): string | null => {
               // nx, ny are normalized coordinates [0, 1] from mediapipe landmarks
               if (!video) return null;
               const offCanvas = document.createElement('canvas');
               offCanvas.width = 1; 
               offCanvas.height = 1;
               const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
               if (!offCtx) return null;
               
               // Video is rendered mirrored logically for the user.
               // MediaPipe coordinates x=0 is the left side of the mirrored image.
               // So in the original video frame, x is actually (1 - nx).
               const videoX = Math.floor((1.0 - nx) * video.videoWidth);
               const videoY = Math.floor(ny * video.videoHeight);
               
               offCtx.drawImage(video, videoX, videoY, 1, 1, 0, 0, 1, 1);
               const data = offCtx.getImageData(0, 0, 1, 1).data;
               return `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
             };

             // Let theme handle logic
             activeTheme.handleGesture(hand, ctx, w, h, getX, getY, now, getColor);
          });
        }
      }

      activeTheme.render(ctx, w, h);
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isLoaded, handLandmarker, videoRef, canvasRef, activeTheme, sensitivity, onGestureFire]);
};
