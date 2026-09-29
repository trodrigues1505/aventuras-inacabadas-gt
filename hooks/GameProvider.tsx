// src/hooks/GameProvider.tsx
// Fase 4 — este arquivo também não foi recebido nesta conversa.
// Como o GameProvider das Fases 1-3 provavelmente já existe no repo real
// (expondo sessão/auth, player_state, worlds etc.), o bloco abaixo mostra
// SOMENTE a parte de tripulação a ser mesclada nele. Se preferir, use este
// arquivo como está e adicione manualmente o que já existia antes.

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { CrewMember } from '../types/crew';
import { listCrew, triggerSeedIfEmpty } from '../services/crewService';

interface PlayerState {
  user_id: string;
  level: number;
  xp: number;
  currency: number;
  crew_id: string | null;
  suprimentos: number;
  dados: number;
  pulsos: number;
}

interface GameContextValue {
  userId: string;
  playerState: PlayerState | null;
  crew: CrewMember[] | null;
  loadCrew: () => Promise<void>;
  reloadCrew: () => Promise<void>;
  triggerSeedIfEmpty: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string>('');
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [crew, setCrew] = useState<CrewMember[] | null>(null);

  const loadCrew = useCallback(async () => {
    if (!userId) return;
    const result = await triggerSeedIfEmpty(userId);
    setCrew(result);
  }, [userId]);

  const reloadCrew = useCallback(async () => {
    if (!userId) return;
    const result = await listCrew(userId);
    setCrew(result);
  }, [userId]);

  const handleTriggerSeedIfEmpty = useCallback(async () => {
    await loadCrew();
  }, [loadCrew]);

  // Sessão: obtém o usuário atual e busca player_state.
  // (Mantido mínimo aqui — a versão real de Fases 1-3 provavelmente já
  // faz isso de forma mais completa; não duplicar se já existir.)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    supabase
      .from('player_state')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) setPlayerState(data as PlayerState);
      });

    loadCrew();
  }, [userId, loadCrew]);

  const value: GameContextValue = {
    userId,
    playerState,
    crew,
    loadCrew,
    reloadCrew,
    triggerSeedIfEmpty: handleTriggerSeedIfEmpty,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame deve ser usado dentro de um <GameProvider>');
  }
  return ctx;
}
