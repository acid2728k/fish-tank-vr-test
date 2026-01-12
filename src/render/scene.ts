import * as THREE from 'three';

export interface SceneObjects {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  targets: THREE.Mesh[];
  wireframe: THREE.Group;
}

function createTargetTexture(size: number = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size * 0.48;

  // Fill with white background (opaque)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Draw white circle outline
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw red concentric rings on white background
  const numRings = 5;
  const ringWidth = maxRadius / numRings;

  // Draw red rings (alternating with white background)
  for (let i = numRings - 1; i >= 1; i--) {
    if (i % 2 === 0) {
      // Even rings are red
      const outerRadius = ringWidth * (i + 1);
      const innerRadius = ringWidth * i;
      
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
      ctx.fill('evenodd'); // Fill ring
    }
  }

  // Center red dot
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(centerX, centerY, ringWidth * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Add red crosshair lines
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 2;
  const crosshairLength = maxRadius * 0.25;
  ctx.beginPath();
  // Horizontal
  ctx.moveTo(centerX - crosshairLength, centerY);
  ctx.lineTo(centerX + crosshairLength, centerY);
  // Vertical
  ctx.moveTo(centerX, centerY - crosshairLength);
  ctx.lineTo(centerX, centerY + crosshairLength);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createWireframeTunnel(
  width: number,
  height: number,
  depth: number,
  divisions: number = 8
): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color: 0xffffff });

  // Create grid on each face
  function createGrid(w: number, h: number, divX: number, divY: number): THREE.LineSegments {
    const points: number[] = [];
    const halfW = w / 2;
    const halfH = h / 2;

    // Vertical lines
    for (let i = 0; i <= divX; i++) {
      const x = -halfW + (i / divX) * w;
      points.push(x, -halfH, 0);
      points.push(x, halfH, 0);
    }

    // Horizontal lines
    for (let i = 0; i <= divY; i++) {
      const y = -halfH + (i / divY) * h;
      points.push(-halfW, y, 0);
      points.push(halfW, y, 0);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return new THREE.LineSegments(geometry, material);
  }

  // Floor
  const floor = createGrid(width, depth, divisions, divisions);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -height / 2;
  group.add(floor);

  // Ceiling
  const ceiling = createGrid(width, depth, divisions, divisions);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = height / 2;
  group.add(ceiling);

  // Left wall
  const leftWall = createGrid(depth, height, divisions, divisions);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.x = -width / 2;
  group.add(leftWall);

  // Right wall
  const rightWall = createGrid(depth, height, divisions, divisions);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.x = width / 2;
  group.add(rightWall);

  // Back wall
  const backWall = createGrid(width, height, divisions, divisions);
  backWall.position.z = -depth;
  group.add(backWall);

  // Edges of the tunnel
  const edgesGeometry = new THREE.BoxGeometry(width, height, depth);
  const edges = new THREE.EdgesGeometry(edgesGeometry);
  const edgesLines = new THREE.LineSegments(edges, material);
  group.add(edgesLines);

  return group;
}

export function createScene(canvas: HTMLCanvasElement): SceneObjects {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 200);
  camera.position.set(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ 
    canvas,
    antialias: true 
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Create targets (10 planes at different depths)
  const targets: THREE.Mesh[] = [];
  const targetTexture = createTargetTexture(512); // Higher resolution for better quality
  const targetMaterial = new THREE.MeshBasicMaterial({
    map: targetTexture,
    transparent: false, // Opaque white background
    side: THREE.DoubleSide,
  });

  const targetRadius = 0.5; // Slightly smaller radius for better visibility of multiple targets
  const targetGeometry = new THREE.CircleGeometry(targetRadius, 64); // 64 segments for very smooth circle
  
  // Place targets along Z axis - 5 targets visible in scene
  // Moved further back: startZ doubled to make main target half the size
  const startZ = -4; // Moved further back (was -2, now -4 = 2x distance = half size)
  const endZ = -12; // End further away
  const totalTargets = 5;
  const stepZ = (endZ - startZ) / (totalTargets - 1); // Even distribution
  const maxOffset = 1.2; // Spread for 5 targets
  
  // Deterministic offsets for natural distribution (5 targets)
  const offsets = [
    [0, 0],           // Center, closest
    [0.8, 0.5],       // Right, up
    [-0.7, -0.4],     // Left, down
    [0.4, -0.6],      // Right, down
    [-0.5, 0.7]       // Left, up
  ];
  
  for (let i = 0; i < 5; i++) {
    const z = startZ + i * stepZ;
    const [offsetX, offsetY] = offsets[i];
    const target = new THREE.Mesh(targetGeometry, targetMaterial.clone());
    target.position.set(offsetX * maxOffset, offsetY * maxOffset, z);
    target.lookAt(0, 0, 0); // Face towards origin (camera)
    targets.push(target);
    scene.add(target);
  }

  // Create wireframe tunnel
  const tunnelWidth = 8;
  const tunnelHeight = 6;
  const tunnelDepth = 20;
  const wireframe = createWireframeTunnel(tunnelWidth, tunnelHeight, tunnelDepth, 8);
  wireframe.position.set(0, 0, -tunnelDepth / 2);
  scene.add(wireframe);

  return {
    scene,
    camera,
    renderer,
    targets,
    wireframe,
  };
}

export function handleResize(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
