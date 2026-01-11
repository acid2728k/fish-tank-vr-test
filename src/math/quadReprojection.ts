import { Matrix4, PerspectiveCamera, Vector3 } from 'three';

export interface ScreenQuad {
  pa: Vector3; // bottom-left corner (world units, meters)
  pb: Vector3; // bottom-right corner
  pc: Vector3; // top-left corner
}

export interface CalibrationParams {
  screenWidthCm: number;
  screenHeightCm: number;
  viewerDistanceCm: number; // baseline distance
  near: number; // in meters
  far: number; // in meters
}

export interface EyePosition {
  x: number; // cm, relative to screen center
  y: number; // cm, relative to screen center
  z: number; // cm, distance from screen (from calibration)
}

// Reusable objects to avoid allocations
const _tempVec1 = new Vector3();
const _tempVec2 = new Vector3();
const _tempVec3 = new Vector3();
const _tempVec4 = new Vector3();
const _tempMatrix1 = new Matrix4();
const _tempMatrix2 = new Matrix4();

// Cache for screen quad (only rebuild if calibration changes)
let _cachedCalibration: CalibrationParams | null = null;
let _cachedScreenQuad: ScreenQuad | null = null;

/**
 * Build screen quad from calibration parameters
 * Screen center is at (0, 0, 0), screen plane is at z = 0
 */
export function buildScreenQuad(calibration: CalibrationParams): ScreenQuad {
  // Check cache
  if (
    _cachedCalibration &&
    _cachedScreenQuad &&
    _cachedCalibration.screenWidthCm === calibration.screenWidthCm &&
    _cachedCalibration.screenHeightCm === calibration.screenHeightCm
  ) {
    return _cachedScreenQuad;
  }

  const w = calibration.screenWidthCm / 100; // convert to meters
  const h = calibration.screenHeightCm / 100;
  
  // Screen corners in world space (meters)
  // Screen center is at (0, 0, 0), screen plane is at z = 0
  const pa = new Vector3(-w / 2, -h / 2, 0); // bottom-left
  const pb = new Vector3(w / 2, -h / 2, 0);  // bottom-right
  const pc = new Vector3(-w / 2, h / 2, 0);  // top-left
  
  _cachedCalibration = { ...calibration };
  _cachedScreenQuad = { pa, pb, pc };
  
  return _cachedScreenQuad;
}

/**
 * Quad Reprojection / Generalized Off-Axis Projection
 * 
 * Optimized version that reuses objects to avoid allocations
 */
export function updateQuadReprojection(
  camera: PerspectiveCamera,
  eyePos: EyePosition,
  calibration: CalibrationParams
): void {
  // Build screen quad (cached)
  const screen = buildScreenQuad(calibration);
  
  // Convert eye position to world space (meters) - reuse temp vector
  const pe = _tempVec1.set(
    eyePos.x / 100,
    eyePos.y / 100,
    eyePos.z / 100
  );
  
  // Build screen basis vectors - reuse temp vectors
  const vr = _tempVec2.subVectors(screen.pb, screen.pa).normalize(); // right axis
  const vu = _tempVec3.subVectors(screen.pc, screen.pa).normalize(); // up axis
  const vn = _tempVec4.crossVectors(vr, vu).normalize(); // normal (towards viewer)
  
  // Ensure normal points towards viewer (pe should be in front of screen)
  _tempVec1.subVectors(pe, screen.pa); // reuse _tempVec1 as toEye
  if (vn.dot(_tempVec1) < 0) {
    vn.negate(); // flip if pointing away
  }
  
  // Distance from eye to screen plane
  _tempVec1.subVectors(screen.pa, pe); // reuse _tempVec1
  const d = -vn.dot(_tempVec1);
  
  if (d <= 0 || !isFinite(d)) {
    return; // Skip update if invalid
  }
  
  const near = calibration.near;
  const far = calibration.far;
  const nearOverD = near / d;
  
  // Calculate frustum boundaries on near plane using dot products
  _tempVec1.subVectors(screen.pa, pe);
  _tempVec2.subVectors(screen.pb, pe);
  _tempVec3.subVectors(screen.pc, pe);
  
  const l = vr.dot(_tempVec1) * nearOverD;
  const r = vr.dot(_tempVec2) * nearOverD;
  const b = vu.dot(_tempVec1) * nearOverD;
  const t = vu.dot(_tempVec3) * nearOverD;
  
  // Build projection matrix - reuse temp matrix
  const projectionMatrix = _tempMatrix1;
  const rMinusL = r - l;
  const tMinusB = t - b;
  const farMinusNear = far - near;
  
  const x = 2.0 * near / rMinusL;
  const y = 2.0 * near / tMinusB;
  const a = (r + l) / rMinusL;
  const b_val = (t + b) / tMinusB;
  const c = -(far + near) / farMinusNear;
  const d_val = -2.0 * far * near / farMinusNear;
  
  projectionMatrix.set(
    x, 0, a, 0,
    0, y, b_val, 0,
    0, 0, c, d_val,
    0, 0, -1, 0
  );
  
  // Build view matrix - reuse vectors
  // Camera forward is opposite of screen normal (towards screen)
  const cameraForward = _tempVec1.copy(vn).negate(); // reuse _tempVec1
  const cameraRight = _tempVec2.copy(vr); // reuse _tempVec2
  const cameraUp = _tempVec3.copy(vu); // reuse _tempVec3
  
  // Build view matrix directly - reuse temp matrix
  const viewMatrix = _tempMatrix2;
  viewMatrix.set(
    cameraRight.x, cameraRight.y, cameraRight.z, -cameraRight.dot(pe),
    cameraUp.x, cameraUp.y, cameraUp.z, -cameraUp.dot(pe),
    -cameraForward.x, -cameraForward.y, -cameraForward.z, cameraForward.dot(pe),
    0, 0, 0, 1
  );
  
  // Apply matrices to camera
  camera.matrixAutoUpdate = false;
  camera.matrixWorldInverse.copy(viewMatrix);
  camera.matrixWorld.copy(viewMatrix).invert();
  camera.projectionMatrix.copy(projectionMatrix);
  camera.projectionMatrixInverse.copy(projectionMatrix).invert();
  
  // Update camera position for reference
  camera.position.copy(pe);
}
