import React, { useState, useEffect, useRef, useCallback } from 'react';
import FaceMeshView from './components/FaceMeshView';
import ThreeView, { ThreeViewHandle } from './components/ThreeView';
import ControlPanel from './components/ControlPanel';
import { HeadPose, HeadPoseTracker } from './utils/headPose';
import { calibrationManager, CalibrationData } from './utils/calibration';

function App() {
  const [isCdnAvailable, setIsCdnAvailable] = useState(true);
  const [isCheckingCdn, setIsCheckingCdn] = useState(true);
  const [currentHeadPose, setCurrentHeadPose] = useState<HeadPose | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [calibration, setCalibration] = useState<CalibrationData>(calibrationManager.getCalibration());
  const [debugMode, setDebugMode] = useState(false);
  const [shoePosition, setShoePosition] = useState({ x: 0, y: 0, z: 0 });
  const [shoeScale, setShoeScale] = useState(0.071);
  const [shoeRotation, setShoeRotation] = useState({ x: 0, y: 0, z: 0 });
  const [fps, setFps] = useState(0);
  const [mouseControlMode, setMouseControlMode] = useState(false);
  const headPoseTrackerRef = useRef(new HeadPoseTracker(0.3));
  const threeViewRef = useRef<ThreeViewHandle>(null);
  const fpsRef = useRef({ lastTime: performance.now(), frameCount: 0 });

  useEffect(() => {
    const checkCdnAvailability = async () => {
      setIsCheckingCdn(true);
      try {
        const faceMeshResponse = await fetch(
          'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js',
          { method: 'HEAD' }
        );

        const cameraResponse = await fetch(
          'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
          { method: 'HEAD' }
        );

        const drawingResponse = await fetch(
          'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
          { method: 'HEAD' }
        );

        setIsCdnAvailable(faceMeshResponse.ok && cameraResponse.ok && drawingResponse.ok);
      } catch (error) {
        console.error('Error checking CDN availability:', error);
        setIsCdnAvailable(false);
      } finally {
        setIsCheckingCdn(false);
      }
    };

    checkCdnAvailability();

    const intervalId = setInterval(checkCdnAvailability, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const handleHeadPoseUpdate = useCallback((rawPose: HeadPose | null) => {
    if (rawPose) {
      const smoothedPose = headPoseTrackerRef.current.extractHeadPoseFromLandmarks([
        Array(468).fill(null).map((_, i) => {
          if (i === 133) return { x: rawPose.x - 0.05, y: rawPose.y, z: 0 };
          if (i === 362) return { x: rawPose.x + 0.05, y: rawPose.y, z: 0 };
          if (i === 1) return { x: rawPose.x, y: rawPose.y, z: 0 };
          if (i === 33) return { x: rawPose.x - 0.08, y: rawPose.y, z: 0 };
          if (i === 263) return { x: rawPose.x + 0.08, y: rawPose.y, z: 0 };
          return { x: 0, y: 0, z: 0 };
        })
      ]);
      if (smoothedPose) {
        setCurrentHeadPose(smoothedPose);
      }
    } else {
      setCurrentHeadPose(null);
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (error) {
        console.error('Error entering fullscreen:', error);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (error) {
        console.error('Error exiting fullscreen:', error);
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleCalibrationChange = (newCalibration: CalibrationData) => {
    setCalibration(newCalibration);
    if (threeViewRef.current) {
      threeViewRef.current.updateCalibration(newCalibration);
    }
  };

  const toggleDebugMode = () => {
    const newDebugMode = !debugMode;
    setDebugMode(newDebugMode);
    if (threeViewRef.current) {
      threeViewRef.current.setDebugMode(newDebugMode);
    }
  };

  const handleShoePositionChange = (x: number, y: number, z: number) => {
    setShoePosition({ x, y, z });
    if (threeViewRef.current) {
      threeViewRef.current.updateModelPosition(x, y, z);
    }
  };

  const handleShoeScaleChange = (scale: number) => {
    setShoeScale(scale);
    if (threeViewRef.current) {
      threeViewRef.current.updateModelScale(scale);
    }
  };

  const handleShoeRotationChange = (x: number, y: number, z: number) => {
    setShoeRotation({ x, y, z });
    if (threeViewRef.current) {
      threeViewRef.current.updateModelRotation(x, y, z);
    }
  };


  const handleMouseMove = useCallback((deltaX: number, deltaY: number) => {
    if (!mouseControlMode) return;
    
    setShoePosition(prev => {
      const newPosition = {
        x: prev.x + deltaX,
        y: prev.y + deltaY,
        z: prev.z
      };
      
      if (threeViewRef.current) {
        threeViewRef.current.updateModelPosition(newPosition.x, newPosition.y, newPosition.z);
      }
      
      return newPosition;
    });
  }, [mouseControlMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (threeViewRef.current) {
        const pos = threeViewRef.current.getModelPosition();
        const scale = threeViewRef.current.getModelScale();
        const rot = threeViewRef.current.getModelRotation();
        setShoePosition(pos);
        setShoeScale(scale);
        setShoeRotation(rot);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // FPS counter
  useEffect(() => {
    const updateFps = () => {
      const now = performance.now();
      fpsRef.current.frameCount++;
      
      if (now - fpsRef.current.lastTime >= 1000) {
        setFps(fpsRef.current.frameCount);
        fpsRef.current.frameCount = 0;
        fpsRef.current.lastTime = now;
      }
      
      requestAnimationFrame(updateFps);
    };
    
    const rafId = requestAnimationFrame(updateFps);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col relative">
      <main className="flex-1 relative">
        {!isCheckingCdn && !isCdnAvailable && (
          <div className="absolute top-4 left-4 right-4 z-30 max-w-2xl mx-auto p-3 bg-yellow-50 text-yellow-800 rounded-md">
            <p className="text-sm">
              We're having trouble connecting to the required resources. Please check your internet connection.
            </p>
          </div>
        )}

        <div className="absolute inset-0">
          <ThreeView
            headPose={currentHeadPose}
            ref={threeViewRef}
            mouseControlMode={mouseControlMode}
            onMouseMove={handleMouseMove}
          />
        </div>

        <ControlPanel
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onCalibrationChange={handleCalibrationChange}
          debugMode={debugMode}
          onToggleDebug={toggleDebugMode}
          onPositionChange={handleShoePositionChange}
          onScaleChange={handleShoeScaleChange}
          onRotationChange={handleShoeRotationChange}
          initialPosition={shoePosition}
          initialScale={shoeScale}
          initialRotation={shoeRotation}
          headPose={currentHeadPose}
          fps={fps}
          mouseControlMode={mouseControlMode}
          onToggleMouseControl={() => setMouseControlMode(!mouseControlMode)}
        />

        <div className="absolute bottom-4 right-4 z-10 rounded-lg overflow-hidden shadow-2xl border-2 border-green-500">
          <div className="w-64 h-48">
            <FaceMeshView onHeadPoseUpdate={handleHeadPoseUpdate} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;