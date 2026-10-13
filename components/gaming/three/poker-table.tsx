'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

function createFeltTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Radial emerald felt gradient
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const grad = ctx.createRadialGradient(cx, cy, 60, cx, cy, 512);
  grad.addColorStop(0, '#047857');
  grad.addColorStop(0.65, '#065f46');
  grad.addColorStop(1, '#022c22');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle fabric weave noise
  ctx.fillStyle = 'rgba(255, 255, 255, 0.018)';
  for (let i = 0; i < 6000; i++) {
    const x = (i * 7919) % canvas.width;
    const y = (i * 6271) % canvas.height;
    ctx.fillRect(x, y, 2, 2);
  }

  // Outer gold betting line circle
  ctx.beginPath();
  ctx.arc(cx, cy, 370, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Inner decorative ring
  ctx.beginPath();
  ctx.arc(cx, cy, 175, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Table center branding
  ctx.fillStyle = 'rgba(251, 191, 36, 0.38)';
  ctx.font = 'bold 34px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♠ TEEN PATTI ROYALE ♥', cx, cy - 110);

  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = 'rgba(253, 224, 71, 0.28)';
  ctx.fillText('HISAAB MULTIPLAYER BOARD', cx, cy + 115);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function PokerTable() {
  const feltTexture = useMemo(() => createFeltTexture(), []);

  return (
    <group position={[0, 0, 0]}>
      {/* Oval Table Felt Surface (scaled X=1.35, Z=1.0) */}
      <group scale={[1.35, 1, 1]}>
        {/* Main Felt Cylinder */}
        <mesh position={[0, -0.08, 0]} receiveShadow>
          <cylinderGeometry args={[3.6, 3.6, 0.16, 64]} />
          <meshStandardMaterial
            map={feltTexture}
            color="#059669"
            roughness={0.85}
            metalness={0.05}
          />
        </mesh>

        {/* Gold Inner Trim Rim */}
        <mesh position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
          <torusGeometry args={[3.55, 0.04, 16, 64]} />
          <meshStandardMaterial color="#d97706" roughness={0.25} metalness={0.85} />
        </mesh>

        {/* Padded Mahogany / Leather Outer Rail */}
        <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <torusGeometry args={[3.82, 0.28, 24, 64]} />
          <meshStandardMaterial
            color="#27120b"
            roughness={0.4}
            metalness={0.18}
          />
        </mesh>

        {/* Under-Table Wood Apron */}
        <mesh position={[0, -0.26, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[3.85, 3.4, 0.25, 64]} />
          <meshStandardMaterial color="#3b190d" roughness={0.5} metalness={0.15} />
        </mesh>
      </group>

      {/* Center Pedestal Pillar & Base */}
      <mesh position={[0, -1.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.9, 1.35, 1.8, 32]} />
        <meshStandardMaterial color="#1e0d07" roughness={0.55} metalness={0.2} />
      </mesh>
      <mesh position={[0, -2.05, 0]} receiveShadow>
        <cylinderGeometry args={[2.2, 2.4, 0.18, 32]} />
        <meshStandardMaterial color="#b45309" roughness={0.3} metalness={0.75} />
      </mesh>

      {/* Dealer Card Shoe at Top of Table (North Side) */}
      <group position={[0, 0.08, -2.15]}>
        {/* Brass Tray */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.85, 0.08, 1.05]} />
          <meshStandardMaterial color="#b45309" roughness={0.25} metalness={0.8} />
        </mesh>
        {/* Deck Stack inside Shoe */}
        <mesh position={[0, 0.12, 0]} castShadow>
          <boxGeometry args={[0.65, 0.18, 0.9]} />
          <meshStandardMaterial color="#991b1b" roughness={0.4} metalness={0.1} />
        </mesh>
      </group>
    </group>
  );
}

