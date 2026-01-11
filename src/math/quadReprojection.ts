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

/**
 * Build screen quad from calibration parameters
 * Screen center is at (0, 0, 0), screen plane is at z = 0
 */
export function buildScreenQuad(calibration: CalibrationParams): ScreenQuad {
  const w = calibration.screenWidthCm / 100; // convert to meters
  const h = calibration.screenHeightCm / 100;
  
  // Screen corners in world space (meters)
  // Screen center is at (0, 0, 0), screen plane is at z = 0
  const pa = new Vector3(-w / 2, -h / 2, 0); // bottom-left
  const pb = new Vector3(w / 2, -h / 2, 0);  // bottom-right
  const pc = new Vector3(-w / 2, h / 2, 0);  // top-left
  
  return { pa, pb, pc };
}

/**
 * Quad Reprojection / Generalized Off-Axis Projection
 * 
 * Based on TouchDesigner Quad Reprojection algorithm:
 * - Screen is a physical QUAD in 3D space
 * - Build projection matrix from screen corners and eye position
 * - Build view matrix from screen basis (vr, vu, vn) and eye position
 */
export function updateQuadReprojection(
  camera: PerspectiveCamera,
  eyePos: EyePosition,
  calibration: CalibrationParams
): void {
  // Build screen quad
  const screen = buildScreenQuad(calibration);
  
  // Convert eye position to world space (meters)
  const pe = new Vector3(
    eyePos.x / 100,
    eyePos.y / 100,
    eyePos.z / 100
  );
  
  // Build screen basis vectors
  const vr = new Vector3().subVectors(screen.pb, screen.pa).normalize(); // right axis
  const vu = new Vector3().subVectors(screen.pc, screen.pa).normalize(); // up axis
  let vn = new Vector3().crossVectors(vr, vu).normalize(); // normal (towards viewer)
  
  // Ensure normal points towards viewer (pe should be in front of screen)
  const toEye = new Vector3().subVectors(pe, screen.pa);
  if (vn.dot(toEye) < 0) {
    vn.negate(); // flip if pointing away
  }
  
  // Distance from eye to screen plane
  const d = -vn.dot(new Vector3().subVectors(screen.pa, pe));
  
  if (d <= 0) {
    console.warn('Eye is behind screen plane, d:', d);
    return;
  }
  
  // Debug: log if values seem wrong
  if (isNaN(d) || !isFinite(d)) {
    console.error('Invalid distance d:', d, 'pe:', pe, 'screen:', screen);
    return;
  }
  
  const near = calibration.near;
  const far = calibration.far;
  
  // Calculate frustum boundaries on near plane using dot products
  const l = vr.dot(new Vector3().subVectors(screen.pa, pe)) * near / d;
  const r = vr.dot(new Vector3().subVectors(screen.pb, pe)) * near / d;
  const b = vu.dot(new Vector3().subVectors(screen.pa, pe)) * near / d;
  const t = vu.dot(new Vector3().subVectors(screen.pc, pe)) * near / d;
  
  // Build projection matrix from l, r, b, t, near, far
  const projectionMatrix = new Matrix4();
  const x = 2.0 * near / (r - l);
  const y = 2.0 * near / (t - b);
  const a = (r + l) / (r - l);
  const b_val = (t + b) / (t - b);
  const c = -(far + near) / (far - near);
  const d_val = -2.0 * far * near / (far - near);
  
  projectionMatrix.set(
    x, 0, a, 0,
    0, y, b_val, 0,
    0, 0, c, d_val,
    0, 0, -1, 0
  );
  
  // Build view matrix from screen basis and eye position
  // Camera is at pe, looking towards screen center (0,0,0)
  // Camera basis: right = vr, up = vu, forward = -vn (towards screen)
  
  // Camera forward is opposite of screen normal (towards screen)
  const cameraForward = vn.clone().negate().normalize();
  
  // Camera right and up are screen basis vectors
  const cameraRight = vr.clone().normalize();
  const cameraUp = vu.clone().normalize();
  
  // Build view matrix manually
  // View matrix transforms world to camera space
  // First row: camera right in world space (x-axis in camera space)
  // Second row: camera up in world space (y-axis in camera space)
  // Third row: camera forward in world space (z-axis in camera space, negated for right-handed)
  // Fourth row: translation (eye position)
  
  const viewMatrix = new Matrix4();
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
