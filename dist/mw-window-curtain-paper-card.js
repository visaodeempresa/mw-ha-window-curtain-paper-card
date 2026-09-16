/* MW Window / Curtain Paper Card — custom:mw-window-curtain-paper-card
 *
 * A janela do Home Assistant desenhada em PAPEL e feita para o DEDO.
 *
 * Não é um modo do mw-window-curtain-card: é a primeira peça de uma linha
 * própria (ADR 0021). O card irmão desenha a janela lindamente e se comanda
 * com botões de 26x24 px; este troca o alvo por peças de papel de 56 px, o
 * slider por uma régua de degraus, e deixa o dono escolher entre a cena com
 * paisagem e um pictograma leve que custa menos de um terço dos nós SVG.
 *
 * Arquivo único, sem build: este arquivo é fonte E artefato (padrão da casa).
 *
 * Invariante: MONTAR UMA VEZ, PINTAR POR VARIÁVEL CSS. _build() reescreve o
 * shadow DOM; _paint() só escreve custom properties e textContent. O HA
 * empurra um objeto hass novo a cada evento de qualquer entidade da casa —
 * redesenhar nisso é o jeito mais fácil de travar o celular.
 *
 * Autor: MAYCON WILLIAN OLIVEIRA <visaodeempresa@gmail.com>
 */
(() => {
  "use strict";

  const VERSION = "0.1.0";

  /* ==== blocos embutidos de IA/lib — conferidos por IA/tools/check-embeds.sh ==== */
  // >>> paper-palette v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/paper-palette/paper-palette.js
  // 49 papéis encardidos: 7 matizes do arco-íris × 7 tons (1 = quase branco,
  // 7 = mais encardido). Saturação baixa de propósito — papel descansa a vista.
  const PAPER_HUES = [
    ["red", "Vermelho", 6], ["orange", "Laranja", 27], ["yellow", "Amarelo", 47],
    ["green", "Verde", 96], ["blue", "Azul", 203], ["indigo", "Anil", 236],
    ["violet", "Violeta", 283],
  ];
  const PAPER_TONES = [[97, 6], [96, 9], [94, 12], [92, 15], [90, 18], [88, 21], [85, 24]];
  const PAPER_DEFAULT = "linear-gradient(145deg, #fdfaf3, #e8e3d8)";
  const paperGradient = (key) => {
    const m = /^([a-z]+)-([1-7])$/.exec(String(key || "").trim());
    if (!m) return PAPER_DEFAULT;
    const hue = PAPER_HUES.find((h) => h[0] === m[1]);
    if (!hue) return PAPER_DEFAULT;
    const [l, s] = PAPER_TONES[+m[2] - 1];
    return `linear-gradient(145deg, hsl(${hue[2]}, ${s}%, ${l}%), hsl(${hue[2]}, ${s + 4}%, ${l - 7}%))`;
  };
  const paperOptions = () => [{ value: "paper", label: "Papel original (creme)" }].concat(
    ...PAPER_HUES.map((h) => PAPER_TONES.map((t, i) => ({
      value: `${h[0]}-${i + 1}`,
      label: `${h[1]} · tom ${i + 1}${i === 0 ? " (mais claro)" : i === 6 ? " (mais encardido)" : ""}`,
    }))));
  // <<< paper-palette v1

  // >>> paper-dark-palette v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/paper-dark-palette/paper-dark-palette.js
  // 49 papéis de noite: as mesmas 7 matizes do paper-palette v1 × 7 tons
  // (1 = papel escuro mais claro, 7 = mais encardido). A saturação sobe mais
  // rápido que na rampa clara porque matiz em luminosidade baixa desaparece.
  const PAPER_DARK_HUES = [
    ["red", "Vermelho", 6], ["orange", "Laranja", 27], ["yellow", "Amarelo", 47],
    ["green", "Verde", 96], ["blue", "Azul", 203], ["indigo", "Anil", 236],
    ["violet", "Violeta", 283],
  ];
  const PAPER_DARK_TONES = [[26, 10], [24, 13], [21, 16], [19, 19], [16, 22], [14, 25], [11, 28]];
  const PAPER_DARK_DEFAULT = "linear-gradient(145deg, #2b2825, #161411)";
  const paperDarkGradient = (key) => {
    const m = /^([a-z]+)-([1-7])$/.exec(String(key || "").trim());
    if (!m) return PAPER_DARK_DEFAULT;
    const hue = PAPER_DARK_HUES.find((h) => h[0] === m[1]);
    if (!hue) return PAPER_DARK_DEFAULT;
    const [l, s] = PAPER_DARK_TONES[+m[2] - 1];
    return `linear-gradient(145deg, hsl(${hue[2]}, ${s}%, ${l}%), hsl(${hue[2]}, ${s + 6}%, ${Math.max(4, l - 6)}%))`;
  };
  const paperDarkOptions = () => [{ value: "paper", label: "Papel de noite (grafite)" }].concat(
    ...PAPER_DARK_HUES.map((h) => PAPER_DARK_TONES.map((t, i) => ({
      value: `${h[0]}-${i + 1}`,
      label: `${h[1]} · tom ${i + 1}${i === 0 ? " (mais claro)" : i === 6 ? " (mais escuro)" : ""}`,
    }))));
  // Tinta que se lê sobre o papel do modo pedido. Não é contraste calculado:
  // é o par fixo que a casa usa, para dois cards lado a lado combinarem.
  const paperInk = (dark) => (dark
    ? { text: "rgba(247, 244, 236, 0.94)", dim: "rgba(247, 244, 236, 0.62)", line: "rgba(255, 255, 255, 0.14)" }
    : { text: "rgba(28, 25, 20, 0.92)", dim: "rgba(28, 25, 20, 0.58)", line: "rgba(0, 0, 0, 0.14)" });
  // <<< paper-dark-palette v1

  // >>> mw-climate-scale v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/mw-climate-scale/mw-climate-scale.js
  // Escala canônica de cor por temperatura (°C) e umidade relativa (%).
  // Regra: IA/rules/global/40-cores-de-temperatura-e-umidade.md.
  const MW_CLIMATE_SCALE_ALPHA = 0.5;

  // 19 limites superiores inclusivos → 20 cores (a última vale de 46 °C para cima).
  const MW_TEMP_STOPS = [
    3.99, 6.99, 8.99, 13.99, 15.99, 17.99, 18.99, 20.99, 21.99, 22.99,
    23.99, 24.99, 25.99, 26.99, 29.99, 32.99, 35.99, 39.99, 45.99,
  ];
  const MW_TEMP_RGB = (
    "0,0,0 0,0,139 0,0,255 70,130,180 0,206,209 64,224,208 0,255,255 144,238,144 0,255,0 50,205,50 " +
    "127,255,0 154,205,50 255,255,0 255,215,0 255,165,0 255,99,71 255,69,0 178,34,34 139,0,0 139,0,0"
  ).split(" ");

  // Uma faixa por ponto percentual: índice n cobre [n, n+1); 100 é faixa própria.
  // O template original fecha a faixa em n.99 e deixa (n.99, n+1) sem dono — o
  // laço cai no fallback, que é a cor de 100% (preto). Sensor que reporte
  // 58,995 % pisca preto. Aqui o vão é fechado de propósito.
  const MW_HUM_RGB = (
    "0,0,0 51,0,0 102,0,0 153,0,0 204,0,0 255,0,0 255,11,0 255,22,0 255,33,0 255,45,0 " +
    "255,56,0 255,67,0 255,78,0 255,89,0 255,100,0 255,111,0 255,122,0 255,133,0 255,144,0 255,155,0 " +
    "255,165,0 255,170,0 255,174,0 255,179,0 255,183,0 255,188,0 255,192,0 255,197,0 255,201,0 255,206,0 " +
    "255,210,0 255,215,0 255,219,0 255,224,0 255,228,0 255,233,0 255,237,0 255,242,0 255,246,0 255,251,0 " +
    "255,255,0 170,255,85 85,255,170 0,255,255 12,252,253 24,249,251 36,246,249 48,243,247 60,240,245 72,237,243 " +
    "84,234,241 96,231,239 108,228,237 120,225,235 132,222,234 144,219,231 156,216,229 173,216,230 115,144,238 58,72,246 " +
    "0,0,255 0,0,249 0,0,243 0,0,237 0,0,231 0,0,225 0,0,219 0,0,213 0,0,207 0,0,201 " +
    "0,0,195 0,0,189 0,0,183 0,0,177 0,0,171 0,0,165 0,0,159 0,0,153 0,0,147 0,0,141 " +
    "0,0,139 0,0,132 0,0,125 0,0,118 0,0,111 0,0,104 0,0,97 0,0,90 0,0,83 0,0,76 " +
    "0,0,69 0,0,62 0,0,55 0,0,48 0,0,41 0,0,34 0,0,27 0,0,20 0,0,13 0,0,6 " +
    "0,0,0"
  ).split(" ");
  const MW_HUM_STOPS = MW_HUM_RGB.slice(1).map((_, i) => i + 0.99);

  const mwClimateRgba = (triplet, alpha) => `rgba(${triplet.split(",").join(", ")}, ${alpha})`;

  // Faixas + cores no formato do algoritmo de faixa comum: a cor é a primeira
  // cujo limite superior não foi ultrapassado. `clamp` existe porque umidade
  // fora de 0..100 é ruído de sensor, não frio.
  const mwClimateScale = (kind, alpha) => {
    const a = Number.isFinite(Number(alpha)) ? Number(alpha) : MW_CLIMATE_SCALE_ALPHA;
    const hum = kind === "hum" || kind === "humidity" || kind === "umidade";
    return {
      stops: hum ? MW_HUM_STOPS : MW_TEMP_STOPS,
      colors: (hum ? MW_HUM_RGB : MW_TEMP_RGB).map((t) => mwClimateRgba(t, a)),
      clamp: hum ? [0, 100] : null,
    };
  };

  // Cor seca (sem degradê), do jeito que o button-card faz.
  const mwClimateColor = (kind, value, alpha) => {
    const s = mwClimateScale(kind, alpha);
    let v = Number(value);
    if (!Number.isFinite(v)) return null;
    if (s.clamp) v = Math.min(s.clamp[1], Math.max(s.clamp[0], v));
    const i = s.stops.findIndex((stop) => v <= stop);
    return s.colors[i === -1 ? s.stops.length : i];
  };
  // <<< mw-climate-scale v1

  // >>> touch-feedback v2 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/touch-feedback/touch-feedback-v2.js
  // feedback táctil: o app companion (iOS/Android) escuta o evento "haptic" na
  // window e chama o motor de vibração nativo — é assim que o próprio frontend
  // do HA vibra. Fora do app não existe essa ponte, então cai no
  // navigator.vibrate (funciona no Chrome do Android; o Safari do iPhone não
  // vibra em página nenhuma, só dentro do companion).
  const VIBRATE_MS = { selection: 5, light: 10, success: 15, medium: 20, warning: 25, heavy: 30, failure: 40 };
  const inCompanionApp = () =>
    !!(window.externalApp || window.webkit?.messageHandlers?.externalBus);
  const haptic = (kind) => {
    try {
      window.dispatchEvent(new CustomEvent("haptic",
        { bubbles: true, composed: true, detail: kind }));
      // sem a ponte do companion o evento morre sem ninguém escutando
      if (!inCompanionApp() && navigator.vibrate) navigator.vibrate(VIBRATE_MS[kind] ?? 10);
    } catch (_) { /* vibração é enfeite: nunca pode derrubar o toque */ }
  };

  // confirmação da ação (desligada por default). Duas decisões deliberadas:
  // 1) o diálogo é montado no document.body, não no shadow root do card —
  //    dentro dele o overflow:hidden do botão cortaria o modal;
  // 2) não usa window.confirm: o WebView do companion pode engolir o diálogo
  //    nativo e devolver false sozinho, e aí a ação nunca aconteceria.
  // O texto aceita {nome} e {acao} → "Tem certeza que quer desligar MESA?".
  // O card hospedeiro oferece as chaves confirm/confirm_text; o texto de
  // reserva mora aqui para o bloco não depender do DEFAULTS de ninguém.
  const CONFIRM_FALLBACK = "Tem certeza que quer {acao} {nome}?";
  const CONFIRM_PAPER = "linear-gradient(145deg, #fdfaf3, #e8e3d8)";
  // tinta de reserva: o mesmo par de paperInk(), repetido aqui para o bloco
  // continuar colável em card que não embute a paleta escura.
  const CONFIRM_INK = (dark) => (dark
    ? { text: "rgba(247, 244, 236, 0.94)", dim: "rgba(247, 244, 236, 0.62)", line: "rgba(255, 255, 255, 0.14)" }
    : { text: "rgba(28, 25, 20, 0.92)", dim: "rgba(28, 25, 20, 0.58)", line: "rgba(0, 0, 0, 0.14)" });

  // O relevo do papel é o MESMO vocabulário dos botões MW, e por isso a
  // hierarquia sai de graça: "Confirmar" é papel saliente (o botão ligado) e
  // "Cancelar" é papel afundado (o botão desligado). Ninguém precisa de cor de
  // alerta para saber qual é qual.
  const paper3dSkin = (bg, dark) => {
    // no papel escuro o brilho interno de cima tem que cair muito: 0.80 de
    // branco sobre grafite vira risco de giz, não luz.
    const lit = dark ? "rgba(255,255,255,0.10)" : "rgba(255,250,235,0.80)";
    const litSoft = dark ? "rgba(255,255,255,0.07)" : "rgba(255,250,235,0.85)";
    const dent = dark ? "rgba(0,0,0,0.50)" : "rgba(0,0,0,0.08)";
    const edge = dark ? "rgba(255,255,255,0.10)" : "rgba(180,180,180,0.55)";
    const drop = dark ? "rgba(0,0,0,0.70)" : "rgba(0,0,0,0.50)";
    // botão e balão são o MESMO papel, e só o relevo não basta para separá-los
    // — nos tons encardidos (claros ou escuros) o botão sumia dentro do balão.
    // Uma camada de tinta por cima da folha resolve sem inventar segunda cor:
    // o saliente clareia, o afundado escurece, os dois na mesma matéria.
    const tint = (v) => `linear-gradient(${v}, ${v}), ${bg}`;
    const upBg = tint(dark ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.34)");
    const downBg = tint(dark ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.055)");
    return {
      box: `background:${bg};border:1px solid ${edge};
        box-shadow:0 18px 50px ${drop}, 0 0 8px 2px rgba(0,0,0,0.28),
          inset 2px 2px 4px ${lit}, inset -2px -2px 4px ${dent};`,
      // saliente: luz em cima à esquerda, sombra projetada embaixo
      up: `background:${upBg};border:1px solid ${edge};
        box-shadow:inset 1px 1px 2px ${litSoft}, inset -1px -1px 2px ${dent},
          0 3px 6px rgba(0,0,0,${dark ? "0.45" : "0.22"});`,
      // afundado: a sombra vai para dentro — mesmo estado "desligado" do card
      down: `background:${downBg};border:1px solid ${edge};
        box-shadow:inset 2px 2px 5px rgba(0,0,0,${dark ? "0.55" : "0.30"}),
          inset -1px -1px 3px ${dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.45)"};`,
    };
  };

  const confirmAction = (tpl, nome, acao, opts) => new Promise((resolve) => {
    const o = opts || {};
    const msg = String(tpl || CONFIRM_FALLBACK)
      .replace(/\{nome\}/g, nome).replace(/\{acao\}/g, acao);
    const dark = o.dark === true;
    const ink = o.ink || CONFIRM_INK(dark);
    const bg = o.bg || CONFIRM_PAPER;
    const three = o.paper3d === true;
    const skin = three ? paper3dSkin(bg, dark) : null;

    // v1 chapado × v2 em relevo: as duas peles saem daqui, e o resto do
    // diálogo (foco, Esc, clique no fundo) é idêntico nos dois casos.
    const boxCss = three ? skin.box
      : `background:${CONFIRM_PAPER};box-shadow:0 10px 40px rgba(0,0,0,0.45), inset 2px 2px 4px rgba(255,250,235,0.80);`;
    const textCol = three ? ink.text : "#1a1a1a";
    const noCss = three ? skin.down + `color:${ink.text};`
      : "background:rgba(0,0,0,0.06);color:#1a1a1a;border:1px solid rgba(0,0,0,0.18);";
    const yesCss = three ? skin.up + `color:${ink.text};`
      : "background:#1a1a1a;color:#fdfaf3;border:1px solid #1a1a1a;";
    // o toque tem que responder na hora: pressionar afunda o saliente e
    // levanta o afundado, os dois trocando de lugar como papel de verdade.
    const pressCss = three
      ? `.bt button:active{${skin.down}transform:translateY(1px);}
         .bt button.no:active{${skin.up}transform:translateY(1px);}`
      : ".bt button:active{transform:translateY(1px);}";

    const host = document.createElement("div");
    host.attachShadow({ mode: "open" });
    host.shadowRoot.innerHTML = `
      <style>
        .ov{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
          background:rgba(0,0,0,${three && dark ? "0.68" : "0.55"});padding:16px;}
        .box{max-width:min(420px,86vw);border-radius:14px;padding:22px 22px 16px;
          color:${textCol};font-family:inherit;font-size:15px;line-height:1.45;text-align:center;
          ${boxCss}}
        .bt{display:flex;gap:10px;margin-top:20px;}
        button{flex:1;padding:11px 14px;border-radius:${three ? "12px" : "10px"};font:inherit;font-size:14px;
          font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;
          transition:box-shadow .15s ease,transform .1s ease;}
        .no{${noCss}}
        .yes{${yesCss}}
        ${pressCss}
      </style>
      <div class="ov"><div class="box"><div class="msg"></div>
        <div class="bt"><button class="no">Cancelar</button><button class="yes">Confirmar</button></div>
      </div></div>`;
    // textContent, não innerHTML: o texto vem do YAML do dono, mas nome de
    // entidade não tem por que virar HTML.
    host.shadowRoot.querySelector(".msg").textContent = msg;
    const close = (ok) => {
      window.removeEventListener("keydown", onKey, true);
      host.remove();
      resolve(ok);
    };
    const onKey = (ev) => {
      if (ev.key === "Escape") { ev.stopPropagation(); close(false); }
      else if (ev.key === "Enter") { ev.stopPropagation(); close(true); }
    };
    host.shadowRoot.querySelector(".yes").addEventListener("click", () => close(true));
    host.shadowRoot.querySelector(".no").addEventListener("click", () => close(false));
    // clique no fundo = cancelar (mesma saída do Esc)
    host.shadowRoot.querySelector(".ov").addEventListener("click", (ev) => {
      if (ev.target === ev.currentTarget) close(false);
    });
    window.addEventListener("keydown", onKey, true);
    document.body.appendChild(host);
    host.shadowRoot.querySelector(".yes").focus();
  });
  // <<< touch-feedback v2

  // >>> mw-paper-control v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/mw-paper-control/mw-paper-control.js
  // Piso de alvo de toque. 44 px é o menor quadrado que o polegar acerta sem
  // mirar (WCAG 2.5.5 / HIG). Abaixo disso o card erra no celular e o dono
  // reclama que "não pega".
  const MWP_MIN_TOUCH = 44;
  // As sete fatias do papel. `bg` vem de paperGradient/paperDarkGradient.
  // CAMADA DE TINTA: pintar chapado POR CIMA do mesmo gradiente. background-color
  // não empilha sobre gradiente; um linear-gradient de cor sólida empilha.
  const mwpSkin = (bg, dark) => {
    const tint = (v) => "linear-gradient(" + v + ", " + v + "), " + bg;
    const lit = dark ? "rgba(255,255,255,0.10)" : "rgba(255,250,235,0.80)";
    const litSoft = dark ? "rgba(255,255,255,0.07)" : "rgba(255,250,235,0.85)";
    const dent = dark ? "rgba(0,0,0,0.50)" : "rgba(0,0,0,0.08)";
    const edge = dark ? "rgba(255,255,255,0.10)" : "rgba(180,180,180,0.55)";
    return {
      edge,
      sheet: "background:" + bg + ";border:1px solid " + edge + ";box-shadow:"
        + "inset 2px 2px 4px " + lit + ",inset -2px -2px 4px " + dent + ";",
      raised: "background:" + tint(dark ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.34)")
        + ";border:1px solid " + edge + ";box-shadow:"
        + "inset 1px 1px 2px " + litSoft + ",inset -1px -1px 2px " + dent
        + ",0 3px 6px rgba(0,0,0," + (dark ? "0.45" : "0.22") + ");",
      sunken: "background:" + tint(dark ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.055)")
        + ";border:1px solid " + edge + ";box-shadow:"
        + "inset 2px 2px 5px rgba(0,0,0," + (dark ? "0.55" : "0.30") + ")"
        + ",inset -1px -1px 3px " + (dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.45)") + ";",
      // Pressionar TROCA a pele: o saliente afunda, o afundado sobe. É o único
      // jeito de o dedo sentir resposta sem animar box-shadow (que trava o
      // celular — regra da animação barata).
      pressedRaised: "background:" + tint(dark ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.055)")
        + ";box-shadow:inset 2px 2px 5px rgba(0,0,0," + (dark ? "0.55" : "0.30") + ");transform:translateY(1px);",
      pressedSunken: "background:" + tint(dark ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.34)")
        + ";box-shadow:inset 1px 1px 2px " + litSoft + ",inset -1px -1px 2px " + dent + ";transform:translateY(1px);",
    };
  };
  // Folha de estilo das duas peças. Escala por container query (o card mora
  // numa coluna, não na janela) com piso em MWP_MIN_TOUCH.
  const mwpControlCss = (o) => {
    const s = mwpSkin(o.bg, !!o.dark);
    const size = Math.max(MWP_MIN_TOUCH, +o.size || 56);
    const rad = o.radius == null ? Math.round(size * 0.25) : +o.radius;
    const ink = o.ink || { text: "rgba(28,25,20,0.92)", dim: "rgba(28,25,20,0.58)" };
    return ""
      + ".mwp-k,.mwp-rg{-webkit-tap-highlight-color:transparent;touch-action:manipulation;"
      + "user-select:none;-webkit-user-select:none;}"
      + ".mwp-k{display:grid;place-items:center;gap:2px;box-sizing:border-box;"
      + "min-width:" + MWP_MIN_TOUCH + "px;min-height:" + MWP_MIN_TOUCH + "px;"
      + "width:clamp(" + MWP_MIN_TOUCH + "px," + size + "px,28cqw);"
      + "height:clamp(" + MWP_MIN_TOUCH + "px," + size + "px,28cqw);"
      + "border-radius:" + rad + "px;cursor:pointer;padding:0;color:" + ink.text + ";"
      + s.raised + "}"
      + ".mwp-k.off{" + s.sunken + "}"
      + ".mwp-k:active{" + s.pressedRaised + "}"
      + ".mwp-k.off:active{" + s.pressedSunken + "}"
      // O anel não pode depender só de --primary-color: o azul padrão do HA
      // sobre papel creme dá 2,39:1 (o piso de borda informativa é 3:1). O halo
      // fixo por baixo garante o contraste em qualquer tema que o dono use.
      // 0.55 e não 0.38: medido na bancada, 0.38 sobre papel creme dá 2,65:1 —
      // ainda reprova. 0.55 dá 4,64:1 no claro e 5,84:1 no escuro.
      + ".mwp-k:focus-visible,.mwp-rg:focus-visible{outline:2.5px solid var(--primary-color);"
      + "outline-offset:2px;box-shadow:0 0 0 4.5px " + (o.dark ? "rgba(255,255,255,.55)" : "rgba(0,0,0,.55)") + ";}"
      + ".mwp-k[disabled]{opacity:.42;cursor:default;pointer-events:none;}"
      + ".mwp-k ha-icon{--mdc-icon-size:" + Math.round(size * 0.46) + "px;pointer-events:none;}"
      + ".mwp-k .kl{font-size:" + Math.max(8, Math.round(size * 0.17)) + "px;line-height:1;"
      + "color:" + ink.dim + ";pointer-events:none;max-width:96%;overflow:hidden;"
      + "text-overflow:ellipsis;white-space:nowrap;}"
      // Régua: trilho afundado, trecho andado saliente, degrau é alvo de toque
      // inteiro (a marca é fina, o botão que a cobre não).
      + ".mwp-rg{position:relative;display:block;box-sizing:border-box;width:100%;"
      + "container-type:inline-size;"
      + "min-height:" + MWP_MIN_TOUCH + "px;border-radius:" + Math.round(rad * 0.8) + "px;"
      + "cursor:pointer;padding:0;" + s.sunken + "}"
      + ".mwp-rg[disabled]{opacity:.42;pointer-events:none;}"
      + ".mwp-rg .rgf{position:absolute;left:3px;top:3px;bottom:3px;pointer-events:none;"
      + "width:calc(100% - 6px);transform-origin:left center;transform:scaleX(var(--rgp,0));"
      + "border-radius:" + Math.round(rad * 0.6) + "px;" + s.raised + "}"
      + ".mwp-rg.drag .rgf,.mwp-rg.drag .rgk{transition:none;}"
      // top/bottom em -1px: a régua tem border de 1px e box-sizing:border-box,
      // então um filho em top:0;bottom:0 nasce 2px mais baixo que a caixa.
      // Medido: 44x42. O piso é 44 nos DOIS eixos ou não é piso.
      + ".mwp-rg .rgs{position:absolute;top:-1px;bottom:-1px;width:" + MWP_MIN_TOUCH + "px;"
      + "transform:translateX(-50%);background:none;border:0;padding:0;cursor:pointer;}"
      + ".mwp-rg .rgs::before{content:'';position:absolute;left:50%;top:22%;bottom:22%;width:2px;"
      + "transform:translateX(-50%);border-radius:1px;background:" + ink.text + ";opacity:.30;}"
      + ".mwp-rg .rgs:first-of-type::before,.mwp-rg .rgs:last-of-type::before{opacity:.16;}"
      + ".mwp-rg .rgs:active::before{opacity:.75;}"
      // A ponta do trecho andado é um vinco, não uma borda: é o que conta ao
      // olho onde a régua "parou" sem depender de cor de destaque.
      // Ele é IRMÃO do preenchimento, não filho: dentro do .rgf o scaleX
      // esticaria o vinco de 2px junto. Anda por translateX (composto), com a
      // régua servindo de container para o 100cqw valer a largura dela.
      + ".mwp-rg .rgk{position:absolute;left:3px;top:12%;bottom:12%;width:2px;pointer-events:none;"
      + "border-radius:1px;transform:translateX(calc(var(--rgp,0) * (100cqw - 6px)));"
      + "background:" + (o.dark ? "rgba(0,0,0,.55)" : "rgba(0,0,0,.22)") + ";}"
      // O número mora na ponta direita, não no meio: numa régua larga o valor
      // centralizado cai longe do vinco e o olho procura os dois.
      // Só transform e opacity entram em transição, e só com o sistema
      // permitindo. background e box-shadow animados redesenham a sombra a cada
      // quadro — era o que a própria receita do papel manda evitar, e estava
      // na transition da peça contradizendo o comentário dela.
      + "@media (prefers-reduced-motion: no-preference){"
      + ".mwp-k{transition:transform .1s ease;}"
      + ".mwp-rg .rgf{transition:transform .18s ease;}"
      + ".mwp-rg .rgk{transition:transform .18s ease;}}"
      + ".mwp-rg .rgv{position:absolute;inset:0;display:grid;place-items:center end;"
      + "padding-right:12px;box-sizing:border-box;"
      + "pointer-events:none;font-size:" + Math.max(10, Math.round(size * 0.2)) + "px;"
      + "font-weight:600;font-variant-numeric:tabular-nums;color:" + ink.text + ";}";
  };
  // <<< mw-paper-control v1

  /* ==================== helpers ==================== */

  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const numOr = (v, d) => (v === "" || v == null || isNaN(+v) ? d : +v);
  // Ruído reprodutível: a mesma janela desenha as mesmas gotas em toda sessão.
  // Sem semente, cada _build() sorteia chuva nova e a cena "pisca".
  const seeded = (n) => { let s = n * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); };

  const friendly = (hass, id) => {
    const st = id && hass && hass.states[id];
    return (st && st.attributes && st.attributes.friendly_name) || id || "";
  };
  const areaOf = (hass, id) => {
    if (!hass || !id) return null;
    const ent = hass.entities && hass.entities[id];
    if (ent && ent.area_id) return ent.area_id;
    const dev = ent && ent.device_id && hass.devices && hass.devices[ent.device_id];
    return (dev && dev.area_id) || null;
  };
  const entOptions = (hass, domains) => {
    if (!hass) return [];
    return Object.keys(hass.states)
      .filter((id) => domains.includes(id.split(".")[0]))
      .sort()
      .map((id) => ({ value: id, label: friendly(hass, id) + " (" + id + ")" }));
  };
  const areaOptions = (hass) => {
    const a = (hass && hass.areas) || {};
    return Object.keys(a).map((k) => ({ value: k, label: a[k].name || k }))
      .sort((x, y) => x.label.localeCompare(y.label));
  };

  // Leitura de um cover: posição 0..100 e se está andando. `invert` existe
  // porque empurrador de janela costuma reportar ao contrário do que o olho vê.
  const coverInfo = (hass, id, invert) => {
    const st = id && hass && hass.states[id];
    if (!st) return { pos: null, state: "missing", moving: false, dead: true };
    const dead = st.state === "unavailable" || st.state === "unknown";
    let pos = st.attributes && st.attributes.current_position;
    if (pos == null) pos = st.state === "open" ? 100 : st.state === "closed" ? 0 : null;
    if (pos != null && invert) pos = 100 - pos;
    return {
      pos: pos == null ? null : clamp(Math.round(pos), 0, 100),
      state: st.state, dead,
      moving: st.state === "opening" || st.state === "closing",
    };
  };
  const numState = (hass, id) => {
    const st = id && hass && hass.states[id];
    if (!st || st.state === "unavailable" || st.state === "unknown") return null;
    const n = parseFloat(st.state);
    return isNaN(n) ? null : n;
  };
  const onOff = (hass, id) => {
    const st = id && hass && hass.states[id];
    if (!st) return { on: false, dead: true, state: "missing" };
    const dead = st.state === "unavailable" || st.state === "unknown";
    return { on: !dead && st.state !== "off" && st.state !== "closed", dead, state: st.state };
  };
  // O card irmão já formata pelo locale do HA; imprimir "23.4" com ponto numa
  // casa pt-BR é regressão frente a um componente já aceito.
  const nfmt = (hass, v, casas) => {
    try {
      return new Intl.NumberFormat((hass && hass.locale && hass.locale.language) || "pt-BR",
        { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v);
    } catch (_) { return v.toFixed(casas); }
  };

  const batteryIcon = (p) => {
    if (p == null) return "mdi:battery-unknown";
    if (p >= 95) return "mdi:battery";
    if (p <= 5) return "mdi:battery-outline";
    return "mdi:battery-" + Math.round(p / 10) * 10;
  };
  const batteryColor = (p) => (p == null ? "var(--dim)" : p <= 15 ? "#e05a4f" : p <= 35 ? "#e0a23f" : "var(--dim)");

  // Fase do dia pela hora local. O sol da casa não é o sol do servidor.
  const dayPhase = (h) => (h < 5 ? "night" : h < 7 ? "dawn" : h < 10 ? "morning"
    : h < 16 ? "day" : h < 18 ? "afternoon" : h < 20 ? "dusk" : h < 22 ? "twilight" : "night");

  /* ==================== descoberta por área ==================== */

  // Monta a janela sozinha a partir do que a área tem. É o que transforma
  // "escolher 9 entidades numa lista de 800" em um clique.
  const PAT = {
    opener: [/janela/, /window/],
    curtain: [/cortina/, /curtain/],
    blackout: [/blackout/, /persiana/, /black_out/],
    exhaust: [/exaustor/, /exhaust/],
  };
  const matches = (id, pats) => pats.some((p) => p.test(id));
  const discoverForArea = (hass, area) => {
    const out = { opener: "", opener_right: "", curtain: "", blackout: "", exhaust: "",
      sensor_left: "", sensor_right: "", temperature: "", humidity: "", battery: "" };
    if (!hass || !area) return out;
    const mine = Object.keys(hass.states).filter((id) => areaOf(hass, id) === area);
    const covers = mine.filter((id) => id.startsWith("cover."));
    const openers = covers.filter((id) => matches(id, PAT.opener) && !matches(id, PAT.curtain) && !matches(id, PAT.blackout));
    // A sala tem DOIS empurradores (esquerda e direita). Quem tem "direita" no
    // id vai para o segundo campo; o resto entra pela ordem.
    const right = openers.find((id) => /direit/.test(id));
    const left = openers.find((id) => /esquerd/.test(id));
    out.opener = left || openers[0] || "";
    out.opener_right = right && right !== out.opener ? right : "";
    // Empurrador sem nome de lado: cover da área que não é cortina nem blackout.
    if (!out.opener) out.opener = covers.find((id) => !matches(id, PAT.curtain) && !matches(id, PAT.blackout)) || "";
    out.curtain = covers.find((id) => matches(id, PAT.curtain)) || "";
    out.blackout = covers.find((id) => matches(id, PAT.blackout)) || "";
    out.exhaust = mine.find((id) => id.startsWith("fan.") && matches(id, PAT.exhaust)) || "";
    const bins = mine.filter((id) => id.startsWith("binary_sensor.") && matches(id, PAT.opener));
    out.sensor_left = bins.find((id) => /esquerd/.test(id)) || bins[0] || "";
    out.sensor_right = bins.find((id) => /direit/.test(id) && id !== out.sensor_left) || "";
    const byClass = (cls) => mine.find((id) => id.startsWith("sensor.") &&
      hass.states[id].attributes && hass.states[id].attributes.device_class === cls &&
      matches(id, PAT.opener)) ||
      mine.find((id) => id.startsWith("sensor.") && hass.states[id].attributes &&
        hass.states[id].attributes.device_class === cls);
    out.temperature = byClass("temperature") || "";
    out.humidity = byClass("humidity") || "";
    out.battery = byClass("battery") || "";
    return out;
  };

  /* ==================== geometria da cena ==================== */

  const SC = { W: 360, H: 210 };                       // caixa da cena, unidades SVG
  const FR = { x: 40, y: 8, w: 280, h: 170, t: 10 };   // esquadria
  const GL = { x: FR.x + FR.t, y: FR.y + FR.t, w: FR.w - FR.t * 2, h: FR.h - FR.t * 2 };
  const SILL = { x: FR.x - 10, y: FR.y + FR.h, w: FR.w + 20, h: 10 };

  const FRAME_TONES = {
    claro: { a: "#f2efe8", b: "#d8d3c7", c: "#bdb7a9" },
    escuro: { a: "#4a4741", b: "#33302b", c: "#242119" },
    branco: { a: "#ffffff", b: "#ececec", c: "#cfcfcf" },
    madeira: { a: "#b98a52", b: "#95682f", c: "#6d4a1c" },
    aluminio: { a: "#dfe3e6", b: "#b6bcc1", c: "#8e959b" },
  };
  // A esquadria "auto" segue o PAPEL, não o tema do HA: o card é uma folha
  // clara mesmo dentro de um dashboard escuro, e alumínio sobre creme é o que
  // se enxerga. Sem isso a moldura some e a janela vira um borrão.
  const frameTone = (key, dark) => FRAME_TONES[key] || (dark ? FRAME_TONES.claro : FRAME_TONES.aluminio);

  // Escurece (ou clareia) uma cor hsl() da paleta. Existe para o PANO nascer
  // separado da FOLHA sem obrigar o dono a escolher dois tons no editor:
  // cortina creme em card creme faz "aberta" e "fechada" ficarem idênticas.
  const shade = (col, dl, ds) => {
    const v = String(col).trim();
    let h, sat, l;
    const m = /^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/.exec(v);
    if (m) { h = +m[1]; sat = +m[2]; l = +m[3]; }
    else {
      // ARMADILHA: o tom "paper" (o neutro das duas rampas) é HEX, não hsl.
      // Sem converter, o sombreamento virava no-op JUSTO no padrão de fábrica
      // — cortina creme sobre folha creme, e "aberta" idêntica a "fechada".
      const x = /^#([0-9a-f]{6})$/i.exec(v);
      if (!x) return col;
      const n = parseInt(x[1], 16);
      const R = ((n >> 16) & 255) / 255, G = ((n >> 8) & 255) / 255, B = (n & 255) / 255;
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
      l = (mx + mn) / 2 * 100;
      sat = d === 0 ? 0 : (d / (1 - Math.abs((mx + mn) - 1))) * 100;
      h = d === 0 ? 0 : 60 * (mx === R ? ((G - B) / d + (G < B ? 6 : 0)) : mx === G ? (B - R) / d + 2 : (R - G) / d + 4);
    }
    // Teto de saturação em 30%: um creme quase branco tem S alto de verdade
    // (#fdfaf3 dá 71%), e escurecê-lo sem teto devolve um amarelo de aviso em
    // vez de papel. A rampa da casa nunca passa de 30 — o pano fica na família.
    return "hsl(" + h.toFixed(0) + ", " + clamp(sat + (ds || 0), 0, 30).toFixed(0) +
      "%, " + clamp(l + dl, 3, 97).toFixed(0) + "%)";
  };

  // Tecidos: a prega É o próprio gradiente do pano. Como ele acompanha a caixa
  // do painel, franzir a cortina estreita as pregas sozinho — que é o que o
  // tecido faz de verdade. Zero custo por quadro.
  const TEXTURES = {
    paper: { label: "Papel", pleat: 7, sheen: 0.10 },
    linho: { label: "Linho", pleat: 9, sheen: 0.07 },
    juta: { label: "Juta", pleat: 11, sheen: 0.05 },
    veludo: { label: "Veludo", pleat: 6, sheen: 0.20 },
    seda: { label: "Seda", pleat: 5, sheen: 0.28 },
    voil: { label: "Voil (translúcido)", pleat: 8, sheen: 0.14 },
  };

  // Céu por fase do dia: três paradas, sem animação. O gradiente é repintado
  // no máximo uma vez por minuto (relógio do connectedCallback).
  const SKY = {
    night: ["#0b1230", "#131a3a", "#1d2448"],
    dawn: ["#2b3566", "#7b5f7a", "#d99a72"],
    morning: ["#9fc6e8", "#c9dff2", "#eaf2f8"],
    day: ["#7fb4e3", "#a9d2ef", "#dfeefb"],
    afternoon: ["#8cb6dd", "#c2d6e8", "#f0e3d0"],
    dusk: ["#4a4a86", "#b1688a", "#e79a63"],
    twilight: ["#1b2350", "#3a3a70", "#6b5580"],
  };

  /* ==================== configuração ==================== */

  const DEFAULTS = {
    name: "",
    area: "",
    // alvos
    opener: "", opener_right: "", curtain: "", blackout: "", exhaust: "",
    sensor_left: "", sensor_right: "",
    temperature: "", humidity: "", battery: "",
    invert_position: false,
    // cena
    scene_mode: "pictograma",
    scene_height: 260,
    panes: "auto",
    pane_run: "left",
    frame_tone: "auto",
    glass_tint: true,
    curtain_texture: "paper",
    curtain_open: "center",
    curtain_overhang: 12,
    curtain_drop: 16,
    curtain_paper: "",
    curtain_dark: false,
    blackout_paper: "",
    blackout_dark: true,
    show_sensors: true,
    // paisagem (só vale em scene_mode: paisagem)
    scenery_skyline: "cidade",
    scenery_weather: "auto",
    scenery_stars: true,
    // controles
    controls: "auto",
    control_size: 56,
    control_style: "papel",
    control_labels: true,
    slider_style: "regua",
    regua_steps: "0,25,50,75,100",
    stop_button: true,
    haptic: true,
    confirm: false,
    confirm_text: "",
    // modo ambiente
    room_mode: false,
    room_extras: true,
    // aparência
    paper: "paper",
    paper_dark: false,
    radius: 16,
    depth: "3d",
    show_header: true,
    show_climate: true,
    show_battery: "auto",
    // ações
    tap_action: "toggle",
    hold_action: "more-info",
  };

  const LABELS = {
    name: "Nome",
    area: "Ambiente (área do HA)",
    opener: "Empurrador (janela)",
    opener_right: "Empurrador direito (janela de 4 folhas)",
    curtain: "Cortina",
    blackout: "Blackout",
    exhaust: "Exaustor / ventoinha",
    sensor_left: "Sensor de abertura — esquerda",
    sensor_right: "Sensor de abertura — direita",
    temperature: "Sensor de temperatura",
    humidity: "Sensor de umidade",
    battery: "Sensor de bateria",
    invert_position: "Inverter a posição do empurrador",
    scene_mode: "Desenho da janela",
    scene_height: "Altura do desenho (px)",
    panes: "Folhas de vidro",
    pane_run: "Para onde a folha corre",
    frame_tone: "Tom da esquadria",
    glass_tint: "Vidro com tom do clima",
    curtain_texture: "Tecido da cortina",
    curtain_open: "Como a cortina abre",
    curtain_overhang: "Sobra da cortina além do vão (un.)",
    curtain_drop: "Quanto a cortina desce abaixo do vão (un.)",
    curtain_paper: "Tom de papel da cortina",
    curtain_dark: "Cortina na rampa escura",
    blackout_paper: "Tom de papel do blackout",
    blackout_dark: "Blackout na rampa escura",
    show_sensors: "Mostrar os riscos de sensor",
    scenery_skyline: "Silhueta no horizonte",
    scenery_weather: "Efeito no vidro",
    scenery_stars: "Estrelas à noite",
    controls: "Barra de controles",
    control_size: "Lado do botão de papel (px)",
    control_style: "Relevo dos controles",
    control_labels: "Rótulo embaixo do botão",
    slider_style: "Ajuste de posição",
    regua_steps: "Degraus da régua (%, separados por vírgula)",
    stop_button: "Botão de parar",
    haptic: "Vibrar ao tocar",
    confirm: "Pedir confirmação",
    confirm_text: "Texto da confirmação",
    room_mode: "Modo ambiente (tudo de uma vez)",
    room_extras: "Incluir exaustor e tomadas no modo ambiente",
    paper: "Tom de papel do card",
    paper_dark: "Card na rampa escura",
    radius: "Arredondamento do card (px)",
    depth: "Profundidade do papel",
    show_header: "Mostrar o cabeçalho",
    show_climate: "Mostrar temperatura e umidade",
    show_battery: "Mostrar bateria",
    tap_action: "Toque",
    hold_action: "Toque longo",
  };

  const OPT = {
    scene_mode: [
      { value: "pictograma", label: "Pictograma leve (padrão)" },
      { value: "paisagem", label: "Cena com paisagem" },
      { value: "none", label: "Sem desenho — só os controles" },
    ],
    panes: [
      { value: "auto", label: "Automático (2, ou 4 se houver dois empurradores)" },
      { value: "2", label: "2 folhas" },
      { value: "4", label: "4 folhas" },
    ],
    pane_run: [
      { value: "left", label: "Para a esquerda" },
      { value: "right", label: "Para a direita" },
      { value: "center", label: "Das pontas para o centro" },
    ],
    frame_tone: [
      { value: "auto", label: "Automático (segue o tema)" },
      { value: "claro", label: "Claro" }, { value: "escuro", label: "Escuro" },
      { value: "branco", label: "Branco" }, { value: "madeira", label: "Madeira" },
      { value: "aluminio", label: "Alumínio" },
    ],
    curtain_texture: Object.keys(TEXTURES).map((k) => ({ value: k, label: TEXTURES[k].label })),
    curtain_open: [
      { value: "center", label: "Abre para os dois lados" },
      { value: "left", label: "Corre toda para a esquerda" },
      { value: "right", label: "Corre toda para a direita" },
    ],
    scenery_skyline: [
      { value: "cidade", label: "Cidade" }, { value: "morros", label: "Morros" },
      { value: "arvores", label: "Árvores" }, { value: "nenhuma", label: "Nenhuma" },
    ],
    scenery_weather: [
      { value: "auto", label: "Automático (pelo clima e pela temperatura)" },
      { value: "none", label: "Vidro limpo" }, { value: "rain", label: "Chuva" },
      { value: "dew", label: "Orvalho" }, { value: "hot", label: "Calor" },
      { value: "cold", label: "Gelo" },
    ],
    controls: [
      { value: "auto", label: "Automática (uma linha por alvo)" },
      { value: "compact", label: "Compacta (sem rótulo, botões lado a lado)" },
      { value: "none", label: "Sem controles" },
    ],
    control_style: [
      { value: "papel", label: "Papel com relevo" },
      { value: "chapado", label: "Chapado (sem relevo)" },
    ],
    slider_style: [
      { value: "regua", label: "Régua de papel com degraus" },
      { value: "barra", label: "Barra simples" },
      { value: "none", label: "Sem ajuste de posição" },
    ],
    depth: [
      { value: "3d", label: "Relevo cheio" }, { value: "soft", label: "Suave" },
      { value: "flat", label: "Chapado" },
    ],
    show_battery: [
      { value: "auto", label: "Só quando estiver baixa" },
      { value: "sempre", label: "Sempre" }, { value: "nunca", label: "Nunca" },
    ],
    tap_action: [
      { value: "toggle", label: "Abrir / fechar" },
      { value: "more-info", label: "Abrir a janela de detalhes" },
      { value: "none", label: "Nada" },
    ],
    hold_action: [
      { value: "more-info", label: "Abrir a janela de detalhes" },
      { value: "toggle", label: "Abrir / fechar" },
      { value: "none", label: "Nada" },
    ],
  };

  const TABS = [
    { id: "janela", icon: "mdi:window-open-variant", label: "Janela" },
    { id: "controles", icon: "mdi:gesture-tap-button", label: "Controles" },
    { id: "ambiente", icon: "mdi:home-group", label: "Ambiente" },
    { id: "cena", icon: "mdi:image-filter-hdr", label: "Cena" },
    { id: "clima", icon: "mdi:thermometer", label: "Clima" },
    { id: "estilo", icon: "mdi:palette", label: "Estilo" },
  ];

  // Os alvos que a barra de controles conhece, na ordem em que aparecem.
  // `dom` é o domínio do serviço; `inv` diz se a posição é invertida.
  const TARGETS = [
    { k: "op1", cfg: "opener", icon: "mdi:window-open-variant", label: "Janela", alt: "Folha esquerda", pos: true },
    { k: "op2", cfg: "opener_right", icon: "mdi:window-open-variant", label: "Folha direita", pos: true },
    { k: "cur", cfg: "curtain", icon: "mdi:curtains", label: "Cortina", pos: true },
    { k: "bo", cfg: "blackout", icon: "mdi:blinds-horizontal", label: "Blackout", pos: true },
  ];

  /* ==================== o card ==================== */

  class MwWindowCurtainPaperCard extends HTMLElement {
    setConfig(config) {
      if (!config) throw new Error("Configuração vazia.");
      const c = Object.assign({}, DEFAULTS, config);
      if (!c.opener && !c.curtain && !c.blackout && !c.exhaust && !c.room_mode) {
        throw new Error("Escolha ao menos um alvo: empurrador, cortina, blackout ou exaustor.");
      }
      // A FORMA do card (o que muda o DOM) é separada do ESTADO (o que muda
      // só as variáveis CSS). Trocar o tom do papel não remonta nada; trocar
      // o scene_mode remonta. Sem essa separação, mexer no editor pisca a tela.
      const shape = [
        "opener", "opener_right", "curtain", "blackout", "exhaust",
        "sensor_left", "sensor_right", "temperature", "humidity", "battery",
        "scene_mode", "scene_height", "panes", "pane_run", "frame_tone",
        "curtain_open", "curtain_overhang", "curtain_drop", "curtain_texture",
        "curtain_paper", "curtain_dark", "blackout_paper", "blackout_dark",
        "controls", "control_size", "control_style", "control_labels",
        "slider_style", "regua_steps", "stop_button", "room_mode", "room_extras",
        "paper", "paper_dark", "radius", "depth", "show_header", "show_climate",
        "show_sensors", "show_battery", "scenery_skyline", "scenery_stars", "name",
      ].map((k) => JSON.stringify(c[k])).join("|");
      const remount = shape !== this._shape;
      this._shape = shape;
      this._config = c;
      if (this._hass && remount) this._build();
      else if (this._hass) this._paint(true);
    }

    set hass(hass) {
      const first = !this._hass;
      this._hass = hass;
      if (!this._config) return;
      if (first) this._build(); else this._paint();
    }

    getCardSize() {
      const c = this._config || DEFAULTS;
      const scene = c.scene_mode === "none" ? 0 : numOr(c.scene_height, 260) / 50;
      return Math.max(2, Math.round(scene + (c.controls === "none" ? 1 : 2.5)));
    }

    static getConfigElement() { return document.createElement("mw-window-curtain-paper-card-editor"); }

    static getStubConfig(hass) {
      const id = Object.keys(hass.states).find((e) => e.startsWith("cover.") && /janela|window/.test(e));
      const area = id ? areaOf(hass, id) : null;
      const found = area ? discoverForArea(hass, area) : {};
      return Object.assign({ type: "custom:mw-window-curtain-paper-card", area: area || "" },
        found.opener ? found : { opener: id || "" });
    }

    connectedCallback() {
      // Card fora da tela não pinta. Numa view com 20 janelas isso é a
      // diferença entre abrir e travar no celular.
      if (!this._io && typeof IntersectionObserver !== "undefined") {
        this._io = new IntersectionObserver((es) => {
          this._visible = es.some((e) => e.isIntersecting);
          if (this._visible) this._paint(true);
        }, { rootMargin: "120px" });
        this._io.observe(this);
      }
      // A fase do dia muda sozinha; sem relógio o céu congela na hora em que
      // a aba foi aberta. Um minuto é o passo mais grosso que ninguém percebe.
      // IntersectionObserver só sabe de rolagem: com a ABA do navegador
      // escondida o card continua na viewport e o relógio seguia pintando.
      if (!this._clock) this._clock = setInterval(() => {
        if (this._visible !== false && !document.hidden) this._paint(true);
      }, 60000);
    }

    disconnectedCallback() {
      if (this._io) { this._io.disconnect(); this._io = null; }
      if (this._clock) { clearInterval(this._clock); this._clock = null; }
    }

    /* ---------- leitura do estado ---------- */

    _read() {
      const c = this._config, h = this._hass;
      const inv = c.invert_position === true;
      const r = {
        op1: coverInfo(h, c.opener, inv),
        op2: coverInfo(h, c.opener_right, inv),
        cur: coverInfo(h, c.curtain, false),
        bo: coverInfo(h, c.blackout, false),
        exh: onOff(h, c.exhaust),
        t: numState(h, c.temperature),
        hum: numState(h, c.humidity),
        bat: numState(h, c.battery),
        sl: c.sensor_left ? onOff(h, c.sensor_left) : null,
        sr: c.sensor_right ? onOff(h, c.sensor_right) : null,
        phase: dayPhase(new Date().getHours()),
      };
      r.fx = this._fxKey(r);
      return r;
    }

    // Qual efeito o vidro mostra. Prioridade: o que o dono pediu; senão o
    // clima; senão a temperatura; senão nada.
    _fxKey(r) {
      const c = this._config;
      if (c.scene_mode !== "paisagem") return "none";
      if (c.scenery_weather && c.scenery_weather !== "auto") return c.scenery_weather;
      const w = Object.keys(this._hass.states).find((e) => e.startsWith("weather."));
      const st = w && this._hass.states[w];
      const cond = (st && st.state) || "";
      if (/rain|pour|light/.test(cond)) return "rain";
      if (/snow|hail/.test(cond)) return "cold";
      if (r.t != null && r.t >= 30) return "hot";
      if (r.t != null && r.t <= 8) return "cold";
      if (r.hum != null && r.hum >= 85) return "dew";
      return "none";
    }

    /* ---------- montagem ---------- */

    _build() {
      const c = this._config, h = this._hass;
      const dark = c.paper_dark === true;
      const bg = dark ? paperDarkGradient(c.paper) : paperGradient(c.paper);
      const ink = paperInk(dark);
      const fr = frameTone(c.frame_tone === "auto" ? null : c.frame_tone, dark);
      const tex = TEXTURES[c.curtain_texture] || TEXTURES.paper;
      const r = this._read();

      const title = c.name || friendly(h, c.opener || c.curtain || c.blackout || c.exhaust) || "Janela";

      this._root = this.shadowRoot || this.attachShadow({ mode: "open" });
      this._root.innerHTML =
        "<style>" + this._css(c, dark, ink, bg, fr, tex) + "</style>" +
        // O canal acessível do estado é ESTE rótulo, não o <title> do SVG: a
        // cena é aria-hidden, e aria-hidden poda a subárvore INTEIRA da árvore
        // de acessibilidade — o <title> lá dentro é conforto de mouse e nada
        // mais. O rótulo aqui funciona mesmo com show_header: false, que é
        // justamente quando o resumo não existe para ser lido.
        '<ha-card class="root" role="group" aria-label="">' +
        (c.show_header ? this._header(c, title) : "") +
        (c.scene_mode === "none" ? "" : this._scene(c, dark, fr, tex, r)) +
        (c.room_mode ? this._roomBar(c, h) : this._controls(c)) +
        "</ha-card>";

      // ARMADILHA Nº 1: remontou o shadow DOM, zere TODA referência guardada.
      // Sintoma de esquecer: um pedaço do card congela em travessão sem erro
      // nenhum no console, porque o nó guardado não está mais na árvore.
      this._ctlEls = null;
      this._roomEls = null;
      this._skyStops = null;
      this._sig = null;
      this._dragging = null;
      this._rotulo = null;

      this._el = {
        title: this._root.querySelector(".title"),
        summary: this._root.querySelector(".summary"),
        badges: this._root.querySelector(".badges"),
        temp: this._root.querySelector(".v-temp"),
        hum: this._root.querySelector(".v-hum"),
        bat: this._root.querySelector(".v-bat"),
        batIcon: this._root.querySelector(".i-bat"),
        glass: this._root.querySelector(".glass"),
        root: this._root.querySelector(".root"),
      };
      this._wire();
      this._paint(true);
    }

    _header(c, title) {
      return '<div class="head">' +
        '<div class="titlewrap">' +
        '<div class="title">' + esc(title) + "</div>" +
        '<div class="summary"></div>' +
        "</div>" +
        '<div class="badges"></div>' +
        "</div>";
    }

    /* ---------- a cena ---------- */

    _scene(c, dark, fr, tex, r) {
      const pict = c.scene_mode === "pictograma";
      const four = c.panes === "4" || (c.panes === "auto" && !!c.opener_right);
      const run = c.pane_run;
      const over = numOr(c.curtain_overhang, 12);
      const drop = numOr(c.curtain_drop, 16);
      const vb = [0, 0, SC.W, SC.H + drop + 4].join(" ");

      const defs = [];
      const body = [];
      // A folha que corre precisa de recorte SEMPRE, não só na paisagem: sem
      // ele o vidro desliza para fora da esquadria e aparece um retângulo
      // pálido flutuando ao lado da janela.
      defs.push('<clipPath id="clipGlass"><rect x="' + GL.x + '" y="' + GL.y +
        '" width="' + GL.w + '" height="' + GL.h + '" rx="2"/></clipPath>');

      /* céu — no pictograma é uma parada só, chapada; na paisagem, três */
      if (pict) {
        defs.push('<linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="var(--sky-a)"/><stop offset="1" stop-color="var(--sky-c)"/></linearGradient>');
      } else {
        defs.push('<linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">' +
          '<stop class="sk" offset="0" stop-color="var(--sky-a)"/>' +
          '<stop class="sk" offset="0.55" stop-color="var(--sky-b)"/>' +
          '<stop class="sk" offset="1" stop-color="var(--sky-c)"/></linearGradient>');
      }
      body.push('<rect class="glass" x="' + GL.x + '" y="' + GL.y + '" width="' + GL.w + '" height="' + GL.h + '" fill="url(#pg)"/>');

      /* paisagem: sol/lua, silhueta, estrelas, efeito no vidro */
      if (!pict) {
        body.push('<g clip-path="url(#clipGlass)">');
        if (c.scenery_stars) {
          const rnd = seeded(7);
          let st = "";
          for (let i = 0; i < 22; i++) {
            const x = GL.x + rnd() * GL.w, y = GL.y + rnd() * GL.h * 0.6, rr = 0.5 + rnd() * 0.9;
            st += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + rr.toFixed(1) + '"/>';
          }
          body.push('<g class="stars" fill="#fff">' + st + "</g>");
        }
        body.push('<circle class="sun" cx="0" cy="0" r="13"/>');
        body.push(this._skyline(c.scenery_skyline, dark));
        body.push(this._fx());
        body.push("</g>");
      }

      /* folhas de vidro que correm */
      const pw = four ? GL.w / 4 : GL.w / 2;
      const panes = [];
      const mk = (i, v) => '<rect class="pane" x="' + (GL.x + i * pw).toFixed(1) + '" y="' + GL.y +
        '" width="' + pw.toFixed(1) + '" height="' + GL.h + '" style="--tv:' + v + '"/>';
      if (four) {
        panes.push(mk(0, "var(--t1)"), mk(1, "var(--t1)"), mk(2, "var(--t2)"), mk(3, "var(--t2)"));
      } else if (run === "center") {
        panes.push(mk(0, "var(--t1)"), mk(1, "calc(var(--t1) * -1)"));
      } else if (run === "right") {
        panes.push(mk(0, "0px"), mk(1, "var(--t1)"));
      } else {
        panes.push(mk(0, "calc(var(--t1) * -1)"), mk(1, "0px"));
      }
      body.push('<g class="panes" clip-path="url(#clipGlass)">' + panes.join("") + "</g>");

      /* montantes e esquadria */
      body.push('<g class="frame" fill="none">' +
        '<rect x="' + FR.x + '" y="' + FR.y + '" width="' + FR.w + '" height="' + FR.h +
        '" rx="3" stroke="var(--fr-b)" stroke-width="' + FR.t + '"/>' +
        '<rect x="' + (FR.x + FR.t / 2) + '" y="' + (FR.y + FR.t / 2) + '" width="' + (FR.w - FR.t) +
        '" height="' + (FR.h - FR.t) + '" rx="2" stroke="var(--fr-c)" stroke-width="1" opacity=".55"/>' +
        '<line x1="' + (GL.x + GL.w / 2) + '" y1="' + GL.y + '" x2="' + (GL.x + GL.w / 2) + '" y2="' + (GL.y + GL.h) +
        '" stroke="var(--fr-b)" stroke-width="3"/>' +
        "</g>");

      /* riscos de sensor — desenhados DEPOIS do pano, senão a cortina os come */
      let lines = "";
      if (c.show_sensors && (c.sensor_left || c.sensor_right)) {
        // Marca curta no meio da guia. Barra do tamanho do vidro competia com
        // a cortina e lia como "néon", não como sensor.
        const y1 = GL.y + GL.h * 0.36, y2 = GL.y + GL.h * 0.64;
        // Verde/âmbar diz o estado, mas cor sozinha não é canal: o <title> dá o
        // texto, e o resumo do cabeçalho repete em palavra. Regra da casa —
        // cor de status anda com rótulo escrito junto.
        // <title> vai DENTRO da própria <line>, não num <g> em volta: o
        // wrapper custaria dois nós por sensor no pictograma, que é o modo
        // cujo contrato é ser leve.
        if (c.sensor_left) lines += '<line class="sens s-l" x1="' + (FR.x + FR.t / 2) + '" y1="' + y1.toFixed(1) +
          '" x2="' + (FR.x + FR.t / 2) + '" y2="' + y2.toFixed(1) + '"><title class="t-sl"></title></line>';
        if (c.sensor_right) lines += '<line class="sens s-r" x1="' + (FR.x + FR.w - FR.t / 2) + '" y1="' + y1.toFixed(1) +
          '" x2="' + (FR.x + FR.w - FR.t / 2) + '" y2="' + y2.toFixed(1) + '"><title class="t-sr"></title></line>';
      }

      /* blackout: ripas que descem por scaleY */
      if (c.blackout) {
        defs.push(this._slatGrad(c, dark));
        body.push('<rect class="bo" x="' + (GL.x - 2) + '" y="' + (GL.y - 1) + '" width="' + (GL.w + 4) +
          '" height="' + (GL.h + 2) + '" fill="url(#bog)"/>');
      }

      /* cortina: um ou dois panos que fecham por scaleX */
      if (c.curtain) {
        defs.push(this._pleatGrad(c, dark, tex));
        const cy = GL.y - 4, ch = GL.h + drop;
        const cw = (GL.w + over * 2) / (c.curtain_open === "center" ? 2 : 1);
        const x0 = GL.x - over;
        if (c.curtain_open === "center") {
          body.push('<rect class="cur cur-l" x="' + x0 + '" y="' + cy + '" width="' + cw + '" height="' + ch + '" fill="url(#pleat)"/>');
          body.push('<rect class="cur cur-r" x="' + (x0 + cw) + '" y="' + cy + '" width="' + cw + '" height="' + ch + '" fill="url(#pleat)"/>');
        } else {
          body.push('<rect class="cur cur-' + (c.curtain_open === "right" ? "r" : "l") + '" x="' + x0 +
            '" y="' + cy + '" width="' + cw + '" height="' + ch + '" fill="url(#pleat)"/>');
        }
        // varão
        body.push('<rect class="rod" x="' + (x0 - 4) + '" y="' + (cy - 5) + '" width="' + (cw * (c.curtain_open === "center" ? 2 : 1) + 8) + '" height="4" rx="2"/>');
      }

      body.push(lines);

      /* peitoril */
      body.push('<rect class="sill" x="' + SILL.x + '" y="' + SILL.y + '" width="' + SILL.w + '" height="' + SILL.h + '" rx="2"/>');

      // O SVG toma a largura da coluna e a altura sai da proporção (scene_height
      // vira teto, não medida). Com height fixa o desenho ficava com uma tarja
      // vazia de cada lado — a janela parecia um selo no meio do card.
      return '<div class="scene" style="--sh:' + numOr(c.scene_height, 260) + 'px">' +
        '<svg viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
        "<defs>" + defs.join("") + "</defs>" + body.join("") + "</svg></div>";
    }

    // Pregas = paradas alternadas do gradiente. Nada de <path> por prega.
    _pleatGrad(c, dark, tex) {
      const key = c.curtain_paper || c.paper;
      const d = c.curtain_paper ? c.curtain_dark === true : dark;
      const [a, b] = this._stops(key, d, c.curtain_paper ? 0 : (d ? 9 : -14));
      // No pictograma o pano é ícone, não tecido: metade das paradas basta e
      // o desenho inteiro cabe no orçamento de nós que o modo promete.
      const n = c.scene_mode === "pictograma" ? Math.max(4, Math.round(tex.pleat / 2)) : tex.pleat;
      const out = [];
      for (let i = 0; i <= n; i++) {
        const off = (i / n * 100).toFixed(1);
        out.push('<stop offset="' + off + '%" stop-color="' + (i % 2 ? a : b) + '"/>');
      }
      return '<linearGradient id="pleat" x1="0" y1="0" x2="1" y2="0">' + out.join("") + "</linearGradient>";
    }

    _slatGrad(c, dark) {
      const key = c.blackout_paper || c.paper;
      const d = c.blackout_paper ? c.blackout_dark === true : dark;
      const [a, b] = this._stops(key, d, c.blackout_paper ? 0 : (d ? -4 : -34));
      const n = c.scene_mode === "pictograma" ? 6 : 12;
      const out = [];
      for (let i = 0; i <= n; i++) out.push('<stop offset="' + (i / n * 100).toFixed(1) + '%" stop-color="' + (i % 2 ? a : b) + '"/>');
      return '<linearGradient id="bog" x1="0" y1="0" x2="0" y2="1">' + out.join("") + "</linearGradient>";
    }

    // O papel é um linear-gradient CSS; o SVG precisa das duas cores soltas.
    // `dl` afasta o pano da folha quando ele não tem tom próprio.
    _stops(key, dark, dl) {
      const g = dark ? paperDarkGradient(key) : paperGradient(key);
      const m = g.match(/(hsl\([^)]*\)|#[0-9a-f]{3,8})/gi);
      const pair = m && m.length >= 2 ? [m[0], m[1]] : (dark ? ["#2b2825", "#161411"] : ["#e8e3d8", "#cfc9bb"]);
      if (!dl) return pair;
      return [shade(pair[0], dl, 3), shade(pair[1], dl, 3)];
    }

    _skyline(kind, dark) {
      if (kind === "nenhuma") return "";
      const base = GL.y + GL.h;
      const col = dark ? "#0d1017" : "#2a2f3a";
      let d = "M" + GL.x + " " + base;
      const rnd = seeded(kind === "morros" ? 3 : kind === "arvores" ? 5 : 11);
      if (kind === "morros") {
        d += " L" + GL.x + " " + (base - 18);
        for (let x = GL.x; x <= GL.x + GL.w; x += 22) {
          d += " Q" + (x + 11) + " " + (base - 18 - rnd() * 22) + " " + (x + 22) + " " + (base - 14);
        }
      } else if (kind === "arvores") {
        for (let x = GL.x; x <= GL.x + GL.w; x += 14) {
          const hh = 10 + rnd() * 18;
          d += " L" + x + " " + (base - hh * 0.3) + " L" + (x + 7) + " " + (base - hh) + " L" + (x + 14) + " " + (base - hh * 0.3);
        }
      } else {
        for (let x = GL.x; x <= GL.x + GL.w; x += 16) {
          const hh = 8 + rnd() * 30;
          d += " L" + x + " " + (base - hh) + " L" + (x + 16) + " " + (base - hh);
        }
      }
      d += " L" + (GL.x + GL.w) + " " + base + " Z";
      return '<path class="skyline" d="' + d + '" fill="' + col + '" opacity=".62"/>';
    }

    // Efeito no vidro. Todos os elementos são estáticos: o que liga e desliga
    // é uma classe no contêiner, não um redesenho.
    _fx() {
      const rnd = seeded(13);
      let rain = "", dew = "", cold = "";
      for (let i = 0; i < 14; i++) {
        const x = GL.x + rnd() * GL.w, y = GL.y + rnd() * GL.h;
        rain += '<line x1="' + x.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + (x - 3).toFixed(1) + '" y2="' + (y + 9).toFixed(1) + '"/>';
      }
      for (let i = 0; i < 18; i++) {
        const x = GL.x + rnd() * GL.w, y = GL.y + rnd() * GL.h, rr = 0.8 + rnd() * 1.6;
        dew += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + rr.toFixed(1) + '"/>';
      }
      for (let i = 0; i < 10; i++) {
        const x = GL.x + rnd() * GL.w, y = GL.y + rnd() * GL.h, s = 2 + rnd() * 3;
        cold += '<path d="M' + x.toFixed(1) + " " + (y - s).toFixed(1) + "v" + (s * 2).toFixed(1) +
          "M" + (x - s).toFixed(1) + " " + y.toFixed(1) + "h" + (s * 2).toFixed(1) + '"/>';
      }
      return '<g class="fx fx-rain" stroke="#cfe6ff" stroke-width="1" opacity=".55">' + rain + "</g>" +
        '<g class="fx fx-dew" fill="#dff0ff" opacity=".45">' + dew + "</g>" +
        '<g class="fx fx-cold" stroke="#dff2ff" stroke-width=".8" opacity=".6">' + cold + "</g>" +
        '<rect class="fx fx-hot" x="' + GL.x + '" y="' + GL.y + '" width="' + GL.w + '" height="' + GL.h + '" fill="#ff9a4d" opacity=".10"/>';
    }

    /* ---------- controles ---------- */

    _live(c) {
      return TARGETS.filter((t) => !!c[t.cfg]).map((t) => {
        const label = t.k === "op1" && c.opener_right ? t.alt : t.label;
        return { k: t.k, id: c[t.cfg], icon: t.icon, label };
      });
    }

    _steps(c) {
      const raw = String(c.regua_steps == null ? "" : c.regua_steps);
      const out = raw.split(",").map((s) => parseInt(s, 10))
        .filter((n) => !isNaN(n) && n >= 0 && n <= 100);
      // Sem degrau nenhum a régua vira barra muda: o dedo não teria onde
      // acertar 50% sem mirar, que é o motivo de ela existir.
      return out.length ? Array.from(new Set(out)).sort((a, b) => a - b) : [0, 50, 100];
    }

    // `alt` é o rótulo do estado ligado. Um botão que diz "Ligar" quando a
    // coisa já está ligada é a mentira mais fácil de cometer num card.
    _piece(a, k, icon, label, extra, alt) {
      return '<button type="button" class="mwp-k" data-a="' + a + '" data-k="' + k + '"' +
        (alt ? ' data-loff="' + esc(label) + '" data-lon="' + esc(alt) + '"' : "") +
        (extra || "") + ' aria-label="' + esc(label) + '">' +
        '<ha-icon icon="' + icon + '"></ha-icon>' +
        (this._config.control_labels ? '<span class="kl">' + esc(label) + "</span>" : "") +
        "</button>";
    }

    _ruler(c, k, label) {
      if (c.slider_style === "none") return "";
      if (c.slider_style === "barra") {
        return '<input class="cs" type="range" min="0" max="100" step="1" data-s="' + k +
          '" aria-label="' + esc("Posição de " + label) + '">';
      }
      const steps = this._steps(c);
      const marks = steps.map((v) => '<button type="button" class="rgs" data-v="' + v +
        '" style="left:' + v + '%" tabindex="-1" aria-hidden="true"></button>').join("");
      return '<div class="mwp-rg" data-s="' + k + '" role="slider" tabindex="0"' +
        ' aria-label="' + esc("Posição de " + label) + '"' +
        ' aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
        '<div class="rgf"></div><div class="rgk"></div>' + marks + '<div class="rgv">—</div></div>';
    }

    _controls(c) {
      if (c.controls === "none") return "";
      const live = this._live(c);
      if (!live.length && !c.exhaust) return "";
      const compact = c.controls === "compact";
      const rows = live.map((t) => {
        const rg = c.slider_style === "regua";
        return '<div class="ctl' + (rg ? " hasrg" : "") + '" data-k="' + t.k + '">' +
          '<div class="chead">' +
          '<ha-icon class="ci" icon="' + t.icon + '"></ha-icon>' +
          '<span class="cn">' + esc(t.label) + "</span>" +
          '<span class="cp" data-p="' + t.k + '">—</span>' +
          "</div>" +
          this._ruler(c, t.k, t.label) +
          '<div class="cbar">' +
          this._piece("close", t.k, "mdi:arrow-collapse-vertical", "Fechar") +
          (c.stop_button ? this._piece("stop", t.k, "mdi:stop", "Parar") : "") +
          this._piece("open", t.k, "mdi:arrow-expand-vertical", "Abrir") +
          "</div>" +
          "</div>";
      });
      if (c.exhaust) {
        rows.push('<div class="ctl" data-k="exh">' +
          '<div class="chead"><ha-icon class="ci" icon="mdi:fan"></ha-icon>' +
          '<span class="cn">Exaustor</span><span class="cp" data-p="exh">—</span></div>' +
          '<div class="cbar">' + this._piece("toggle", "exh", "mdi:fan", "Ligar", "", "Desligar") + "</div></div>");
      }
      return '<div class="ctls' + (compact ? " compact" : "") + '">' + rows.join("") + "</div>";
    }

    /* ---------- modo ambiente: tudo de uma vez ---------- */

    // Uma fileira de peças grandes com TUDO do ambiente. É o que a sala (dois
    // empurradores) e a suíte pedem na prática: o dono não quer uma linha por
    // alvo, quer bater o dedo em "fechar tudo".
    _roomBar(c, h) {
      const live = this._live(c);
      const tiles = live.map((t) => this._piece("toggle", t.k, t.icon, t.label,
        ' data-room="1"'));
      if (c.room_extras && c.exhaust) tiles.push(this._piece("toggle", "exh", "mdi:fan", "Exaustor", ' data-room="1"'));
      const all = live.length > 1;
      const extra = all
        ? '<div class="rall">' +
          this._piece("all-open", "all", "mdi:arrow-expand-all", "Abrir tudo", ' data-wide="1"') +
          this._piece("all-close", "all", "mdi:arrow-collapse-all", "Fechar tudo", ' data-wide="1"') +
          "</div>"
        : "";
      return '<div class="ctls room">' +
        '<div class="rtiles">' + tiles.join("") + "</div>" + extra +
        (c.slider_style === "none" || !live.length ? "" :
          '<div class="rslid">' + live.map((t) =>
            '<div class="ctl' + (c.slider_style === "regua" ? " hasrg" : "") + '" data-k="' + t.k + '">' +
            '<div class="chead"><ha-icon class="ci" icon="' + t.icon + '"></ha-icon>' +
            '<span class="cn">' + esc(t.label) + '</span><span class="cp" data-p="' + t.k + '">—</span></div>' +
            this._ruler(c, t.k, t.label) + "</div>").join("") + "</div>") +
        "</div>";
    }

    /* ---------- folha de estilo ---------- */

    // ATENÇÃO: nunca use crase dentro deste template literal, nem em
    // comentário. Uma crase solta fecha a string e o node --check acusa
    // "SyntaxError: Unexpected identifier" numa linha que parece inocente.
    _css(c, dark, ink, bg, fr, tex) {
      const size = clamp(numOr(c.control_size, 56), 44, 96);
      const rad = numOr(c.radius, 16);
      const flat = c.depth === "flat" || c.control_style === "chapado";
      const soft = c.depth === "soft";
      const skin = mwpSkin(bg, dark);
      const drop = dark
        ? (flat ? "none" : soft ? "0 4px 12px rgba(0,0,0,.45)" : "0 2px 6px rgba(0,0,0,.5),0 10px 26px rgba(0,0,0,.4)")
        : (flat ? "none" : soft ? "0 4px 12px rgba(0,0,0,.12)" : "0 2px 6px rgba(0,0,0,.14),0 10px 26px rgba(0,0,0,.10)");

      return "" +
        ":host{display:block;}" +
        ".root{--ink:" + ink.text + ";--dim:" + ink.dim + ";--line:" + ink.line + ";" +
        "--fr-a:" + fr.a + ";--fr-b:" + fr.b + ";--fr-c:" + fr.c + ";" +
        "--t1:0px;--t2:0px;--cl:1;--cr:1;--bo:0;--sky-a:#7fb4e3;--sky-b:#a9d2ef;--sky-c:#dfeefb;" +
        "background:" + bg + ";color:var(--ink);border-radius:" + rad + "px;" +
        "border:1px solid " + skin.edge + ";box-shadow:" + drop + ";" +
        "overflow:hidden;padding:10px 10px 12px;box-sizing:border-box;}" +
        // O relevo interno da folha é a única sombra "de papel" do card; os
        // controles trazem a deles do mw-paper-control.
        (flat ? "" : ".root{box-shadow:" + drop + ",inset 2px 2px 4px " +
          (dark ? "rgba(255,255,255,0.08)" : "rgba(255,250,235,0.75)") + ",inset -2px -2px 4px " +
          (dark ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.07)") + ";}") +

        /* cabeçalho */
        ".head{display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;}" +
        ".titlewrap{min-width:0;flex:1;}" +
        ".title{font-size:15px;font-weight:650;line-height:1.15;overflow:hidden;" +
        "text-overflow:ellipsis;white-space:nowrap;}" +
        ".summary{font-size:11.5px;color:var(--dim);margin-top:1px;overflow:hidden;" +
        "text-overflow:ellipsis;white-space:nowrap;}" +
        ".badges{display:flex;gap:5px;align-items:center;flex:0 0 auto;}" +
        ".bdg{display:inline-flex;align-items:center;gap:3px;font-size:11px;" +
        "padding:2px 7px;border-radius:999px;border:1px solid var(--line);" +
        "font-variant-numeric:tabular-nums;white-space:nowrap;}" +
        ".bdg ha-icon{--mdc-icon-size:13px;}" +

        /* cena */
        ".scene{position:relative;contain:layout paint style;}" +
        ".scene svg{width:100%;height:auto;max-height:var(--sh);display:block;margin:0 auto;}" +
        ".glass{transition:none;}" +
        ".pane{fill:rgba(190,215,235,.16);stroke:rgba(255,255,255,.22);stroke-width:.7;" +
        "transform:translateX(var(--tv));}" +
        ".frame{}" +
        // O peitoril é apoio, não protagonista: cheio de fr-b ele virava uma
        // barra clara atravessando o card de papel escuro.
        ".sill{fill:var(--fr-c);opacity:.75;}" +
        ".rod{fill:var(--fr-c);}" +
        ".stars{opacity:var(--night,0);}" +
        ".sun{fill:var(--sun-c,#ffd98a);opacity:var(--sun-o,1);" +
        "transform:translate(var(--sun-x,120px),var(--sun-y,40px));}" +
        ".cur{transform-origin:left center;}" +
        ".cur-l{transform:scaleX(var(--cl));}" +
        ".cur-r{transform-origin:right center;transform:scaleX(var(--cr));}" +
        ".bo{transform-origin:top center;transform:scaleY(var(--bo));}" +
        ".sens{stroke:#36c07a;stroke-width:3.5;stroke-linecap:round;opacity:.9;}" +
        ".sens.open{stroke:#e0a23f;opacity:.9;}" +
        ".sens.dead{stroke:var(--dim);opacity:.4;}" +
        // Efeito no vidro: tudo desenhado uma vez, ligado por classe. Nada
        // aqui anima — gota que cai custa um quadro inteiro por gota.
        ".fx{display:none;}" +
        ".fx-on.fx-rain .fx-rain,.fx-on.fx-dew .fx-dew,.fx-on.fx-cold .fx-cold,.fx-on.fx-hot .fx-hot{display:inline;}" +

        // Movimento é enfeite: quem pediu menos movimento no sistema recebe o
        // card inteiro parado, e ele continua contando o mesmo estado.
        "@media (prefers-reduced-motion: no-preference){" +
        ".pane{transition:transform .45s ease;}" +
        ".cur,.bo{transition:transform .5s ease;}" +
        ".stars{transition:opacity .6s ease;}}" +

        /* controles */
        mwpControlCss({ bg, dark, size, ink, radius: Math.max(8, Math.round(rad * 0.7)) }) +
        // control_style: chapado promete "sem relevo" NO CONTROLE. Sem isto o
        // editor prometia e só a moldura do cartão perdia a sombra — a peça
        // saía byte a byte igual à do modo papel.
        (c.control_style === "chapado"
          ? ".mwp-k,.mwp-k.off,.mwp-k:active,.mwp-k.off:active{box-shadow:none;}"
          + ".mwp-rg,.mwp-rg .rgf{box-shadow:none;}"
          : "") +
        ".ctls{container-type:inline-size;display:grid;gap:9px;margin-top:9px;" +
        "padding-top:9px;border-top:1px solid var(--line);contain:layout style;}" +
        ".ctl{display:grid;gap:6px;}" +
        ".chead{display:flex;align-items:center;gap:6px;min-width:0;}" +
        ".ci{--mdc-icon-size:17px;color:var(--dim);flex:0 0 auto;}" +
        ".cn{font-size:12.5px;font-weight:600;flex:1;min-width:0;overflow:hidden;" +
        "text-overflow:ellipsis;white-space:nowrap;}" +
        ".cp{font-size:12.5px;font-weight:700;color:var(--dim);" +
        "font-variant-numeric:tabular-nums;flex:0 0 auto;}" +
        // Em coluna larga os botões repartem a linha em vez de ficarem encolhidos
        // num canto; o teto de 116 px impede a peça de virar um outdoor.
        ".cbar{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(44px,116px);gap:8px;}" +
        ".cbar .mwp-k{width:100%;}" +
        ".ctl.dead{opacity:.45;}" +
        // O % já aparece dentro da régua; repetir 10 px acima é ruído.
        ".ctl.hasrg .chead .cp{display:none;}" +
        ".ctl.moving .cp{color:var(--ink);}" +
        // Compacto tira o rótulo, não o tamanho: alvo pequeno é o defeito que
        // este card nasceu para consertar.
        ".ctls.compact .chead{gap:4px;}" +
        ".ctls.compact .cn{font-size:11.5px;}" +
        ".cs{width:100%;height:" + MWP_MIN_TOUCH + "px;accent-color:var(--primary-color);}" +

        /* modo ambiente */
        ".ctls.room{gap:10px;}" +
        ".rtiles{display:flex;flex-wrap:wrap;gap:8px;}" +
        ".rall{display:flex;gap:8px;}" +
        // "Fechar tudo" não cabe num quadrado de 56 px — e rótulo cortado
        // ("Fechar t...") num botão que fecha a casa inteira é perigoso.
        '.mwp-k[data-wide]{width:auto;min-width:' + Math.max(96, Math.round(size * 1.7)) + 'px;padding:0 10px;}' +
        ".mwp-k[data-wide] .kl{max-width:none;}" +
        ".rslid{display:grid;gap:8px;}" +
        ".root .mwp-k[data-room] .kl{max-width:" + Math.round(size * 1.15) + "px;}" +

        /* container query: coluna estreita encolhe o texto, nunca o alvo */
        "@container (max-width: 300px){.cn{font-size:11.5px;}.kl{display:none;}" +
        ".cbar{gap:6px;}.rtiles{gap:6px;}}" +
        "@container (max-width: 220px){.chead .cp{font-size:11.5px;}}";
    }

    /* ---------- ligação dos eventos ---------- */

    _idOf(k) {
      const c = this._config;
      return k === "op1" ? c.opener : k === "op2" ? c.opener_right
        : k === "cur" ? c.curtain : k === "bo" ? c.blackout : k === "exh" ? c.exhaust : "";
    }

    _buzz(kind) { if (this._config.haptic !== false) haptic(kind); }

    async _guard(label, acao) {
      const c = this._config;
      if (c.confirm !== true) return true;
      const dark = c.paper_dark === true;
      return confirmAction(c.confirm_text, label, acao, {
        paper3d: true, dark,
        bg: dark ? paperDarkGradient(c.paper) : paperGradient(c.paper),
        ink: paperInk(dark),
      });
    }

    _call(domain, service, data) {
      if (!this._hass) return;
      this._hass.callService(domain, service, data);
    }

    // Um cover pode estar num estado em que "abrir" não faz nada. Mandar o
    // serviço mesmo assim é barato e o HA resolve; o que NÃO pode é a tela
    // mentir que mandou quando a entidade não existe.
    async _doAction(a, k) {
      const id = this._idOf(k);
      const c = this._config;
      if (a === "all-open" || a === "all-close") {
        const ids = this._live(c).map((t) => this._idOf(t.k)).filter(Boolean);
        if (!ids.length) return;
        if (!(await this._guard(c.name || "tudo", a === "all-open" ? "abrir" : "fechar"))) return;
        this._buzz("medium");
        this._call("cover", a === "all-open" ? "open_cover" : "close_cover", { entity_id: ids });
        return;
      }
      if (!id) return;
      if (k === "exh") {
        if (!(await this._guard(friendly(this._hass, id), "alternar"))) return;
        this._call("homeassistant", "toggle", { entity_id: id });
        return;
      }
      if (a === "toggle") {
        if (!(await this._guard(friendly(this._hass, id), "alternar"))) return;
        this._call("cover", "toggle", { entity_id: id });
        return;
      }
      const svc = a === "open" ? "open_cover" : a === "close" ? "close_cover" : "stop_cover";
      if (a !== "stop" && !(await this._guard(friendly(this._hass, id), a === "open" ? "abrir" : "fechar"))) return;
      this._call("cover", svc, { entity_id: id });
    }

    _setPos(k, v) {
      const id = this._idOf(k);
      if (!id) return;
      const c = this._config;
      // A inversão é do empurrador, não da cortina: quem inverteu a leitura
      // tem de inverter a escrita também, senão o card "anda para trás".
      const out = c.invert_position === true && k.indexOf("op") === 0 ? 100 - v : v;
      this._call("cover", "set_cover_position", { entity_id: id, position: clamp(Math.round(out), 0, 100) });
    }

    _wire() {
      const root = this._root;

      // peças: toque curto age, toque longo abre detalhes
      root.querySelectorAll(".mwp-k").forEach((b) => {
        let timer = null, held = false;
        const k = b.dataset.k, a = b.dataset.a;
        b.addEventListener("pointerdown", () => {
          held = false;
          this._buzz("light");
          timer = setTimeout(() => {
            timer = null; held = true;
            this._buzz("medium");
            const id = this._idOf(k);
            if (id) this._moreInfo(id);
          }, 500);
        });
        ["pointerleave", "pointercancel"].forEach((t) =>
          b.addEventListener(t, () => { if (timer) { clearTimeout(timer); timer = null; } }));
        b.addEventListener("pointerup", () => {
          if (timer) { clearTimeout(timer); timer = null; }
          if (held) return;
          this._doAction(a, k);
        });
        // Teclado: a peça é um <button>, então Enter/Espaço já disparam click.
        b.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); });
      });

      // barra simples
      root.querySelectorAll(".cs").forEach((s) => {
        s.addEventListener("change", () => this._setPos(s.dataset.s, +s.value));
      });

      // régua de papel: degrau, arrasto e teclado
      root.querySelectorAll(".mwp-rg").forEach((rg) => this._wireRuler(rg));
    }

    _wireRuler(rg) {
      const k = rg.dataset.s;
      const pct = (ev) => {
        const r = rg.getBoundingClientRect();
        if (!r.width) return 0;
        return clamp(Math.round(((ev.clientX - r.left) / r.width) * 100), 0, 100);
      };
      // Degrau: alvo de 44 px sobre uma marca de 2 px. O dedo acerta o alvo.
      rg.querySelectorAll(".rgs").forEach((s) => {
        s.addEventListener("pointerdown", (e) => e.stopPropagation());
        s.addEventListener("click", (e) => {
          e.preventDefault(); e.stopPropagation();
          this._buzz("selection");
          this._preview(k, +s.dataset.v);
          this._setPos(k, +s.dataset.v);
        });
      });
      // Arrasto: durante o gesto só o DESENHO se mexe. Chamar o serviço a cada
      // pixel entupiria o WebSocket e o estado velho voltaria puxando a peça
      // de volta no meio do dedo.
      rg.addEventListener("pointerdown", (e) => {
        if (rg.hasAttribute("disabled")) return;
        this._dragging = k;
        rg.classList.add("drag");
        try { rg.setPointerCapture(e.pointerId); } catch (_) { /* sem captura: segue no move */ }
        this._buzz("selection");
        this._preview(k, pct(e));
      });
      rg.addEventListener("pointermove", (e) => {
        if (this._dragging !== k) return;
        this._preview(k, pct(e));
      });
      const end = (e) => {
        if (this._dragging !== k) return;
        const v = pct(e);
        this._dragging = null;
        rg.classList.remove("drag");
        this._buzz("light");
        this._setPos(k, v);
      };
      rg.addEventListener("pointerup", end);
      rg.addEventListener("pointercancel", () => { this._dragging = null; rg.classList.remove("drag"); this._paint(true); });
      // Teclado — nenhum outro card MW tem isso, e é o que faz a régua ser
      // um controle de verdade e não um enfeite que responde ao dedo.
      rg.addEventListener("keydown", (e) => {
        const cur = +rg.getAttribute("aria-valuenow") || 0;
        let v = null;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") v = cur + (e.key === "ArrowUp" ? 10 : 5);
        else if (e.key === "ArrowLeft" || e.key === "ArrowDown") v = cur - (e.key === "ArrowDown" ? 10 : 5);
        else if (e.key === "Home") v = 0;
        else if (e.key === "End") v = 100;
        else if (e.key === "PageUp") v = cur + 25;
        else if (e.key === "PageDown") v = cur - 25;
        if (v == null) return;
        e.preventDefault();
        v = clamp(v, 0, 100);
        this._preview(k, v);
        this._setPos(k, v);
      });
    }

    // Move só o desenho, sem falar com o HA.
    _preview(k, v) {
      const root = this._root;
      const rg = root.querySelector('.mwp-rg[data-s="' + k + '"]');
      if (rg) {
        rg.style.setProperty("--rgp", (v / 100).toFixed(3));
        rg.setAttribute("aria-valuenow", String(v));
        rg.setAttribute("aria-valuetext", v + "%");
        const rv = rg.querySelector(".rgv");
        if (rv) rv.textContent = v + "%";
      }
      const cp = root.querySelector('.cp[data-p="' + k + '"]');
      if (cp) cp.textContent = v + "%";
      this._sceneVar(k, v);
    }

    _sceneVar(k, v) {
      const s = this._root.querySelector(".root");
      if (!s) return;
      if (k === "op1") s.style.setProperty("--t1", (v / 100 * (GL.w / 2 - 2)).toFixed(1) + "px");
      else if (k === "op2") s.style.setProperty("--t2", (v / 100 * (GL.w / 2 - 2)).toFixed(1) + "px");
      else if (k === "cur") {
        const closed = 1 - v / 100;
        s.style.setProperty("--cl", closed.toFixed(3));
        s.style.setProperty("--cr", closed.toFixed(3));
      } else if (k === "bo") s.style.setProperty("--bo", ((100 - v) / 100).toFixed(3));
    }

    _moreInfo(entityId) {
      this.dispatchEvent(new CustomEvent("hass-more-info", {
        bubbles: true, composed: true, detail: { entityId },
      }));
    }

    /* ---------- pintura ---------- */

    _paint(force) {
      if (!this._config || !this._hass || !this._root) return;
      if (this._visible === false && !force) return;
      const c = this._config, r = this._read();

      // Assinatura: se nada que a tela mostra mudou, não escreve nada. O HA
      // entrega um hass novo a cada evento da casa inteira.
      const sig = [
        r.op1.pos, r.op1.state, r.op2.pos, r.op2.state, r.cur.pos, r.cur.state,
        r.bo.pos, r.bo.state, r.exh.on, r.exh.state, r.t, r.hum, r.bat,
        r.sl && r.sl.on, r.sr && r.sr.on, r.phase, r.fx,
      ].join("|");
      if (!force && sig === this._sig) return;
      this._sig = sig;

      const root = this._root.querySelector(".root");
      if (!root) return;
      const dk = this._dragging;   // a peça sob o dedo não é repintada

      const half = GL.w / 2 - 2;
      if (dk !== "op1") root.style.setProperty("--t1", ((r.op1.pos || 0) / 100 * half).toFixed(1) + "px");
      if (dk !== "op2") root.style.setProperty("--t2", ((r.op2.pos || 0) / 100 * half).toFixed(1) + "px");
      if (dk !== "cur") {
        const closed = 1 - (r.cur.pos || 0) / 100;
        root.style.setProperty("--cl", closed.toFixed(3));
        root.style.setProperty("--cr", closed.toFixed(3));
      }
      if (dk !== "bo") root.style.setProperty("--bo", ((100 - (r.bo.pos == null ? 100 : r.bo.pos)) / 100).toFixed(3));

      /* céu e paisagem */
      if (c.scene_mode === "paisagem") {
        const sky = SKY[r.phase] || SKY.day;
        root.style.setProperty("--sky-a", sky[0]);
        root.style.setProperty("--sky-b", sky[1]);
        root.style.setProperty("--sky-c", sky[2]);
        const night = r.phase === "night" || r.phase === "twilight";
        root.style.setProperty("--night", night ? "1" : "0");
        root.style.setProperty("--sun-c", night ? "#eef1f7" : "#ffd98a");
        root.style.setProperty("--sun-o", r.phase === "day" || r.phase === "morning" || night ? "1" : ".9");
        const hh = new Date().getHours() + new Date().getMinutes() / 60;
        const frac = clamp((hh - 6) / 12, 0, 1);
        root.style.setProperty("--sun-x", (GL.x + 14 + frac * (GL.w - 28)).toFixed(0) + "px");
        root.style.setProperty("--sun-y", (GL.y + 46 - Math.sin(frac * Math.PI) * 32).toFixed(0) + "px");
        const g = this._el.glass && this._el.glass.parentElement;
        const holder = this._root.querySelector(".scene svg");
        if (holder) {
          holder.classList.toggle("fx-on", r.fx !== "none");
          ["rain", "dew", "hot", "cold"].forEach((f) => holder.classList.toggle("fx-" + f, r.fx === f));
        }
      } else {
        const sky = SKY[r.phase] || SKY.day;
        root.style.setProperty("--sky-a", c.glass_tint === false ? "#cfe0ee" : sky[1]);
        root.style.setProperty("--sky-c", c.glass_tint === false ? "#eaf1f6" : sky[2]);
      }

      /* riscos de sensor */
      const sl = this._root.querySelector(".s-l"), sr = this._root.querySelector(".s-r");
      const diz = (info) => (info.dead ? "sem contato" : info.on ? "aberto" : "fechado");
      if (sl && r.sl) {
        sl.classList.toggle("open", r.sl.on); sl.classList.toggle("dead", r.sl.dead);
        const t = this._root.querySelector(".t-sl");
        if (t) t.textContent = "Sensor esquerdo: " + diz(r.sl);
      }
      if (sr && r.sr) {
        sr.classList.toggle("open", r.sr.on); sr.classList.toggle("dead", r.sr.dead);
        const t = this._root.querySelector(".t-sr");
        if (t) t.textContent = "Sensor direito: " + diz(r.sr);
      }

      this._paintControls(r, dk);
      const resumo = this._summary(r);
      if (c.show_header) {
        if (this._el.summary) this._el.summary.textContent = resumo;
        this._badges(c, r);
      }
      if (this._el.root) {
        const rot = (c.name || friendly(this._hass, c.opener || c.curtain || c.blackout || c.exhaust)
          || "Janela") + (resumo ? ": " + resumo : "");
        if (rot !== this._rotulo) { this._rotulo = rot; this._el.root.setAttribute("aria-label", rot); }
      }
    }

    _paintControls(r, dk) {
      const c = this._config;
      if (!this._ctlEls) {
        this._ctlEls = {};
        this._root.querySelectorAll(".ctl[data-k]").forEach((el) => { this._ctlEls[el.dataset.k] = el; });
      }
      const put = (k, info) => {
        const el = this._ctlEls[k];
        if (!el) return;
        el.classList.toggle("dead", !!info.dead);
        el.classList.toggle("moving", !!info.moving);
        if (dk === k) return;
        const v = info.pos == null ? null : info.pos;
        const cp = el.querySelector(".cp");
        if (cp) cp.textContent = info.dead ? "—" : v == null ? (info.state === "open" ? "aberto" : "fechado") : v + "%";
        const rg = el.querySelector(".mwp-rg");
        if (rg) {
          rg.style.setProperty("--rgp", ((v || 0) / 100).toFixed(3));
          rg.setAttribute("aria-valuenow", String(v || 0));
          rg.setAttribute("aria-valuetext", (v || 0) + "%");
          if (info.dead) rg.setAttribute("disabled", ""); else rg.removeAttribute("disabled");
          const rv = rg.querySelector(".rgv");
          if (rv) rv.textContent = info.dead ? "—" : (v || 0) + "%";
        }
        const cs = el.querySelector(".cs");
        if (cs && document.activeElement !== cs) cs.value = String(v || 0);
        el.querySelectorAll(".mwp-k").forEach((b) => {
          if (info.dead) b.setAttribute("disabled", ""); else b.removeAttribute("disabled");
          // A peça "afunda" quando o alvo está fechado: o relevo conta o
          // estado sem precisar de cor de alerta.
          if (b.dataset.a === "toggle" || b.dataset.room) b.classList.toggle("off", !info.dead && (v == null ? info.state !== "open" : v < 5));
        });
      };
      put("op1", r.op1); put("op2", r.op2); put("cur", r.cur); put("bo", r.bo);
      const ex = this._ctlEls.exh;
      if (ex) {
        ex.classList.toggle("dead", !!r.exh.dead);
        const cp = ex.querySelector(".cp");
        if (cp) cp.textContent = r.exh.dead ? "—" : r.exh.on ? "ligado" : "desligado";
        ex.querySelectorAll(".mwp-k").forEach((b) => {
          b.classList.toggle("off", !r.exh.on);
          const lab = r.exh.on ? b.dataset.lon : b.dataset.loff;
          if (lab) {
            b.setAttribute("aria-label", lab);
            const kl = b.querySelector(".kl");
            if (kl && kl.textContent !== lab) kl.textContent = lab;
          }
        });
      }
      // No modo ambiente as peças ficam fora de .ctl — pintar pelo data-k.
      if (c.room_mode) {
        this._root.querySelectorAll('.rtiles .mwp-k[data-k]').forEach((b) => {
          const k = b.dataset.k;
          const info = k === "exh" ? { pos: r.exh.on ? 100 : 0, dead: r.exh.dead, state: r.exh.on ? "open" : "closed" } : r[k];
          if (!info) return;
          if (info.dead) b.setAttribute("disabled", ""); else b.removeAttribute("disabled");
          const v = info.pos;
          b.classList.toggle("off", !info.dead && (v == null ? info.state !== "open" : v < 5));
        });
      }
    }

    _summary(r) {
      const bits = [];
      const say = (label, info) => {
        if (info.dead) return;
        if (info.pos == null) { if (info.state !== "missing") bits.push(label + " " + (info.state === "open" ? "aberta" : "fechada")); return; }
        bits.push(label + " " + info.pos + "%");
      };
      say("janela", r.op1);
      if (this._config.opener_right) say("direita", r.op2);
      if (this._config.curtain) say("cortina", r.cur);
      if (this._config.blackout) say("blackout", r.bo);
      if (this._config.exhaust && !r.exh.dead) bits.push("exaustor " + (r.exh.on ? "ligado" : "desligado"));
      // O estado do sensor entra no resumo em PALAVRA: no SVG ele só tem cor,
      // e a cena inteira é aria-hidden.
      const sens = [];
      if (r.sl && !r.sl.dead) sens.push("esquerda " + (r.sl.on ? "aberta" : "fechada"));
      if (r.sr && !r.sr.dead) sens.push("direita " + (r.sr.on ? "aberta" : "fechada"));
      if (sens.length) bits.push(sens.join(" e "));
      return bits.join(" · ");
    }

    _badges(c, r) {
      const b = this._el.badges;
      if (!b) return;
      const out = [];
      if (c.show_climate && r.t != null) {
        out.push('<span class="bdg v-temp" style="background:' + mwClimateColor("temperature", r.t, 0.5) +
          '"><ha-icon icon="mdi:thermometer"></ha-icon>' + nfmt(this._hass, r.t, 1) + "°</span>");
      }
      if (c.show_climate && r.hum != null) {
        out.push('<span class="bdg v-hum" style="background:' + mwClimateColor("humidity", r.hum, 0.5) +
          '"><ha-icon icon="mdi:water-percent"></ha-icon>' + nfmt(this._hass, Math.round(r.hum), 0) + "%</span>");
      }
      const wantBat = c.show_battery === "sempre" || (c.show_battery === "auto" && r.bat != null && r.bat <= 35);
      if (wantBat && r.bat != null) {
        out.push('<span class="bdg v-bat" style="color:' + batteryColor(r.bat) + '"><ha-icon icon="' +
          batteryIcon(r.bat) + '"></ha-icon>' + Math.round(r.bat) + "%</span>");
      }
      const html = out.join("");
      // innerHTML só quando MUDOU: reescrever a cada quadro joga fora os nós
      // do ha-icon e o ícone pisca.
      if (html !== this._badgeHtml) { this._badgeHtml = html; b.innerHTML = html; }
    }
  }

  /* ==================== o editor ==================== */

  // Sem shadow DOM de propósito: o ha-form do HA herda o tema pela árvore
  // clara. Por isso toda classe leva o prefixo wcp-.
  class MwWindowCurtainPaperCardEditor extends HTMLElement {
    setConfig(config) {
      this._config = Object.assign({}, DEFAULTS, config || {});
      if (this._hass) this._render();
    }

    set hass(hass) {
      const first = !this._hass;
      this._hass = hass;
      // ARMADILHA: o HA chama setConfig ANTES de entregar o hass. Sem refazer
      // a montagem na primeira entrega, o editor mostra só o campo "Nome".
      if (first) this._build();
      else this._render();
    }

    get _cfg() { return this._config || DEFAULTS; }

    _build() {
      if (!this._config) return;
      this.innerHTML =
        "<style>" + this._css() + "</style>" +
        '<div class="wcp-ed">' +
        '<div class="wcp-prev"></div>' +
        '<div class="wcp-auto">' +
        '<div class="wcp-hint">Escolha o ambiente e o card se monta sozinho com o que a área tem.</div>' +
        '<div class="wcp-autorow"><select class="wcp-area"></select>' +
        '<button type="button" class="wcp-btn wcp-fill">Montar a janela sozinho</button></div>' +
        "</div>" +
        '<div class="wcp-tabs">' + TABS.map((t, i) =>
          '<button type="button" class="wcp-tab' + (i === 0 ? " on" : "") + '" data-t="' + t.id + '">' +
          '<ha-icon icon="' + t.icon + '"></ha-icon><span>' + t.label + "</span></button>").join("") +
        "</div>" +
        '<div class="wcp-body">' + TABS.map((t, i) =>
          '<div class="wcp-pane" data-p="' + t.id + '"' + (i === 0 ? "" : " hidden") + "></div>").join("") +
        "</div></div>";

      this.querySelectorAll(".wcp-tab").forEach((b) => b.addEventListener("click", () => {
        this.querySelectorAll(".wcp-tab").forEach((x) => x.classList.toggle("on", x === b));
        this.querySelectorAll(".wcp-pane").forEach((p) => { p.hidden = p.dataset.p !== b.dataset.t; });
      }));
      TABS.forEach((t) => this._buildPane(t.id, this.querySelector('.wcp-pane[data-p="' + t.id + '"]')));

      const sel = this.querySelector(".wcp-area");
      areaOptions(this._hass).forEach((o) => {
        const op = document.createElement("option");
        op.value = o.value; op.textContent = o.label;
        sel.appendChild(op);
      });
      sel.value = this._cfg.area || "";
      sel.addEventListener("change", () => this._set("area", sel.value));
      this.querySelector(".wcp-fill").addEventListener("click", () => this._autofill(sel.value));

      this._render();
    }

    _buildPane(id, pane) {
      if (!pane) return;
      const add = (html) => { const d = document.createElement("div"); d.innerHTML = html; pane.appendChild(d.firstChild); };
      if (id === "janela") add('<div class="wcp-hint">Uma janela precisa de pelo menos um alvo. A sala tem dois empurradores; os demais ambientes, um.</div>');
      if (id === "controles") add('<div class="wcp-hint">O botão nunca fica abaixo de 44 px — é o menor quadrado que o polegar acerta sem mirar.</div>');
      if (id === "ambiente") add('<div class="wcp-hint">No modo ambiente o card vira uma fileira de peças grandes: janela, cortina, blackout e exaustor lado a lado, mais «abrir tudo» e «fechar tudo».</div>');
      if (id === "cena") add('<div class="wcp-hint">O pictograma custa menos de um terço dos nós do desenho com paisagem. Numa view com muitas janelas, é a diferença entre abrir e travar.</div>');
      const form = document.createElement("ha-form");
      form.classList.add("wcp-form");
      form.dataset.pane = id;
      form.addEventListener("value-changed", (e) => this._onForm(e));
      pane.appendChild(form);
      if (id === "estilo") {
        pane.appendChild(this._swatch("paper", "Tom de papel do card"));
      }
      if (id === "cena") {
        pane.appendChild(this._swatch("curtain_paper", "Tom de papel da cortina"));
        pane.appendChild(this._swatch("blackout_paper", "Tom de papel do blackout"));
      }
    }

    _swatch(target, label) {
      const w = document.createElement("div");
      w.className = "wcp-swwrap";
      w.innerHTML = '<div class="wcp-swlabel">' + esc(label) + "</div>" +
        '<div class="wcp-sw" data-target="' + target + '"></div>';
      return w;
    }

    _schemaFor(id) {
      const h = this._hass;
      const covers = entOptions(h, ["cover"]);
      const sel = (options) => ({ selector: { select: { mode: "dropdown", options } } });
      const bool = { selector: { boolean: {} } };
      const num = (min, max, step) => ({ selector: { number: { min, max, step, mode: "box" } } });
      const txt = { selector: { text: {} } };
      const ent = (domains) => ({ selector: { entity: { domain: domains } } });
      const mk = (name, extra) => Object.assign({ name, label: LABELS[name] || name }, extra);

      if (id === "janela") {
        return [
          mk("name", txt),
          mk("opener", ent(["cover"])), mk("opener_right", ent(["cover"])),
          mk("curtain", ent(["cover"])), mk("blackout", ent(["cover"])),
          mk("exhaust", ent(["fan", "switch"])),
          mk("sensor_left", ent(["binary_sensor"])), mk("sensor_right", ent(["binary_sensor"])),
          mk("invert_position", bool),
          mk("panes", sel(OPT.panes)), mk("pane_run", sel(OPT.pane_run)),
        ];
      }
      if (id === "controles") {
        return [
          mk("controls", sel(OPT.controls)),
          mk("control_size", num(44, 96, 2)),
          mk("control_style", sel(OPT.control_style)),
          mk("control_labels", bool),
          mk("slider_style", sel(OPT.slider_style)),
          mk("regua_steps", txt),
          mk("stop_button", bool),
          mk("haptic", bool),
          mk("confirm", bool), mk("confirm_text", txt),
          mk("tap_action", sel(OPT.tap_action)), mk("hold_action", sel(OPT.hold_action)),
        ];
      }
      if (id === "ambiente") {
        return [mk("room_mode", bool), mk("room_extras", bool)];
      }
      if (id === "cena") {
        return [
          mk("scene_mode", sel(OPT.scene_mode)),
          mk("scene_height", num(90, 400, 5)),
          mk("frame_tone", sel(OPT.frame_tone)),
          mk("glass_tint", bool),
          mk("curtain_texture", sel(OPT.curtain_texture)),
          mk("curtain_open", sel(OPT.curtain_open)),
          mk("curtain_overhang", num(0, 60, 1)), mk("curtain_drop", num(0, 80, 1)),
          mk("curtain_dark", bool), mk("blackout_dark", bool),
          mk("show_sensors", bool),
          mk("scenery_skyline", sel(OPT.scenery_skyline)),
          mk("scenery_weather", sel(OPT.scenery_weather)),
          mk("scenery_stars", bool),
        ];
      }
      if (id === "clima") {
        return [
          mk("temperature", ent(["sensor"])), mk("humidity", ent(["sensor"])),
          mk("battery", ent(["sensor"])),
          mk("show_climate", bool), mk("show_battery", sel(OPT.show_battery)),
        ];
      }
      return [
        mk("paper_dark", bool),
        mk("paper", sel(this._cfg.paper_dark === true ? paperDarkOptions() : paperOptions())),
        mk("depth", sel(OPT.depth)),
        mk("radius", num(0, 40, 1)),
        mk("show_header", bool),
      ];
    }

    _render() {
      if (!this._config || !this._hass) return;
      this.querySelectorAll(".wcp-form").forEach((f) => {
        f.hass = this._hass;
        f.schema = this._schemaFor(f.dataset.pane);
        f.data = this._cfg;
        f.computeLabel = (s) => s.label || LABELS[s.name] || s.name;
      });
      this._paintSwatches();
      this._paintPreview();
    }

    // 50 amostras clicáveis. Cache pela chave: sem ele, cada tecla digitada
    // no campo "Nome" redesenharia 50 botões.
    _paintSwatches() {
      this.querySelectorAll(".wcp-sw").forEach((grid) => {
        const target = grid.dataset.target;
        const dark = target === "curtain_paper" ? this._cfg.curtain_dark === true
          : target === "blackout_paper" ? this._cfg.blackout_dark === true
            : this._cfg.paper_dark === true;
        const val = this._cfg[target] || "";
        const key = dark + "|" + val;
        if (grid.dataset.key === key) return;
        grid.dataset.key = key;
        const grad = dark ? paperDarkGradient : paperGradient;
        let html = "";
        if (target !== "paper") {
          html += '<button type="button" class="wcp-chip wcp-none" data-v="" aria-pressed="' +
            (val === "") + '" title="Sem tom próprio"></button>';
        }
        html += '<button type="button" class="wcp-chip" data-v="paper" aria-pressed="' + (val === "paper") +
          '" title="Neutro" style="background:' + grad("paper") + '"></button>';
        (dark ? PAPER_DARK_HUES : PAPER_HUES).forEach((h) => {
          html += "<b>" + h[1] + "</b>";
          for (let i = 1; i <= 7; i++) {
            const v = h[0] + "-" + i;
            html += '<button type="button" class="wcp-chip" data-v="' + v + '" aria-pressed="' + (val === v) +
              '" title="' + h[1] + " tom " + i + '" style="background:' + grad(v) + '"></button>';
          }
        });
        grid.innerHTML = html;
        grid.querySelectorAll(".wcp-chip").forEach((b) =>
          b.addEventListener("click", () => this._set(target, b.dataset.v)));
      });
    }

    _paintPreview() {
      const host = this.querySelector(".wcp-prev");
      if (!host) return;
      try {
        if (!this._card) {
          this._card = document.createElement("mw-window-curtain-paper-card");
          host.appendChild(this._card);
        }
        this._card.setConfig(Object.assign({}, this._cfg));
        this._card.hass = this._hass;
        host.classList.remove("wcp-preverr");
      } catch (e) {
        // Config incompleta no meio da edição é normal — o dono ainda não
        // escolheu a entidade. Avisar sem quebrar o editor.
        host.classList.add("wcp-preverr");
        host.textContent = String(e && e.message ? e.message : e);
        this._card = null;
      }
    }

    _autofill(area) {
      if (!area) return;
      const found = discoverForArea(this._hass, area);
      const next = Object.assign({}, this._cfg, found, { area });
      if (!next.name) {
        const a = this._hass.areas && this._hass.areas[area];
        next.name = (a && a.name) ? "Janela d" + (/^[aA]/.test(a.name) ? "a " : "o ") + a.name : "";
      }
      this._config = next;
      this._emit();
      this._render();
    }

    _set(k, v) {
      this._config = Object.assign({}, this._cfg, { [k]: v });
      this._emit();
      this._render();
    }

    _onForm(e) {
      e.stopPropagation();
      const v = e.detail && e.detail.value;
      if (!v) return;
      this._config = Object.assign({}, this._cfg, v);
      this._emit();
      this._render();
    }

    _emit() {
      const out = { type: "custom:mw-window-curtain-paper-card" };
      // Só o que difere do padrão vai para o YAML. Gravar as 60 chaves
      // deixaria o dashboard ilegível e prenderia o card no default de hoje.
      Object.keys(this._cfg).forEach((k) => {
        if (k === "type") return;
        const v = this._cfg[k];
        if (v === DEFAULTS[k]) return;
        if (v === "" || v == null) return;
        out[k] = v;
      });
      this.dispatchEvent(new CustomEvent("config-changed", {
        detail: { config: out }, bubbles: true, composed: true,
      }));
    }

    _css() {
      return "" +
        ".wcp-ed{display:grid;gap:10px;}" +
        ".wcp-prev{border:1px solid var(--divider-color);border-radius:12px;padding:8px;" +
        "background:var(--card-background-color);overflow:hidden;}" +
        ".wcp-preverr{color:var(--error-color,#c62828);font-size:12px;padding:10px;}" +
        ".wcp-auto{display:grid;gap:6px;}" +
        ".wcp-autorow{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}" +
        ".wcp-area{flex:1;min-width:140px;padding:7px;border-radius:8px;" +
        "border:1px solid var(--divider-color);background:var(--card-background-color);color:inherit;}" +
        ".wcp-btn{min-height:40px;padding:0 14px;border-radius:10px;cursor:pointer;" +
        "border:1px solid var(--divider-color);background:var(--secondary-background-color);color:inherit;}" +
        ".wcp-hint{font-size:11.5px;color:var(--secondary-text-color);line-height:1.35;}" +
        ".wcp-tabs{display:flex;gap:4px;flex-wrap:wrap;}" +
        ".wcp-tab{display:inline-flex;align-items:center;gap:5px;min-height:40px;padding:0 10px;" +
        "border-radius:10px;cursor:pointer;font-size:12px;border:1px solid var(--divider-color);" +
        "background:transparent;color:inherit;}" +
        ".wcp-tab.on{background:var(--secondary-background-color);border-color:var(--primary-color);}" +
        ".wcp-tab ha-icon{--mdc-icon-size:16px;}" +
        ".wcp-pane{display:grid;gap:10px;}" +
        ".wcp-swwrap{display:grid;gap:5px;}" +
        ".wcp-swlabel{font-size:11.5px;color:var(--secondary-text-color);}" +
        ".wcp-sw{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;}" +
        ".wcp-sw b{grid-column:1/-1;font-size:10.5px;font-weight:600;color:var(--secondary-text-color);margin-top:2px;}" +
        ".wcp-chip{height:26px;border-radius:6px;cursor:pointer;padding:0;" +
        "border:1px solid rgba(127,127,127,.35);}" +
        ".wcp-chip:hover{transform:scale(1.12);z-index:2;}" +
        ".wcp-none{background:repeating-linear-gradient(45deg,#bbb,#bbb 4px,#eee 4px,#eee 8px);}" +
        '.wcp-chip[aria-pressed="true"]{outline:2.5px solid var(--primary-color);outline-offset:1px;z-index:3;}';
    }
  }

  /* ==================== registro ==================== */

  customElements.define("mw-window-curtain-paper-card", MwWindowCurtainPaperCard);
  customElements.define("mw-window-curtain-paper-card-editor", MwWindowCurtainPaperCardEditor);

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "mw-window-curtain-paper-card",
    name: "MW Window / Curtain Paper Card",
    description: "A janela em papel, feita para o dedo: peças de 56 px, régua de degraus e o desenho leve — ou a paisagem inteira, se quiser.",
    preview: true,
    documentationURL: "https://github.com/visaodeempresa/mw-ha-window-curtain-paper-card",
  });

  console.info("%c MW-WINDOW-CURTAIN-PAPER-CARD %c " + VERSION + " ",
    "color:#1c1914;background:#e8e3d8;font-weight:700;border-radius:3px 0 0 3px",
    "color:#e8e3d8;background:#4a4741;font-weight:700;border-radius:0 3px 3px 0");

  // Export só para o probe headless; no navegador não existe module.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      DEFAULTS, LABELS, OPT, TABS, TARGETS, TEXTURES, VERSION,
      discoverForArea, paperGradient, paperDarkGradient, mwpControlCss, MWP_MIN_TOUCH,
    };
  }
})();
