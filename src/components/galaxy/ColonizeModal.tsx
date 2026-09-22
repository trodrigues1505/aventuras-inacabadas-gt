import { useState, useRef, useEffect } from 'react'
import type { WorldWithStatus } from '../../types/galaxy'

type Step = 'lore' | 'title' | 'confirm' | 'success'

interface ColonizeModalProps {
  world: WorldWithStatus
  onClose: () => void
  onColonize: (worldId: string, title: string) => Promise<void>
}

export function ColonizeModal({ world, onClose, onColonize }: ColonizeModalProps) {
  const [step, setStep] = useState<Step>(
    world.status === 'colonized' ? 'confirm' : 'lore'
  )
  const [title, setTitle] = useState(world.playerWorld?.title ?? '')
  const [inputError, setInputError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'title' && inputRef.current) inputRef.current.focus()
  }, [step])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleExplore = async () => {
    const trimmed = title.trim()
    if (!trimmed) { setInputError('O título não pode ser vazio.'); return }
    if (trimmed.length < 2) { setInputError('Mínimo de 2 caracteres.'); return }
    if (trimmed.length > 40) { setInputError('Máximo de 40 caracteres.'); return }

    setInputError('')
    setIsSubmitting(true)
    try {
      await onColonize(world.id, trimmed)
      setStep('success')
    } catch (err) {
      setInputError(err instanceof Error ? err.message : 'Erro ao explorar planeta.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const BIOME_ICONS: Record<string, string> = {
    florestal: '🌿', oceanico: '🌊', desertico: '🏜️', gelado: '❄️',
    baldio: '🌑', cristalino: '💎', metalico: '⚙️', nebuloso: '🌫️',
    vulcanico: '🌋', organico: '🧬', solar: '☀️', subterraneo: '🪨',
    fortaleza: '🏔️', temporal: '⏳', anomalia: '🌀', gasoso: '🌪️',
    escuro: '🌑', dual: '♾️', imperial: '⚜️', nucleo: '🔮',
  }
  const biomeIcon = BIOME_ICONS[world.biome] ?? '🪐'

  // Estilos base
  const bg = 'rgba(10,16,32,0.97)'
  const border = '1px solid rgba(255,255,255,0.08)'
  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: inputError ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0',
    fontFamily: "'Space Grotesk',sans-serif",
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    width: '100%',
    outline: 'none',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(3,6,16,0.85)', backdropFilter: 'blur(10px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl"
        style={{ background: bg, border, boxShadow: `0 0 60px ${world.color_glow}22, 0 25px 50px rgba(0,0,0,0.7)` }}>

        {/* Faixa de cor */}
        <div className="h-0.5 w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${world.color_primary}, transparent)` }}/>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
              style={{ background: `${world.color_primary}20`, border: `1px solid ${world.color_primary}40` }}>
              {biomeIcon}
            </div>
            <div>
              <div className="mb-0.5 text-xs font-medium uppercase tracking-widest"
                style={{ color: world.color_primary, opacity: 0.8 }}>
                {world.region.replace(/-/g, ' ')} · {world.biome}
              </div>
              <h2 className="text-xl font-semibold text-white"
                style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                {world.name}
              </h2>
            </div>
          </div>
          <button onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm transition-colors"
            style={{ color: '#4a6fa5', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >✕</button>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 24px' }}/>

        {/* ── Etapa: LORE ── */}
        {step === 'lore' && (
          <div className="px-6 py-5">
            <p className="mb-4 text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
              {world.lore_full}
            </p>
            <div className="mb-5 rounded-xl p-4"
              style={{ background: `${world.color_primary}0d`, border: `1px solid ${world.color_primary}25` }}>
              <div className="mb-1.5 text-xs font-medium uppercase tracking-widest"
                style={{ color: world.color_primary, opacity: 0.7 }}>Traço do planeta</div>
              <p className="text-sm font-medium text-white">{world.trait_desc}</p>
              <p className="mt-1 text-xs" style={{ color: '#64748b' }}>Ideal: {world.ideal_category}</p>
            </div>
            <button onClick={() => setStep('title')}
              className="w-full rounded-xl py-3 text-sm font-semibold tracking-wide transition-all"
              style={{ background: `linear-gradient(135deg, ${world.color_primary}dd, ${world.color_primary}99)`, color: '#050810', boxShadow: `0 0 20px ${world.color_glow}40` }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = '' }}
            >
              Explorar este planeta →
            </button>
          </div>
        )}

        {/* ── Etapa: TÍTULO ── */}
        {step === 'title' && (
          <div className="px-6 py-5">
            <p className="mb-5 text-sm leading-relaxed" style={{ color: '#64748b' }}>
              <strong className="text-white">{world.name}</strong> será adicionado ao seu mapa.
              Defina um título que identifique como você vai usar este planeta — a área da sua vida que ele representa.
            </p>

            <p className="mb-2 text-xs font-medium uppercase tracking-widest" style={{ color: '#4a6fa5' }}>
              Título / Categoria
            </p>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); if (inputError) setInputError('') }}
              onKeyDown={e => { if (e.key === 'Enter' && title.trim()) setStep('confirm') }}
              placeholder="Ex: Escola, Trabalho, Saúde..."
              maxLength={40}
              style={inputStyle}
              onFocus={e => { if (!inputError) e.currentTarget.style.border = `1px solid ${world.color_primary}60` }}
              onBlur={e => { if (!inputError) e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)' }}
            />
            <div className="mt-1.5 flex items-center justify-between">
              {inputError
                ? <p className="text-xs text-red-400">{inputError}</p>
                : <span/>
              }
              <p className="text-xs" style={{ color: '#2a3a55' }}>{title.length}/40</p>
            </div>

            <p className="mt-2 text-xs" style={{ color: '#4a6fa5' }}>
              O planeta mantém o nome <strong style={{ color: '#6b8ab5' }}>{world.name}</strong>. O título é apenas como você o identifica.
            </p>

            <div className="mt-5 flex gap-3">
              <button onClick={() => setStep('lore')}
                className="flex-1 rounded-xl py-3 text-sm font-medium transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', color: '#4a6fa5' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              >← Voltar</button>
              <button
                onClick={() => title.trim() && setStep('confirm')}
                disabled={!title.trim()}
                className="flex-[2] rounded-xl py-3 text-sm font-semibold tracking-wide transition-all"
                style={{
                  background: title.trim() ? `linear-gradient(135deg, ${world.color_primary}dd, ${world.color_primary}99)` : 'rgba(255,255,255,0.05)',
                  color: title.trim() ? '#050810' : '#2a3a55',
                  cursor: title.trim() ? 'pointer' : 'not-allowed',
                }}
              >Confirmar título →</button>
            </div>
          </div>
        )}

        {/* ── Etapa: CONFIRMAR ── */}
        {step === 'confirm' && world.status !== 'colonized' && (
          <div className="px-6 py-5">
            <div className="mb-5 rounded-xl p-5 text-center"
              style={{ background: `${world.color_primary}0a`, border: `1px solid ${world.color_primary}30` }}>
              <div className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#4a6fa5' }}>
                {world.name}
              </div>
              <div className="text-2xl font-bold" style={{ color: world.color_primary, fontFamily: "'Space Grotesk',sans-serif", textShadow: `0 0 20px ${world.color_glow}60` }}>
                {title.trim()}
              </div>
              <div className="text-xs mt-1" style={{ color: '#4a6fa5' }}>
                {world.biome} · {world.region.replace(/-/g, ' ')}
              </div>
            </div>

            <p className="mb-5 text-center text-sm" style={{ color: '#64748b' }}>
              O planeta <strong className="text-white">{world.name}</strong> será explorado com o título <strong style={{ color: world.color_primary }}>{title.trim()}</strong>.
            </p>

            {inputError && (
              <p className="mb-4 rounded-lg px-4 py-2 text-center text-sm text-red-400"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {inputError}
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('title')} disabled={isSubmitting}
                className="flex-1 rounded-xl py-3 text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#4a6fa5' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              >← Editar</button>
              <button onClick={handleExplore} disabled={isSubmitting}
                className="flex-[2] flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold tracking-wide transition-all"
                style={{
                  background: isSubmitting ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${world.color_primary}dd, ${world.color_primary}99)`,
                  color: isSubmitting ? '#2a3a55' : '#050810',
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  boxShadow: isSubmitting ? 'none' : `0 0 20px ${world.color_glow}40`,
                }}
              >
                {isSubmitting ? (
                  <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: '#2a3a55', borderTopColor: 'transparent' }}/> Explorando...</>
                ) : '🚀 Explorar planeta'}
              </button>
            </div>
          </div>
        )}

        {/* ── Etapa: SUCESSO ── */}
        {step === 'success' && (
          <div className="px-6 py-8 text-center">
            <div className="mb-4 text-5xl" style={{ animation: 'pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              🚀
            </div>
            <h3 className="mb-1 text-xl font-bold" style={{ color: world.color_primary, fontFamily: "'Space Grotesk',sans-serif", textShadow: `0 0 30px ${world.color_glow}60` }}>
              {world.name}
            </h3>
            <p className="mb-1 text-sm font-medium" style={{ color: '#e2e8f0' }}>{title.trim()}</p>
            <p className="mb-2 text-sm" style={{ color: '#64748b' }}>explorado com sucesso</p>
            <p className="mb-8 text-xs" style={{ color: '#4a6fa5' }}>Traço ativo: {world.trait_desc}</p>
            <button onClick={onClose}
              className="px-8 py-3 rounded-xl text-sm font-semibold tracking-wide"
              style={{ background: `linear-gradient(135deg, ${world.color_primary}dd, ${world.color_primary}99)`, color: '#050810', boxShadow: `0 0 25px ${world.color_glow}50` }}
            >Ver no mapa</button>
          </div>
        )}

        {/* ── Já explorado ── */}
        {world.status === 'colonized' && step !== 'success' && (
          <div className="px-6 py-5">
            <div className="mb-4 rounded-xl p-4" style={{ background: `${world.color_primary}0d`, border: `1px solid ${world.color_primary}25` }}>
              <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{world.lore_full}</p>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-3">
              {[
                { label: 'Missões', value: world.playerWorld?.missions_total ?? 0 },
                { label: 'Concluídas', value: world.playerWorld?.missions_won ?? 0 },
                { label: 'Explorado', value: `${Math.round(world.playerWorld?.explored_pct ?? 0)}%` },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-lg font-bold" style={{ color: world.color_primary, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</div>
                  <div className="mt-0.5 text-xs" style={{ color: '#4a6fa5' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="mb-5 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="mb-1 text-xs font-medium uppercase tracking-widest" style={{ color: world.color_primary, opacity: 0.7 }}>Traço ativo</div>
              <p className="text-sm text-white">{world.trait_desc}</p>
            </div>
            <button onClick={onClose}
              className="w-full rounded-xl py-3 text-sm font-medium"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            >Fechar</button>
          </div>
        )}

        <style>{`@keyframes pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
      </div>
    </div>
  )
}
