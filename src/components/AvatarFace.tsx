import React from 'react';

interface AvatarFaceProps {
  effort: number; // 0 to 1
}

export function AvatarFace({ effort }: AvatarFaceProps) {
  // Simplest shapes using react-three-fiber primitives
  return (
    <group position={[0, 0.18, 0.12]}>
      {/* Eyes */}
      <mesh position={[-0.035, 0.02, 0]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0.035, 0.02, 0]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Mouth */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[0.04, 0.005 + effort * 0.02, 0.005]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
}
