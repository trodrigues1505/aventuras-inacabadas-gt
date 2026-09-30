import { CREW } from '../data/crew'

/**
 * Onde fica o rosto em cada retrato (400×600), em fração da imagem.
 * O círculo é pequeno; sem isto o `object-cover` centralizado mostra o
 * tronco e corta o rosto. Se trocar um retrato, ajuste só esta tabela.
 */
const FACE: Record<string, { x: number; y: number }> = {
  dani: { x: 0.48, y: 0.19 },
  aadan: { x: 0.53, y: 0.18 },
  connor: { x: 0.47, y: 0.23 },
  kira: { x: 0.5, y: 0.19 },
  blanche: { x: 0.55, y: 0.19 },
  iakop: { x: 0.57, y: 0.15 },
}

/** Quanto a imagem é ampliada em relação ao círculo (130% = cabeça inteira, com folga). */
const ZOOM = 1.3

export function CrewAvatar({
  id,
  className = 'size-11',
  tone = 'bg-raised text-muted',
}: {
  id: string
  /** Tamanho do círculo (classes Tailwind). */
  className?: string
  /** Cor de fundo/iniciais enquanto a imagem não carrega. */
  tone?: string
}) {
  const face = FACE[id] ?? { x: 0.5, y: 0.2 }
  const initials = CREW.find((c) => c.id === id)?.portrait ?? ''
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full text-[12px] font-semibold ${className} ${tone}`}
    >
      {initials}
      <img
        src={`assets/crew/${id}.webp`}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute max-w-none select-none"
        style={{
          width: `${ZOOM * 100}%`,
          // a imagem é 2:3; o rosto vai para o centro do círculo
          left: `${50 - face.x * ZOOM * 100}%`,
          top: `${50 - face.y * ZOOM * 1.5 * 100}%`,
        }}
        onError={(e) => {
          ;(e.target as HTMLImageElement).style.display = 'none'
        }}
      />
    </span>
  )
}
