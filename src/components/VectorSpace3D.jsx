import { useRef, useEffect, useCallback, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { vectorDB } from '../utils/vectorDB';

// ── Individual vector point ──────────────────────────────────────────────────
function VectorPoint({ entry, isSelected, onSelect, animDelay = 0 }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [scale, setScale] = useState(0);

  const { x, y, z } = entry.position3d || { x: 0, y: 0, z: 0 };
  const color = new THREE.Color(entry.color);
  const hColor = new THREE.Color('#ffffff');

  useEffect(() => {
    const t = setTimeout(() => setScale(1), animDelay);
    return () => clearTimeout(t);
  }, [animDelay]);

  useFrame(() => {
    if (!meshRef.current) return;
    // Scale in animation on load/hover/select
    meshRef.current.scale.setScalar(
      THREE.MathUtils.lerp(meshRef.current.scale.x, scale * (hovered ? 1.5 : isSelected ? 1.4 : 1), 0.12)
    );
    // Rotate gently when interacted with
    if (hovered || isSelected) {
      meshRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group position={[x, y, z]}>
      <mesh
        ref={meshRef}
        onClick={() => onSelect(entry)}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshBasicMaterial
          color={hovered || isSelected ? hColor : '#cbd5e1'}
        />
      </mesh>

      {/* Tooltip on hover */}
      {hovered && (
        <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(5,8,16,0.95)',
            border: `1px solid ${entry.color}`,
            borderRadius: '8px',
            padding: '8px 12px',
            width: '180px',
            backdropFilter: 'blur(10px)',
            boxShadow: `0 0 15px ${entry.color}40`,
          }}>
            <div style={{ fontSize: '10px', color: entry.color, fontWeight: 700, marginBottom: 4 }}>
              #{entry.id} · {entry.metadata?.label || 'Vector'}
            </div>
            <div style={{ fontSize: '9px', color: '#94a3b8', lineHeight: 1.4, maxHeight: 60, overflow: 'hidden' }}>
              {entry.text?.slice(0, 80)}{entry.text?.length > 80 ? '…' : ''}
            </div>
            <div style={{ fontSize: '9px', color: '#475569', marginTop: 4 }}>
              [{(entry.position3d?.x || 0).toFixed(2)}, {(entry.position3d?.y || 0).toFixed(2)}, {(entry.position3d?.z || 0).toFixed(2)}]
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Connection lines between similar vectors ─────────────────────────────────
function SimilarityEdges({ vectors }) {
  const linesMemo = useCallback(() => {
    const edges = [];
    for (let i = 0; i < vectors.length; i++) {
      for (let j = i + 1; j < vectors.length; j++) {
        const a = vectors[i];
        const b = vectors[j];
        // Compute cosine sim
        const sim = vectorDB.cosineSimilarity(a.embedding, b.embedding);
        if (sim > 0.6) {
          edges.push({ a, b, sim });
        }
      }
    }
    return edges;
  }, [vectors]);

  const edges = linesMemo();

  return (
    <>
      {edges.map((edge, i) => {
        const { x: ax, y: ay, z: az } = edge.a.position3d || {};
        const { x: bx, y: by, z: bz } = edge.b.position3d || {};
        if (!ax || !bx) return null;
        const points = [new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz)];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        return (
          <line key={i} geometry={geo}>
            <lineBasicMaterial
              color="#64748b"
              transparent
              opacity={Math.min((edge.sim - 0.6) * 2.0, 0.4)}
              linewidth={1}
            />
          </line>
        );
      })}
    </>
  );
}

// ── Grid floor ───────────────────────────────────────────────────────────────
function GridFloor() {
  return (
    <gridHelper
      args={[20, 20, '#1e2d5a', '#0a1228']}
      position={[0, -4, 0]}
    />
  );
}

// ── Axis labels and High-Dimensional Representation ────────────────────────────
function AxisLabels() {
  return (
    <group>
      {/* Primary 3D Axes (PCA/Projection) */}
      <Text position={[8, 0, 0]} fontSize={0.3} color="#00f5ff" anchorX="left">Dim 1</Text>
      <Text position={[0, 8, 0]} fontSize={0.3} color="#f472b6" anchorX="center" anchorY="bottom">Dim 2</Text>
      <Text position={[0, 0, 8]} fontSize={0.3} color="#8b5cf6" anchorX="center" anchorY="bottom">Dim 3</Text>
      
      {/* Axis lines */}
      <line>
        <bufferGeometry setFromPoints={[new THREE.Vector3(-8,0,0), new THREE.Vector3(8,0,0)]} />
        <lineBasicMaterial color="#00f5ff" transparent opacity={0.4} />
      </line>
      <line>
        <bufferGeometry setFromPoints={[new THREE.Vector3(0,-8,0), new THREE.Vector3(0,8,0)]} />
        <lineBasicMaterial color="#f472b6" transparent opacity={0.4} />
      </line>
      <line>
        <bufferGeometry setFromPoints={[new THREE.Vector3(0,0,-8), new THREE.Vector3(0,0,8)]} />
        <lineBasicMaterial color="#8b5cf6" transparent opacity={0.4} />
      </line>

      {/* Ghost axes to represent higher dimensions (N-Dim projection) */}
      {[...Array(6)].map((_, i) => {
        const angle = (i * Math.PI) / 6;
        const pts = [
          new THREE.Vector3(Math.cos(angle) * -6, Math.sin(angle) * -6, (i%2 === 0 ? -4 : 4)),
          new THREE.Vector3(Math.cos(angle) * 6, Math.sin(angle) * 6, (i%2 === 0 ? 4 : -4))
        ];
        return (
          <group key={i}>
            <line>
              <bufferGeometry setFromPoints={pts} />
              <lineBasicMaterial color="#475569" transparent opacity={0.15} linewidth={1} />
            </line>
            <Text position={pts[1].clone().multiplyScalar(1.1)} fontSize={0.15} color="#475569" transparent opacity={0.5}>
              Dim {i + 4}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

// ── Floating particles background ────────────────────────────────────────────
function Particles() {
  const ref = useRef();
  const count = 80;
  const positions = useRef(
    new Float32Array(count * 3).map(() => (Math.random() - 0.5) * 20)
  );

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions.current}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#8b5cf6" size={0.05} transparent opacity={0.4} />
    </points>
  );
}

// ── Camera auto-rotate when no vectors ────────────────────────────────────────
function CameraRig({ hasVectors }) {
  const { camera } = useThree();
  useFrame((state) => {
    if (!hasVectors) {
      camera.position.x = Math.sin(state.clock.elapsedTime * 0.2) * 12;
      camera.position.z = Math.cos(state.clock.elapsedTime * 0.2) * 12;
      camera.lookAt(0, 0, 0);
    }
  });
  return null;
}

// ── Main VectorSpace3D component ─────────────────────────────────────────────
export default function VectorSpace3D({ vectors, onSelectVector, selectedVector }) {
  const hasVectors = vectors.length > 0;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Corner info */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          3D VECTOR SPACE
        </div>
        <div className="badge badge-purple">{vectors.length} vectors</div>
        {selectedVector && (
          <div className="glass-card" style={{ padding: '6px 10px', marginTop: 4 }}>
            <div style={{ fontSize: '10px', color: 'var(--accent-cyan)' }}>Selected:</div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedVector.text?.slice(0, 40)}…
            </div>
          </div>
        )}
      </div>

      {/* Controls hint */}
      <div style={{
        position: 'absolute', bottom: 60, left: 12, zIndex: 10,
        fontSize: '10px', color: 'var(--text-muted)',
      }}>
        🖱️ Left-Click to Orbit · Right-Click to Pan (Move Left/Right) · Scroll to Zoom
      </div>

      <Canvas
        camera={{ position: [8, 5, 10], fov: 60 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#8b5cf6" />
        <pointLight position={[-10, -5, -10]} intensity={0.5} color="#00f5ff" />
        <pointLight position={[0, 10, 0]} intensity={0.3} color="#f472b6" />

        <CameraRig hasVectors={hasVectors} />
        <OrbitControls
          makeDefault
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={0.5}
          maxDistance={50}
          dampingFactor={0.05}
          enableDamping
          zoomSpeed={0.6}
          panSpeed={1.0}
          rotateSpeed={0.7}
        />

        <Particles />
        <GridFloor />
        <AxisLabels />

        {/* Similarity edges */}
        {vectors.length > 1 && <SimilarityEdges vectors={vectors} />}

        {/* Vector points */}
        {vectors.map((entry, i) => (
          <VectorPoint
            key={entry.id}
            entry={entry}
            isSelected={selectedVector?.id === entry.id}
            onSelect={onSelectVector}
            animDelay={i * 80}
          />
        ))}

        {/* Empty state text */}
        {!hasVectors && (
          <Text
            position={[0, 0, 0]}
            fontSize={0.4}
            color="#1e2d5a"
            anchorX="center"
            anchorY="middle"
            maxWidth={8}
            textAlign="center"
          >
            {'Add text in the left panel\nto see vectors appear here'}
          </Text>
        )}
      </Canvas>
    </div>
  );
}
