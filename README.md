# Fish Tank VR

Interactive web application for displaying 3D models with a "window into virtual space" effect. The application uses head tracking to create a realistic parallax effect, making the screen feel like a portal into a three-dimensional world.

## 🎯 Key Features

- **Head Tracking**: Head position tracking via webcam using MediaPipe
- **Off-Axis Projection**: Advanced projection technique for creating a "window into 3D" effect
- **Interactive Control**: 3D model control via mouse or interface buttons
- **Calibration**: Screen parameter adjustment for optimal effect
- **Realistic Lighting**: Configured lighting system for volumetric model visualization

## 🚀 Quick Start

### Requirements

- Node.js 18+ and npm
- Modern browser with WebGL support (Chrome, Firefox, Safari)
- Webcam (optional, mouse control mode available)

### Installation

```bash
# Clone the repository (or use existing folder)
cd fish-tank-vr2

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open your browser and navigate to `http://localhost:5173`

### First Launch

1. Allow webcam access when prompted by the browser
2. Move your head - you'll see the 3D scene perspective change in real-time
3. Use the control panel on the left to adjust parameters

## 📦 Project Structure

```
fish-tank-vr2/
├── public/
│   └── models/              # Folder for 3D models (.glb, .gltf)
│       ├── pokemon_card.glb # Current model
│       └── ...
├── src/
│   ├── components/          # React components
│   │   ├── ControlPanel.tsx # Control panel
│   │   ├── FaceMeshView.tsx # Camera widget with tracking
│   │   └── ThreeView.tsx    # Three.js scene container
│   ├── utils/
│   │   ├── threeScene.ts    # 3D scene and lighting management
│   │   ├── offAxisCamera.ts # Off-axis projection mathematics
│   │   ├── headPose.ts      # Tracking data processing
│   │   └── calibration.ts   # Screen calibration
│   └── App.tsx              # Main component
└── package.json
```

## 🎨 Adding Your Own 3D Model

### Step 1: Model Preparation

Supported formats:
- **GLB** (recommended) - binary format, single file
- **GLTF** - text format, may require additional files

Where to find models:
- [Sketchfab](https://sketchfab.com) - large collection of free models
- [Poly Haven](https://polyhaven.com/models) - quality CC0 models
- [TurboSquid](https://www.turbosquid.com) - paid and free models
- [Free3D](https://free3d.com) - free models

### Step 2: File Placement

Place the model file in the `public/models/` folder:

```bash
# Example: copying a model
cp /path/to/your/model.glb public/models/my_model.glb
```

### Step 3: Change Path in Code

Open the file `src/utils/threeScene.ts` and find the `loadPokemonCardModel()` method:

```typescript
loader.load(
  '/models/pokemon_card.glb',  // ← Change to your model path
  (gltf) => {
    this.model = gltf.scene;
    // ...
  }
);
```

Change the path to your file:
```typescript
loader.load(
  '/models/my_model.glb',  // Your file
  (gltf) => {
    // ...
  }
);
```

### Step 4: Configure Position and Scale

In the same method, configure the initial position, rotation, and scale of the model:

```typescript
this.model.position.set(0, 0, 0);      // X, Y, Z position
this.model.rotation.set(0, 0, 0);      // X, Y, Z rotation (in radians)
this.model.scale.set(0.071, 0.071, 0.071);  // Scale on axes
```

**Configuration Tips:**
- If the model is too large/small, change the `scale` values
- To rotate the model, use `rotation.set(x, y, z)` where values are in radians
- To offset, use `position.set(x, y, z)`

### Step 5: Model Optimization (Optional)

For better performance:
- Use GLB format (binary, loads faster)
- Optimize polygon count (50k-100k for web)
- Compress textures (recommended 1024x1024 or smaller)

Optimization tools:
- [glTF-Pipeline](https://github.com/CesiumGS/gltf-pipeline) - CLI tool
- [Blender](https://www.blender.org) - 3D editor with GLB export

## 💡 Lighting Configuration

Lighting is configured in the file `src/utils/threeScene.ts` in the `loadPokemonCardModel()` method.

### Light Source Types

#### 1. Ambient Light
Creates base illumination for the entire scene:

```typescript
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
// Parameters: color, intensity (0-1)
this.scene.add(ambientLight);
```

**Recommendations:**
- Intensity: 0.2-0.4 (too high removes contrast)
- Used for basic object visibility

#### 2. Directional Light
Creates parallel light rays (like the sun):

```typescript
const frontLight = new THREE.DirectionalLight(0xffffff, 1.8);
frontLight.position.set(0, 0, 3);  // Light source position
// Intensity: 0.5-2.0
this.scene.add(frontLight);
```

**Positioning:**
- `position.set(x, y, z)` - light direction (not source position)
- `(0, 0, 3)` - light from front of model
- `(2, 3, 1)` - light from top right
- `(-2, 1, 1)` - light from left

#### 3. Point Light
Light emitting from a single point in all directions:

```typescript
const pointLight = new THREE.PointLight(0xffffff, 1.5, 10);
pointLight.position.set(0, 0, 2.5);  // Position in 3D space
// Parameters: color, intensity, attenuation distance
this.scene.add(pointLight);
```

**Recommendations:**
- Intensity: 0.5-2.0
- Distance: 5-15 (larger = light spreads further)
- Great for creating highlights

### Current Lighting Configuration

The project uses the following scheme:

1. **Ambient Light** (0.3) - base illumination
2. **Front Light** (1.8) - main front light for highlights
3. **Front Top Light** (1.2) - additional light from top front
4. **Side Lights** (0.8, 0.5) - side lighting for volume
5. **Point Lights** (1.5, 0.8) - point sources for details

### Material Configuration for Better Highlights

Model materials are automatically configured in code:

```typescript
// In loadPokemonCardModel() method, after loading model:
this.model.traverse((child) => {
  if (child instanceof THREE.Mesh) {
    if (child.material instanceof THREE.MeshStandardMaterial) {
      child.material.metalness = 0.2;    // Metalness (0-1)
      child.material.roughness = 0.2;    // Roughness (0-1)
      // Lower roughness = more highlights
    }
  }
});
```

**Material Parameters:**
- `metalness` (0-1): Metallic tint. 0 = dielectric, 1 = metal
- `roughness` (0-1): Surface roughness. 0 = mirror, 1 = matte surface
- For glossy surfaces: `roughness = 0.1-0.3`
- For matte surfaces: `roughness = 0.5-0.8`

### Lighting Configuration Examples

#### Bright Frontal Lighting (for cards, documents)
```typescript
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
const frontLight = new THREE.DirectionalLight(0xffffff, 2.0);
frontLight.position.set(0, 0, 3);
const pointLight = new THREE.PointLight(0xffffff, 1.5, 10);
pointLight.position.set(0, 0, 2.5);
```

#### Soft Volumetric Lighting (for organic objects)
```typescript
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
const topLight = new THREE.DirectionalLight(0xffffff, 1.0);
topLight.position.set(0, 3, 2);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
fillLight.position.set(-2, 1, 1);
```

#### Dramatic Lighting (for demonstrations)
```typescript
const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
keyLight.position.set(2, 3, 2);
const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
rimLight.position.set(-2, 1, -1);
```

## 🎮 Controls

### Control Panel (Left Side)

**Header:**
- 🖼️ **Fullscreen** - fullscreen mode
- 📦 **Debug mode** - show coordinate axes and head position marker

**Tracking:**
- Tracking status (OK/Lost)
- Head coordinates (X, Y, Z)
- FPS counter

**Parallax Calibration:**
- **Screen Width/Height** - physical screen dimensions in cm
- **Viewing Distance** - distance from eyes to screen in cm
- **Aspect Ratio** - automatically calculated aspect ratio

**Model Controls:**
- **Position X/Y/Z** - sliders for model position
- **Scale** - model scale
- **Rotation** - model rotation
- 🖱️ **Mouse Control** - button for mouse control of model

### Mouse Control

1. Click the mouse icon button in the "Model Controls" section
2. Cursor changes to `grab`
3. Hold left mouse button and move - model will move
4. Release mouse button to finish moving

## 🔧 Technical Details

### Technology Stack

- **Vite** - fast build and dev server
- **React 18** - UI framework
- **TypeScript** - typed JavaScript
- **Three.js** - 3D rendering via WebGL
- **MediaPipe Tasks Vision** - head tracking via FaceLandmarker
- **Tailwind CSS** - interface styling

### Off-Axis Projection

The application uses off-axis projection technique to create a "window into 3D" effect:

- Screen is treated as a physical QUAD in 3D space
- Projection matrix is built based on eye position relative to screen
- View matrix is formed from screen basis vectors
- This creates a realistic parallax effect when moving head

### Head Tracking

- Uses MediaPipe FaceLandmarker for face detection
- X/Y position estimation from face center (normalized coordinates)
- Z estimation from inter-pupillary distance (IPD)
- EMA smoothing for stable movement
- Automatic return to center when face is lost (>0.5 sec)

## 🐛 Troubleshooting

### Camera Not Working

- Ensure browser has camera access (check browser settings)
- Use mouse control mode (mouse icon button)
- Try a different browser (Chrome recommended)

### Model Not Displaying

- Check file path in `threeScene.ts`
- Ensure file is in `public/models/`
- Check browser console for loading errors
- Ensure file format is supported (GLB/GLTF)

### Low Performance

- Reduce camera resolution in browser settings
- Optimize 3D model (fewer polygons)
- Disable debug mode
- Close other browser tabs

### Parallax Effect Not Working

- Check screen size calibration
- Configure screen distance
- Ensure tracking is active (status "OK" in panel)
- Try changing calibration parameters

## 📝 License

MIT

## 🙏 Acknowledgments

- Three.js - powerful library for 3D graphics
- MediaPipe - machine learning technologies from Google
- Johnny Chung Lee - inspiration for fish-tank VR effect
