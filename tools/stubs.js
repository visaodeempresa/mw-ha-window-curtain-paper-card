/* Dublês de ha-card / ha-icon e o hass de mentira, compartilhados pelas
 * bancadas. NÃO é o Home Assistant — serve para olhar o desenho sem ele.
 */
/* ---------------- dublês dos elementos do HA ---------------- */
customElements.define("ha-card", class extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    this.attachShadow({ mode: "open" }).innerHTML =
      "<style>:host{display:block;box-sizing:border-box;}</style><slot></slot>";
  }
});
const GLYPH = {
  "mdi:window-open-variant": "▤", "mdi:curtains": "▥", "mdi:blinds-horizontal": "▦",
  "mdi:fan": "✦", "mdi:stop": "■", "mdi:thermometer": "🌡", "mdi:water-percent": "💧",
  "mdi:arrow-expand-vertical": "▲", "mdi:arrow-collapse-vertical": "▼",
  "mdi:arrow-expand-all": "⤢", "mdi:arrow-collapse-all": "⤡",
};
customElements.define("ha-icon", class extends HTMLElement {
  static get observedAttributes() { return ["icon"]; }
  connectedCallback() { this._up(); }
  attributeChangedCallback() { this._up(); }
  _up() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const ic = this.getAttribute("icon") || "";
    const g = GLYPH[ic] || (ic.indexOf("mdi:battery") === 0 ? "▮" : "◻");
    this.shadowRoot.innerHTML =
      "<style>:host{display:inline-grid;place-items:center;line-height:1;" +
      "font-size:var(--mdc-icon-size,20px);}</style><span>" + g + "</span>";
  }
});

/* ---------------- hass de mentira ---------------- */
const cover = (pos, name) => ({ state: pos > 0 ? "open" : "closed",
  attributes: { current_position: pos, friendly_name: name } });
const sens = (v, dc, u) => ({ state: String(v), attributes: { device_class: dc, unit_of_measurement: u } });
const HASS = {
  states: {
    "cover.op_l": cover(50, "🟧🪟 JANELA ESQUERDA DA SALA"),
    "cover.op_r": cover(20, "🟧🪟 JANELA DIREITA DA SALA"),
    "cover.op": cover(70, "🟪🪟 JANELA DA SUÍTE"),
    "cover.cortina": cover(35, "🟪 CORTINA DA SUÍTE"),
    "cover.blackout": cover(60, "🟧 BLACKOUT DA SALA"),
    "cover.morto": { state: "unavailable", attributes: {} },
    "binary_sensor.sl": { state: "on", attributes: { device_class: "window" } },
    "binary_sensor.sr": { state: "off", attributes: { device_class: "window" } },
    "sensor.t": sens(23.4, "temperature", "°C"),
    "sensor.h": sens(62, "humidity", "%"),
    "sensor.bat": sens(11, "battery", "%"),
    "fan.exaustor": { state: "on", attributes: {} },
    "weather.casa": { state: "rainy", attributes: {} },
  },
  entities: {}, devices: {}, areas: { suite: { area_id: "suite", name: "Suíte" } },
  callService(d, s, p) { console.log("callService", d, s, p); },
  localize: () => "",
};

const BASE = {
  type: "custom:mw-window-curtain-paper-card",
  opener: "cover.op", curtain: "cover.cortina", blackout: "cover.blackout",
  sensor_left: "binary_sensor.sl", sensor_right: "binary_sensor.sr",
  temperature: "sensor.t", humidity: "sensor.h", battery: "sensor.bat",
};
