# PROGRESSO — MW Window / Curtain Paper Card

> Estado da entrega, atualizado **antes de cada commit**. Existe para que uma
> sessão nova retome sem o histórico do chat. Se algo aqui contradiz o
> transcript, vale o que está aqui.

**Início:** 12/09/2026 · **Repo:** `PROJECTS/mw-ha-window-curtain-paper-card`

| # | Etapa | Estado |
|---|---|---|
| 1 | Repo + casca HACS | ✅ |
| 2 | `mw-paper-control v1` em `IA/lib/` + `check-embeds.sh` | ✅ |
| 3 | Card: esqueleto, config, `_build`/`_paint`, 5 blocos embutidos | ✅ 1960 linhas |
| 4 | Cena `pictograma` / `paisagem` / `none` | ✅ 37 nós contra 120 |
| 5 | Peças de papel + régua + teclado + haptic | ✅ |
| 6 | `room_mode` + `discoverForArea` | ✅ |
| 7 | Editor: 6 abas, prévia, 3 grades de 50 amostras, montar sozinho | ✅ |
| 8 | Bancada + README + marca | ✅ |
| 9 | Auditoria do `inspetor-de-design` | ⚠️ reprovou com 5 itens · todos consertados e medidos · reauditoria pedida; o agente caiu 2× por limite de sessão, então **reconferi eu mesmo na bancada** e está tudo medido |
| 10 | Implantação no HA (`.js` **e** `.js.gz`) + recurso Lovelace | ✅ shasum bate nos 3 |
| 11 | Vitrine `/mw-components` (aba nova) | ✅ 12 views, 28 cards na aba |
| 12 | Harness: knowledge, ADR, skill, CHANGELOG, memória | ✅ `make check` verde |
| 13 | PR para `develop` | ⬜ |

## Verificação já passando

```
node --check dist/mw-window-curtain-paper-card.js      ok
node tools/probe.js                                    57 provas, "tudo certo."
IA/tools/check-embeds.sh                               5 blocos batem
```

## Já visto na tela (bancada 8793, Chrome do pane)

Nos dois temas e em três larguras de coluna (260 · 340 · 600). Consertados
nesta rodada, todos com sintoma anotado no CONTEXTO: cortina invisível sobre
papel creme (`shade()` não sabia hex), folha de vidro escapando da esquadria
(faltava `clip-path`), a janela virando um selo no meio do card (`height` fixa
na cena), `%` repetido no cabeçalho e na régua, «Fechar t...» cortado,
botão do exaustor dizendo «Ligar» com o exaustor ligado.

## Ainda não verificado

- A auditoria do `inspetor-de-design` **reprovou** em 16/09 com 5 achados
  ⚠️ e 3 💡. Todos consertados e **medidos de novo na bancada**:

| achado | antes | agora |
|---|---|---|
| degrau da régua | 44×42 (o border comia 2 px) | **44×44** |
| anel de foco no papel claro | 2,39:1 | **4,64:1** (halo fixo a .55 — a .38 dava 2,65 e ainda reprovava) |
| sensor de abertura | só por cor, cena `aria-hidden` | `<title>` + estado em palavra no resumo |
| `prefers-reduced-motion` | 0 ocorrências | todas as transições dentro do guarda |
| transição em `width`/`background`/`box-shadow` | 3 casos | só `transform` |
| locale do número | `23.4°` | **`23,4°`** (`Intl`, como no card irmão) |
| `control_style: chapado` | não achatava a peça | `box-shadow:none` na peça e na régua |
| estado acessível sem cabeçalho | nenhum canal de texto | `aria-label` no `.root`, painted a cada estado |
| relógio de 60 s | pintava com a aba escondida | `document.hidden` |
| «sem dado» | `--` | `—` |
- **A conferência na tela do HA de verdade é do dono** — o que está provado
  daqui é que o byte servido é o byte do `dist/` (shasum igual no `.js`, no
  `.js.gz` e no que o HA entrega comprimido), que o recurso está em
  `lovelace/resources` e que o deploy da vitrine gravou 12 views.

## No ar

| onde | o quê |
|---|---|
| `/config/www/community/mw-ha-window-curtain-paper-card/` | `.js` **e** `.js.gz`, shasum `5dbbefe7…` |
| `lovelace/resources` | `…/mw-window-curtain-paper-card.js?v=5dbbefe7` (module) |
| `/mw-components/janelas-papel` | 7 seções, 28 cards, entidades reais da suíte e da sala |

Isto é **deploy de teste por SSH**, não release. O HACS só verá versão nova
depois do merge na `main` — e o merge é do dono.
