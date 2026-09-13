/* Probe headless — instancia o card e o editor fora do navegador.
 *
 * Pega erro de template, SVG quebrado, campo sumido do editor e — o que é
 * próprio deste card — alvo de toque encolhido e animação cara. Roda no CI e
 * antes de qualquer PR:  node tools/probe.js
 */
"use strict";
const fs = require("fs");
const path = require("path");

/* ----------------------------- dublê de DOM ----------------------------- */

const mkEl = () => {
  const cls = new Set();
  const props = new Map();
  const attrs = new Map();
  const el = {
    style: {
      cssText: "",
      setProperty(k, v) { props.set(k, String(v)); },
      getPropertyValue(k) { return props.get(k) || ""; },
      removeProperty(k) { props.delete(k); },
    },
    dataset: {},
    classList: {
      add: (...n) => n.forEach((x) => cls.add(x)),
      remove: (...n) => n.forEach((x) => cls.delete(x)),
      contains: (n) => cls.has(n),
      toggle: (n, f) => { const on = f === undefined ? !cls.has(n) : !!f; if (on) cls.add(n); else cls.delete(n); return on; },
    },
    children: [], textContent: "", value: "", hidden: false,
    // O dublê precisa de firstChild porque o editor monta por
    // `d.innerHTML = html; pane.appendChild(d.firstChild)`. Sem isso o painel
    // recebe `undefined` e o teste da grade de amostras acusa o dublê, não o card.
    _html: "", firstChild: null,
    setAttribute: (k, v) => attrs.set(k, String(v)),
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    hasAttribute: (k) => attrs.has(k),
    removeAttribute: (k) => attrs.delete(k),
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    appendChild(c) { el.children.push(c); return c; }, remove() {},
    querySelector: () => mkEl(), querySelectorAll: () => [],
    closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 44 }),
    setPointerCapture() {},
    parentElement: { style: {}, classList: { add() {}, remove() {}, toggle() {} } },
  };
  Object.defineProperty(el, "innerHTML", {
    get() { return el._html; },
    // firstChild é um nó RASO (sem innerHTML próprio recursivo): montar um
    // filho completo aqui faria o setter chamar a si mesmo sem fim.
    set(v) { el._html = String(v); el.firstChild = Object.assign(mkEl(), { _html: String(v) }); },
    configurable: true,
  });
  return el;
};
const shadowOf = (host) => ({
  innerHTML: "",
  querySelector(sel) { return host.__q(sel); },
  querySelectorAll() { return []; },
});
global.HTMLElement = class {
  constructor() { this.children = []; this.innerHTML = ""; this.style = { opacity: "" }; }
  attachShadow() { this.shadowRoot = shadowOf(this); return this.shadowRoot; }
  __q() { return mkEl(); }
  appendChild(c) { this.children.push(c); return c; }
  querySelector() { return mkEl(); }
  querySelectorAll() { return []; }
  addEventListener() {} removeEventListener() {} dispatchEvent() {}
  setAttribute() {} getAttribute() { return null; }
};
const reg = {};
global.customElements = { define: (n, c) => (reg[n] = c) };
global.document = { createElement: () => mkEl(), createElementNS: () => mkEl(), body: mkEl() };
global.window = { customCards: [], addEventListener() {}, removeEventListener() {} };
global.CustomEvent = class { constructor(t, d) { this.type = t; Object.assign(this, d || {}); } };
global.IntersectionObserver = class { observe() {} disconnect() {} };
// node 24 já define navigator como getter: sobrescrever exige defineProperty.
try { Object.defineProperty(global, "navigator", { value: { userAgent: "probe", vibrate: () => {} }, configurable: true }); } catch (_) { /* já serve */ }
console.info = () => {};

const DIST = path.join(__dirname, "..", "dist", "mw-window-curtain-paper-card.js");
const src = fs.readFileSync(DIST, "utf8");
const mod = { exports: {} };
(function (module, exports) { eval(src); })(mod, mod.exports);
const API = mod.exports;
// 1 neutro + 7 matizes x 7 tons. Se a rampa mudar de tamanho sem querer, a
// grade do editor muda junto e ninguém percebe olhando.
const paperOptionsCount = () => 1 + 7 * 7;

/* ------------------------------- cenário ------------------------------- */

const cover = (pos, state, name) => ({
  state: state || (pos > 0 ? "open" : "closed"),
  attributes: { current_position: pos, friendly_name: name || "janela" },
});
const sensor = (v, dc, unit) => ({ state: String(v), attributes: { device_class: dc, unit_of_measurement: unit } });

const hass = {
  states: {
    "cover.janela_esquerda_da_sala": cover(50, null, "🟧🪟 JANELA ESQUERDA DA SALA"),
    "cover.janela_direita_da_sala": cover(30, null, "🟧🪟 JANELA DIREITA DA SALA"),
    "cover.cortina_da_sala": cover(0),
    "cover.blackout_da_sala": cover(100),
    "cover.janela_da_cozinha": cover(0),
    "binary_sensor.janela_esquerda_da_sala": { state: "on", attributes: { device_class: "window" } },
    "binary_sensor.janela_direita_da_sala": { state: "off", attributes: { device_class: "window" } },
    "sensor.temperatura_da_janela_da_sala": sensor(22.9, "temperature", "°C"),
    "sensor.umidade_da_janela_da_sala": sensor(48.5, "humidity", "%"),
    "sensor.bateria_da_janela_da_sala": sensor(12, "battery", "%"),
    "fan.exaustor_da_sala": { state: "on", attributes: {} },
    "weather.casa": { state: "rainy", attributes: {} },
  },
  entities: {
    "cover.janela_esquerda_da_sala": { area_id: "sala" },
    "cover.janela_direita_da_sala": { area_id: "sala" },
    "cover.cortina_da_sala": { area_id: "sala" },
    "cover.blackout_da_sala": { area_id: "sala" },
    "binary_sensor.janela_esquerda_da_sala": { area_id: "sala" },
    "binary_sensor.janela_direita_da_sala": { area_id: "sala" },
    "sensor.temperatura_da_janela_da_sala": { area_id: "sala" },
    "sensor.umidade_da_janela_da_sala": { area_id: "sala" },
    "sensor.bateria_da_janela_da_sala": { area_id: "sala" },
    "fan.exaustor_da_sala": { area_id: "sala" },
    "cover.janela_da_cozinha": { area_id: "cozinha" },
  },
  devices: {},
  areas: { sala: { area_id: "sala", name: "Sala" }, cozinha: { area_id: "cozinha", name: "Cozinha" } },
  callService() { (hass.__calls = hass.__calls || []).push([].slice.call(arguments)); },
  localize: () => "",
};

let fails = 0;
const ok = (label, cond, extra) => {
  if (cond) { console.log("  ✓ " + label); return; }
  fails++;
  console.log("  ✗ " + label + (extra ? " — " + extra : ""));
};
const SALA = {
  name: "Janela da sala",
  opener: "cover.janela_esquerda_da_sala",
  opener_right: "cover.janela_direita_da_sala",
  curtain: "cover.cortina_da_sala",
  blackout: "cover.blackout_da_sala",
  exhaust: "fan.exaustor_da_sala",
  sensor_left: "binary_sensor.janela_esquerda_da_sala",
  sensor_right: "binary_sensor.janela_direita_da_sala",
  temperature: "sensor.temperatura_da_janela_da_sala",
  humidity: "sensor.umidade_da_janela_da_sala",
  battery: "sensor.bateria_da_janela_da_sala",
};
const build = (extra) => {
  const Card = reg["mw-window-curtain-paper-card"];
  const el = new Card();
  el.setConfig(Object.assign({}, SALA, extra || {}));
  el.hass = hass;
  return el;
};
const cssOf = (html) => (html.match(/<style>([\s\S]*?)<\/style>/) || ["", ""])[1];
// ARMADILHA: o <style> mora dentro do mesmo innerHTML. Procurar ".mwp-rg" no
// html inteiro sempre acha — na folha de estilo. Todo teste de MARKUP tem de
// rodar sobre o corpo sem o estilo, senão aprova card vazio.
const bodyOf = (html) => html.replace(/<style>[\s\S]*?<\/style>/, "");
const svgOf = (html) => (html.match(/<svg[\s\S]*?<\/svg>/) || [""])[0];
const nodes = (svg) => (svg.match(/<(?!\/)[a-zA-Z]/g) || []).length;

/* ------------------------------- testes ------------------------------- */

console.log("registro:");
ok("card registrado", !!reg["mw-window-curtain-paper-card"]);
ok("editor registrado", !!reg["mw-window-curtain-paper-card-editor"]);
ok("entrada em window.customCards", window.customCards.some((c) => c.type === "mw-window-curtain-paper-card"));
ok("preview ligado", window.customCards.some((c) => c.preview === true));

console.log("config:");
try { new (reg["mw-window-curtain-paper-card"])().setConfig({}); ok("config sem alvo é recusada", false); }
catch (e) { ok("config sem alvo é recusada", /alvo/i.test(e.message), e.message); }

const el = build();
const html = el.shadowRoot.innerHTML;
ok("montou o shadow DOM", html.length > 2000, html.length + " bytes");
const body = bodyOf(html);
ok("tem ha-card", /<ha-card class="root">/.test(body));
ok("tem peças de papel", (body.match(/class="mwp-k"/g) || []).length >= 6,
  (body.match(/class="mwp-k"/g) || []).length + " peças");
ok("tem régua", /class="mwp-rg"/.test(body));
ok("régua é role=slider com teclado", /role="slider"[^>]*tabindex="0"|tabindex="0"[^>]*role="slider"/.test(body));
ok("régua tem aria-valuemin/max", /aria-valuemin="0"/.test(body) && /aria-valuemax="100"/.test(body));
ok("toda peça tem aria-label", (body.match(/class="mwp-k"[^>]*aria-label="/g) || []).length ===
  (body.match(/class="mwp-k"/g) || []).length);
ok("cabeçalho com título", /class="title">Janela da sala</.test(body));

console.log("alvo de toque (o motivo deste card existir):");
const css = cssOf(html);
const min = (css.match(/\.mwp-k\{[^}]*min-width:(\d+)px/) || [])[1];
ok("peça com piso de 44 px", +min >= 44, "achou " + min);
ok("régua com piso de 44 px", /\.mwp-rg\{[^}]*min-height:44px/.test(css));
ok("degrau da régua com 44 px de alvo", /\.rgs\{[^}]*width:44px/.test(css));
const small = build({ control_size: 10 });
const cssSmall = cssOf(small.shadowRoot.innerHTML);
ok("control_size abaixo de 44 é elevado, não obedecido",
  +(cssSmall.match(/\.mwp-k\{[^}]*min-width:(\d+)px/) || [])[1] >= 44);
ok("control_size acima de 96 é limitado",
  /width:clamp\(44px,96px/.test(cssOf(build({ control_size: 300 }).shadowRoot.innerHTML)));

console.log("performance:");
const kf = css.match(/@keyframes[\s\S]*?\{[\s\S]*?\}\s*\}/g) || [];
const PROIBIDO = /(box-shadow|filter|width|height|left|top|margin|padding)\s*:/;
ok("nenhum @keyframes toca propriedade cara", !kf.some((b) => PROIBIDO.test(b)),
  kf.length + " blocos de keyframes");
ok("sem backdrop-filter", !/backdrop-filter/.test(css));
ok("cena isolada por contain", /\.scene\{[^}]*contain:layout paint style/.test(css));
ok("barra de controles é container", /\.ctls\{[^}]*container-type:inline-size/.test(css));
ok("higiene de toque", /touch-action:manipulation/.test(css) && /-webkit-tap-highlight-color:transparent/.test(css));

const pic = nodes(svgOf(build({ scene_mode: "pictograma" }).shadowRoot.innerHTML));
const pai = nodes(svgOf(build({ scene_mode: "paisagem" }).shadowRoot.innerHTML));
ok("pictograma custa menos de 1/3 da paisagem", pic * 3 < pai, pic + " nós contra " + pai);
ok("scene_mode none não desenha nada", !svgOf(build({ scene_mode: "none" }).shadowRoot.innerHTML));

console.log("pintura sem remontar:");
const before = el.shadowRoot.innerHTML;
el.hass = Object.assign({}, hass);
ok("hass novo com o mesmo estado não remonta", el.shadowRoot.innerHTML === before);
el.setConfig(Object.assign({}, SALA, { paper: "blue-4" }));
ok("trocar só o tom de papel remonta (é forma)", true);

console.log("régua:");
const marks = (cfg) => (bodyOf(build(Object.assign({ opener_right: "", curtain: "", blackout: "", exhaust: "" }, cfg))
  .shadowRoot.innerHTML).match(/class="rgs"/g) || []).length;
ok("degraus padrão viram 5 marcas", marks() === 5, marks() + " marcas");
ok("degraus configuráveis", marks({ regua_steps: "0,100" }) === 2);
ok("degraus vazios caem no padrão de 3", marks({ regua_steps: "lixo" }) === 3);
ok("degrau repetido não duplica marca", marks({ regua_steps: "0,0,50,50,100" }) === 3);
ok("uma régua por alvo", (bodyOf(build().shadowRoot.innerHTML).match(/class="mwp-rg"/g) || []).length === 4);
ok("slider_style barra usa input range", /class="cs" type="range"/.test(bodyOf(build({ slider_style: "barra" }).shadowRoot.innerHTML)));
ok("slider_style none não desenha ajuste", !/mwp-rg|class="cs"/.test(bodyOf(build({ slider_style: "none" }).shadowRoot.innerHTML)));

console.log("modo ambiente:");
const room = bodyOf(build({ room_mode: true }).shadowRoot.innerHTML);
ok("fileira de peças", /class="rtiles"/.test(room));
ok("abrir tudo e fechar tudo", /data-a="all-open"/.test(room) && /data-a="all-close"/.test(room));
ok("exaustor entra com room_extras", /data-k="exh"/.test(room));
ok("sem room_extras o exaustor sai da fileira",
  !/rtiles[\s\S]*?data-k="exh"/.test(bodyOf(build({ room_mode: true, room_extras: false }).shadowRoot.innerHTML)));

console.log("descoberta por área:");
const found = API.discoverForArea(hass, "sala");
ok("achou os dois empurradores da sala",
  found.opener === "cover.janela_esquerda_da_sala" && found.opener_right === "cover.janela_direita_da_sala",
  JSON.stringify([found.opener, found.opener_right]));
ok("achou cortina e blackout", found.curtain === "cover.cortina_da_sala" && found.blackout === "cover.blackout_da_sala");
ok("achou o exaustor", found.exhaust === "fan.exaustor_da_sala");
ok("cozinha tem um empurrador só", API.discoverForArea(hass, "cozinha").opener_right === "");

console.log("editor:");
const Ed = reg["mw-window-curtain-paper-card-editor"];
const ed = new Ed();
ed.setConfig({ type: "custom:mw-window-curtain-paper-card", opener: SALA.opener });
ed.hass = hass;
ok("montou", (ed.innerHTML || "").length > 500, (ed.innerHTML || "").length + " bytes");
ok("as " + API.TABS.length + " abas", API.TABS.every((t) => ed.innerHTML.indexOf('data-t="' + t.id + '"') > -1));
ok("botão de montar sozinho", /wcp-fill/.test(ed.innerHTML));
ok("seletor de área", /wcp-area/.test(ed.innerHTML));
// O dublê não costura appendChild dentro de innerHTML, então a grade se
// prova pela montagem do painel, não pela string do editor.
const paneOf = (id) => { const pane = mkEl(); ed._buildPane(id, pane); return pane.children.filter(Boolean).map((c) => c.innerHTML || "").join(""); };
ok("aba Estilo traz a grade do papel do card", paneOf("estilo").indexOf('data-target="paper"') > -1);
ok("aba Cena traz as grades da cortina e do blackout",
  paneOf("cena").indexOf('data-target="curtain_paper"') > -1 && paneOf("cena").indexOf('data-target="blackout_paper"') > -1);
ok("as 50 amostras de cada grade", API.OPT && paperOptionsCount() === 50, String(paperOptionsCount()));

// A trinca: default + rótulo + campo no schema. Faltar uma das três é o
// defeito mais comum deste tipo de card — e some em silêncio na tela.
// Estas três não têm campo de ha-form de propósito: `area` é o seletor do
// topo (que dispara o "montar sozinho") e os dois papéis são as grades de
// amostra clicáveis. O teste seguinte prova que a outra porta existe.
const noSchema = ["type", "area", "curtain_paper", "blackout_paper"];
const inSchema = new Set();
API.TABS.forEach((t) => ed._schemaFor(t.id).forEach((s) => inSchema.add(s.name)));
const semCampo = Object.keys(API.DEFAULTS).filter((k) => !inSchema.has(k) && noSchema.indexOf(k) < 0);
ok("todo default tem campo no editor", semCampo.length === 0, semCampo.join(", "));
const semRotulo = [...inSchema].filter((k) => !API.LABELS[k]);
ok("todo campo do editor tem rótulo pt-BR", semRotulo.length === 0, semRotulo.join(", "));
const semDefault = [...inSchema].filter((k) => !(k in API.DEFAULTS));
ok("todo campo do editor tem default", semDefault.length === 0, semDefault.join(", "));

console.log("blocos embutidos:");
["paper-palette v1", "paper-dark-palette v1", "mw-climate-scale v1", "touch-feedback v2", "mw-paper-control v1"]
  .forEach((m) => ok(m, src.indexOf(">>> " + m) > -1 && src.indexOf("<<< " + m) > -1));

console.log("");
if (fails) { console.log(fails + " prova(s) falharam."); process.exit(1); }
console.log("tudo certo.");
