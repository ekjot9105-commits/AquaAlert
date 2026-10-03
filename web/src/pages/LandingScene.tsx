import { useFrame } from '@react-three/fiber';
import { Float, OrbitControls, Sparkles } from '@react-three/drei';
import { useRef } from 'react';
import type { Group, Mesh } from 'three';

export function LandingScene({ act }: { act: number }) {
  const river = useRef<Mesh>(null);
  const pulse = useRef<Mesh>(null);
  const city = useRef<Group>(null);
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    if (river.current) river.current.rotation.z = Math.sin(time * 0.3) * 0.015;
    if (pulse.current) {
      const scale = act >= 3 ? 1 + ((Math.sin(time * 2) + 1) * 0.12) : 0.01;
      pulse.current.scale.setScalar(scale);
    }
    if (city.current) city.current.rotation.y += delta * 0.004;
    state.camera.position.x += ((act * 0.15) - state.camera.position.x) * 0.015;
    state.camera.position.z += (8 - state.camera.position.z) * 0.015;
  });
  const water = act >= 4 ? (act === 4 ? '#b88942' : '#248f8b') : '#167b83';
  return <>
    <color attach="background" args={['#071722']} />
    <fog attach="fog" args={['#071722', 7, 19]} />
    <ambientLight intensity={0.8} />
    <directionalLight position={[4, 8, 3]} intensity={2.5} color="#ffd6a0" />
    <pointLight position={[0, 2, 3]} intensity={5} color="#2ee6d6" distance={10} />
    <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
    <mesh ref={river} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <planeGeometry args={[3.2, 18, 16, 24]} />
      <meshStandardMaterial color={water} roughness={0.3} metalness={0.2} />
    </mesh>
    <group ref={city}>
      {Array.from({ length: 28 }, (_, index) => {
        const side = index % 2 ? -1 : 1;
        const z = (index % 14) - 6.5;
        return <mesh key={index} position={[side * (2.4 + (index % 3) * 0.45), 0.25 + (index % 4) * 0.18, z]}>
          <boxGeometry args={[0.8 + (index % 2) * 0.35, 0.5 + (index % 4) * 0.4, 0.7]} />
          <meshStandardMaterial color={index % 3 ? '#19384b' : '#28546a'} />
        </mesh>;
      })}
    </group>
    <Sparkles count={act >= 1 ? 80 : 30} scale={[8, 3, 14]} size={0.035} speed={0.15} color="#a7fff3" />
    {act >= 1 && <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.4}><mesh position={[1.35, 0.65, 1.5]}><boxGeometry args={[0.48, 0.9, 0.08]} /><meshStandardMaterial color="#101e2a" emissive="#193c4a" emissiveIntensity={0.4} /></mesh></Float>}
    {act >= 1 && <mesh position={[0, 0.12, 1.2]}><coneGeometry args={[0.16, 0.55, 6]} /><meshStandardMaterial color="#ffb547" emissive="#ffb547" emissiveIntensity={1} /></mesh>}
    {act >= 2 && <mesh position={[0, 0.22, 0.4]}><ringGeometry args={[0.22, 0.28, 32]} /><meshBasicMaterial color="#2ee6d6" /></mesh>}
    {act >= 3 && <mesh ref={pulse} position={[0, 0.2, -0.8]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.45, 0.5, 40]} /><meshBasicMaterial color="#ffb547" transparent opacity={0.8} /></mesh>}
    {act >= 4 && <Float speed={1} floatIntensity={0.5}><mesh position={[1.25, 0.8, -1.5]}><sphereGeometry args={[0.27, 12, 8]} /><meshStandardMaterial color="#2ee6d6" emissive="#2ee6d6" emissiveIntensity={0.8} /></mesh></Float>}
  </>;
}
