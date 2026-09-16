# CONTEXTO — MW Window / Curtain Paper Card

O mapa deste repositório. **Leia antes de mexer.** O que está aqui custou uma
sessão para descobrir; redescobrir custa outra.

## 1. O que ele é

`custom:mw-window-curtain-paper-card` — a janela do HA em papel, feita para o
dedo. Arquivo único, sem build: `dist/mw-window-curtain-paper-card.js` é fonte
**e** artefato.

**Não é** um modo do `mw-ha-window-curtain-card`, nem uma subclasse dele:
é componente independente, primeira peça de uma linha própria (ADR 0021). O
dono tem outros planos para essa linha — herdar do irmão prenderia os dois.

## 2. As decisões que não se mexe sem motivo

1. **Montar uma vez, pintar por variável CSS.** `_build()` reescreve o shadow
   DOM; `_paint()` só escreve custom properties e `textContent`. A assinatura
   `sig` corta o trabalho quando nada que a tela mostra mudou.
2. **A forma é separada do estado** (`_shape` em `setConfig`). Trocar o tom do
   papel remonta; chegar um `hass` novo, não.
3. **Piso de 44 px, sempre.** `control_size: 10` é elevado para 44 — obedecer
   seria refazer o defeito que o card nasceu para consertar.
4. **Nenhuma animação cara.** Relevo é sombra parada. O probe reprova
   `@keyframes` que toque `box-shadow`, `filter`, `width`, `height`, `left`,
   `top`, `margin` ou `padding`.
5. **Escala por container query**, não por `@media`: o card mora numa coluna do
   Lovelace, não na janela do navegador.

## 3. Onde mexer em cada coisa

| Quero | Onde |
|---|---|
| geometria da janela | `SC`, `FR`, `GL`, `SILL` no topo |
| tom da esquadria | `FRAME_TONES` + `frameTone()` |
| folha que corre | `_scene()` (grupo `.panes`) + `--t1`/`--t2` em `_paint()` |
| tecido novo | `TEXTURES` |
| pano separado da folha sem configurar | `shade()` + o `dl` de `_stops()` |
| peça de papel / régua | bloco `mw-paper-control v1` + `.mwp-k` / `.mwp-rg` |
| linha de controle | `_controls()` · `_ruler()` · `_piece()` |
| modo ambiente | `_roomBar()` |
| gesto e serviço | `_wire()` · `_wireRuler()` · `_doAction()` · `_setPos()` |
| campo do editor | `DEFAULTS` + `LABELS` + `_schemaFor(<aba>)` — **as três** |

## 4. Armadilhas (com sintoma observável)

| Sintoma | Causa | Conserto |
|---|---|---|
| Um pedaço do card congela em `--`, console limpo | `_build()` remontou e `_ctlEls`/`_roomEls`/`_skyStops` apontam para nós soltos | zerar TODAS no começo do `_build()` |
| Editor mostra só o campo «Nome» | o HA chama `setConfig` **antes** do `hass` | refazer a montagem na primeira entrega do `hass` |
| `SyntaxError: Unexpected identifier` no `node --check` | crase em comentário dentro do template do `_css()` | nunca usar crase ali |
| Cortina creme em card creme: aberta idêntica a fechada | `paperGradient("paper")` devolve **HEX**, e o `shade()` só sabia `hsl()` | `shade()` converte hex; **e** limita a saturação em 30% — sem teto, escurecer um creme dá amarelo de aviso |
| Retângulo pálido flutuando ao lado da janela | a folha que corre sem `clip-path` desliza para fora da esquadria | `.panes` sempre com `clip-path="url(#clipGlass)"` |
| A janela vira um selo no meio do card | `height` fixa na cena + `preserveAspectRatio` = tarja vazia dos dois lados | `width:100%;height:auto` e `scene_height` como **teto** |
| Teste de markup passa com o card vazio | o `<style>` mora no mesmo `innerHTML`: `/\.mwp-rg/` acha na folha de estilo | testar sobre `bodyOf(html)` (o probe tem o helper) |
| «Fechar t...» num botão que fecha a casa | rótulo longo em quadrado de 56 px | `data-wide` nas peças «tudo» |
| Botão diz «Ligar» com a coisa ligada | rótulo estático | `data-lon`/`data-loff` pintados em `_paintControls` |
| `node 24`: «Cannot set property navigator» | `navigator` virou getter | `Object.defineProperty` no probe |
| Card diz que mandou o comando e nada acontece | `.js.gz` velho continua sendo servido | subir `.js` **E** `.js.gz` |
| Conserto certo, medida errada (44×42 depois de consertar para 44×44) | a bancada servia o `.js` do cache | `preview.html`/`vitrine.html` carimbam `?v=Date.now()` na URL do script |
| `<title>` no SVG não chega ao leitor de tela | a cena é `aria-hidden="true"`, e isso poda a subárvore **inteira** da árvore de acessibilidade | o canal que vale é o `aria-label` do `.root` (existe mesmo com `show_header: false`); o `<title>` é conforto de mouse |
| Halo de foco "consertado" e ainda reprovando | `rgba(0,0,0,.38)` sobre papel creme dá **2,65:1** | `.55` → 4,64:1 claro e 5,84:1 escuro — **medir**, não deduzir |
| Vinco da régua esticado | estava dentro do `.rgf`, que anda por `scaleX` | virou irmão (`.rgk`) andando por `translateX` com a régua de `container-type` |

## 5. Blocos embutidos

`paper-palette v1` · `paper-dark-palette v1` · `mw-climate-scale v1` ·
`touch-feedback v2` · **`mw-paper-control v1`** (nasceu aqui).

Byte a byte com `IA/lib/`. Confere com `IA/tools/check-embeds.sh`; realinha com
`--fix`. **Bloco publicado não muda** (ADR 0010) — comportamento novo nasce com
marcador novo.

## 6. Entidades reais da casa

A topologia é a mesma levantada pelo card irmão — **é lá a fonte**, em
`../mw-ha-window-curtain-card/memoria-ia/CONTEXTO.md`. Resumo: só a **sala**
tem 4 folhas e dois empurradores (`cover.janela_{esquerda,direita}_da_sala`);
as demais têm 2 correndo para a esquerda; toda janela tem
`sensor.{temperatura,umidade}_da_janela_<ambiente>`.

## 7. Bancada

| arquivo | para quê |
|---|---|
| `tools/preview.html` | 12 cenários, com botão de tema e de largura de coluna |
| `tools/vitrine.html` | a fonte da imagem do README |
| `tools/stubs.js` | dublês de `ha-card`/`ha-icon` e o `hass` de mentira |
| `tools/shot.sh` | Chrome headless → `docs/exemplos.png` |
| `tools/probe.js` | sem navegador, roda no CI |

**Não abre por `file://`**: o pane de browser serve arquivo de fora do projeto
como snapshot `data:` e o `<script src="../dist/...">` morre em silêncio
(console **vazio**, `customElements.get()` = `undefined`). Sirva por HTTP —
entrada `mw-window-curtain-paper-preview`, porta **8793**, no
`PROJECTS/.claude/launch.json` (o da **raiz**, não o do repo).

## 8. Próximo passo registrado

`mw-ha-window-curtain-paper-element` — a mesma janela de papel na planta, com o
menu de hexágonos trocado por peças. Fora do escopo da entrega de 12/09/2026
por decisão do dono.
