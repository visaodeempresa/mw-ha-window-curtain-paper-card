---
name: mw-window-curtain-paper-card
description: >
  Mexer no card de janela de PAPEL do Home Assistant
  (custom:mw-window-curtain-paper-card). Use quando o Maycon falar em "janela de
  papel", "o card da janela com botão grande", "a régua da cortina", "não
  consigo acertar o botão no celular", "modo ambiente da janela", "abrir tudo
  da suíte", "o pictograma da janela", "o card de papel está pesado", ou quando
  pedir print novo para o README deste repositório. Para o card com paisagem e
  acessórios na cena, a skill é mw-window-curtain-card; para elemento de planta,
  mw-picture-element.
---

# MW Window / Curtain Paper Card

Arquivo único, sem build: `dist/mw-window-curtain-paper-card.js` é fonte **e**
artefato. JS puro + `<ha-form>`. HACS, categoria Dashboard.

Leia `memoria-ia/CONTEXTO.md` antes de mexer — o mapa e as armadilhas com
sintoma estão lá. `memoria-ia/PROGRESSO.md` diz onde a entrega parou.

## Pré-condições

| Preciso de | Como obter | Se faltar |
|---|---|---|
| Bancada | `preview_start` com `mw-window-curtain-paper-preview` (porta 8793) | sem conferência visual; **dizer isso** (regra 30) |
| HTTP no HA | `curl -s -o /dev/null -w '%{http_code}' http://192.168.1.71:8123/` → `200` | usar a Nabu Casa |
| Entidades reais | `/api/states` com o `.env` de `ha-dashboards/` | não inventar `entity_id` nos exemplos |

## Fluxo

1. **Editar** `dist/mw-window-curtain-paper-card.js`: default em `DEFAULTS`,
   rótulo pt-BR em `LABELS`, campo no `_schemaFor(<aba>)`. **As três, sempre** —
   o probe reprova se faltar uma.
2. `node --check dist/mw-window-curtain-paper-card.js`
3. `node tools/probe.js` — termina em «tudo certo.»
4. `IA/tools/check-embeds.sh` — os 5 blocos embutidos batem com `IA/lib/`.
5. **Olhar**: bancada em `/tools/preview.html`, nos dois temas e nas três
   larguras. Mudou desenho? `bash tools/shot.sh` regenera `docs/exemplos.png`.
6. Auditar com o agente `inspetor-de-design` antes de entregar.
7. Commit assinado (regra 00), branch `feature/**`, PR para `develop`.
   **Merge é do dono.**

## Regras próprias desta linha

- **Nenhum alvo abaixo de 44 px.** Se um pedido implicar alvo menor, o certo é
  recusar o número e elevar — foi para isso que o card nasceu.
- **Nenhuma animação cara.** Relevo é sombra parada.
- **Peça publicada do `mw-paper-control` não muda** (ADR 0010): comportamento
  novo nasce com marcador `v2`.

## Verificação (o que faz a tarefa estar pronta)

```bash
node --check dist/mw-window-curtain-paper-card.js
node tools/probe.js                      # "tudo certo."
IA/tools/check-embeds.sh                 # "todos os blocos ... batem"
git log -1 --pretty='%G? %an'            # G + MAYCON WILLIAN OLIVEIRA
```

Conferência na tela do HA de verdade é do dono. Se não houve, **diga** — não
deixe implícito que houve teste (regra global 30).
