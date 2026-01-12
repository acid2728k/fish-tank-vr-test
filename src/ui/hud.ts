import { CalibrationParams, EyePosition } from '../render/offAxisCamera';
import { NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface HUDCallbacks {
  onCameraToggle: () => void;
  onDebugToggle: () => void;
  onTrackingStrengthChange: (value: number) => void;
  onSmoothingChange: (value: number) => void;
  onScreenWidthChange: (value: number) => void;
  onScreenHeightChange: (value: number) => void;
  onDistanceChange: (value: number) => void;
  onResetCalibration: () => void;
}

export interface HUDState {
  cameraEnabled: boolean;
  debugOverlay: boolean;
  trackingStrength: number;
  smoothing: number;
  calibration: CalibrationParams;
  fps: number;
  trackingState: 'face found' | 'not found';
  eyePos: EyePosition | null;
}

export class HUD {
  private container: HTMLElement;
  private state: HUDState;
  private callbacks: HUDCallbacks;
  
  get currentState(): HUDState {
    return this.state;
  }
  private debugCanvas: HTMLCanvasElement | null = null;
  private debugCtx: CanvasRenderingContext2D | null = null;
  private fpsCounter = 0;
  private lastFpsUpdate = performance.now();

  constructor(container: HTMLElement, initialState: HUDState, callbacks: HUDCallbacks) {
    this.container = container;
    this.state = initialState;
    this.callbacks = callbacks;
    this.render();
    this.setupKeyboardShortcuts();
  }

  updateState(updates: Partial<HUDState>): void {
    this.state = { ...this.state, ...updates };
    this.render();
  }

  updateFPS(): void {
    this.fpsCounter++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.updateState({ fps: this.fpsCounter });
      this.fpsCounter = 0;
      this.lastFpsUpdate = now;
    }
  }

  updateDebugOverlay(video: HTMLVideoElement | null, landmarks: NormalizedLandmark[] | null): void {
    if (!this.state.debugOverlay || !this.debugCanvas || !this.debugCtx) {
      return;
    }

    if (!video || video.readyState < 2) {
      return;
    }

    const ctx = this.debugCtx;
    const canvas = this.debugCanvas;
    
    // Clear and draw video frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw landmarks
    if (landmarks && landmarks.length > 0) {
      ctx.strokeStyle = '#00ff00';
      ctx.fillStyle = '#00ff00';
      ctx.lineWidth = 1;

      // Draw face mesh connections (simplified - key points)
      const keyPoints = [33, 263, 4, 10, 152]; // eyes, nose, forehead, chin
      ctx.beginPath();
      for (const idx of keyPoints) {
        if (landmarks[idx]) {
          const x = landmarks[idx].x * canvas.width;
          const y = landmarks[idx].y * canvas.height;
          ctx.fillRect(x - 2, y - 2, 4, 4);
        }
      }
    }
  }

  private render(): void {
    this.container.innerHTML = '';

    // Main control panel (top-left)
    const panel = document.createElement('div');
    panel.className = 'hud-panel';
    panel.style.top = '20px';
    panel.style.left = '20px';

    panel.innerHTML = `
      <h3>Head-Tracked 3D Window</h3>
      
      <div class="hud-status">
        <strong>FPS:</strong> ${this.state.fps.toFixed(1)}<br>
        <strong>Tracking:</strong> ${this.state.trackingState}<br>
        ${this.state.eyePos ? `
          <strong>Eye:</strong> ${this.state.eyePos.x.toFixed(1)}, ${this.state.eyePos.y.toFixed(1)}, ${this.state.eyePos.z.toFixed(1)} cm
        ` : ''}
      </div>

      <button class="hud-button" id="btn-camera">
        ${this.state.cameraEnabled ? 'Disable Camera' : 'Enable Camera'}
      </button>
      
      <button class="hud-button" id="btn-debug">
        ${this.state.debugOverlay ? 'Hide Debug' : 'Show Debug'}
      </button>

      <div class="hud-control">
        <label>Tracking Strength:</label>
        <input type="range" id="slider-tracking" min="0" max="2" step="0.1" value="${this.state.trackingStrength}">
        <input type="number" id="input-tracking" value="${this.state.trackingStrength.toFixed(1)}" step="0.1">
      </div>

      <div class="hud-control">
        <label>Smoothing:</label>
        <input type="range" id="slider-smoothing" min="0" max="0.95" step="0.05" value="${this.state.smoothing}">
        <input type="number" id="input-smoothing" value="${this.state.smoothing.toFixed(2)}" step="0.05">
      </div>

      <div class="hud-control">
        <label>Screen Width (cm):</label>
        <input type="range" id="slider-width" min="10" max="100" step="0.1" value="${this.state.calibration.screenWidthCm}">
        <input type="number" id="input-width" value="${this.state.calibration.screenWidthCm.toFixed(1)}" step="0.1">
      </div>

      <div class="hud-control">
        <label>Screen Height (cm):</label>
        <input type="range" id="slider-height" min="10" max="100" step="0.1" value="${this.state.calibration.screenHeightCm}">
        <input type="number" id="input-height" value="${this.state.calibration.screenHeightCm.toFixed(1)}" step="0.1">
      </div>

      <div class="hud-control">
        <label>Distance (cm):</label>
        <input type="range" id="slider-distance" min="30" max="150" step="1" value="${this.state.calibration.viewerDistanceCm}">
        <input type="number" id="input-distance" value="${this.state.calibration.viewerDistanceCm.toFixed(0)}" step="1">
      </div>

      <button class="hud-button" id="btn-reset">Reset Calibration (R)</button>
    `;

    this.container.appendChild(panel);

    // Debug overlay (bottom-right)
    if (this.state.debugOverlay) {
      const debugOverlay = document.createElement('div');
      debugOverlay.className = 'debug-overlay';
      this.debugCanvas = document.createElement('canvas');
      this.debugCanvas.width = 200;
      this.debugCanvas.height = 150;
      this.debugCtx = this.debugCanvas.getContext('2d');
      debugOverlay.appendChild(this.debugCanvas);
      this.container.appendChild(debugOverlay);
    } else {
      this.debugCanvas = null;
      this.debugCtx = null;
    }

    // Setup event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const btnCamera = document.getElementById('btn-camera');
    const btnDebug = document.getElementById('btn-debug');
    const btnReset = document.getElementById('btn-reset');
    
    const sliderTracking = document.getElementById('slider-tracking') as HTMLInputElement;
    const inputTracking = document.getElementById('input-tracking') as HTMLInputElement;
    const sliderSmoothing = document.getElementById('slider-smoothing') as HTMLInputElement;
    const inputSmoothing = document.getElementById('input-smoothing') as HTMLInputElement;
    const sliderWidth = document.getElementById('slider-width') as HTMLInputElement;
    const inputWidth = document.getElementById('input-width') as HTMLInputElement;
    const sliderHeight = document.getElementById('slider-height') as HTMLInputElement;
    const inputHeight = document.getElementById('input-height') as HTMLInputElement;
    const sliderDistance = document.getElementById('slider-distance') as HTMLInputElement;
    const inputDistance = document.getElementById('input-distance') as HTMLInputElement;

    btnCamera?.addEventListener('click', () => this.callbacks.onCameraToggle());
    btnDebug?.addEventListener('click', () => this.callbacks.onDebugToggle());
    btnReset?.addEventListener('click', () => this.callbacks.onResetCalibration());

    const syncSliderInput = (slider: HTMLInputElement, input: HTMLInputElement, callback: (v: number) => void) => {
      slider.addEventListener('input', () => {
        const value = parseFloat(slider.value);
        input.value = value.toFixed(slider.step === '1' ? 0 : slider.step.includes('0.1') ? 1 : 2);
        callback(value);
      });
      input.addEventListener('change', () => {
        const value = parseFloat(input.value);
        slider.value = value.toString();
        callback(value);
      });
    };

    syncSliderInput(sliderTracking, inputTracking, (v) => this.callbacks.onTrackingStrengthChange(v));
    syncSliderInput(sliderSmoothing, inputSmoothing, (v) => this.callbacks.onSmoothingChange(v));
    syncSliderInput(sliderWidth, inputWidth, (v) => this.callbacks.onScreenWidthChange(v));
    syncSliderInput(sliderHeight, inputHeight, (v) => this.callbacks.onScreenHeightChange(v));
    syncSliderInput(sliderDistance, inputDistance, (v) => this.callbacks.onDistanceChange(v));
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D') {
        this.callbacks.onDebugToggle();
      } else if (e.key === 'm' || e.key === 'M') {
        // Mouse mode handled in main.ts
      } else if (e.key === 'r' || e.key === 'R') {
        this.callbacks.onResetCalibration();
      }
    });
  }
}
