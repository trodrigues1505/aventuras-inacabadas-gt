// ============================================================
// StarField — fundo de estrelas animadas para o mapa estelar
// ============================================================

import { useMemo } from 'react'

interface Star {
  x: number
  y: number
  r: number
  opacity: number
  duration: number
  delay: number
}

interface StarFieldProps {
  width: number
  height: number
  count?: number
}

export function StarField({ width, height, count = 200 }: StarFieldProps) {
  const stars = useMemo<Star[]>(() => {
    // Seed determinística para não re-renderizar em todo frame
    const rng = (seed: number) => {
      let s = seed
      return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff
        return (s >>> 0) / 0xffffffff
      }
    }
    const rand = rng(42)

    return Array.from({ length: count }, () => ({
      x: rand() * width,
      y: rand() * height,
      r: rand() * 1.2 + 0.3,
      opacity: rand() * 0.6 + 0.2,
      duration: rand() * 4 + 2,
      delay: rand() * 5,
    }))
  }, [width, height, count])

  return (
    <g className="star-field">
      {stars.map((star, i) => (
        <circle
          key={i}
          cx={star.x}
          cy={star.y}
          r={star.r}
          fill="white"
          opacity={star.opacity}
        >
          <animate
            attributeName="opacity"
            values={`${star.opacity};${star.opacity * 0.3};${star.opacity}`}
            dur={`${star.duration}s`}
            begin={`${star.delay}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </g>
  )
}
