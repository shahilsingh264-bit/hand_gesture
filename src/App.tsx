import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useHandTracking } from './useHandTracking'
import { useGameEngine } from './useGameEngine'
import { GardenTheme } from './themes/GardenTheme'
import { CosmicTheme } from './themes/CosmicTheme'
import { PaintTheme } from './themes/PaintTheme'
import { BubblesTheme } from './themes/BubblesTheme'
import { FireTheme } from './themes/FireTheme'
import { WhiteboardTheme } from './themes/WhiteboardTheme'
import { ThereminTheme } from './themes/ThereminTheme'
import { PotteryTheme } from './themes/PotteryTheme'
import { ShadowPuppetTheme } from './themes/ShadowPuppetTheme'
import { MeasureTheme } from './themes/MeasureTheme'
import { StorybookTheme } from './themes/StorybookTheme'
import { FruitSlasherTheme } from './themes/FruitSlasherTheme'
import { RPSTheme } from './themes/RPSTheme'
import { WhackAMoleTheme } from './themes/WhackAMoleTheme'
import { FlappyHandTheme } from './themes/FlappyHandTheme'
import { CatchStarsTheme } from './themes/CatchStarsTheme'
import './App.css'

type AppMode = 'playground' | 'whiteboard' | 'photobooth' | 'theremin' | 'pottery' | 'shadowpuppets' | 'measure' | 'storybook' | 'fruitslasher' | 'rps' | 'whackamole' | 'flappyhand' | 'catchstars';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { isLoaded, handLandmarker } = useHandTracking()
  const [cameraActive, setCameraActive] = useState(false)

  const [mode, setMode] = useState<AppMode>('playground');
  const [sensitivity, setSensitivity] = useState(1.0);
  const [gallery, setGallery] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  const playgroundThemes = useMemo(() => [new GardenTheme(), new CosmicTheme(), new PaintTheme(), new BubblesTheme(), new FireTheme()], []);
  const whiteboardTheme = useMemo(() => new WhiteboardTheme(), []);
  const thereminTheme = useMemo(() => new ThereminTheme(), []);
  const potteryTheme = useMemo(() => new PotteryTheme(), []);
  const shadowPuppetTheme = useMemo(() => new ShadowPuppetTheme(), []);
  const measureTheme = useMemo(() => new MeasureTheme(), []);
  const storybookTheme = useMemo(() => new StorybookTheme(), []);
  const fruitSlasherTheme = useMemo(() => new FruitSlasherTheme(), []);
  const rpsTheme = useMemo(() => new RPSTheme(), []);
  const whackAMoleTheme = useMemo(() => new WhackAMoleTheme(), []);
  const flappyHandTheme = useMemo(() => new FlappyHandTheme(), []);
  const catchStarsTheme = useMemo(() => new CatchStarsTheme(), []);
  
  const [activeThemeIdx, setActiveThemeIdx] = useState(0);
  
  const activeTheme = mode === 'whiteboard' ? whiteboardTheme : 
                      mode === 'theremin' ? thereminTheme : 
                      mode === 'pottery' ? potteryTheme :
                      mode === 'shadowpuppets' ? shadowPuppetTheme :
                      mode === 'measure' ? measureTheme :
                      mode === 'storybook' ? storybookTheme :
                      mode === 'fruitslasher' ? fruitSlasherTheme :
                      mode === 'rps' ? rpsTheme :
                      mode === 'whackamole' ? whackAMoleTheme :
                      mode === 'flappyhand' ? flappyHandTheme :
                      mode === 'catchstars' ? catchStarsTheme :
                      playgroundThemes[activeThemeIdx];

  const [toast, setToast] = useState<{msg: string, id: number} | null>(null);

  // Initialize Webcam
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setCameraActive(true);
          };
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const flash = document.createElement('div');
    flash.className = 'camera-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 1000);

    const comp = document.createElement('canvas');
    comp.width = video.videoWidth;
    comp.height = video.videoHeight;
    const ctx = comp.getContext('2d')!;
    
    ctx.translate(comp.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, comp.width, comp.height);
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(canvas, 0, 0, comp.width, comp.height);

    const dataUrl = comp.toDataURL('image/png');
    setGallery(prev => [dataUrl, ...prev].slice(0, 5)); // Keep last 5
    
    const link = document.createElement('a');
    link.download = `gesture-garden-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, []);

  // Need a ref for mode because handleGestureFire is passed to a hook that might not react well to changing deps
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const handleGestureFire = useCallback((gesture: string) => {
    const emojis: Record<string, string> = {
      'Point': '🪄', 'OpenPalm': '🖐️', 'Fist': '✊', 'Pinch': '🤏', 'Peace': '✌️', 'ThumbsUp': '👍', 'Rock': '🤘', 'Swipe': '👋', 'OK': '👌'
    };
    
    // Global actions
    if (gesture === 'ThumbsUp') {
      if (modeRef.current === 'photobooth') {
         // Start countdown
         setCountdown(3);
      } else if (modeRef.current === 'playground') {
         handleCapture();
      }
    }

    if (gesture === 'Peace' && modeRef.current !== 'whiteboard') {
      setActiveThemeIdx(prev => {
        const next = (prev + 1) % playgroundThemes.length;
        setToast({ msg: `✌️ Theme: ${playgroundThemes[next].name}`, id: Date.now() });
        return next;
      });
    } else {
      setToast({ msg: `${emojis[gesture] || ''} ${gesture}`, id: Date.now() });
    }
  }, [playgroundThemes, handleCapture]);

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      handleCapture();
      setCountdown(null);
      return;
    }
    const t = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [countdown, handleCapture]);

  useGameEngine(videoRef, canvasRef, handLandmarker, isLoaded && cameraActive, activeTheme, sensitivity, handleGestureFire);

  return (
    <div className="app-container">
      {!isLoaded && <div className="loading">Loading AI Engine...</div>}
      
      <video ref={videoRef} className="webcam-video" playsInline muted />
      <canvas ref={canvasRef} className="render-canvas" />

      {countdown !== null && (
        <div className="countdown-overlay">
          {countdown > 0 ? countdown : '📸'}
        </div>
      )}

      {toast && (
        <div key={toast.id} className="toast-notification">
          {toast.msg}
        </div>
      )}

      <div className="toolbar">
        <label>Mode: 
          <select value={mode} onChange={e => setMode(e.target.value as AppMode)}>
            <option value="playground">Playground</option>
            <option value="whiteboard">Whiteboard</option>
            <option value="photobooth">Photo Booth</option>
            <option value="theremin">Theremin (Audio)</option>
            <option value="pottery">Virtual Pottery</option>
            <option value="shadowpuppets">Shadow Puppets</option>
            <option value="measure">AR Measure</option>
            <option value="storybook">Kids Storybook</option>
            <option disabled>--- Games ---</option>
            <option value="fruitslasher">Fruit Slasher</option>
            <option value="rps">Rock Paper Scissors</option>
            <option value="whackamole">Whack-a-Mole</option>
            <option value="flappyhand">Flappy Hand</option>
            <option value="catchstars">Catch the Stars</option>
          </select>
        </label>
      </div>

      <div className="settings-panel">
        {mode === 'playground' && (
          <label>
            Theme:
            <select value={activeThemeIdx} onChange={e => setActiveThemeIdx(Number(e.target.value))}>
              {playgroundThemes.map((t, idx) => (
                <option key={t.name} value={idx}>{t.name}</option>
              ))}
            </select>
          </label>
        )}
        
        <label>
          Sensitivity: {sensitivity.toFixed(1)}
          <input 
            type="range" 
            min="0.5" 
            max="1.5" 
            step="0.1" 
            value={sensitivity}
            onChange={e => setSensitivity(Number(e.target.value))}
          />
        </label>

        {mode === 'playground' && <p>✌️ Peace sign to cycle themes</p>}
        {mode === 'photobooth' ? <p>👍 Thumbs up to start countdown</p> : (mode === 'playground' && <p>👍 Thumbs up to capture photo</p>)}
        {mode === 'theremin' && <p>↕️ Hand Y = Pitch, ↔️ Hand X = Volume. 🤏 Pinch for Vibrato. ✊ Fist to silence.</p>}
        {mode === 'pottery' && <p>🤏 Pinch near the wheel to shape the spinning clay!</p>}
        {mode === 'shadowpuppets' && <p>🐶 Make dog ears (index+pinky), or 🦅 a bird (thumb up)!</p>}
        {mode === 'measure' && <p>🤏 Pinch and drag to measure objects in your view!</p>}
        {mode === 'storybook' && <p>👋 Swipe to turn pages. 🪄 Point to interact with the story!</p>}
        {mode === 'fruitslasher' && <p>⚔️ Use Point or Open Palm to slice the fruits!</p>}
        {mode === 'rps' && <p>👍 Thumbs Up to start countdown. Then play Rock ✊, Paper 🖐️, or Scissors ✌️!</p>}
        {mode === 'whackamole' && <p>🔨 Use Fist or Point to whack the monsters when they pop up!</p>}
        {mode === 'flappyhand' && <p>🐦 Pinch or Point and move your hand Up/Down to fly through pipes!</p>}
        {mode === 'catchstars' && <p>🖐️ Use an Open Palm as a basket. Move left and right to catch stars!</p>}
      </div>

      {mode === 'photobooth' && gallery.length > 0 && (
        <div className="gallery-panel">
          <h4>Recent Photos</h4>
          <div className="gallery-scroll">
            {gallery.map((src, i) => (
              <img key={i} src={src} className="gallery-thumb" alt="snapshot" />
            ))}
          </div>
        </div>
      )}

      <div className="gesture-legend">
        <div className="legend-item">🪄 Point: {activeTheme.name === 'Paint' || mode === 'whiteboard' ? 'Draw' : 'Spawn'}</div>
        <div className="legend-item">
          {mode === 'whiteboard' ? '🤏 Pinch: Pick Color' : `🖐️ Open Palm: ${activeTheme.name === 'Cosmic' ? 'Supernova' : 'Scatter'}`}
        </div>
        <div className="legend-item">✊ Fist: {activeTheme.name === 'Paint' || mode === 'whiteboard' ? 'Eraser' : 'Vacuum'}</div>
        <div className="legend-item">✋ Swipe: Clear all</div>
      </div>
    </div>
  )
}

export default App
