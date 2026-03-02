# To do list

## Resolvidos

- [x] BUG: Não carrega a configuração de EQ ao abrir a aplicação, precisa clicar no menu do EQ, quando ele abre é aplicado e então funciona.
  - **Resolução**: O EQ agora é inicializado automaticamente via hook `useAudioEngine` assim que o componente é montado. Os filtros são criados uma única vez e aplicados imediatamente.

- [x] BUG: Faixa fica travando indo e voltando alguns segundos quando a configuração de EQ muda, não é estável o real-time
  - **Resolução**: Eliminado o "buffer mode" que causava os travamentos. Agora usa exclusivamente `<audio>` + `MediaElementAudioSourceNode` com Blob URL. As mudanças de EQ atualizam apenas os valores dos filtros existentes (sem recriar o grafo de áudio) usando `setValueAtTime`.

- [x] BUG: Áudio não pode mais ser pausado
  - **Resolução**: Era causado pelo "buffer mode" que usa `AudioBufferSourceNode` (one-shot). Agora usa o elemento `<audio>` nativo que suporta pause/play corretamente.

- [x] BUG: Parar, não para
  - **Resolução**: Corrigido ao usar o elemento `<audio>` nativo. `stopTrack()` agora chama `audio.pause()` e `audio.currentTime = 0`.

- [x] BUG: Trocar de música, não substitui a primeira faixa que tocar com EQ
  - **Resolução**: Corrigido ao eliminar as flags `eqBufferModeRef`/`useBufferModeRef` que mantinham estados conflitantes. A troca de faixa agora gerencia corretamente o blob URL e o estado do player.

- [x] BUG: Mutar, não muta
  - **Resolução**: O mute agora é sincronizado entre o store (persistido) e o elemento `<audio>` via efeitos no hook `useAudioEngine`.

## Persistência implementada

Todos os seguintes estados agora são salvos automaticamente em `localStorage` (chave `audio-player-settings`):

- [x] **Volume** - Último volume definido
- [x] **Mute** - Estado de mudo
- [x] **Repeat Mode** - Modo de repetição
- [x] **View** - Visualização da listagem (list/grid)
- [x] **Controls Hidden** - Estado de colapso dos controles
- [x] **EQ Bands** - Configuração completa do equalizador (5 bandas)
- [x] **Last Opened Folder** - Última pasta aberta

## Arquitetura nova

- [x] Store Zustand com persist middleware (`src/stores/player.tsx`)
- [x] Hook `useAudioEngine` para Web Audio API (`src/hooks/use-audio-engine.ts`)
- [x] Componente separado `EqModal` (`src/components/player/eq-modal.tsx`)
- [x] Playback via Blob URL (evita CORS com `MediaElementAudioSourceNode`)
- [x] Um único fluxo de áudio: `<audio>` -> `MediaElementSource` -> filtros EQ -> destination
