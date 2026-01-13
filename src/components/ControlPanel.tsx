import React, { useState, useEffect } from 'react';
import { Maximize, Minimize, Box, MousePointer } from 'lucide-react';
import { calibrationManager, CalibrationData } from '../utils/calibration';

interface ControlPanelProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onCalibrationChange: (calibration: CalibrationData) => void;
  debugMode: boolean;
  onToggleDebug: () => void;
  onPositionChange: (x: number, y: number, z: number) => void;
  onScaleChange: (scale: number) => void;
  onRotationChange: (x: number, y: number, z: number) => void;
  initialPosition: { x: number; y: number; z: number };
  initialScale: number;
  initialRotation: { x: number; y: number; z: number };
  headPose: { x: number; y: number; z: number } | null;
  fps?: number;
  mouseControlMode: boolean;
  onToggleMouseControl: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isFullscreen,
  onToggleFullscreen,
  onCalibrationChange,
  debugMode,
  onToggleDebug,
  onPositionChange,
  onScaleChange,
  onRotationChange,
  initialPosition,
  initialScale,
  initialRotation,
  headPose,
  fps,
  mouseControlMode,
  onToggleMouseControl
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [scale, setScale] = useState(initialScale);
  const [rotation, setRotation] = useState(initialRotation);
  const [calibration, setCalibration] = useState<CalibrationData>(calibrationManager.getCalibration());

  useEffect(() => {
    setPosition(initialPosition);
    setScale(initialScale);
    setRotation(initialRotation);
  }, [initialPosition, initialScale, initialRotation]);

  const handleCalibrationChange = (field: 'screenWidthCm' | 'screenHeightCm' | 'viewingDistanceCm', value: number) => {
    const newCalibration = { ...calibration, [field]: value };
    setCalibration(newCalibration);
    calibrationManager.saveCalibration(newCalibration);
    onCalibrationChange(newCalibration);
  };

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newPosition = { ...position, [axis]: value };
    setPosition(newPosition);
    onPositionChange(newPosition.x, newPosition.y, newPosition.z);
  };

  const handleScaleChange = (value: number) => {
    setScale(value);
    onScaleChange(value);
  };

  const handleRotationChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newRotation = { ...rotation, [axis]: value };
    setRotation(newRotation);
    onRotationChange(newRotation.x, newRotation.y, newRotation.z);
  };

  const frameStyle = "bg-black bg-opacity-70 backdrop-blur-sm text-green-400 rounded-lg shadow-lg border border-green-500";

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-3">
      {/* Header with quick actions */}
      <div className={`${frameStyle} p-2`}>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 hover:bg-green-500 hover:bg-opacity-20 rounded transition-colors"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>

          <button
            onClick={onToggleDebug}
            className={`p-1.5 rounded transition-colors ${
              debugMode ? 'bg-green-500 bg-opacity-30' : 'hover:bg-green-500 hover:bg-opacity-20'
            }`}
            aria-label="Debug mode"
            title="Debug mode"
          >
            <Box size={14} />
          </button>
        </div>
      </div>

      {/* Frame 1: Status info */}
      <div className={`${frameStyle} px-3 py-2 text-xs`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-green-300">Tracking:</span>
          <span className={headPose ? 'text-green-400' : 'text-red-400'}>
            {headPose ? 'OK' : 'Lost'}
          </span>
        </div>
        {headPose && (
          <div className="text-green-400 font-mono text-[10px] space-y-0.5">
            <div>X: {headPose.x.toFixed(3)}</div>
            <div>Y: {headPose.y.toFixed(3)}</div>
            <div>Z: {headPose.z.toFixed(3)}</div>
          </div>
        )}
        {fps !== undefined && (
          <div className="mt-1 text-green-300">
            FPS: <span className="text-green-400">{fps}</span>
          </div>
        )}
      </div>

      {/* Frame 2: Calibration section */}
      <div className={`${frameStyle} p-3 space-y-3`}>
        <div className="mb-2">
          <span className="text-xs text-green-300">Parallax Calibration</span>
        </div>

        <div>
          <label className="text-xs block mb-1 text-green-300">
            Screen Width: <span className="text-green-400">{calibration.screenWidthCm.toFixed(1)} cm</span>
          </label>
          <input
            type="range"
            min="10"
            max="100"
            step="0.1"
            value={calibration.screenWidthCm}
            onChange={(e) => handleCalibrationChange('screenWidthCm', parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
        </div>

        <div>
          <label className="text-xs block mb-1 text-green-300">
            Screen Height: <span className="text-green-400">{calibration.screenHeightCm.toFixed(1)} cm</span>
          </label>
          <input
            type="range"
            min="10"
            max="100"
            step="0.1"
            value={calibration.screenHeightCm}
            onChange={(e) => handleCalibrationChange('screenHeightCm', parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
        </div>

        <div>
          <label className="text-xs block mb-1 text-green-300">
            Viewing Distance: <span className="text-green-400">{calibration.viewingDistanceCm.toFixed(1)} cm</span>
          </label>
          <input
            type="range"
            min="20"
            max="150"
            step="1"
            value={calibration.viewingDistanceCm}
            onChange={(e) => handleCalibrationChange('viewingDistanceCm', parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
        </div>

        <div className="text-[10px] text-green-400 font-mono pt-1 border-t border-green-500">
          Aspect: {(calibration.screenWidthCm / calibration.screenHeightCm).toFixed(2)}:1
        </div>
      </div>

      {/* Frame 3: Model Controls */}
      <div className={`${frameStyle} p-3 space-y-3 max-h-[60vh] overflow-y-auto`}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-green-300">Model Controls</span>
          <button
            onClick={onToggleMouseControl}
            className={`p-1.5 rounded transition-colors ${
              mouseControlMode ? 'bg-green-500 bg-opacity-30' : 'hover:bg-green-500 hover:bg-opacity-20'
            }`}
            aria-label="Toggle mouse control mode"
            title="Toggle mouse control mode"
          >
            <MousePointer size={14} />
          </button>
        </div>

        <div>
          <label className="text-xs block mb-1 text-green-300">
            Position X: <span className="text-green-400">{position.x.toFixed(3)}</span>
          </label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={position.x}
            onChange={(e) => handlePositionChange('x', parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
        </div>

        <div>
          <label className="text-xs block mb-1 text-green-300">
            Position Y: <span className="text-green-400">{position.y.toFixed(3)}</span>
          </label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={position.y}
            onChange={(e) => handlePositionChange('y', parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
        </div>

        <div>
          <label className="text-xs block mb-1 text-green-300">
            Position Z: <span className="text-green-400">{position.z.toFixed(3)}</span>
          </label>
          <input
            type="range"
            min="-2"
            max="1"
            step="0.01"
            value={position.z}
            onChange={(e) => handlePositionChange('z', parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
        </div>

        <div className="pt-2 border-t border-green-500">
          <label className="text-xs block mb-1 text-green-300">
            Scale: <span className="text-green-400">{scale.toFixed(3)}</span>
          </label>
          <input
            type="range"
            min="0.01"
            max="0.3"
            step="0.001"
            value={scale}
            onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
        </div>

        <div className="pt-2 border-t border-green-500">
          <label className="text-xs block mb-1 text-green-300">
            Rotation: <span className="text-green-400">{(rotation.y * 180 / Math.PI).toFixed(0)}°</span>
          </label>
          <input
            type="range"
            min={-Math.PI}
            max={Math.PI}
            step="0.01"
            value={rotation.y}
            onChange={(e) => handleRotationChange('y', parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
        </div>
      </div>
    </div>
  );
};


export default ControlPanel;
