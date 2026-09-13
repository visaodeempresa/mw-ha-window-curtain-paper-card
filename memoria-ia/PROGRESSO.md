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
| 9 | Auditoria do `inspetor-de-design` | ⬜ |
| 10 | Implantação no HA (`.js` **e** `.js.gz`) + recurso Lovelace | ⬜ |
| 11 | Vitrine `/mw-components` (aba nova) | ⬜ |
| 12 | Harness: knowledge, ADR, skill, CHANGELOG, memória | ⬜ |
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

- **Nada foi para o HA ainda** — o card não está no `lovelace/resources`.
- A auditoria do `inspetor-de-design` ainda não rodou.
