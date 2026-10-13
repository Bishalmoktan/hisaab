'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Card } from '@/lib/game/types';
import { suitToSymbol } from '@/lib/game/deck';

interface Card3DProps {
  card?: Card | null;
  faceUp?: boolean;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  isFolded?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
}

const textureCache = new Map<string, THREE.CanvasTexture>();

function createCardBackTexture(): THREE.CanvasTexture {
  const cacheKey = '__card_back__';
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 360;
  const ctx = canvas.getContext('2d')!;

  // White outer border
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Deep royal crimson inner background
  const pad = 12;
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, '#7f1d1d');
  grad.addColorStop(0.5, '#991b1b');
  grad.addColorStop(1, '#450a0a');
  ctx.fillStyle = grad;
  ctx.fillRect(pad, pad, canvas.width - pad * 2, canvas.height - pad * 2);

  // Gold ornate frame
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  ctx.strokeRect(pad + 6, pad + 6, canvas.width - (pad + 6) * 2, canvas.height - (pad + 6) * 2);

  // Geometric diamond lattice pattern
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.28)';
  ctx.lineWidth = 1.5;
  const step = 24;
  for (let x = pad + 10; x < canvas.width - pad - 10; x += step) {
    for (let y = pad + 10; y < canvas.height - pad - 10; y += step) {
      ctx.beginPath();
      ctx.moveTo(x + step / 2, y);
      ctx.lineTo(x + step, y + step / 2);
      ctx.lineTo(x + step / 2, y + step);
      ctx.lineTo(x, y + step / 2);
      ctx.closePath();
      ctx.stroke();
    }
  }

  // Center medallion
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 42, 0, Math.PI * 2);
  ctx.fillStyle = '#450a0a';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fbbf24';
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 24px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♠ ♥', cx, cy - 11);
  ctx.fillText('♣ ♦', cx, cy + 13);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

function createCardFrontTexture(card: Card): THREE.CanvasTexture {
  const cacheKey = `${card.rank}_${card.suit}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 360;
  const ctx = canvas.getContext('2d')!;

  // Ivory card stock background
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, '#ffffff');
  bgGrad.addColorStop(1, '#f1f5f9');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle card border
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const mainColor = isRed ? '#dc2626' : '#0f172a';
  const symbol = suitToSymbol(card.suit);

  // Inner gold trim
  ctx.strokeStyle = isRed ? 'rgba(220, 38, 38, 0.2)' : 'rgba(15, 23, 42, 0.15)';
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

  // Top-left corner index
  ctx.fillStyle = mainColor;
  ctx.font = 'bold 38px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(card.rank, 22, 20);

  ctx.font = '34px sans-serif';
  ctx.fillText(symbol, 22, 60);

  // Bottom-right corner index (upside down)
  ctx.save();
  ctx.translate(canvas.width - 22, canvas.height - 20);
  ctx.rotate(Math.PI);
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(card.rank, 0, 0);
  ctx.font = '34px sans-serif';
  ctx.fillText(symbol, 0, 40);
  ctx.restore();

  // Center artwork
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  if (['J', 'Q', 'K', 'A'].includes(card.rank)) {
    // Ornate medallion for high/court cards
    ctx.beginPath();
    ctx.arc(cx, cy, 68, 0, Math.PI * 2);
    ctx.fillStyle = isRed ? 'rgba(254, 226, 226, 0.6)' : 'rgba(241, 245, 249, 0.8)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#d97706';
    ctx.stroke();

    ctx.fillStyle = mainColor;
    ctx.font = '92px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, cx, cy);

    if (card.rank !== 'A') {
      ctx.font = 'bold 28px serif';
      ctx.fillStyle = '#b45309';
      ctx.fillText(card.rank, cx, cy - 48);
    }
  } else {
    // Large central suit + rank watermark
    ctx.fillStyle = mainColor;
    ctx.font = '96px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, cx, cy);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

export function Card3D({
  card,
  faceUp = false,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  isFolded = false,
  isHighlighted = false,
  onClick,
}: Card3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  const backTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return createCardBackTexture();
  }, []);

  const frontTexture = useMemo(() => {
    if (typeof document === 'undefined' || !card) return null;
    return createCardFrontTexture(card);
  }, [card]);

  // Target transforms for smooth animation
  const targetPos = useMemo(() => new THREE.Vector3(...position), [position]);
  const targetRot = useMemo(() => {
    // When faceUp is true, card face points up (+Y). When faceDown, flip 180 deg around Z.
    const flipZ = faceUp && card ? 0 : Math.PI;
    return new THREE.Euler(rotation[0], rotation[1], rotation[2] + flipZ);
  }, [rotation, faceUp, card]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const speed = Math.min(1, delta * 8);

    // Smoothly interpolate position
    const hoverOffset = isHighlighted ? 0.12 : 0;
    groupRef.current.position.lerp(
      new THREE.Vector3(targetPos.x, targetPos.y + hoverOffset, targetPos.z),
      speed
    );

    // Smoothly interpolate rotation
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRot.x,
      speed
    );
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRot.y,
      speed
    );
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      targetRot.z,
      speed
    );
  });

  const cardWidth = 0.65 * scale;
  const cardHeight = 0.92 * scale;
  const cardThickness = 0.015 * scale;

  return (
    <group
      ref={groupRef}
      position={[0, 1.5, 0]} // Starts above center dealer shoe for deal animation
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      {/* Card Core Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[cardWidth, cardThickness, cardHeight]} />
        <meshStandardMaterial
          color={isFolded ? '#94a3b8' : '#f8fafc'}
          roughness={0.35}
          metalness={0.05}
          transparent={isFolded}
          opacity={isFolded ? 0.55 : 1}
        />
      </mesh>

      {/* Top Face (Front of Card - visible when faceUp=true) */}
      <mesh position={[0, cardThickness / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cardWidth * 0.98, cardHeight * 0.98]} />
        <meshStandardMaterial
          map={frontTexture ?? backTexture}
          roughness={0.25}
          metalness={0.05}
          transparent={isFolded}
          opacity={isFolded ? 0.55 : 1}
        />
      </mesh>

      {/* Bottom Face (Back of Card - visible when flipped faceDown) */}
      <mesh position={[0, -cardThickness / 2 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cardWidth * 0.98, cardHeight * 0.98]} />
        <meshStandardMaterial
          map={backTexture}
          roughness={0.3}
          metalness={0.1}
          transparent={isFolded}
          opacity={isFolded ? 0.55 : 1}
        />
      </mesh>

      {/* Subtle gold glow rim when highlighted */}
      {isHighlighted && (
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[cardWidth * 1.12, cardHeight * 1.1]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  );
}

