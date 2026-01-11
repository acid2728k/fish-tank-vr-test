import { Matrix4, PerspectiveCamera } from 'three';

export interface CalibrationParams {
  screenWidthCm: number;
  screenHeightCm: number;
  cameraToScreenCm: number;
  viewerZCm: number;
  near: number;
  far: number;
}

export interface HeadPosition {
  x: number; // cm, relative to screen center
  y: number; // cm, relative to screen center
  z: number; // cm, distance from screen
}

/**
 * Calculate off-axis projection matrix based on head position
 * 
 * Screen plane is at z = 0, center is (0, 0, 0)
 * Head position E = (ex, ey, ez) where ez > 0 (in front of screen)
 * 
 * Frustum boundaries on near plane:
 * left  = near * ( (-w/2 - ex) / ez )
 * right = near * ( ( w/2 - ex) / ez )
 * bottom= near * ( (-h/2 - ey) / ez )
 * top   = near * ( ( h/2 - ey) / ez )
 */
export function updateOffAxisProjection(
  camera: PerspectiveCamera,
  headPos: HeadPosition,
  calibration: CalibrationParams
): void {
  const { screenWidthCm, screenHeightCm, near, far } = calibration;
  
  // Head position in world coordinates (cm)
  // Screen center is (0, 0, 0), so head is at (x, y, z)
  const ex = headPos.x;
  const ey = headPos.y;
  const ez = headPos.z;

  // Physical screen dimensions (cm)
  const w = screenWidthCm;
  const h = screenHeightCm;

  // Calculate frustum boundaries on near plane
  // Convert cm to meters for Three.js
  const w_m = screenWidthCm / 100;
  const h_m = screenHeightCm / 100;
  const ex_m = ex / 100;
  const ey_m = ey / 100;
  const ez_m = ez / 100;

  const left = near * ((-w_m / 2 - ex_m) / ez_m);
  const right = near * ((w_m / 2 - ex_m) / ez_m);
  const bottom = near * ((-h_m / 2 - ey_m) / ez_m);
  const top = near * ((h_m / 2 - ey_m) / ez_m);

  // Create off-axis projection matrix manually
  // Based on: https://www.scratchapixel.com/lessons/3d-basic-rendering/perspective-and-orthographic-projection-matrix/opengl-perspective-projection-matrix
  const projectionMatrix = new Matrix4();
  const x = 2.0 * near / (right - left);
  const y = 2.0 * near / (top - bottom);
  const a = (right + left) / (right - left);
  const b = (top + bottom) / (top - bottom);
  const c = -(far + near) / (far - near);
  const d = -2.0 * far * near / (far - near);

  projectionMatrix.set(
    x, 0, a, 0,
    0, y, b, 0,
    0, 0, c, d,
    0, 0, -1, 0
  );

  // Set camera position to head position (already in meters)
  camera.position.set(ex_m, ey_m, ez_m);
  
  // Look at screen center (0, 0, 0)
  camera.lookAt(0, 0, 0);
  
  // Apply projection matrix
  camera.projectionMatrix.copy(projectionMatrix);
  camera.projectionMatrixInverse.copy(projectionMatrix).invert();
  
  // Update camera matrix
  camera.updateMatrixWorld();
}
