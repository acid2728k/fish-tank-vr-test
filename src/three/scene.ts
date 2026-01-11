import * as THREE from 'three';

/**
 * Create a uniform rectangular grid with equal spacing
 * Uses standard LineSegments (not Line2)
 */
function createUniformGrid(
  width: number,
  height: number,
  divisionsX: number,
  divisionsY: number
): THREE.LineSegments {
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
  });

  const points: number[] = [];
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  // Vertical lines
  for (let i = 0; i <= divisionsX; i++) {
    const x = -halfWidth + (i / divisionsX) * width;
    points.push(x, -halfHeight, 0);
    points.push(x, halfHeight, 0);
  }

  // Horizontal lines
  for (let i = 0; i <= divisionsY; i++) {
    const y = -halfHeight + (i / divisionsY) * height;
    points.push(-halfWidth, y, 0);
    points.push(halfWidth, y, 0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

  return new THREE.LineSegments(geometry, material);
}

export function createScene(): {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
} {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Camera will be configured with quad reprojection
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
  camera.position.set(0, 0, 0.65); // Default position (65cm = 0.65m)

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Create wireframe box (room) - using standard LineSegments
  const boxSize = 2; // 2 meters
  const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
  const boxEdges = new THREE.EdgesGeometry(boxGeometry);
  const boxMaterial = new THREE.LineBasicMaterial({ 
    color: 0xffffff
  });
  const box = new THREE.LineSegments(boxEdges, boxMaterial);
  box.position.set(0, 0, -boxSize / 2); // Center box, front face at z=0
  scene.add(box);

  // Grid parameters - rectangular form factor
  const gridDivisionsX = 8;
  const gridDivisionsY = 8;
  const gridSize = boxSize;

  // Create grid on floor (XZ plane, Y = -boxSize/2)
  const floorGrid = createUniformGrid(gridSize, gridSize, gridDivisionsX, gridDivisionsY);
  floorGrid.rotation.x = -Math.PI / 2;
  floorGrid.position.set(0, -boxSize / 2, -boxSize / 2);
  scene.add(floorGrid);

  // Create grid on back wall (XY plane, Z = -boxSize)
  const backGrid = createUniformGrid(gridSize, gridSize, gridDivisionsX, gridDivisionsY);
  backGrid.position.set(0, 0, -boxSize);
  scene.add(backGrid);

  // Create grid on left wall (YZ plane, X = -boxSize/2)
  const leftGrid = createUniformGrid(gridSize, gridSize, gridDivisionsX, gridDivisionsY);
  leftGrid.rotation.y = Math.PI / 2;
  leftGrid.position.set(-boxSize / 2, 0, -boxSize / 2);
  scene.add(leftGrid);

  // Create grid on right wall (YZ plane, X = boxSize/2)
  const rightGrid = createUniformGrid(gridSize, gridSize, gridDivisionsX, gridDivisionsY);
  rightGrid.rotation.y = -Math.PI / 2;
  rightGrid.position.set(boxSize / 2, 0, -boxSize / 2);
  scene.add(rightGrid);

  // Create grid on ceiling (XZ plane, Y = boxSize/2)
  const topGrid = createUniformGrid(gridSize, gridSize, gridDivisionsX, gridDivisionsY);
  topGrid.rotation.x = Math.PI / 2;
  topGrid.position.set(0, boxSize / 2, -boxSize / 2);
  scene.add(topGrid);

  return { scene, camera, renderer };
}

export function handleResize(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  // Update aspect ratio (for viewport, not for quad reprojection)
  camera.aspect = width / height;
  renderer.setSize(width, height);
}
