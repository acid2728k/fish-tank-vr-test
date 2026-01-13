import React, { useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { ThreeSceneManager } from '../utils/threeScene';
import { HeadPose } from '../utils/headPose';
import { CalibrationData } from '../utils/calibration';

interface ThreeViewProps {
  headPose: HeadPose | null;
  mouseControlMode?: boolean;
  onMouseMove?: (deltaX: number, deltaY: number) => void;
}

export interface ThreeViewHandle {
  updateCalibration: (calibration: CalibrationData) => void;
  setDebugMode: (enabled: boolean) => void;
  updateModelPosition: (x: number, y: number, z: number) => void;
  updateModelScale: (scale: number) => void;
  updateModelRotation: (x: number, y: number, z: number) => void;
  getModelPosition: () => { x: number; y: number; z: number };
  getModelScale: () => number;
  getModelRotation: () => { x: number; y: number; z: number };
}

const ThreeView = forwardRef<ThreeViewHandle, ThreeViewProps>(({ headPose, mouseControlMode = false, onMouseMove }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<ThreeSceneManager | null>(null);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    sceneManagerRef.current = new ThreeSceneManager({
      container: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight
    });

    sceneManagerRef.current.start();

    const handleResize = () => {
      if (containerRef.current && sceneManagerRef.current) {
        sceneManagerRef.current.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (headPose && sceneManagerRef.current) {
      sceneManagerRef.current.updateHeadPose(headPose);
    }
  }, [headPose]);

  // Mouse control handlers
  useEffect(() => {
    if (!mouseControlMode || !containerRef.current) return;

    const container = containerRef.current;
    const step = 0.01;

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const deltaX = (e.clientX - lastMousePosRef.current.x) * step;
      const deltaY = (e.clientY - lastMousePosRef.current.y) * step;

      if (onMouseMove) {
        onMouseMove(deltaX, -deltaY); // Invert Y for natural movement
      }

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [mouseControlMode, onMouseMove]);

  useImperativeHandle(ref, () => ({
    updateCalibration: (calibration: CalibrationData) => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.updateCalibration(calibration);
      }
    },
    setDebugMode: (enabled: boolean) => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.setDebugMode(enabled);
      }
    },
    updateModelPosition: (x: number, y: number, z: number) => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.updateModelPosition(x, y, z);
      }
    },
    updateModelScale: (scale: number) => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.updateModelScale(scale);
      }
    },
    getModelPosition: () => {
      if (sceneManagerRef.current) {
        return sceneManagerRef.current.getModelPosition();
      }
      return { x: 0, y: 0, z: 0 };
    },
    getModelScale: () => {
      if (sceneManagerRef.current) {
        return sceneManagerRef.current.getModelScale();
      }
      return 0.071;
    },
    updateModelRotation: (x: number, y: number, z: number) => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.updateModelRotation(x, y, z);
      }
    },
    getModelRotation: () => {
      if (sceneManagerRef.current) {
        return sceneManagerRef.current.getModelRotation();
      }
      return { x: 0, y: 0, z: 0 };
    },
  }));

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black"
      style={{ 
        touchAction: 'none',
        cursor: mouseControlMode 
          ? (isDraggingRef.current ? 'grabbing' : 'grab')
          : 'default'
      }}
    />
  );
});

ThreeView.displayName = 'ThreeView';

export default ThreeView;
