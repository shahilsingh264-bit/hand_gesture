export type GestureType = 'None' | 'Point' | 'OpenPalm' | 'Fist' | 'Pinch' | 'Peace' | 'ThumbsUp' | 'Swipe' | 'Rock' | 'OK';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface HandState {
  handedness: 'Left' | 'Right';
  landmarks: Point3D[]; // Smoothed
  currentGesture: GestureType;
  gestureFrames: number; // How long it has been held
  pinchDistance: number; // For pinch zoom scaling
  palmHistory: Point3D[]; // For swipe detection
}

const EMA_ALPHA = 0.4; // Smoothing factor (lower = smoother but more lag)
const GESTURE_HOLD_FRAMES = 5; // Temporal voting threshold

// Math utils
export const dist = (p1: Point3D, p2: Point3D): number => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export class GestureEngine {
  private handsHistory: Map<string, HandState> = new Map();

  public processHands(rawLandmarks: Point3D[][], handednesses: any[], sensitivity: number = 1.0): HandState[] {
    const currentHands: HandState[] = [];
    const seenIndices = new Set<string>();

    for (let i = 0; i < rawLandmarks.length; i++) {
      const landmarks = rawLandmarks[i];
      const handLabel = handednesses[i]?.[0]?.categoryName || (i === 0 ? 'Left' : 'Right');
      const handId = `Hand${i}`;
      seenIndices.add(handId);

      let state = this.handsHistory.get(handId);
      if (!state) {
        state = {
          handedness: handLabel,
          landmarks: landmarks.map(l => ({ ...l })),
          currentGesture: 'None',
          gestureFrames: 0,
          pinchDistance: 0,
          palmHistory: []
        };
      } else {
        // Apply EMA Smoothing
        for (let j = 0; j < landmarks.length; j++) {
          state.landmarks[j].x = state.landmarks[j].x * (1 - EMA_ALPHA) + landmarks[j].x * EMA_ALPHA;
          state.landmarks[j].y = state.landmarks[j].y * (1 - EMA_ALPHA) + landmarks[j].y * EMA_ALPHA;
          state.landmarks[j].z = state.landmarks[j].z * (1 - EMA_ALPHA) + landmarks[j].z * EMA_ALPHA;
        }
      }

      state.palmHistory.push({ ...state.landmarks[0] });
      if (state.palmHistory.length > 10) state.palmHistory.shift();

      // Detect Gesture
      const detected = this.detectGesture(state.landmarks, state.palmHistory, sensitivity);
      if (detected === state.currentGesture) {
        state.gestureFrames++;
      } else {
        state.currentGesture = detected;
        state.gestureFrames = 1;
      }

      // Update pinch distance if pinching
      if (state.currentGesture === 'Pinch' || state.currentGesture === 'OK') {
         state.pinchDistance = dist(state.landmarks[4], state.landmarks[8]);
      }

      this.handsHistory.set(handId, state);
      currentHands.push(state);
    }

    // Clean up lost hands
    for (const key of this.handsHistory.keys()) {
      if (!seenIndices.has(key)) {
        this.handsHistory.delete(key);
      }
    }

    // Only return gestures that passed temporal voting
    return currentHands.map(h => ({
      ...h,
      currentGesture: h.gestureFrames >= GESTURE_HOLD_FRAMES ? h.currentGesture : 'None'
    }));
  }

  private detectGesture(landmarks: Point3D[], palmHistory: Point3D[], sensitivity: number): GestureType {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const handSize = dist(wrist, landmarks[9]);
    if (handSize === 0) return 'None'; 

    // Swipe Check: Check palm history velocity
    if (palmHistory.length === 10) {
      const oldest = palmHistory[0];
      const newest = palmHistory[9];
      const dx = newest.x - oldest.x;
      const velocity = Math.abs(dx);
      // If palm moved significantly horizontally within 10 frames
      if (velocity > 0.15 * (2 - sensitivity)) { // Higher sensitivity = lower velocity required
        return 'Swipe';
      }
    }

    const dThumb = dist(thumbTip, wrist) / handSize;
    const dIndex = dist(indexTip, wrist) / handSize;
    const dMiddle = dist(middleTip, wrist) / handSize;
    const dRing = dist(ringTip, wrist) / handSize;
    const dPinky = dist(pinkyTip, wrist) / handSize;

    // Apply sensitivity modifier:
    // Higher sensitivity (e.g. 1.5) -> lower extension thresholds, higher curl thresholds (easier to trigger)
    const extModifier = (2 - sensitivity); // 1.0 -> 1.0, 1.5 -> 0.5
    const curlModifier = sensitivity;      // 1.0 -> 1.0, 1.5 -> 1.5

    const extThumb = dThumb > (1.0 * extModifier);
    const extIndex = dIndex > (1.3 * extModifier);
    const extMiddle = dMiddle > (1.3 * extModifier);
    const extRing = dRing > (1.3 * extModifier);
    const extPinky = dPinky > (1.3 * extModifier);

    const curlIndex = dIndex < (1.25 * curlModifier);
    const curlMiddle = dMiddle < (1.25 * curlModifier);
    const curlRing = dRing < (1.25 * curlModifier);
    const curlPinky = dPinky < (1.25 * curlModifier);

    const pinchDist = dist(thumbTip, indexTip) / handSize;

    // OK Sign: Thumb and Index tips touching, other 3 extended
    if (pinchDist < (0.3 * sensitivity) && extMiddle && extRing && extPinky) {
      return 'OK';
    }

    // Pinch: thumb and index tips are very close
    if (pinchDist < (0.3 * sensitivity) && curlMiddle && curlRing && curlPinky) {
      return 'Pinch';
    }

    // Fist: all fingers curled
    if (!extThumb && curlIndex && curlMiddle && curlRing && curlPinky) {
      return 'Fist';
    }

    // Open Palm: all fingers extended
    if (extThumb && extIndex && extMiddle && extRing && extPinky) {
      return 'OpenPalm';
    }

    // Peace: Index and Middle extended, spread apart. Others curled.
    const splitDist = dist(indexTip, middleTip) / handSize;
    if (extIndex && extMiddle && curlRing && curlPinky && splitDist > (0.3 * extModifier)) {
      return 'Peace';
    }

    // Rock Sign: Index and Pinky extended, Middle and Ring curled
    if (extIndex && curlMiddle && curlRing && extPinky) {
      return 'Rock';
    }

    // Thumbs Up: Thumb extended, others curled
    const thumbIsUp = thumbTip.y < landmarks[5].y;
    if (extThumb && curlIndex && curlMiddle && curlRing && curlPinky && thumbIsUp) {
      return 'ThumbsUp';
    }

    // Point: Index extended, others curled
    if (extIndex && curlMiddle && curlRing && curlPinky) {
      return 'Point';
    }

    return 'None';
  }
}
