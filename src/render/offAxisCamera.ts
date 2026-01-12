import { PerspectiveCamera, Matrix4, Vector3 } from 'three';

export interface CalibrationParams {
  screenWidthCm: number;
  screenHeightCm: number;
  viewerDistanceCm: number;
  near: number;
  far: number;
}

export interface EyePosition {
  x: number; // cm, relative to screen center
  y: number; // cm, relative to screen center
  z: number; // cm, distance from screen plane
}

/**
 * Off-axis projection based on Kooima's approach
 * Implements generalized perspective projection for head-tracked displays
 */
export function updateOffAxisProjection(
  camera: PerspectiveCamera,
  eyePos: EyePosition,
  calibration: CalibrationParams
): void {
  // Convert screen dimensions to meters
  const w = calibration.screenWidthCm / 100;
  const h = calibration.screenHeightCm / 100;
  
  // Define screen corners in world space (screen plane at z=0)
  // pa = bottom-left, pb = bottom-right, pc = top-left
  const pa = new Vector3(-w / 2, -h / 2, 0);
  const pb = new Vector3(w / 2, -h / 2, 0);
  const pc = new Vector3(-w / 2, h / 2, 0);
  
  // Eye position in meters
  const pe = new Vector3(
    eyePos.x / 100,
    eyePos.y / 100,
    eyePos.z / 100
  );
  
  // Calculate screen basis vectors
  const vr = new Vector3().subVectors(pb, pa).normalize(); // right axis
  const vu = new Vector3().subVectors(pc, pa).normalize(); // up axis
  let vn = new Vector3().crossVectors(vr, vu).normalize(); // normal (towards viewer)
  
  // Ensure normal points towards viewer
  const toEye = new Vector3().subVectors(pe, pa);
  if (vn.dot(toEye) < 0) {
    vn.negate();
  }
  
  // Distance from eye to screen plane
  const d = -vn.dot(new Vector3().subVectors(pa, pe));
  
  if (d <= 0) {
    console.warn('Eye is behind screen plane, d:', d);
    return;
  }
  
  if (isNaN(d) || !isFinite(d)) {
    console.error('Invalid distance d:', d, 'pe:', pe);
    return;
  }
  
  const near = calibration.near;
  const far = calibration.far;
  
  // Calculate frustum boundaries on near plane
  const l = vr.dot(new Vector3().subVectors(pa, pe)) * near / d;
  const r = vr.dot(new Vector3().subVectors(pb, pe)) * near / d;
  const b = vu.dot(new Vector3().subVectors(pa, pe)) * near / d;
  const t = vu.dot(new Vector3().subVectors(pc, pe)) * near / d;
  
  // Build projection matrix manually
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
  
  // Build view matrix from screen basis
  // Camera basis: right = vr, up = vu, forward = -vn
  const cameraRight = vr.clone();
  const cameraUp = vu.clone();
  const cameraForward = vn.clone().negate();
  
  // View matrix: transforms world to camera space
  // R = [right.x up.x -forward.x 0; right.y up.y -forward.y 0; right.z up.z -forward.z 0; 0 0 0 1]
  // Then translate by -pe
  const viewMatrix = new Matrix4();
  viewMatrix.set(
    cameraRight.x, cameraUp.x, -cameraForward.x, 0,
    cameraRight.y, cameraUp.y, -cameraForward.y, 0,
    cameraRight.z, cameraUp.z, -cameraForward.z, 0,
    0, 0, 0, 1
  );
  
  // Translate to eye position
  const translateMatrix = new Matrix4();
  translateMatrix.makeTranslation(-pe.x, -pe.y, -pe.z);
  viewMatrix.multiplyMatrices(viewMatrix, translateMatrix);
  
  // Apply to camera
  camera.matrixAutoUpdate = false;
  camera.matrixWorldInverse.copy(viewMatrix);
  camera.matrixWorld.copy(viewMatrix).invert();
  camera.projectionMatrix.copy(projectionMatrix);
  camera.projectionMatrixInverse.copy(projectionMatrix).invert();
  
  // Update camera position for reference
  camera.position.copy(pe);
}
