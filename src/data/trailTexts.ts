// ============================================================
// FASE 6 — textos dos nós da trilha (templates)
//
// Um dilema curto por (abordagem × bioma), 2 variantes cada.
// A chave do bioma é o slug do planeta fixo (worlds.slug).
// IA para gerar mais texto fica para o Modo Veterano (GDD).
// ============================================================

import type { ApproachKey } from '../types/challenges'

export type BiomeSlug = 'varda' | 'thalassa' | 'zerion' | 'kestrel' | 'nyx'

type Table = Record<ApproachKey, Record<BiomeSlug, [string, string]>>

export const NODE_TEXT: Table = {
  combate: {
    varda: [
      'Uma barreira de raízes vivas fecha a trilha e reage a cada golpe. Abrir passagem à força vai custar caro.',
      'Algo grande investe contra a equipe entre os troncos. Não há por onde recuar sem lutar.',
    ],
    thalassa: [
      'Uma criatura de casco duro bate contra o submersível. Alguém precisa afastá-la agora.',
      'O cardume fecha a passagem em massa. Só um golpe firme abre caminho entre as correntes.',
    ],
    zerion: [
      'Um predador emerge da duna a dez metros da equipe. A areia não deixa ninguém correr.',
      'Corpos de rocha e garras bloqueiam a passagem do cânion. É força contra força.',
    ],
    kestrel: [
      'Uma fera branca se solta do gelo e avança sobre o acampamento. O vento apaga qualquer plano sutil.',
      'A parede de gelo está viva e se fecha. É preciso quebrá-la antes que endureça de vez.',
    ],
    nyx: [
      'Uma sentinela antiga desperta e trava o corredor das ruínas. Ela não reconhece bandeira nenhuma.',
      'Fragmentos de armamento reativam ao redor da equipe. É destruir ou ser destruído.',
    ],
  },
  captura: {
    varda: [
      'Uma criatura veloz se esconde nas copas e derruba a rede de sensores. Prendê-la sem feri-la é o desafio.',
      'Um bicho pequeno e esperto fugiu com uma peça do posto. Cercá-lo entre as raízes exige coordenação.',
    ],
    thalassa: [
      'Uma forma ágil nada em círculos ao redor das turbinas. É preciso isolá-la antes que fuja para a fossa.',
      'Uma rede submersa precisa fechar sobre algo que se move mais rápido que os sensores.',
    ],
    zerion: [
      'Um réptil salta entre as dunas e some. Encurralá-lo sem perder o terreno firme.',
      'Uma criatura pequena se enterra a cada aproximação. Prever o próximo movimento é a única saída.',
    ],
    kestrel: [
      'Um animal camuflado corre pela crosta de gelo. Um passo errado e ele desaparece na neve.',
      'Uma criatura entorpecida pelo frio pode ser levada viva, se a equipe agir antes do degelo.',
    ],
    nyx: [
      'Uma forma sem contorno se desloca entre paredes que mudam. Capturá-la exige antecipar o próximo passo.',
      'Um drone abandonado foge dos sinais da equipe. Trazê-lo inteiro vale mais do que destruí-lo.',
    ],
  },
  furtividade: {
    varda: [
      'Um bando patrulha a clareira. Há passagem pelo sub-bosque, se ninguém pisar em folha seca.',
      'O ninho fica entre duas sentinelas. Passar sem ser notado é a única opção.',
    ],
    thalassa: [
      'Sensores de pressão vigiam o canal. Deslizar entre as varreduras exige um ritmo perfeito.',
      'Uma sombra enorme cruza acima. A equipe precisa ficar imóvel e só então avançar no escuro.',
    ],
    zerion: [
      'A tempestade de areia cobre o som, mas não o brilho. Cruzar o posto de vigia sem acender nada.',
      'Um predador noturno rastreia calor. Cada tripulante precisa esfriar o próprio rastro.',
    ],
    kestrel: [
      'O gelo estala sob qualquer peso. Há uma rota de neve macia junto à vigia, mas ela é estreita.',
      'Um caçador branco aguarda imóvel. A equipe precisa contorná-lo sem mudar o vento.',
    ],
    nyx: [
      'A zona de sombra apaga os sensores, e a equipe some até para si mesma. Atravessar sem perder o rumo.',
      'Algo ouve o que ninguém diz em voz alta. É preciso passar em silêncio total.',
    ],
  },
  exploracao: {
    varda: [
      'A trilha se bifurca em três e nenhuma consta no mapa. Escolher com o que dá para ver e ouvir.',
      'Marcas de patas levam à caverna do ecossistema interno. Seguir o rastro sem perder a saída.',
    ],
    thalassa: [
      'Boias mudas apontam direções opostas. Ler a corrente para achar a origem da anomalia.',
      'Uma estrutura afundada aparece no sonar e some. Voltar e mapear antes que a maré mude.',
    ],
    zerion: [
      'Uma ruína soterrada apareceu depois da tempestade. Mapear o que a areia deixou à mostra.',
      'As dunas mudaram de lugar durante a noite. Achar o marco certo antes do calor do meio-dia.',
    ],
    kestrel: [
      'Uma fissura nova corta a planície. Descobrir onde ela termina antes que se abra mais.',
      'A aurora bagunça as bússolas. Navegar pelas estrelas e pelas marcas no gelo.',
    ],
    nyx: [
      'Cada corredor da ruína termina num lugar diferente de onde começou. Registrar o padrão antes de se perder.',
      'Um sinal em loop marca o caminho, mas muda a cada volta. Segui-lo sem cair no ciclo.',
    ],
  },
  pesquisa: {
    varda: [
      'Amostras do micélio mostram um padrão que nenhum catálogo reconhece. Decifrar antes que se espalhe.',
      'Os sensores registram um ciclo no comportamento do enxame. Achar a regra por trás dele.',
    ],
    thalassa: [
      'A água tem uma assinatura química nova. Analisar a origem antes que os filtros cedam.',
      'O padrão de pulsos vindo do fundo parece uma linguagem. Decodificar o bastante para responder.',
    ],
    zerion: [
      'A fonte tem uma composição impossível para o deserto. Descobrir quem a construiu e por quê.',
      'Marcas na rocha repetem uma sequência. Catalogar e traduzir antes que o vento apague.',
    ],
    kestrel: [
      'O bloco de gelo guarda algo de metabolismo lento. Diagnosticar o que é sem acordá-lo.',
      'Os aquecedores falham em ondas. Encontrar a causa nos registros de temperatura.',
    ],
    nyx: [
      'A frequência repete três tons e mais nada. Decifrar o que o sinal quer dizer.',
      'A IA só responde a comandos que ninguém deu. Rastrear de onde vem a instrução.',
    ],
  },
  negociacao: {
    varda: [
      'Os primatas erguem barricadas e fazem gestos que ninguém entende. Ganhar confiança antes que haja conflito.',
      'O líder do bando observa a equipe. Um gesto certo pode abrir a trilha sem um tiro.',
    ],
    thalassa: [
      'A criatura das profundezas devolve o sonar como pergunta. Responder de um jeito que ela entenda.',
      'Uma plataforma vizinha cobra passagem pelo canal. Fechar um acordo sem entregar demais.',
    ],
    zerion: [
      'O dono do oásis aparece, e não é quem se esperava. Convencer sem revelar o que a equipe sabe.',
      'Nômades pedem suprimentos pela rota. Um acordo justo, ou um caminho bem mais longo.',
    ],
    kestrel: [
      'Um sobrevivente da estrutura de gelo aceita conversar, mas desconfia. Ganhar tempo com palavras.',
      'Os operadores do posto vizinho discordam entre si. Alinhar todos antes do degelo.',
    ],
    nyx: [
      'A entidade repete frases que a equipe ainda não disse. Dialogar sem dar a ela o que ela quer.',
      'A IA aceita negociar, se a equipe provar que ainda é confiável. Convencê-la.',
    ],
  },
}

export function isBiomeSlug(slug: string | null | undefined): slug is BiomeSlug {
  return slug === 'varda' || slug === 'thalassa' || slug === 'zerion' || slug === 'kestrel' || slug === 'nyx'
}
