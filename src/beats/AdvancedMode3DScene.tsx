import { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { SurfaceImageData } from '../types';

// ---------- types ----------
interface SceneProps {
  imageData: SurfaceImageData;
  gridRange: [number, number];
  gridSize: number;
  playing: boolean;
  onAnimationComplete: () => void;
}

// ---------- color helpers ----------
const skyBlue = new THREE.Color('#38bdf8');
const pink = new THREE.Color('#f472b6');
const white = new THREE.Color('#ffffff');

function marginColor(margin: number, maxMargin: number): THREE.Color {
  if (margin >= 0) {
    const t = Math.min(margin / maxMargin, 1);
    return white.clone().lerp(skyBlue, t);
  } else {
    const t = Math.min(-margin / maxMargin, 1);
    return white.clone().lerp(pink, t);
  }
}

// ---------- Surface Mesh ----------
function SurfaceMesh({ imageData, gridRange, gridSize }: {
  imageData: SurfaceImageData;
  gridRange: [number, number];
  gridSize: number;
}) {
  const geom = useMemo(() => {
    const [lo, hi] = gridRange;
    const step = (hi - lo) / (gridSize - 1);
    const surface = imageData.surface_margin;

    // Find max absolute margin for color scaling
    let maxMargin = 0;
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        maxMargin = Math.max(maxMargin, Math.abs(surface[i][j]));
      }
    }
    if (maxMargin === 0) maxMargin = 1;

    const positions = new Float32Array(gridSize * gridSize * 3);
    const colors = new Float32Array(gridSize * gridSize * 3);

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const idx = (i * gridSize + j) * 3;
        const alpha = lo + j * step;
        const beta = lo + i * step;
        const margin = surface[i][j];

        positions[idx] = alpha;
        positions[idx + 1] = margin;
        positions[idx + 2] = beta;

        const c = marginColor(margin, maxMargin);
        colors[idx] = c.r;
        colors[idx + 1] = c.g;
        colors[idx + 2] = c.b;
      }
    }

    // Build index buffer for triangles
    const indices: number[] = [];
    for (let i = 0; i < gridSize - 1; i++) {
      for (let j = 0; j < gridSize - 1; j++) {
        const a = i * gridSize + j;
        const b = a + 1;
        const c = a + gridSize;
        const d = c + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }, [imageData, gridRange, gridSize]);

  return (
    <group>
      <mesh geometry={geom}>
        <meshStandardMaterial
          vertexColors
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={geom}>
        <meshBasicMaterial
          wireframe
          color="#ffffff"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ---------- Decision Boundary ----------
function DecisionBoundary({ contour, gridRange, gridSize, surfaceMargin }: {
  contour: number[][];
  gridRange: [number, number];
  gridSize: number;
  surfaceMargin: number[][];
}) {
  const points = useMemo(() => {
    if (!contour || contour.length < 2) return null;
    const [lo, hi] = gridRange;
    const step = (hi - lo) / (gridSize - 1);

    return contour.map(([ci, cj]) => {
      const alpha = lo + cj * step;
      const beta = lo + ci * step;
      // Interpolate margin at fractional grid coords
      const i0 = Math.floor(ci);
      const j0 = Math.floor(cj);
      const i1 = Math.min(i0 + 1, gridSize - 1);
      const j1 = Math.min(j0 + 1, gridSize - 1);
      const fi = ci - i0;
      const fj = cj - j0;
      const m00 = surfaceMargin[i0]?.[j0] ?? 0;
      const m01 = surfaceMargin[i0]?.[j1] ?? 0;
      const m10 = surfaceMargin[i1]?.[j0] ?? 0;
      const m11 = surfaceMargin[i1]?.[j1] ?? 0;
      const margin = m00 * (1 - fi) * (1 - fj) + m01 * (1 - fi) * fj + m10 * fi * (1 - fj) + m11 * fi * fj;
      return new THREE.Vector3(alpha, margin, beta);
    });
  }, [contour, gridRange, gridSize, surfaceMargin]);

  if (!points || points.length < 2) return null;

  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
  const tubeGeom = new THREE.TubeGeometry(curve, points.length * 4, 0.005, 8, false);

  return (
    <mesh geometry={tubeGeom}>
      <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
    </mesh>
  );
}

// ---------- Attack Path ----------
function AttackPath({ path, color, radius, smooth, playing, duration, onComplete }: {
  path: number[][];
  color: string;
  radius: number;
  smooth: boolean;
  playing: boolean;
  duration: number;
  onComplete?: () => void;
}) {
  const progressRef = useRef(0);
  const sphereRef = useRef<THREE.Mesh>(null);
  const tubeRef = useRef<THREE.Mesh>(null);
  const completedRef = useRef(false);

  const { curve, fullTubeGeom } = useMemo(() => {
    const pts = path.map(([a, b, m]) => new THREE.Vector3(a, m, b));
    const c = smooth
      ? new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5)
      : new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0);
    const g = new THREE.TubeGeometry(c, Math.max(pts.length * 8, 64), radius, 8, false);
    return { curve: c, fullTubeGeom: g };
  }, [path, radius, smooth]);

  useEffect(() => {
    progressRef.current = 0;
    completedRef.current = false;
  }, [playing]);

  useFrame((_, delta) => {
    if (!playing) {
      // Show full path when not playing (after animation completes or initial state)
      if (tubeRef.current) {
        tubeRef.current.geometry = fullTubeGeom;
        tubeRef.current.visible = true;
      }
      if (sphereRef.current) sphereRef.current.visible = false;
      return;
    }

    progressRef.current = Math.min(progressRef.current + delta / duration, 1);
    const t = progressRef.current;

    // Update sphere position
    const pos = curve.getPointAt(t);
    if (sphereRef.current) {
      sphereRef.current.position.copy(pos);
      sphereRef.current.visible = true;
    }

    // Draw partial tube up to current progress
    if (tubeRef.current && t > 0.01) {
      const partialPts = [];
      const steps = Math.max(Math.floor(t * 80), 2);
      for (let i = 0; i <= steps; i++) {
        partialPts.push(curve.getPointAt((i / steps) * t));
      }
      const partialCurve = new THREE.CatmullRomCurve3(partialPts);
      const newGeom = new THREE.TubeGeometry(partialCurve, steps * 2, radius, 8, false);
      tubeRef.current.geometry.dispose();
      tubeRef.current.geometry = newGeom;
      tubeRef.current.visible = true;
    }

    if (t >= 1 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  });

  return (
    <group>
      <mesh ref={tubeRef} visible={!playing}>
        <primitive object={fullTubeGeom} attach="geometry" />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh ref={sphereRef} visible={false}>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

// ---------- Camera Captions ----------
function CameraCaptions() {
  const { camera } = useThree();
  const [caption, setCaption] = useState('');

  useFrame(() => {
    const spherical = new THREE.Spherical().setFromVector3(camera.position);
    const azimuth = THREE.MathUtils.radToDeg(spherical.theta);
    const polar = THREE.MathUtils.radToDeg(spherical.phi);

    // Front view: looking along alpha axis
    if (Math.abs(azimuth) < 20 && polar > 40 && polar < 80) {
      setCaption('FGSM takes the shortest path — but overshoots the optimal point');
    }
    // Side view: looking along beta axis
    else if (Math.abs(Math.abs(azimuth) - 90) < 20 && polar > 40 && polar < 80) {
      setCaption('C&W finds the true minimum in the margin valley');
    }
    // Top view
    else if (polar < 30) {
      setCaption('The decision boundary (white line) — cross it and the classification flips');
    }
    else {
      setCaption('');
    }
  });

  // Rendered outside Canvas via a portal - we use CSS overlay instead
  // Store caption in a ref accessible from parent
  useEffect(() => {
    const el = document.getElementById('camera-caption');
    if (el) el.textContent = caption;
  }, [caption]);

  return null;
}

// ---------- Auto-rotate controller ----------
function AutoRotateController({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const onStart = () => {
      controls.autoRotate = false;
      clearTimeout(timerRef.current);
    };
    const onEnd = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        controls.autoRotate = true;
      }, 3000);
    };

    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);
    return () => {
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
      clearTimeout(timerRef.current);
    };
  }, [controlsRef]);

  return null;
}

// ---------- Camera Reset ----------
function CameraResetter({ resetSignal }: { resetSignal: number }) {
  const { camera } = useThree();
  const targetPos = useMemo(() => new THREE.Vector3(3, 2.5, 3.5), []);
  const animatingRef = useRef(false);
  const startPosRef = useRef(new THREE.Vector3());
  const tRef = useRef(0);

  useEffect(() => {
    if (resetSignal > 0) {
      startPosRef.current.copy(camera.position);
      tRef.current = 0;
      animatingRef.current = true;
    }
  }, [resetSignal, camera]);

  useFrame((_, delta) => {
    if (!animatingRef.current) return;
    tRef.current = Math.min(tRef.current + delta / 0.5, 1);
    const t = tRef.current;
    // Ease-out
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(startPosRef.current, targetPos, eased);
    camera.lookAt(0, 0, 0);
    if (t >= 1) animatingRef.current = false;
  });

  return null;
}

// ---------- Main Scene (default export for lazy loading) ----------
export default function AdvancedMode3DScene({ imageData, gridRange, gridSize, playing, onAnimationComplete }: SceneProps) {
  const controlsRef = useRef<any>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const completedPaths = useRef(0);

  const handlePathComplete = useCallback(() => {
    completedPaths.current++;
    const totalPaths = 1 + (imageData.pgd_path_visible ? 1 : 0) + (imageData.cw_path_visible ? 1 : 0);
    if (completedPaths.current >= totalPaths) {
      completedPaths.current = 0;
      onAnimationComplete();
    }
  }, [imageData, onAnimationComplete]);

  useEffect(() => {
    completedPaths.current = 0;
  }, [playing]);

  // Expose reset function for parent's "Reset camera" button
  useEffect(() => {
    const btn = document.querySelector('[data-reset-camera]');
    if (!btn) return;
    const handler = () => setResetSignal(s => s + 1);
    btn.addEventListener('click', handler);
    return () => btn.removeEventListener('click', handler);
  }, []);

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [3, 2.5, 3.5], fov: 45, near: 0.1, far: 50 }}
        gl={{ antialias: false }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />
        <hemisphereLight args={['#38bdf8', '#f472b6', 0.2]} />

        {/* Surface */}
        <SurfaceMesh imageData={imageData} gridRange={gridRange} gridSize={gridSize} />

        {/* Decision boundary */}
        <DecisionBoundary
          contour={imageData.decision_boundary_contour}
          gridRange={gridRange}
          gridSize={gridSize}
          surfaceMargin={imageData.surface_margin}
        />

        {/* Attack paths */}
        <AttackPath
          path={imageData.fgsm_path}
          color="#fbbf24"
          radius={0.008}
          smooth={false}
          playing={playing}
          duration={1.5}
          onComplete={handlePathComplete}
        />
        {imageData.pgd_path_visible && (
          <AttackPath
            path={imageData.pgd_path}
            color="#22d3ee"
            radius={0.006}
            smooth={false}
            playing={playing}
            duration={3}
            onComplete={handlePathComplete}
          />
        )}
        {imageData.cw_path_visible && (
          <AttackPath
            path={imageData.cw_path}
            color="#f472b6"
            radius={0.006}
            smooth={true}
            playing={playing}
            duration={4}
            onComplete={handlePathComplete}
          />
        )}

        {/* Controls */}
        <OrbitControls
          ref={controlsRef}
          autoRotate
          autoRotateSpeed={0.4}
          enableDamping
          dampingFactor={0.1}
          minDistance={1.5}
          maxDistance={8}
          minPolarAngle={THREE.MathUtils.degToRad(10)}
          maxPolarAngle={THREE.MathUtils.degToRad(85)}
        />
        <AutoRotateController controlsRef={controlsRef} />
        <CameraResetter resetSignal={resetSignal} />
        <CameraCaptions />

        {/* Post-processing */}
        <EffectComposer>
          <SMAA />
          <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.1} intensity={0.3} radius={0.4} />
        </EffectComposer>
      </Canvas>

      {/* Camera caption overlay */}
      <div
        id="camera-caption"
        className="absolute bottom-12 left-1/2 -translate-x-1/2 font-body text-xs text-text-muted bg-canvas/80 px-3 py-1 rounded pointer-events-none transition-opacity duration-300 empty:opacity-0"
      />
    </div>
  );
}
