// ============================================================
// ColonizeModal — fluxo de colonização de planeta
// Etapas: lore → nome → confirmar → animação de sucesso
// ============================================================

import { useState, useRef, useEffect } from 'react'
import type { WorldWithStatus } from '../../types/galaxy'

type Step = 'lore' | 'name' | 'confirm' | 'success'

interface ColonizeModalProps {
  world: WorldWithStatus
  onClose: () => void
  onColonize: (worldId: string, customName: string) => Promise<void>
}

export function ColonizeModal({ world, onClose, onColonize }: ColonizeModalProps) {
  const [step, setStep] = useState<Step>(
    world.status === 'colonized' ? 'confirm' : 'lore'
  )
  const [customName, setCustomName] = useState(world.playerWorld?.custom_name ?? '')
  const [inputError, setInputError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus automático no input quando chega na etapa "name"
  useEffect(() => {
    if (step === 'name' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [step])

  // Fechar com ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleColonize = async () => {
    const trimmed = customName.trim()

    // Validações do lado do cliente
    if (!trimmed) {
      setInputError('O nome não pode ser vazio.')
      return
    }
    if (trimmed.length < 2) {
      setInputError('Mínimo de 2 caracteres.')
      return
    }
    if (trimmed.length > 40) {
      setInputError('Máximo de 40 caracteres.')
      return
    }

    setInputError('')
    setIsSubmitting(true)

    try {
      await onColonize(world.id, trimmed)
      setStep('success')
    } catch (err) {
      setInputError(err instanceof Error ? err.message : 'Erro ao colonizar planeta.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const BIOME_ICONS: Record<string, string> = {
    florestal: '🌿',
    oceanico: '🌊',
    desertico: '🏜️',
    gelado: '❄️',
    baldio: '🌑',
    cristalino: '💎',
    metalico: '⚙️',
    nebuloso: '🌫️',
    vulcanico: '🌋',
    organico: '🧬',
    solar: '☀️',
    subterraneo: '🪨',
    fortaleza: '🏔️',
    temporal: '⏳',
    anomalia: '🌀',
    gasoso: '🌪️',
    escuro: '🌑',
    dual: '♾️',
    imperial: '⚜️',
    nucleo: '🔮',
  }

  const biomeIcon = BIOME_ICONS[world.biome] ?? '🪐'

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(3, 6, 16, 0.88)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0d1b2a 0%, #0a1628 50%, #0d1422 100%)',
          border: '1px solid #1e3a5f',
          boxShadow: `0 0 60px ${world.color_glow}22, 0 25px 50px rgba(0,0,0,0.7)`,
        }}
      >
        {/* Faixa de cor do planeta no topo */}
        <div
          className="h-1 w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${world.color_primary}, transparent)`,
          }}
        />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Ícone do planeta */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
              style={{
                background: `${world.color_primary}20`,
                border: `1px solid ${world.color_primary}40`,
                boxShadow: `0 0 12px ${world.color_glow}30`,
              }}
            >
              {biomeIcon}
            </div>
            <div>
              <div
                className="text-xs font-medium tracking-widest uppercase mb-0.5"
                style={{ color: world.color_primary, opacity: 0.8 }}
              >
                {world.region.replace(/-/g, ' ')} · {world.biome}
              </div>
              <h2
                className="text-xl font-semibold tracking-tight"
                style={{ color: '#e2e8f0', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {world.status === 'colonized'
                  ? world.playerWorld?.custom_name ?? world.name
                  : world.name}
              </h2>
            </div>
          </div>

          {/* Botão fechar */}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
            style={{ color: '#4a6fa5', background: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e3a5f'
              e.currentTarget.style.color = '#94a3b8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#4a6fa5'
            }}
          >
            ✕
          </button>
        </div>

        {/* Divisor */}
        <div style={{ height: '1px', background: '#1e3a5f', margin: '0 24px' }} />

        {/* ── Etapa: LORE ────────────────────────────────────── */}
        {step === 'lore' && (
          <div className="px-6 py-5">
            <p
              className="text-sm leading-relaxed mb-4"
              style={{ color: '#94a3b8', fontFamily: "'Inter', sans-serif" }}
            >
              {world.lore_full}
            </p>

            {/* Traço mecânico */}
            <div
              className="rounded-xl p-4 mb-5"
              style={{
                background: `${world.color_primary}0d`,
                border: `1px solid ${world.color_primary}25`,
              }}
            >
              <div
                className="text-xs font-medium uppercase tracking-widest mb-1.5"
                style={{ color: world.color_primary, opacity: 0.7 }}
              >
                Traço do planeta
              </div>
              <p
                className="text-sm font-medium"
                style={{ color: '#e2e8f0' }}
              >
                {world.trait_desc}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: '#64748b' }}
              >
                Ideal para: {world.ideal_category}
              </p>
            </div>

            <button
              onClick={() => setStep('name')}
              className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-all"
              style={{
                background: `linear-gradient(135deg, ${world.color_primary}dd, ${world.color_primary}99)`,
                color: '#050810',
                boxShadow: `0 0 20px ${world.color_glow}40`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 0 30px ${world.color_glow}60`
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `0 0 20px ${world.color_glow}40`
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Colonizar este planeta →
            </button>
          </div>
        )}

        {/* ── Etapa: NOME ────────────────────────────────────── */}
        {step === 'name' && (
          <div className="px-6 py-5">
            <p
              className="text-sm mb-5"
              style={{ color: '#64748b', fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}
            >
              Você está prestes a tornar este planeta parte da sua galáxia.
              Ele manterá sua identidade e mecânica — mas o nome será seu.
            </p>

            <label
              htmlFor="planet-name"
              className="block text-xs font-medium tracking-widest uppercase mb-2"
              style={{ color: '#4a6fa5' }}
            >
              Nome do planeta
            </label>

            <input
              ref={inputRef}
              id="planet-name"
              type="text"
              value={customName}
              onChange={(e) => {
                setCustomName(e.target.value)
                if (inputError) setInputError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customName.trim()) {
                  setStep('confirm')
                }
              }}
              placeholder={world.name}
              maxLength={40}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: '#0a1628',
                border: inputError ? '1px solid #ef4444' : '1px solid #1e3a5f',
                color: '#e2e8f0',
                fontFamily: "'Space Grotesk', sans-serif",
                boxShadow: inputError ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none',
              }}
              onFocus={(e) => {
                if (!inputError) {
                  e.currentTarget.style.border = `1px solid ${world.color_primary}60`
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${world.color_primary}15`
                }
              }}
              onBlur={(e) => {
                if (!inputError) {
                  e.currentTarget.style.border = '1px solid #1e3a5f'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            />

            {/* Contador e erro */}
            <div className="flex items-center justify-between mt-1.5">
              {inputError ? (
                <p className="text-xs" style={{ color: '#ef4444' }}>{inputError}</p>
              ) : (
                <span />
              )}
              <p className="text-xs" style={{ color: '#2a3a55' }}>
                {customName.length}/40
              </p>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setStep('lore')}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: '#0a1628',
                  border: '1px solid #1e3a5f',
                  color: '#4a6fa5',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1e2d47'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#0a1628'
                }}
              >
                ← Voltar
              </button>

              <button
                onClick={() => customName.trim() && setStep('confirm')}
                disabled={!customName.trim()}
                className="flex-[2] py-3 rounded-xl text-sm font-semibold tracking-wide transition-all"
                style={{
                  background: customName.trim()
                    ? `linear-gradient(135deg, ${world.color_primary}dd, ${world.color_primary}99)`
                    : '#1a2740',
                  color: customName.trim() ? '#050810' : '#2a3a55',
                  cursor: customName.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Confirmar nome →
              </button>
            </div>
          </div>
        )}

        {/* ── Etapa: CONFIRMAR ───────────────────────────────── */}
        {step === 'confirm' && world.status !== 'colonized' && (
          <div className="px-6 py-5">
            <div
              className="rounded-xl p-5 mb-5 text-center"
              style={{
                background: `${world.color_primary}0a`,
                border: `1px solid ${world.color_primary}30`,
              }}
            >
              <div
                className="text-3xl mb-2"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: world.color_primary,
                  fontWeight: 700,
                  textShadow: `0 0 20px ${world.color_glow}60`,
                }}
              >
                {customName.trim()}
              </div>
              <div className="text-xs" style={{ color: '#4a6fa5' }}>
                {world.name} — {world.biome} · {world.region.replace(/-/g, ' ')}
              </div>
            </div>

            <p
              className="text-sm text-center mb-5"
              style={{ color: '#64748b', lineHeight: 1.6 }}
            >
              Este nome é permanente. Ele identificará este planeta
              no seu mapa para sempre.
            </p>

            {inputError && (
              <p
                className="text-sm text-center mb-4 py-2 px-4 rounded-lg"
                style={{
                  color: '#ef4444',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                {inputError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('name')}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: '#0a1628',
                  border: '1px solid #1e3a5f',
                  color: '#4a6fa5',
                }}
                onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.background = '#1e2d47')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#0a1628')}
              >
                ← Editar
              </button>

              <button
                onClick={handleColonize}
                disabled={isSubmitting}
                className="flex-[2] py-3 rounded-xl text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-2"
                style={{
                  background: isSubmitting
                    ? '#1a2740'
                    : `linear-gradient(135deg, ${world.color_primary}dd, ${world.color_primary}99)`,
                  color: isSubmitting ? '#2a3a55' : '#050810',
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  boxShadow: isSubmitting ? 'none' : `0 0 20px ${world.color_glow}40`,
                }}
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="inline-block w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: '#2a3a55', borderTopColor: 'transparent' }}
                    />
                    Colonizando...
                  </>
                ) : (
                  '🚀 Colonizar'
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Estado: JÁ COLONIZADO ──────────────────────────── */}
        {world.status === 'colonized' && step !== 'success' && (
          <div className="px-6 py-5">
            <div
              className="rounded-xl p-4 mb-5"
              style={{
                background: `${world.color_primary}0d`,
                border: `1px solid ${world.color_primary}25`,
              }}
            >
              <p
                className="text-sm leading-relaxed"
                style={{ color: '#94a3b8' }}
              >
                {world.lore_full}
              </p>
            </div>

            {/* Stats de colonização */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Missões', value: world.playerWorld?.missions_total ?? 0 },
                { label: 'Concluídas', value: world.playerWorld?.missions_won ?? 0 },
                {
                  label: 'Explorado',
                  value: `${Math.round(world.playerWorld?.explored_pct ?? 0)}%`,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl p-3 text-center"
                  style={{
                    background: '#0a1628',
                    border: '1px solid #1e3a5f',
                  }}
                >
                  <div
                    className="text-lg font-bold"
                    style={{
                      color: world.color_primary,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#4a6fa5' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Traço mecânico */}
            <div
              className="rounded-xl p-4 mb-5"
              style={{
                background: `${world.color_primary}0d`,
                border: `1px solid ${world.color_primary}25`,
              }}
            >
              <div
                className="text-xs font-medium uppercase tracking-widest mb-1"
                style={{ color: world.color_primary, opacity: 0.7 }}
              >
                Traço ativo
              </div>
              <p className="text-sm" style={{ color: '#e2e8f0' }}>
                {world.trait_desc}
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: '#0a1628',
                border: '1px solid #1e3a5f',
                color: '#94a3b8',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1e2d47')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#0a1628')}
            >
              Fechar
            </button>
          </div>
        )}

        {/* ── Etapa: SUCESSO ─────────────────────────────────── */}
        {step === 'success' && (
          <div className="px-6 py-8 text-center">
            <div
              className="text-5xl mb-4"
              style={{ animation: 'colonize-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              🚀
            </div>
            <h3
              className="text-2xl font-bold mb-2"
              style={{
                color: world.color_primary,
                fontFamily: "'Space Grotesk', sans-serif",
                textShadow: `0 0 30px ${world.color_glow}60`,
              }}
            >
              {customName.trim()}
            </h3>
            <p
              className="text-sm mb-2"
              style={{ color: '#94a3b8' }}
            >
              colonizado com sucesso
            </p>
            <p
              className="text-xs mb-8"
              style={{ color: '#4a6fa5' }}
            >
              Traço ativo: {world.trait_desc}
            </p>

            <button
              onClick={onClose}
              className="px-8 py-3 rounded-xl text-sm font-semibold tracking-wide"
              style={{
                background: `linear-gradient(135deg, ${world.color_primary}dd, ${world.color_primary}99)`,
                color: '#050810',
                boxShadow: `0 0 25px ${world.color_glow}50`,
              }}
            >
              Ver no mapa
            </button>
          </div>
        )}

        {/* Animação CSS inline para o foguete */}
        <style>{`
          @keyframes colonize-pop {
            from { transform: scale(0.5); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  )
}
