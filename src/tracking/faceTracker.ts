import { FaceLandmarker, FilesetResolver, NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface HeadPosition {
  x: number; // cm, relative to screen center
  y: number; // cm, relative to screen center
  z: number; // cm, distance from screen
  rotationX: number; // pitch (radians)
  rotationY: number; // yaw (radians)
  rotationZ: number; // roll (radians)
}

export interface FaceTrackerCallbacks {
  onResults: (position: HeadPosition | null, landmarks: NormalizedLandmark[] | null) => void;
  onError: (error: Error) => void;
}

export class FaceTracker {
  private faceLandmarker: FaceLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private isTracking = false;
  private lastValidPosition: HeadPosition | null = null;
  private callbacks: FaceTrackerCallbacks;
  
  // Smoothing parameters
  private smoothingAlpha = 0.7;
  private smoothedX = 0;
  private smoothedY = 0;
  private smoothedZ = 0;
  
  // Calibration
  private offsetX = 0;
  private offsetY = 0;
  private offsetZ = 0;
  
  // Tracking state
  private faceLostTime = 0;
  private readonly FACE_LOST_THRESHOLD = 500; // ms

  constructor(callbacks: FaceTrackerCallbacks) {
    this.callbacks = callbacks;
  }

  async initialize(): Promise<void> {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm'
      );
      
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: 'GPU',
        },
        outputFaceBlendshapes: false,
        runningMode: 'VIDEO',
        numFaces: 1,
      });
    } catch (error) {
      throw new Error(`Failed to initialize FaceLandmarker: ${error}`);
    }
  }

  async startCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.autoplay = true;
      this.video.playsInline = true;
      await this.video.play();

      this.isTracking = true;
      this.startTracking();
    } catch (error) {
      throw new Error(`Failed to start camera: ${error}`);
    }
  }

  stopCamera(): void {
    this.isTracking = false;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
  }

  private startTracking(): void {
    if (!this.faceLandmarker || !this.video || !this.isTracking) {
      return;
    }

    const detect = () => {
      if (!this.faceLandmarker || !this.video || !this.isTracking) {
        return;
      }

      const startTimeMs = performance.now();
      const results = this.faceLandmarker.detectForVideo(this.video, startTimeMs);

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        const position = this.processLandmarks(landmarks);
        this.lastValidPosition = position;
        this.faceLostTime = 0;
        this.callbacks.onResults(position, landmarks);
      } else {
        // Track when face was lost
        if (this.faceLostTime === 0) {
          this.faceLostTime = performance.now();
        }
        
        const timeSinceLost = performance.now() - this.faceLostTime;
        
        if (this.lastValidPosition && timeSinceLost < this.FACE_LOST_THRESHOLD) {
          // Return last valid position if recently lost
          this.callbacks.onResults(this.lastValidPosition, null);
        } else {
          // Face lost for too long
          this.callbacks.onResults(null, null);
        }
      }

      if (this.isTracking) {
        requestAnimationFrame(detect);
      }
    };

    detect();
  }

  private processLandmarks(landmarks: NormalizedLandmark[]): HeadPosition {
    // Key landmarks indices
    const LEFT_EYE = 33;
    const RIGHT_EYE = 263;
    const NOSE_TIP = 4;

    // Get key points
    const leftEye = landmarks[LEFT_EYE];
    const rightEye = landmarks[RIGHT_EYE];
    const noseTip = landmarks[NOSE_TIP];

    // Calculate face center (between eyes and nose)
    const faceCenterX = (leftEye.x + rightEye.x + noseTip.x) / 3;
    const faceCenterY = (leftEye.y + rightEye.y + noseTip.y) / 3;

    // Estimate Z from inter-pupillary distance (IPD)
    // Average IPD is ~6.4cm, use as reference
    // At 60cm distance, IPD in normalized coordinates is ~0.1
    const ipdNormalized = Math.sqrt(
      Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2)
    );
    
    // Inverse relationship: larger IPD = closer face
    // Reference: at 60cm, IPD ~0.1 normalized
    const referenceIPD = 0.1;
    const referenceDistance = 60; // cm
    const zCm = Math.max(30, Math.min(150, (referenceIPD / ipdNormalized) * referenceDistance));

    // Convert normalized coordinates to cm
    // More accurate conversion: use camera FOV and distance to calculate visible area
    // Typical webcam FOV is ~60-70 degrees horizontal
    // At distance zCm, visible width = 2 * zCm * tan(FOV/2)
    const cameraFOVDegrees = 60; // Approximate webcam FOV
    const cameraFOVRad = (cameraFOVDegrees * Math.PI) / 180;
    const visibleWidthCm = 2 * zCm * Math.tan(cameraFOVRad / 2);
    
    // Convert normalized face position to cm relative to screen center
    // faceCenterX/Y are 0-1, where 0.5 is center
    const xCm = (faceCenterX - 0.5) * visibleWidthCm;
    const yCm = (0.5 - faceCenterY) * visibleWidthCm; // Flip Y (camera Y is inverted)

    // Apply smoothing
    this.smoothedX = this.smoothingAlpha * xCm + (1 - this.smoothingAlpha) * this.smoothedX;
    this.smoothedY = this.smoothingAlpha * yCm + (1 - this.smoothingAlpha) * this.smoothedY;
    this.smoothedZ = this.smoothingAlpha * zCm + (1 - this.smoothingAlpha) * this.smoothedZ;

    // Calculate rotation from facial transformation matrix if available
    // For now, estimate from landmark positions
    // Simple rotation estimates
    const rotationY = (faceCenterX - 0.5) * 0.5; // yaw
    const rotationX = (0.5 - faceCenterY) * 0.3; // pitch
    const rotationZ = Math.atan2(
      rightEye.y - leftEye.y,
      rightEye.x - leftEye.x
    ) * 0.5; // roll

    return {
      x: this.smoothedX - this.offsetX,
      y: this.smoothedY - this.offsetY,
      z: this.smoothedZ - this.offsetZ,
      rotationX,
      rotationY,
      rotationZ,
    };
  }

  setSmoothing(alpha: number): void {
    this.smoothingAlpha = Math.max(0, Math.min(1, alpha));
  }

  recenter(): void {
    if (this.lastValidPosition) {
      this.offsetX = this.lastValidPosition.x;
      this.offsetY = this.lastValidPosition.y;
      this.offsetZ = this.lastValidPosition.z;
    }
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.video;
  }
}
