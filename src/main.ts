import { createScene, handleResize, SceneObjects } from './render/scene';
import { updateOffAxisProjection, CalibrationParams, EyePosition } from './render/offAxisCamera';
import { FaceTracker, HeadPosition } from './tracking/faceTracker';
import { HUD, HUDCallbacks, HUDState } from './ui/hud';
import { NormalizedLandmark } from '@mediapipe/tasks-vision';

// State
let sceneObjects: SceneObjects | null = null;
let faceTracker: FaceTracker | null = null;
let hud: HUD | null = null;
let isMouseMode = false;
let mouseEyePos: EyePosition = { x: 0, y: 0, z: 60 };

// Calibration
const defaultCalibration: CalibrationParams = {
  screenWidthCm: 30.4,
  screenHeightCm: 19.7,
  viewerDistanceCm: 60,
  near: 0.1,
  far: 200,
};

let calibration: CalibrationParams = { ...defaultCalibration };
let currentEyePos: EyePosition = { x: 0, y: 0, z: 60 };
let targetEyePos: EyePosition = { x: 0, y: 0, z: 60 };

// Tracking state
let trackingStrength = 1.0;
let lastFaceTime = 0;
const FACE_LOST_LERP_TIME = 500; // ms

// Initialize
async function init() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas not found');
  }

  // Create scene
  sceneObjects = createScene(canvas);
  
  // Initialize face tracker
  faceTracker = new FaceTracker({
    onResults: (position: HeadPosition | null, landmarks: NormalizedLandmark[] | null) => {
      if (position && !isMouseMode) {
        // Apply tracking strength to X/Y movement (parallax effect)
        // INVERTED: head moves left -> scene moves right (inverted reaction)
        // Reduced sensitivity: multiply by 0.6
        const dx = -position.x * trackingStrength * 0.6; // Inverted X, reduced sensitivity
        const dy = -position.y * trackingStrength * 0.6; // Inverted Y, reduced sensitivity
        // Z: use tracked Z but keep it close to calibration distance for stability
        const zBase = calibration.viewerDistanceCm;
        const zDelta = (position.z - zBase) * 0.3; // Reduce Z sensitivity
        const dz = zBase + zDelta;
        
        targetEyePos = {
          x: dx,
          y: dy,
          z: Math.max(30, Math.min(150, dz)), // Clamp Z
        };
        lastFaceTime = performance.now();
        
        if (hud) {
          hud.updateState({
            trackingState: 'face found',
            eyePos: targetEyePos,
          });
        }
      } else {
        if (hud) {
          hud.updateState({
            trackingState: 'not found',
          });
        }
      }
      
      // Update debug overlay
      if (hud && faceTracker) {
        const video = faceTracker.getVideoElement();
        hud.updateDebugOverlay(video, landmarks);
      }
    },
    onError: (error: Error) => {
      console.error('Face tracking error:', error);
      if (hud) {
        hud.updateState({
          trackingState: 'not found',
        });
      }
    },
  });

  // Initialize HUD
  const hudContainer = document.getElementById('hud');
  if (!hudContainer) {
    throw new Error('HUD container not found');
  }

  const hudCallbacks: HUDCallbacks = {
    onCameraToggle: async () => {
      if (!faceTracker) return;
      
      const currentState = hud?.currentState || { cameraEnabled: false } as HUDState;
      const newState = !currentState.cameraEnabled;
      
      if (newState) {
        try {
          await faceTracker.startCamera();
          isMouseMode = false;
        } catch (error) {
          console.error('Failed to start camera:', error);
          alert('Failed to start camera. Enable mouse mode with M key.');
          return;
        }
      } else {
        faceTracker.stopCamera();
      }
      
      hud?.updateState({ cameraEnabled: newState });
    },
    onDebugToggle: () => {
      const currentState = hud?.currentState || { debugOverlay: false } as HUDState;
      hud?.updateState({ debugOverlay: !currentState.debugOverlay });
    },
    onTrackingStrengthChange: (value: number) => {
      trackingStrength = value;
    },
    onSmoothingChange: (value: number) => {
      if (faceTracker) {
        faceTracker.setSmoothing(value);
      }
    },
    onScreenWidthChange: (value: number) => {
      calibration.screenWidthCm = value;
    },
    onScreenHeightChange: (value: number) => {
      calibration.screenHeightCm = value;
    },
    onDistanceChange: (value: number) => {
      calibration.viewerDistanceCm = value;
      if (!isMouseMode) {
        targetEyePos.z = value;
      } else {
        mouseEyePos.z = value;
      }
    },
    onResetCalibration: () => {
      calibration = { ...defaultCalibration };
      if (faceTracker) {
        faceTracker.recenter();
      }
      targetEyePos = { x: 0, y: 0, z: calibration.viewerDistanceCm };
      mouseEyePos = { x: 0, y: 0, z: calibration.viewerDistanceCm };
      hud?.updateState({ calibration });
    },
  };

  const initialHUDState: HUDState = {
    cameraEnabled: false,
    debugOverlay: false,
    trackingStrength: 1.0,
    smoothing: 0.7,
    calibration,
    fps: 0,
    trackingState: 'not found',
    eyePos: null,
  };

  hud = new HUD(hudContainer, initialHUDState, hudCallbacks);

  // Initialize MediaPipe (but don't start camera yet)
  try {
    await faceTracker.initialize();
  } catch (error) {
    console.error('Failed to initialize MediaPipe:', error);
    alert('Failed to initialize face tracking. Mouse mode (M key) will be available.');
  }

  // Mouse mode
  let isMouseDown = false;
  document.addEventListener('mousedown', (e) => {
    if (isMouseMode) {
      isMouseDown = true;
      updateMousePosition(e);
    }
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isMouseMode && isMouseDown) {
      updateMousePosition(e);
    }
  });
  
  document.addEventListener('mouseup', () => {
    isMouseDown = false;
  });
  
  document.addEventListener('wheel', (e) => {
    if (isMouseMode) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 5 : -5;
      mouseEyePos.z = Math.max(30, Math.min(150, mouseEyePos.z + delta));
      if (hud) {
        hud.updateState({ eyePos: mouseEyePos });
      }
    }
  });

  function updateMousePosition(e: MouseEvent) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Convert mouse position to cm relative to screen center
    const x = ((e.clientX / screenWidth) - 0.5) * calibration.screenWidthCm * 2;
    const y = ((1 - e.clientY / screenHeight) - 0.5) * calibration.screenHeightCm * 2;
    
    mouseEyePos.x = x;
    mouseEyePos.y = y;
    
    if (hud) {
      hud.updateState({ eyePos: mouseEyePos });
    }
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
      isMouseMode = !isMouseMode;
      if (isMouseMode && faceTracker) {
        faceTracker.stopCamera();
        if (hud) {
          hud.updateState({ cameraEnabled: false });
        }
      }
      console.log('Mouse mode:', isMouseMode ? 'ON' : 'OFF');
    }
  });

  // Handle resize
  window.addEventListener('resize', () => {
    if (sceneObjects) {
      handleResize(sceneObjects.camera, sceneObjects.renderer);
    }
  });

  // Render loop
  function render() {
    if (!sceneObjects) return;

    // Smooth interpolation for eye position
    const now = performance.now();
    const timeSinceFace = now - lastFaceTime;
    
    if (isMouseMode) {
      currentEyePos = { ...mouseEyePos };
    } else {
      // Lerp towards target if face lost
      if (timeSinceFace > FACE_LOST_LERP_TIME) {
        const lerpFactor = 0.05;
        currentEyePos.x = currentEyePos.x * (1 - lerpFactor) + 0 * lerpFactor;
        currentEyePos.y = currentEyePos.y * (1 - lerpFactor) + 0 * lerpFactor;
        currentEyePos.z = currentEyePos.z * (1 - lerpFactor) + calibration.viewerDistanceCm * lerpFactor;
      } else {
        // Smooth transition to target - faster for more responsive tracking
        const lerpFactor = 0.25; // Increased from 0.1 for faster response
        currentEyePos.x = currentEyePos.x * (1 - lerpFactor) + targetEyePos.x * lerpFactor;
        currentEyePos.y = currentEyePos.y * (1 - lerpFactor) + targetEyePos.y * lerpFactor;
        currentEyePos.z = currentEyePos.z * (1 - lerpFactor) + targetEyePos.z * lerpFactor;
      }
    }

    // Update off-axis projection
    updateOffAxisProjection(sceneObjects.camera, currentEyePos, calibration);

    // Render
    sceneObjects.renderer.render(sceneObjects.scene, sceneObjects.camera);

    // Update FPS
    if (hud) {
      hud.updateFPS();
    }

    requestAnimationFrame(render);
  }

  render();
}

// Start
init().catch(console.error);
