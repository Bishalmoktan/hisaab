'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ChipStackProps {
  amount: number;
  position: [number, number, number];
  scale?: number;
  animateSpin?: boolean;
}

const CHIP_DENOMINATIONS = [
  { value: 500, color: '#1e1b4b', rim: '#fbbf24' }, // Royal Purple / Gold ₹500
  { value: 100, color: '#0f172a', rim: '#f8fafc' }, // Black / White ₹100
  { value: 50, color: '#1d4ed8', rim: '#ffffff' },  // Blue / White ₹50
  { value: 20, color: '#15803d', rim: '#fde047' },  // Green / Yellow ₹20
  { value: 10, color: '#dc2626', rim: '#ffffff' },  // Red / White ₹10
];

export function ChipStack({
  amount,
  position,
  scale = 1,
  animateSpin = false,
}: ChipStackProps) {
  const groupRef = useRef<THREE.Group>(null);

  const piles = useMemo(() => {
    let remaining = Math.max(0, Math.floor(amount));
    const result: { color: string; rim: string; count: number }[] = [];

    for (const denom of CHIP_DENOMINATIONS) {
      const count = Math.min(10, Math.floor(remaining / denom.value));
      if (count > 0) {
        result.push({
          color: denom.color,
          rim: denom.rim,
          count,
        });
        remaining -= count * denom.value;
      }
    }

    if (result.length === 0 && amount > 0) {
      result.push({ color: '#dc2626', rim: '#ffffff', count: 2 });
    }

    return result.slice(0, 4);
  }, [amount]);

  useFrame((_, delta) => {
    if (animateSpin && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  if (amount <= 0) return null;

  const chipRadius = 0.2 * scale;
  const chipHeight = 0.04 * scale;

  return (
    <group ref={groupRef} position={position}>
      {piles.map((pile, pileIdx) => {
        const angle = (pileIdx / Math.max(1, piles.length)) * Math.PI * 2;
        const offsetRadius = piles.length > 1 ? 0.24 * scale : 0;
        const px = Math.cos(angle) * offsetRadius;
        const pz = Math.sin(angle) * offsetRadius;

        return (
          <group key={pileIdx} position={[px, 0, pz]}>
            {Array.from({ length: pile.count }).map((_, chipIdx) => {
              const jitterX = ((chipIdx * 7) % 3 - 1) * 0.008 * scale;
              const jitterZ = ((chipIdx * 11) % 3 - 1) * 0.008 * scale;
              const y = chipIdx * (chipHeight + 0.002) + chipHeight / 2;

              return (
                <group key={chipIdx} position={[jitterX, y, jitterZ]}>
                  {/* Main Chip Body */}
                  <mesh castShadow receiveShadow>
                    <cylinderGeometry args={[chipRadius, chipRadius, chipHeight, 24]} />
                    <meshStandardMaterial
                      color={pile.color}
                      roughness={0.3}
                      metalness={0.25}
                    />
                  </mesh>

                  {/* Gold/White Inlay Ring on Top */}
                  <mesh
                    position={[0, chipHeight / 2 + 0.001, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                  >
                    <ringGeometry args={[chipRadius * 0.55, chipRadius * 0.78, 24]} />
                    <meshStandardMaterial
                      color={pile.rim}
                      roughness={0.2}
                      metalness={0.5}
                    />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

