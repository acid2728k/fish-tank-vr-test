import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createScene, handleResize } from './three/scene';
import { FaceTracker } from './tracking/face';
import { updateQuadReprojection, CalibrationParams, EyePosition } from './math/quadReprojection';
import { PositionFilter } from './utils/smoothing';
import { CameraView } from './components/CameraView';
import './App.css';

type Status = 'idle' | 'loading' | 'tracking' | 'error' | 'demo';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const faceTrackerRef = useRef<FaceTracker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const positionFilterRef = useRef<PositionFilter>(new PositionFilter(0.04));

  const [status, setStatus] = useState<Status>('demo'); // Start with mouse demo
  const [fps, setFps] = useState(0);
  const [eyePos, setEyePos] = useState<EyePosition>({ x: 0, y: 0, z: 65 });
  const [isDemoMode, setIsDemoMode] = useState(true); // Mouse demo by default
  const [landmarks, setLandmarks] = useState<any[] | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  const [calibration, setCalibration] = useState<CalibrationParams>({
    screenWidthCm: 60,
    screenHeightCm: 34,
    viewerDistanceCm: 65, // baseline distance
    near: 0.1,
    far: 100,
  });

  const [smoothingAlpha, setSmoothingAlpha] = useState(0.04);

  // FPS counter
  const fpsRef = useRef({ lastTime: performance.now(), frameCount: 0 });

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const { scene, camera, renderer } = createScene();
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    containerRef.current.appendChild(renderer.domElement);

    // Initial quad reprojection setup
    const initialEyePos: EyePosition = { x: 0, y: 0, z: calibration.viewerDistanceCm };
    updateQuadReprojection(camera, initialEyePos, calibration);

    // Handle resize
    const onResize = () => {
      if (cameraRef.current && rendererRef.current) {
        handleResize(cameraRef.current, rendererRef.current);
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Initialize face tracking (optional, mouse demo is primary)
  useEffect(() => {
    if (isDemoMode) {
      setStatus('demo');
      return;
    }

    const initTracking = async () => {
      setStatus('loading');

      try {
        const videoElement = document.createElement('video');
        videoElement.style.display = 'none';
        document.body.appendChild(videoElement);

        const tracker = new FaceTracker({
          onResults: (pos, landmarksData) => {
            setLandmarks(landmarksData || null);
            if (pos) {
              // Only use X and Y from tracking, Z always comes from calibration
              const [x, y] = positionFilterRef.current.update(pos.x, pos.y, calibration.viewerDistanceCm);
              setEyePos({ x, y, z: calibration.viewerDistanceCm });
              setStatus('tracking');
            } else {
              setStatus('tracking'); // Keep tracking status, but use last position
            }
          },
          onError: (error) => {
            console.error('Face tracking error:', error);
            setStatus('error');
          },
        });

        await tracker.initialize(videoElement);
        faceTrackerRef.current = tracker;
        setVideoElement(videoElement);
      } catch (error) {
        console.error('Failed to initialize camera:', error);
        setStatus('error');
      }
    };

    initTracking();

    return () => {
      if (faceTrackerRef.current) {
        faceTrackerRef.current.stop();
      }
    };
  }, [isDemoMode, calibration.viewerDistanceCm]);

  // Mouse demo mode (primary control)
  useEffect(() => {
    if (!isDemoMode) return;

    const onMouseMove = (e: MouseEvent) => {
      // Map mouse position to eye position
      // Center of screen = (0, 0), edges = ±15cm horizontally, ±10cm vertically
      const x = ((e.clientX / window.innerWidth) - 0.5) * 30;
      const y = ((0.5 - e.clientY / window.innerHeight)) * 20;
      
      // Only use X and Y from mouse, Z comes from calibration
      const [smoothX, smoothY] = positionFilterRef.current.update(
        x,
        y,
        calibration.viewerDistanceCm
      );
      setEyePos({ x: smoothX, y: smoothY, z: calibration.viewerDistanceCm });
    };

    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [isDemoMode, calibration.viewerDistanceCm]);

  // Update smoothing alpha
  useEffect(() => {
    positionFilterRef.current.setAlpha(smoothingAlpha);
  }, [smoothingAlpha]);

  // Update eyePos Z when calibration changes
  useEffect(() => {
    setEyePos((prev) => ({ ...prev, z: calibration.viewerDistanceCm }));
  }, [calibration.viewerDistanceCm]);


  // Render loop
  useEffect(() => {
    let lastEyePos = { ...eyePos };
    let lastCalibration = { ...calibration };
    
    const render = () => {
      if (!cameraRef.current || !rendererRef.current || !sceneRef.current) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Only update if eye position or calibration changed
      const eyePosChanged = 
        lastEyePos.x !== eyePos.x || 
        lastEyePos.y !== eyePos.y || 
        lastEyePos.z !== eyePos.z;
      const calibrationChanged = 
        lastCalibration.screenWidthCm !== calibration.screenWidthCm ||
        lastCalibration.screenHeightCm !== calibration.screenHeightCm ||
        lastCalibration.viewerDistanceCm !== calibration.viewerDistanceCm ||
        lastCalibration.near !== calibration.near ||
        lastCalibration.far !== calibration.far;

      if (eyePosChanged || calibrationChanged) {
        updateQuadReprojection(cameraRef.current, eyePos, calibration);
        lastEyePos = { ...eyePos };
        lastCalibration = { ...calibration };
      }

      // Render
      rendererRef.current.render(sceneRef.current, cameraRef.current);

      // FPS calculation
      const now = performance.now();
      fpsRef.current.frameCount++;
      if (now - fpsRef.current.lastTime >= 1000) {
        setFps(fpsRef.current.frameCount);
        fpsRef.current.frameCount = 0;
        fpsRef.current.lastTime = now;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [eyePos, calibration]);

  const handleRecenter = () => {
    if (faceTrackerRef.current) {
      faceTrackerRef.current.recenter();
    }
    positionFilterRef.current.reset();
    // Keep Z from calibration, only reset X and Y
    setEyePos({ x: 0, y: 0, z: calibration.viewerDistanceCm });
  };

  const toggleDemoMode = () => {
    setIsDemoMode(!isDemoMode);
    if (faceTrackerRef.current) {
      faceTrackerRef.current.stop();
      faceTrackerRef.current = null;
    }
    positionFilterRef.current.reset();
  };

  return (
    <div ref={containerRef} className="app-container">
      <div className="ui-overlay">
        <div className="ui-section">
          <div className="ui-label">Status</div>
          <div className="ui-value">
            {status === 'loading' && 'Initializing camera...'}
            {status === 'tracking' && 'Tracking: OK'}
            {status === 'error' && 'Camera access denied'}
            {status === 'demo' && 'Demo: Mouse mode'}
            {status === 'idle' && 'Idle'}
          </div>
        </div>

        <div className="ui-section">
          <div className="ui-label">FPS</div>
          <div className="ui-value">{fps}</div>
        </div>

        <div className="ui-section">
          <div className="ui-label">Eye Position</div>
          <div className="ui-value">
            ex: {eyePos.x.toFixed(1)} cm
            <br />
            ey: {eyePos.y.toFixed(1)} cm
            <br />
            ez: {eyePos.z.toFixed(1)} cm
          </div>
        </div>

        <div className="ui-section">
          <div className="ui-label">Calibration</div>
          <div className="ui-control">
            <label>
              screenWidthCm:
              <input
                type="number"
                value={calibration.screenWidthCm}
                onChange={(e) =>
                  setCalibration({ ...calibration, screenWidthCm: parseFloat(e.target.value) })
                }
                step="1"
                min="10"
                max="200"
              />
            </label>
          </div>
          <div className="ui-control">
            <label>
              screenHeightCm:
              <input
                type="number"
                value={calibration.screenHeightCm}
                onChange={(e) =>
                  setCalibration({ ...calibration, screenHeightCm: parseFloat(e.target.value) })
                }
                step="1"
                min="10"
                max="200"
              />
            </label>
          </div>
          <div className="ui-control">
            <label>
              viewerDistanceCm:
              <input
                type="number"
                value={calibration.viewerDistanceCm}
                onChange={(e) =>
                  setCalibration({ ...calibration, viewerDistanceCm: parseFloat(e.target.value) })
                }
                step="1"
                min="30"
                max="150"
              />
            </label>
          </div>
        </div>

        <div className="ui-section">
          <div className="ui-label">Smoothing</div>
          <div className="ui-control">
            <label>
              Alpha:
              <input
                type="range"
                value={smoothingAlpha}
                onChange={(e) => setSmoothingAlpha(parseFloat(e.target.value))}
                min="0"
                max="1"
                step="0.01"
              />
              <span>{smoothingAlpha.toFixed(2)}</span>
            </label>
          </div>
        </div>

        <div className="ui-section">
          <button onClick={handleRecenter} className="ui-button">
            Recenter
          </button>
          <button onClick={toggleDemoMode} className="ui-button">
            {isDemoMode ? 'Disable' : 'Enable'} Mouse Demo
          </button>
        </div>
      </div>
      <CameraView videoElement={videoElement} landmarks={landmarks} />
    </div>
  );
}

export default App;
