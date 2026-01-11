import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { HeadPosition } from '../math/offAxis';

export interface FaceTrackingCallbacks {
  onResults: (headPos: HeadPosition | null, landmarks?: any[] | null) => void;
  onError?: (error: Error) => void;
}

export class FaceTracker {
  private faceMesh: FaceMesh | null = null;
  private camera: Camera | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private callbacks: FaceTrackingCallbacks;
  private isInitialized = false;
  private lastValidHeadPos: HeadPosition | null = null;
  
  // Calibration offsets (for "Recenter")
  private offsetX = 0;
  private offsetY = 0;
  private offsetZ = 0;
  
  // Scale factors for converting MediaPipe coordinates to cm
  private scaleX = 1;
  private scaleY = 1;
  private scaleZ = 1;

  constructor(callbacks: FaceTrackingCallbacks) {
    this.callbacks = callbacks;
  }

  async initialize(videoElement: HTMLVideoElement): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.videoElement = videoElement;

    this.faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      },
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.faceMesh.onResults((results) => {
      this.processResults(results);
    });

    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        if (this.faceMesh) {
          await this.faceMesh.send({ image: videoElement });
        }
      },
      width: 640,
      height: 480,
    });

    try {
      await this.camera.start();
      this.isInitialized = true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Camera initialization failed');
      this.callbacks.onError?.(err);
      throw err;
    }
  }

  private processResults(results: any): void {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      // No face detected - return last valid position or null
      this.callbacks.onResults(this.lastValidHeadPos, null);
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    
    // Key landmarks indices (MediaPipe FaceMesh)
    // Left eye: 33, Right eye: 263
    // Nose tip: 4
    // Left face edge: 234, Right face edge: 454
    // Forehead center: 10
    
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const noseTip = landmarks[4];
    const leftFace = landmarks[234];
    const rightFace = landmarks[454];

    // Calculate center between eyes (proxy for head center)
    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;
    const eyeCenterZ = (leftEye.z + rightEye.z) / 2;

    // Calculate face width (proxy for distance)
    const faceWidth = Math.abs(rightFace.x - leftFace.x);
    const eyeDistance = Math.abs(rightEye.x - leftEye.x);
    
    // Estimate Z distance based on face width/eye distance
    // Normalize: larger face width = closer (smaller z)
    // This is a rough approximation - in real MediaPipe, z is in normalized units
    const normalizedZ = eyeDistance; // Use eye distance as proxy
    
    // Convert normalized coordinates to cm
    // MediaPipe gives normalized coordinates (0-1), we need to map to physical space
    // For X/Y: assume face moves in ~30cm range horizontally, ~20cm vertically
    // For Z: map normalized eye distance to distance range (e.g., 50-80cm)
    const x = (eyeCenterX - 0.5) * 30 * this.scaleX; // -15 to +15 cm
    const y = (0.5 - eyeCenterY) * 20 * this.scaleY; // -10 to +10 cm (flip Y)
    const z = 65 - (normalizedZ - 0.05) * 200 * this.scaleZ; // Rough mapping to 50-80cm range

    // Apply offsets (for "Recenter")
    const headPos: HeadPosition = {
      x: x - this.offsetX,
      y: y - this.offsetY,
      z: Math.max(30, Math.min(150, z - this.offsetZ)), // Clamp z to reasonable range
    };

    this.lastValidHeadPos = headPos;
    this.callbacks.onResults(headPos, landmarks);
  }

  recenter(): void {
    if (this.lastValidHeadPos) {
      this.offsetX = this.lastValidHeadPos.x;
      this.offsetY = this.lastValidHeadPos.y;
      this.offsetZ = this.lastValidHeadPos.z;
    }
  }

  setScaleFactors(scaleX: number, scaleY: number, scaleZ: number): void {
    this.scaleX = scaleX;
    this.scaleY = scaleY;
    this.scaleZ = scaleZ;
  }

  stop(): void {
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
    }
    this.isInitialized = false;
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }
}
