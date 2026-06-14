import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';


function SceneObjects() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Base slow rotation
      const baseRotationX = Math.sin(state.clock.elapsedTime * 0.05) * 0.05;
      const baseRotationY = state.clock.elapsedTime * 0.02;

      // Target rotation based on mouse pointer (normalized coordinates -1 to 1)
      const targetX = baseRotationX - state.pointer.y * 0.15;
      const targetY = baseRotationY + state.pointer.x * 0.15;

      // Smoothly interpolate current rotation towards target
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetX, 2, delta);
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetY, 2, delta);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Subtle Starfield */}
      <Stars 
        radius={50} 
        depth={50} 
        count={3000} 
        factor={3} 
        saturation={0} 
        fade 
        speed={1} 
      />
    </group>
  );
}

export default function Background3D() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Avoid SSR hydration mismatches if any

  return (
    <div className="absolute inset-0 z-[-1] pointer-events-none" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 10], fov: 60 }} dpr={[1, 2]}>
        <SceneObjects />
      </Canvas>
    </div>
  );
}
