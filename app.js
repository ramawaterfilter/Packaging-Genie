      (function () {
        "use strict";
        const Engine = PalletEngineFactory();
        const D = Engine.DEFAULTS;
        const clone = (o) => JSON.parse(JSON.stringify(o));

        /* ------------------------------ STORAGE ------------------------------ */
        const KEYS = {
          products: "pmo.products.v1",
          pallets: "pmo.pallets.v1",
          containers: "pmo.containers.v1",
          plans: "pmo.plans.v1",
          ui: "pmo.ui.v1",
        };
        function load(key, fallback) {
          try {
            const v = localStorage.getItem(key);
            if (v) {
              const p = JSON.parse(v);
              if (p) return p;
            }
          } catch (e) {
            /* storage unavailable */
          }
          return clone(fallback);
        }
        function save(key, value) {
          try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
          } catch (e) {
            toast(
              "Could not save to browser storage (storage full or blocked).",
            );
            return false;
          }
        }
        const DB = {
          products: load(KEYS.products, D.products),
          pallets: load(KEYS.pallets, D.pallets),
          containers: load(KEYS.containers, D.containers),
          plans: load(KEYS.plans, []),
        };
        const persist = (k) => save(KEYS[k], DB[k]);

        /* ------------------------------ HELPERS ------------------------------ */
        const $ = (s, r = document) => r.querySelector(s);
        const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
        const esc = (s) =>
          String(s === null || s === undefined ? "" : s).replace(
            /[&<>"']/g,
            (c) =>
              ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
              })[c],
          );
        const fmt = (v, d = 0) =>
          v === null || v === undefined || v === "" || !isFinite(v)
            ? "–"
            : Number(v).toLocaleString("en-GB", {
                minimumFractionDigits: d,
                maximumFractionDigits: d,
              });
        const signed = (v, d = 1) =>
          v === null || v === undefined
            ? "–"
            : (v > 0.0000001 ? "+" : v < -0.0000001 ? "−" : "±") +
              fmt(Math.abs(v), d);
        const numOrNull = (v) =>
          v === "" || v === null || v === undefined || !isFinite(Number(v))
            ? null
            : Number(v);
        const uid = () =>
          Math.random().toString(36).slice(2, 10) +
          Date.now().toString(36).slice(-4);
        let toastTimer = null;
        function toast(msg) {
          const t = $("#toast");
          t.textContent = msg;
          t.classList.add("show");
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => t.classList.remove("show"), 3600);
        }
        const PALETTE = [
          "#4E79A7",
          "#F28E2B",
          "#59A14F",
          "#E15759",
          "#76B7B2",
          "#EDC948",
          "#B07AA1",
          "#FF9DA7",
          "#9C755F",
          "#86BCB6",
          "#2F6DB5",
          "#D37295",
          "#8CD17D",
          "#B6992D",
          "#499894",
          "#FABFD2",
        ];
        /* Every product keeps its own colour (stored with the product), so deleting or adding products never
     recolours other SKUs or saved plans. Unknown/deleted products get a stable colour from their id. */
        function ensureProductColors() {
          const used = new Set(DB.products.map((p) => p.color).filter(Boolean));
          let changed = false,
            k = 0;
          DB.products.forEach((p) => {
            if (p.color) return;
            while (k < PALETTE.length && used.has(PALETTE[k])) k++;
            p.color =
              PALETTE[
                k < PALETTE.length ? k : DB.products.indexOf(p) % PALETTE.length
              ];
            used.add(p.color);
            changed = true;
          });
          return changed;
        }
        function colorFor(productId) {
          if (productId === "__pallet") return "#C8A36A";
          const p = DB.products.find((x) => x.id === productId);
          if (p && p.color) return p.color;
          let h = 0;
          String(productId || "")
            .split("")
            .forEach((ch) => {
              h = (h * 31 + ch.charCodeAt(0)) >>> 0;
            });
          return PALETTE[h % PALETTE.length];
        }
        function textColor(hex) {
          const n = parseInt(hex.slice(1), 16),
            r = n >> 16,
            g = (n >> 8) & 255,
            b = n & 255;
          return 0.299 * r + 0.587 * g + 0.114 * b > 150
            ? "#1b2733"
            : "#ffffff";
        }
        const productById = (id) => DB.products.find((p) => p.id === id);
        const activeProducts = () =>
          DB.products.filter((p) => p.active !== false);
        const productDims = (p) =>
          `${p.length} × ${p.width} × ${p.height} ${p.dimUnit}`;
        const msgBox = (type, title, list) =>
          `<div class="msg ${type}">${title ? `<b>${esc(title)}</b>` : ""}${list && list.length ? `<ul>${list.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}</div>`;
        function downloadFile(name, content, mime) {
          const blob = new Blob([content], { type: mime });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = name;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            URL.revokeObjectURL(a.href);
            a.remove();
          }, 1000);
        }
        const safeName = (s) =>
          String(s || "plan")
            .replace(/[^\w\- ]+/g, "")
            .trim()
            .replace(/\s+/g, "-")
            .slice(0, 60) || "plan";

        /* ------------------------------ THEME ------------------------------ */
        const THEME_KEY = "pmo.theme";
        const RAMA_LOGO = $(".brand-logo")
          ? $(".brand-logo").getAttribute("src")
          : "";
        function currentTheme() {
          const t = document.documentElement.getAttribute("data-theme");
          if (t === "light" || t === "dark") return t;
          return window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
        }
        function updateThemeButton() {
          const dark = currentTheme() === "dark",
            b = $("#theme-toggle");
          if (!b) return;
          b.textContent = dark ? "☀ Light mode" : "🌙 Dark mode";
          b.setAttribute("aria-pressed", String(dark));
        }
        function toggleTheme() {
          const next = currentTheme() === "dark" ? "light" : "dark";
          document.documentElement.setAttribute("data-theme", next);
          try {
            localStorage.setItem(THEME_KEY, next);
          } catch (e) {
            /* ignore */
          }
          updateThemeButton();
        }
        if (window.matchMedia) {
          const mq = window.matchMedia("(prefers-color-scheme: dark)");
          if (mq.addEventListener)
            mq.addEventListener("change", updateThemeButton);
        }

        /* ------------------------------- TABS -------------------------------- */
        function showTab(name) {
          $$("#tabs button").forEach((b) =>
            b.classList.toggle("active", b.dataset.tab === name),
          );
          $$(".tab").forEach((t) =>
            t.classList.toggle("active", t.id === "tab-" + name),
          );
          try {
            localStorage.setItem(KEYS.ui, JSON.stringify({ tab: name }));
          } catch (e) {
            /* ignore */
          }
          if (name === "plans") renderPlans();
        }
        $("#tabs").addEventListener("click", (e) => {
          const b = e.target.closest("button[data-tab]");
          if (b) showTab(b.dataset.tab);
        });

        /* -------------------------- WORKER RUNNER ---------------------------- */
        const WORKER_TAIL =
          "\nvar Engine = PalletEngineFactory();\n" +
          'self.onmessage = function (e) { var m = e.data; try { var result = Engine[m.fn](m.payload, { progress: function (n) { self.postMessage({ id: m.id, type: "progress", n: n }); } }); self.postMessage({ id: m.id, type: "done", result: result }); } catch (err) { self.postMessage({ id: m.id, type: "error", message: (err && err.message) || String(err) }); } };';
        const Runner = (function () {
          let worker = null,
            workerUrl = null,
            failed = false,
            seq = 0;
          const pending = new Map();
          function runLocal(fn, payload, onProgress) {
            return new Promise((resolve, reject) =>
              setTimeout(() => {
                try {
                  resolve(Engine[fn](payload, { progress: onProgress }));
                } catch (err) {
                  reject(err);
                }
              }, 40),
            );
          }
          function ensure() {
            if (worker || failed) return worker;
            try {
              workerUrl = URL.createObjectURL(
                new Blob([$("#engine-src").textContent + WORKER_TAIL], {
                  type: "text/javascript",
                }),
              );
              worker = new Worker(workerUrl);
              worker.onmessage = (e) => {
                const m = e.data,
                  p = pending.get(m.id);
                if (!p) return;
                if (m.type === "progress") {
                  if (p.onProgress) p.onProgress(m.n);
                  return;
                }
                pending.delete(m.id);
                if (m.type === "done") p.resolve(m.result);
                else p.reject(new Error(m.message));
              };
              worker.onerror = () => {
                failed = true;
                worker = null;
                if (workerUrl) {
                  URL.revokeObjectURL(workerUrl);
                  workerUrl = null;
                }
                for (const [, p] of pending)
                  runLocal(p.fn, p.payload, p.onProgress).then(
                    p.resolve,
                    p.reject,
                  );
                pending.clear();
              };
            } catch (e) {
              failed = true;
              worker = null;
            }
            return worker;
          }
          return {
            run(fn, payload, onProgress) {
              const w = ensure();
              if (!w) return runLocal(fn, payload, onProgress);
              const id = ++seq;
              return new Promise((resolve, reject) => {
                pending.set(id, { resolve, reject, onProgress, fn, payload });
                w.postMessage({ id, fn, payload });
              });
            },
            cancel() {
              if (worker) {
                worker.terminate();
                worker = null;
              }
              if (workerUrl) {
                URL.revokeObjectURL(workerUrl);
                workerUrl = null;
              }
              for (const [, p] of pending) p.reject(new Error("CANCELLED"));
              pending.clear();
            },
          };
        })();
        let engineBusy = false;
        async function runEngine(title, fn, payload) {
          if (engineBusy) {
            toast(
              "A calculation is already running – wait for it or press Cancel.",
            );
            return null;
          }
          engineBusy = true;
          $("#overlay-title").textContent = title;
          $("#overlay-progress").textContent = "Candidates evaluated: 0";
          $("#overlay").hidden = false;
          const cancelBtn = $('[data-action="cancel-run"]');
          if (cancelBtn) cancelBtn.focus();
          try {
            return await Runner.run(fn, payload, (n) => {
              $("#overlay-progress").textContent =
                `Candidates evaluated: ${fmt(n)}`;
            });
          } catch (err) {
            if (err.message === "CANCELLED") {
              toast("Calculation cancelled.");
              return null;
            }
            toast("Calculation error: " + err.message);
            console.error(err);
            return null;
          } finally {
            $("#overlay").hidden = true;
            engineBusy = false;
          }
        }

        /* ------------------------ TRAFFIC-LIGHT SETTINGS ---------------------- */
        const ASSESS_KEY = "pmo.assess.v1";
        function ASSESS() {
          const d = Engine.ASSESS_DEFAULTS;
          try {
            return Object.assign(
              {},
              d,
              JSON.parse(localStorage.getItem(ASSESS_KEY) || "null") || {},
            );
          } catch (e) {
            return Object.assign({}, d);
          }
        }
        const ASSESS_FIELDS = [
          ["greenSpace", "GREEN when space used is at least (%)"],
          [
            "amberSpace",
            "AMBER when space used is at least (%) – below this it is RED",
          ],
          [
            "columnRatio",
            "Warn for free-standing columns taller than … × their narrowest base side",
          ],
          ["weightWarnPct", "AMBER when gross weight reaches (% of the limit)"],
          [
            "topHeavy",
            "Top-heavy when the centre of gravity is above (fraction of stack height, e.g. 0.58)",
          ],
        ];
        function renderAssessSettings() {
          const A = ASSESS();
          $("#assess-panel").innerHTML =
            `<div class="panel-head"><h2>Traffic-light thresholds</h2><button class="btn small" data-action="assess-reset">Reset defaults</button></div>
      <p class="small muted">These rules decide GREEN (ready to load), AMBER (load with care) and RED (not recommended). They are saved in this browser and apply to the next calculation.</p>
      <div class="master-form">${ASSESS_FIELDS.map(([k, l]) => `<div class="field"><label>${esc(l)}</label><input type="number" step="any" min="0" data-assess="${k}" value="${A[k]}"></div>`).join("")}</div>`;
        }
        document.addEventListener("change", (e) => {
          const k = e.target.dataset && e.target.dataset.assess;
          if (!k) return;
          const A = ASSESS(),
            v = Number(e.target.value);
          if (!(v > 0)) {
            toast("Enter a number greater than zero.");
            renderAssessSettings();
            return;
          }
          A[k] = v;
          if (A.amberSpace >= A.greenSpace) {
            toast(
              "The amber threshold must be lower than the green threshold.",
            );
            renderAssessSettings();
            return;
          }
          try {
            localStorage.setItem(ASSESS_KEY, JSON.stringify(A));
            toast("Saved – applies to the next calculation.");
          } catch (err) {
            toast("Could not save the setting.");
          }
        });

        /* --------------------------- SETTINGS PANEL -------------------------- */
        function unitOptionsHTML(selected) {
          return (
            `<optgroup label="Pallets">${DB.pallets.map((p) => `<option value="pallet:${esc(p.id)}"${selected === "pallet:" + p.id ? " selected" : ""}>${esc(p.name)} — ${esc(p.length)}×${esc(p.width)} mm</option>`).join("")}</optgroup>` +
            `<optgroup label="Containers – loose cartons">${DB.containers.map((c) => `<option value="container:${esc(c.id)}"${selected === "container:" + c.id ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</optgroup>`
          );
        }
        function settingsHTML(p) {
          return `
      <div class="field"><label for="${p}-unit">Load unit (pallet or container)</label><select id="${p}-unit"></select><div class="hint" id="${p}-unit-info"></div></div>
      <div class="field"><label for="${p}-orient">Carton orientation</label>
        <select id="${p}-orient">
          <option value="sku">Use SKU default (Keep Upright per product)</option>
          <option value="upright">Keep carton upright (all SKUs)</option>
          <option value="full">Allow full rotation (all 6 orientations)</option>
        </select></div>
      <div class="row2">
        <div class="field"><label for="${p}-clear">Clearance between cartons (mm)</label><input id="${p}-clear" type="number" min="0" step="1" value="0"></div>
        <div class="field"><label for="${p}-base">Pallet base height (mm)</label><input id="${p}-base" type="number" min="0" step="1"></div>
      </div>
      <div class="row2">
        <div class="field"><label for="${p}-tare">Pallet tare weight (kg)</label><input id="${p}-tare" type="number" min="0" step="0.1"></div>
        <div class="field"><label for="${p}-maxg">Max gross weight (kg)</label><input id="${p}-maxg" type="number" min="0" step="1" placeholder="Unrestricted"></div>
      </div>
      <div class="field pallet-only" id="${p}-ovh-wrap"><label class="chk"><input type="checkbox" id="${p}-ovh"> Allow overhang</label>
        <div class="inline small"><input id="${p}-ovhmm" type="number" min="0" step="1" value="25" style="width:80px"> mm max per side</div></div>
      <div class="field"><label class="chk" title="Version 1 always requires every carton to be fully supported by the carton(s) directly below."><input type="checkbox" checked disabled> Require full base support</label></div>`;
        }
        const SETTINGS_PREFIXES = ["single", "mix", "exact", "multi"];
        function initSettings(p, defaultUnit) {
          $(`#${p}-settings`).innerHTML = settingsHTML(p);
          $(`#${p}-unit`).innerHTML = unitOptionsHTML(defaultUnit);
          $(`#${p}-unit`).addEventListener("change", () =>
            applyUnitDefaults(p),
          );
          applyUnitDefaults(p);
        }
        function getUnitRecord(ref) {
          const [kind, id] = String(ref || "").split(":");
          if (kind === "pallet")
            return { kind, rec: DB.pallets.find((x) => x.id === id) };
          if (kind === "container")
            return { kind, rec: DB.containers.find((x) => x.id === id) };
          return { kind: null, rec: null };
        }
        /* Only refreshes the description line (used when master data changes but the unit stays selected). */
        function updateUnitInfo(p) {
          const { kind, rec } = getUnitRecord($(`#${p}-unit`).value);
          if (!rec) return;
          $(`#${p}-unit-info`).textContent =
            kind === "pallet"
              ? `${rec.length} × ${rec.width} mm, max height ${rec.maxHeight} mm${rec.standard ? " · " + rec.standard : ""}`
              : `Internal ${rec.length} × ${rec.width} × ${rec.height} mm, door ${rec.doorWidth || "–"} × ${rec.doorHeight || "–"} mm. Loose cartons are loaded in SKU blocks, wall-by-wall from the closed end.`;
        }
        function applyUnitDefaults(p) {
          const { kind, rec } = getUnitRecord($(`#${p}-unit`).value);
          if (!rec) return;
          const isPal = kind === "pallet";
          $(`#${p}-base`).value = isPal ? rec.baseHeight || 0 : 0;
          $(`#${p}-tare`).value = isPal ? rec.tare || 0 : 0;
          $(`#${p}-maxg`).value = isPal
            ? rec.maxGross || ""
            : rec.maxPayload || "";
          $(`#${p}-base`).disabled = !isPal;
          $(`#${p}-tare`).disabled = !isPal;
          $(`#${p}-ovh`).checked = isPal && !!rec.allowOverhang;
          $(`#${p}-ovh`).disabled = !isPal;
          $(`#${p}-ovhmm`).disabled = !isPal;
          $(`#${p}-ovh-wrap`).classList.toggle("disabled", !isPal);
          $(`#${p}-maxg`).previousElementSibling.textContent = isPal
            ? "Max gross weight (kg)"
            : "Max payload (kg)";
          $(`#${p}-unit-info`).textContent = isPal
            ? `${rec.length} × ${rec.width} mm, max height ${rec.maxHeight} mm${rec.standard ? " · " + rec.standard : ""}`
            : `Internal ${rec.length} × ${rec.width} × ${rec.height} mm, door ${rec.doorWidth || "–"} × ${rec.doorHeight || "–"} mm. Loose cartons are loaded in SKU blocks, wall-by-wall from the closed end.`;
        }
        function readSettingsRaw(p) {
          return {
            unit: $(`#${p}-unit`).value,
            orient: $(`#${p}-orient`).value,
            clear: $(`#${p}-clear`).value,
            base: $(`#${p}-base`).value,
            tare: $(`#${p}-tare`).value,
            maxg: $(`#${p}-maxg`).value,
            ovh: $(`#${p}-ovh`).checked,
            ovhmm: $(`#${p}-ovhmm`).value,
          };
        }
        function writeSettingsRaw(p, s) {
          if (!s) return;
          if ([...$(`#${p}-unit`).options].some((o) => o.value === s.unit))
            $(`#${p}-unit`).value = s.unit;
          applyUnitDefaults(p);
          $(`#${p}-orient`).value = s.orient || "sku";
          $(`#${p}-clear`).value = s.clear ?? 0;
          if (!$(`#${p}-base`).disabled) $(`#${p}-base`).value = s.base ?? 0;
          if (!$(`#${p}-tare`).disabled) $(`#${p}-tare`).value = s.tare ?? 0;
          $(`#${p}-maxg`).value = s.maxg ?? "";
          if (!$(`#${p}-ovh`).disabled) $(`#${p}-ovh`).checked = !!s.ovh;
          $(`#${p}-ovhmm`).value = s.ovhmm ?? 25;
        }
        /* Build the engine request header from a settings panel; returns {req, errors}. */
        function readSettings(p) {
          const raw = readSettingsRaw(p),
            errors = [];
          const { kind, rec } = getUnitRecord(raw.unit);
          if (!rec) return { errors: ["No pallet or container selected."] };
          const clear = numOrNull(raw.clear) ?? 0,
            base = numOrNull(raw.base) ?? 0,
            tare = numOrNull(raw.tare) ?? 0,
            maxg = numOrNull(raw.maxg);
          if (clear < 0) errors.push("Clearance cannot be negative.");
          if (base < 0) errors.push("Pallet base height cannot be negative.");
          if (tare < 0) errors.push("Tare weight cannot be negative.");
          if (maxg !== null && maxg <= 0)
            errors.push(
              "Maximum gross weight must be greater than zero, or left blank for unrestricted.",
            );
          const unit =
            kind === "pallet"
              ? {
                  kind,
                  id: rec.id,
                  name: rec.name,
                  L: Number(rec.length),
                  W: Number(rec.width),
                  maxHeight: Number(rec.maxHeight),
                  baseHeight: base,
                  tare,
                  maxGross: maxg,
                }
              : {
                  kind,
                  id: rec.id,
                  name: rec.name,
                  L: Number(rec.length),
                  W: Number(rec.width),
                  maxHeight: Number(rec.height),
                  baseHeight: 0,
                  topClearance: Number(rec.topClearance || 0),
                  tare: 0,
                  maxGross: maxg,
                  doorHeight: rec.doorHeight,
                };
          return {
            errors,
            req: {
              unit,
              orientationPolicy: raw.orient,
              clearance: clear,
              allowOverhang: kind === "pallet" && raw.ovh,
              overhangMm: numOrNull(raw.ovhmm) ?? 0,
              assessment: ASSESS(),
              fillProducts: activeProducts(),
            },
          };
        }
        /* Product dropdowns are grouped by brand. */
        function brandOrder() {
          const extra = [
            ...new Set(
              DB.products
                .map((p) => p.brand)
                .filter((b) => b && !Engine.BRANDS.includes(b)),
            ),
          ].sort();
          return Engine.BRANDS.concat(extra, [""]);
        }
        function productOptionsHTML(selected, includeInactive) {
          const list = DB.products.filter(
            (p) => p.active !== false || includeInactive || p.id === selected,
          );
          const opt = (p) =>
            `<option value="${esc(p.id)}"${p.id === selected ? " selected" : ""}>${esc(p.sku)}${p.active === false ? " (inactive)" : ""}</option>`;
          const missing =
            selected && !DB.products.some((p) => p.id === selected)
              ? `<option value="${esc(selected)}" selected>(deleted product – choose another)</option>`
              : "";
          if (!list.some((p) => p.brand))
            return missing + list.map(opt).join("");
          return (
            missing +
            brandOrder()
              .map((b) => {
                const g = list.filter((p) => (p.brand || "") === b);
                return g.length
                  ? `<optgroup label="${esc(b || "No brand")}">${g.map(opt).join("")}</optgroup>`
                  : "";
              })
              .join("")
          );
        }
        function brandFilterHTML() {
          const used = brandOrder().filter((b) =>
            DB.products.some(
              (p) => p.active !== false && (p.brand || "") === b,
            ),
          );
          return `<option value="*">All brands</option>${used.map((b) => `<option value="${esc(b)}">${esc(b || "No brand")}</option>`).join("")}`;
        }

        /* ============================ VISUALISATION ========================== */
        let svgSeq = 0;
        function topViewSVG(plan, layerNo, opts) {
          opts = opts || {};
          const g = plan.geom,
            ov = g.ov || 0;
          const spanX = g.L + 2 * ov,
            spanY = g.W + 2 * ov;
          const s = Math.min(
            (opts.maxW || 640) / spanX,
            (opts.maxH || 460) / spanY,
          );
          const pad = 30,
            W = Math.round(spanX * s + pad * 2),
            H = Math.round(spanY * s + pad * 2);
          const X = (x) => pad + (x + ov) * s,
            Y = (y) => pad + (y + ov) * s;
          const lay = plan.placements.filter((p) => p.layer === layerNo);
          const below = plan.placements.filter((p) => p.layer === layerNo - 1);
          const hid = "hatch" + ++svgSeq;
          let o = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Arial, sans-serif" role="img" aria-label="Top view of ${g.kind === "container" ? "tier" : "layer"} ${layerNo}">`;
          o += `<defs><pattern id="${hid}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#f4ecdf"/><line x1="0" y1="0" x2="0" y2="9" stroke="#d9c6a5" stroke-width="3"/></pattern></defs>`;
          if (ov)
            o += `<rect x="${X(-ov)}" y="${Y(-ov)}" width="${spanX * s}" height="${spanY * s}" fill="none" stroke="#b3261e" stroke-dasharray="5 4" stroke-width="1"><title>Overhang limit (${ov} mm per side)</title></rect>`;
          o += `<rect x="${X(0)}" y="${Y(0)}" width="${g.L * s}" height="${g.W * s}" fill="url(#${hid})" stroke="#7a5a2b" stroke-width="2"><title>${g.kind === "container" ? "Container floor" : "Pallet deck"} ${g.L} × ${g.W} mm – hatched area = unused space</title></rect>`;
          for (const p of below)
            o += `<rect x="${X(p.x)}" y="${Y(p.y)}" width="${p.l * s}" height="${p.w * s}" fill="none" stroke="#8c99a8" stroke-dasharray="3 3" stroke-width="1"/>`;
          for (const p of lay) {
            const col = colorFor(p.productId),
              tc = textColor(col);
            const x = X(p.x),
              y = Y(p.y),
              w = p.l * s,
              h = p.w * s;
            o += `<g><title>#${fmt(p.id)} ${esc(p.sku)} · ${fmt(p.l)}×${fmt(p.w)}×${fmt(p.h)} mm · ${esc(p.orientationDesc)} (${esc(p.orientation)}) · x ${fmt(p.x)}, y ${fmt(p.y)}, z ${fmt(p.z)} mm</title>`;
            o += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}" stroke="#1b2733" stroke-width="1"/>`;
            if (p.orientation[0] !== "L")
              o += `<path d="M${x} ${y} l${Math.min(10, w / 3)} 0 l${-Math.min(10, w / 3)} ${Math.min(10, h / 3)} z" fill="${tc}" opacity=".85"/>`;
            if (p.orientation[4] !== "H")
              o += `<line x1="${x}" y1="${y + h}" x2="${x + w}" y2="${y}" stroke="${tc}" stroke-width="1" opacity=".6"/>`;
            if (w > 22 && h > 14) {
              const fs = Math.max(8, Math.min(12, h / 3.2, w / 4));
              o += `<text x="${x + w / 2}" y="${y + h / 2 + (h > 34 ? -2 : fs / 3)}" font-size="${fs}" text-anchor="middle" fill="${tc}" font-weight="700">#${p.id}</text>`;
              if (h > 34 && w > 40)
                o += `<text x="${x + w / 2}" y="${y + h / 2 + fs}" font-size="${fs - 1}" text-anchor="middle" fill="${tc}">${esc(p.sku.length > 11 ? p.sku.slice(0, 10) + "…" : p.sku)}</text>`;
            }
            o += `</g>`;
          }
          o += `<text x="${X(g.L / 2)}" y="${pad - 10}" font-size="11" text-anchor="middle" fill="#5a6b7d">Length ${fmt(g.L)} mm</text>`;
          o += `<text transform="translate(${pad - 10} ${Y(g.W / 2)}) rotate(-90)" font-size="11" text-anchor="middle" fill="#5a6b7d">Width ${fmt(g.W)} mm</text>`;
          if (g.kind === "container")
            o += `<text x="${X(0) + 2}" y="${H - 8}" font-size="10" fill="#5a6b7d">◀ closed end (load first)</text><text x="${X(g.L) - 2}" y="${H - 8}" font-size="10" text-anchor="end" fill="#5a6b7d">doors ▶</text>`;
          return o + "</svg>";
        }
        function elevationSVG(plan, axis, opts) {
          opts = opts || {};
          const g = plan.geom,
            ov = g.ov || 0;
          const span = axis === "y" ? g.W + 2 * ov : g.L + 2 * ov;
          const totalH = g.maxHeight;
          const baseDraw = g.baseHeight > 0 ? 0 : 60;
          const s = Math.min(
            (opts.maxW || 700) / span,
            (opts.maxH || 380) / (totalH + baseDraw),
          );
          const padL = 12,
            padR = 120,
            padT = 18,
            padB = 24;
          const W = Math.round(span * s + padL + padR),
            H = Math.round((totalH + baseDraw) * s + padT + padB);
          const floorY = padT + totalH * s;
          const Yz = (zAbs) => floorY - zAbs * s;
          const Xc = (v) => padL + (v + ov) * s;
          let o = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Arial, sans-serif" role="img" aria-label="Side elevation">`;
          if (g.baseHeight > 0)
            o += `<rect x="${Xc(0)}" y="${Yz(g.baseHeight)}" width="${(axis === "y" ? g.W : g.L) * s}" height="${g.baseHeight * s}" fill="#b98b52" stroke="#6d4c22"><title>Pallet base ${g.baseHeight} mm</title></rect>`;
          else
            o += `<rect x="${Xc(0)}" y="${floorY}" width="${(axis === "y" ? g.W : g.L) * s}" height="5" fill="#b98b52"/><text x="${Xc(0)}" y="${floorY + 17}" font-size="10" fill="#6d4c22">${g.kind === "container" ? "Container floor" : "Pallet base (0 mm entered)"}</text>`;
          /* Only the carton nearest the viewer is visible for each projected rectangle, so hidden ones are
       skipped – a 17,000-carton container then draws a few thousand shapes instead of all of them. */
          const nearest = new Map();
          for (const p of plan.placements) {
            const k =
              axis === "y"
                ? `${p.y}|${p.w}|${p.z}|${p.h}`
                : `${p.x}|${p.l}|${p.z}|${p.h}`;
            const cur = nearest.get(k);
            if (
              !cur ||
              (axis === "y" ? p.x + p.l > cur.x + cur.l : p.y < cur.y)
            )
              nearest.set(k, p);
          }
          const list = [...nearest.values()].sort(
            axis === "y"
              ? (p, q) => p.x - q.x
              : (p, q) => q.y + q.w - (p.y + p.w),
          );
          for (const p of list) {
            const col = colorFor(p.productId);
            const a = axis === "y" ? p.y : p.x,
              len = axis === "y" ? p.w : p.l;
            o += `<rect x="${Xc(a)}" y="${Yz(g.baseHeight + p.z + p.h)}" width="${len * s}" height="${p.h * s}" fill="${col}" fill-opacity=".92" stroke="#1b2733" stroke-width=".8"><title>#${p.id} ${esc(p.sku)} · layer ${p.layer} · z ${p.z}–${p.z + p.h} mm</title></rect>`;
          }
          const maxY = Yz(totalH - (g.topClearance || 0));
          const stack = plan.kpis.stackHeight,
            sy = Yz(g.baseHeight + stack);
          const tx = W - padR + 10,
            same = stack > 0 && Math.abs(sy - maxY) < 14;
          o += `<line x1="${padL}" x2="${W - padR + 6}" y1="${maxY}" y2="${maxY}" stroke="#b3261e" stroke-dasharray="6 4" stroke-width="1.5"/>`;
          o += `<text x="${tx}" y="${maxY + 4}" font-size="11" fill="#b3261e">Max ${fmt(totalH - (g.topClearance || 0))} mm</text>`;
          if (stack > 0) {
            o += `<line x1="${padL}" x2="${W - padR + 6}" y1="${sy}" y2="${sy}" stroke="#17784a" stroke-dasharray="3 3" stroke-width="1.2"/>`;
            o += `<text x="${tx}" y="${same ? maxY + 17 : sy + 4}" font-size="11" fill="#17784a">Stack ${fmt(g.baseHeight + stack)} mm</text>`;
          }
          const busy = [maxY, same ? maxY + 13 : sy];
          const tops = [...new Set(plan.layers.map((L) => L.top))].sort(
            (a, b) => a - b,
          );
          if (tops.length <= 14) {
            tops.forEach((t) => {
              const y = Yz(g.baseHeight + t);
              if (busy.some((v) => Math.abs(v - y) < 15)) return;
              o += `<text x="${tx}" y="${y + 4}" font-size="10" fill="#5a6b7d">${fmt(g.baseHeight + t)}</text>`;
              busy.push(y);
            });
          }
          return o + "</svg>";
        }
        function legendHTML(plan) {
          const counts = {};
          plan.placements.forEach((p) => {
            counts[p.productId] = counts[p.productId] || { sku: p.sku, n: 0 };
            counts[p.productId].n++;
          });
          return (
            Object.keys(counts)
              .map(
                (id) =>
                  `<span><span class="sw" style="background:${colorFor(id)}"></span>${esc(counts[id].sku)} × ${counts[id].n}</span>`,
              )
              .join("") +
            `<span class="muted">◤ corner mark = footprint rotated 90° · diagonal = carton on its side · hatched = unused space · dashed = outline of the layer below</span>`
          );
        }
        function groupNote(plan, no) {
          const gr = plan.layerGroups.find((x) => no >= x.from && no <= x.to);
          const lab = tierWord(plan) + "s";
          return gr && gr.to > gr.from
            ? `${lab} ${gr.from}–${gr.to} use the same layout.`
            : "";
        }
        function validationHTML(v) {
          const names = {
            bounds: "within footprint",
            overlap: "no overlap",
            height: "height",
            weight: "weight",
            orientation: "orientation rules",
            support: "full base support",
            counts: "counts match table",
          };
          if (v.ok)
            return `<div class="valid ok">✔ Physical validation passed: ${Object.keys(
              names,
            )
              .map((k) => names[k])
              .join(" · ")}</div>`;
          return `<div class="valid bad">✖ Physical validation FAILED: ${v.errors.map(esc).join(" ")}</div>`;
        }
        /* Active 3D viewers; detached ones are destroyed (ResizeObserver + timers released). */
        const liveViews = new Set();

        /* ============================= 3-D VIEWER ============================
     Self-contained orthographic 3-D renderer on a 2-D canvas (no library,
     works offline). Every box is drawn from the calculated carton
     coordinates. Painter's ordering uses separating-axis tests between
     boxes (topological sort), so nearer cartons always cover farther ones. */
        const View3D = (function () {
          const PRESETS = {
            iso: [-58, 26],
            front: [-90, 2],
            side: [0, 2],
            top: [-90, 89.5],
            back: [122, 26],
          };
          const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
          const LIGHT = (() => {
            const v = [-0.35, -0.55, 0.76],
              l = Math.hypot(v[0], v[1], v[2]);
            return v.map((x) => x / l);
          })();
          const FACES = [
            [0, -1],
            [0, 1],
            [1, -1],
            [1, 1],
            [2, -1],
            [2, 1],
          ];
          const rgbOf = (hex) => {
            const n = parseInt(hex.slice(1), 16);
            return [n >> 16, (n >> 8) & 255, n & 255];
          };
          const shade = (c, f, a) => {
            const k = (v) =>
              Math.round(
                clamp(f >= 1 ? v + (255 - v) * (f - 1) : v * f, 0, 255),
              );
            return `rgba(${k(c[0])},${k(c[1])},${k(c[2])},${a})`;
          };
          const ink = (c) =>
            0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] > 150
              ? "#1b2733"
              : "#ffffff";

          function buildScene(plan) {
            const g = plan.geom,
              isC = g.kind === "container";
            const boxes = plan.placements.map((p) => {
              const parts = String(p.orientation || "").split("×");
              return {
                p,
                min: [p.x, p.y, p.z],
                max: [p.x + p.l, p.y + p.w, p.z + p.h],
                col: rgbOf(colorFor(p.productId)),
                hAxis: Math.max(0, parts.indexOf("H")),
              };
            });
            const seq = boxes
              .slice()
              .sort(
                isC
                  ? (a, b) =>
                      a.min[0] - b.min[0] ||
                      a.min[2] - b.min[2] ||
                      a.min[1] - b.min[1]
                  : (a, b) =>
                      a.p.layer - b.p.layer ||
                      a.min[2] - b.min[2] ||
                      a.min[1] - b.min[1] ||
                      a.min[0] - b.min[0],
              );
            seq.forEach((b, i) => {
              b.seq = i + 1;
            });
            /* Neighbour table for hidden-face culling: a face touching an identical neighbour
         face is never visible, so dense loads only draw their outer shell. */
            const R = (v) => Math.round(v * 10);
            const byMin = new Map(),
              byMaxX = new Map(),
              byMaxY = new Map();
            boxes.forEach((b) => {
              byMin.set(`${R(b.min[0])}|${R(b.min[1])}|${R(b.min[2])}`, b);
              byMaxX.set(`${R(b.max[0])}|${R(b.min[1])}|${R(b.min[2])}`, b);
              byMaxY.set(`${R(b.min[0])}|${R(b.max[1])}|${R(b.min[2])}`, b);
            });
            const same = (a, q, axes) =>
              axes.every(
                (k) =>
                  R(a.min[k]) === R(q.min[k]) && R(a.max[k]) === R(q.max[k]),
              );
            boxes.forEach((b) => {
              const nb = [null, null, null, null, null, null];
              let q = byMaxX.get(
                `${R(b.min[0])}|${R(b.min[1])}|${R(b.min[2])}`,
              );
              if (q && same(b, q, [1, 2])) nb[0] = q;
              q = byMin.get(`${R(b.max[0])}|${R(b.min[1])}|${R(b.min[2])}`);
              if (q && same(b, q, [1, 2])) nb[1] = q;
              q = byMaxY.get(`${R(b.min[0])}|${R(b.min[1])}|${R(b.min[2])}`);
              if (q && same(b, q, [0, 2])) nb[2] = q;
              q = byMin.get(`${R(b.min[0])}|${R(b.max[1])}|${R(b.min[2])}`);
              if (q && same(b, q, [0, 2])) nb[3] = q;
              q = byMin.get(`${R(b.min[0])}|${R(b.min[1])}|${R(b.max[2])}`);
              if (q && same(b, q, [0, 1])) nb[5] = q;
              b.nb = nb;
            });
            const deckH = isC ? 25 : g.baseHeight > 0 ? g.baseHeight : 110;
            return {
              boxes,
              seq,
              env: {
                L: g.L,
                W: g.W,
                H: isC ? g.maxHeight : g.usableH,
                ov: g.ov || 0,
                deckH,
                isC,
                realBase: g.baseHeight || 0,
              },
            };
          }

          function camera(state, scene, W, H) {
            const th = (state.yaw * Math.PI) / 180,
              ph = (state.pitch * Math.PI) / 180;
            const d = [
              Math.cos(ph) * Math.cos(th),
              Math.cos(ph) * Math.sin(th),
              Math.sin(ph),
            ];
            const r = [-Math.sin(th), Math.cos(th), 0];
            const u = [
              -Math.sin(ph) * Math.cos(th),
              -Math.sin(ph) * Math.sin(th),
              Math.cos(ph),
            ];
            const e = scene.env,
              c = [e.L / 2, e.W / 2, (e.H - e.deckH) / 2];
            let minR = Infinity,
              maxR = -Infinity,
              minU = Infinity,
              maxU = -Infinity;
            for (const x of [-e.ov, e.L + e.ov])
              for (const y of [-e.ov, e.W + e.ov])
                for (const z of [-e.deckH, e.H]) {
                  const q = [x - c[0], y - c[1], z - c[2]],
                    pr = q[0] * r[0] + q[1] * r[1],
                    pu = q[0] * u[0] + q[1] * u[1] + q[2] * u[2];
                  minR = Math.min(minR, pr);
                  maxR = Math.max(maxR, pr);
                  minU = Math.min(minU, pu);
                  maxU = Math.max(maxU, pu);
                }
            const s =
              Math.min(
                (W - 60) / Math.max(1, maxR - minR),
                (H - 50) / Math.max(1, maxU - minU),
              ) * state.zoom;
            const ox = W / 2 - (s * (minR + maxR)) / 2 + state.panX,
              oy = H / 2 + (s * (minU + maxU)) / 2 + state.panY;
            return {
              d,
              s,
              P: (x, y, z) => {
                const q0 = x - c[0],
                  q1 = y - c[1],
                  q2 = z - c[2];
                return [
                  ox + s * (q0 * r[0] + q1 * r[1]),
                  oy - s * (q0 * u[0] + q1 * u[1] + q2 * u[2]),
                ];
              },
              depth: (x, y, z) =>
                (x - c[0]) * d[0] + (y - c[1]) * d[1] + (z - c[2]) * d[2],
            };
          }

          function orderBoxes(list, cam) {
            list.forEach((b) => {
              b._dep = cam.depth(
                (b.min[0] + b.max[0]) / 2,
                (b.min[1] + b.max[1]) / 2,
                (b.min[2] + b.max[2]) / 2,
              );
            });
            const n = list.length;
            if (n > 700) return list.slice().sort((a, b) => a._dep - b._dep);
            list.forEach((b) => {
              let x0 = Infinity,
                y0 = Infinity,
                x1 = -Infinity,
                y1 = -Infinity;
              for (const x of [b.min[0], b.max[0]])
                for (const y of [b.min[1], b.max[1]])
                  for (const z of [b.min[2], b.max[2]]) {
                    const p = cam.P(x, y, z);
                    x0 = Math.min(x0, p[0]);
                    x1 = Math.max(x1, p[0]);
                    y0 = Math.min(y0, p[1]);
                    y1 = Math.max(y1, p[1]);
                  }
              b._bb = [x0, y0, x1, y1];
            });
            const d = cam.d;
            const before = (A, B) => {
              for (let k = 0; k < 3; k++) {
                if (A.max[k] <= B.min[k] + 0.5) {
                  if (d[k] > 1e-9) return true;
                  if (d[k] < -1e-9) return false;
                }
                if (B.max[k] <= A.min[k] + 0.5) {
                  if (d[k] > 1e-9) return false;
                  if (d[k] < -1e-9) return true;
                }
              }
              return A._dep <= B._dep;
            };
            const adj = Array.from({ length: n }, () => []),
              indeg = new Array(n).fill(0);
            for (let i = 0; i < n; i++)
              for (let j = i + 1; j < n; j++) {
                const a = list[i]._bb,
                  b = list[j]._bb;
                if (
                  a[2] < b[0] + 0.5 ||
                  b[2] < a[0] + 0.5 ||
                  a[3] < b[1] + 0.5 ||
                  b[3] < a[1] + 0.5
                )
                  continue;
                if (before(list[i], list[j])) {
                  adj[i].push(j);
                  indeg[j]++;
                } else {
                  adj[j].push(i);
                  indeg[i]++;
                }
              }
            const out = [],
              done = new Array(n).fill(false);
            let ready = [];
            for (let i = 0; i < n; i++) if (!indeg[i]) ready.push(i);
            while (out.length < n) {
              if (!ready.length) {
                let k = -1;
                for (let i = 0; i < n; i++)
                  if (!done[i] && (k < 0 || list[i]._dep < list[k]._dep)) k = i;
                ready.push(k);
                indeg[k] = 0;
              }
              let bi = 0;
              for (let t = 1; t < ready.length; t++)
                if (list[ready[t]]._dep < list[ready[bi]]._dep) bi = t;
              const i = ready.splice(bi, 1)[0];
              if (done[i]) continue;
              done[i] = true;
              out.push(list[i]);
              for (const j of adj[i])
                if (!done[j] && --indeg[j] === 0) ready.push(j);
            }
            return out;
          }

          function facePoints(min, max, ax, sg) {
            const v = sg > 0 ? max[ax] : min[ax],
              a1 = (ax + 1) % 3,
              a2 = (ax + 2) % 3;
            return [
              [min[a1], min[a2]],
              [max[a1], min[a2]],
              [max[a1], max[a2]],
              [min[a1], max[a2]],
            ].map(([p, q]) => {
              const pt = [0, 0, 0];
              pt[ax] = v;
              pt[a1] = p;
              pt[a2] = q;
              return pt;
            });
          }
          const polyArea = (pts) =>
            Math.abs(
              pts.reduce((s, p, i) => {
                const q = pts[(i + 1) % pts.length];
                return s + p[0] * q[1] - q[0] * p[1];
              }, 0),
            ) / 2;

          function drawBox(g2, b, cam, alpha, opt, hits) {
            const polys = [];
            for (let fi = 0; fi < 6; fi++) {
              const [ax, sg] = FACES[fi];
              const nd = sg * cam.d[ax];
              if (nd <= 1e-6) continue;
              if (alpha === 1 && b.nb && b.nb[fi] && b.nb[fi]._shown) continue;
              const pts3 = facePoints(b.min, b.max, ax, sg),
                pts = pts3.map((p) => cam.P(p[0], p[1], p[2]));
              const nl = sg * LIGHT[ax];
              g2.beginPath();
              pts.forEach((p, i) =>
                i ? g2.lineTo(p[0], p[1]) : g2.moveTo(p[0], p[1]),
              );
              g2.closePath();
              g2.fillStyle = shade(b.col, 0.62 + 0.45 * Math.max(0, nl), alpha);
              g2.fill();
              g2.strokeStyle = b.hot
                ? "rgba(255,196,0,1)"
                : `rgba(20,30,40,${0.6 * alpha})`;
              g2.lineWidth = b.hot ? 2.2 : 0.8;
              g2.stroke();
              polys.push(pts);
              const area = polyArea(pts);
              if (
                opt.arrows &&
                alpha > 0.6 &&
                ax !== b.hAxis &&
                area > 520 &&
                !b.deck
              ) {
                const h = b.hAxis,
                  o = [0, 1, 2].find((k) => k !== h && k !== ax);
                const c3 = [
                  (b.min[0] + b.max[0]) / 2,
                  (b.min[1] + b.max[1]) / 2,
                  (b.min[2] + b.max[2]) / 2,
                ];
                c3[ax] = sg > 0 ? b.max[ax] : b.min[ax];
                const eh = b.max[h] - b.min[h],
                  eo = b.max[o] - b.min[o];
                const at = (dh, dO) => {
                  const p = c3.slice();
                  p[h] += dh;
                  p[o] += dO;
                  return cam.P(p[0], p[1], p[2]);
                };
                const tail = at(-0.28 * eh, 0),
                  tip = at(0.28 * eh, 0),
                  l1 = at(0.12 * eh, -0.16 * eo),
                  l2 = at(0.12 * eh, 0.16 * eo);
                g2.strokeStyle =
                  ink(b.col) === "#ffffff"
                    ? "rgba(255,255,255,.9)"
                    : "rgba(27,39,51,.85)";
                g2.lineWidth = Math.max(
                  1.2,
                  Math.min(2.4, Math.sqrt(area) / 22),
                );
                g2.beginPath();
                g2.moveTo(tail[0], tail[1]);
                g2.lineTo(tip[0], tip[1]);
                g2.moveTo(l1[0], l1[1]);
                g2.lineTo(tip[0], tip[1]);
                g2.lineTo(l2[0], l2[1]);
                g2.stroke();
              }
              if (opt.labels && alpha > 0.6 && ax === 2 && sg > 0 && !b.deck) {
                const xs = pts.map((p) => p[0]),
                  ys = pts.map((p) => p[1]);
                const w = Math.max(...xs) - Math.min(...xs),
                  hgt = Math.max(...ys) - Math.min(...ys);
                if (w > 64 && hgt > 18) {
                  const cx = xs.reduce((s, v) => s + v, 0) / 4,
                    cy = ys.reduce((s, v) => s + v, 0) / 4;
                  const fs = Math.max(9, Math.min(12, w / 7));
                  g2.font = `600 ${fs}px Segoe UI, Arial, sans-serif`;
                  g2.textAlign = "center";
                  g2.textBaseline = "middle";
                  g2.fillStyle = ink(b.col);
                  let t = b.p.sku;
                  while (t.length > 3 && g2.measureText(t).width > w * 0.85)
                    t = t.slice(0, -2);
                  g2.fillText(t === b.p.sku ? t : t + "…", cx, cy);
                }
              }
            }
            if (hits && !b.deck) hits.push({ b, polys });
          }

          function drawEnvelope(g2, env, cam) {
            const x0 = 0,
              x1 = env.L,
              y0 = 0,
              y1 = env.W,
              z1 = env.H;
            const E = [
              [
                [x0, y0, 0],
                [x0, y0, z1],
              ],
              [
                [x1, y0, 0],
                [x1, y0, z1],
              ],
              [
                [x0, y1, 0],
                [x0, y1, z1],
              ],
              [
                [x1, y1, 0],
                [x1, y1, z1],
              ],
              [
                [x0, y0, z1],
                [x1, y0, z1],
              ],
              [
                [x0, y1, z1],
                [x1, y1, z1],
              ],
              [
                [x0, y0, z1],
                [x0, y1, z1],
              ],
              [
                [x1, y0, z1],
                [x1, y1, z1],
              ],
            ];
            g2.save();
            g2.setLineDash(env.isC ? [] : [6, 5]);
            g2.strokeStyle = env.isC
              ? "rgba(90,107,125,.55)"
              : "rgba(179,38,30,.55)";
            g2.lineWidth = 1.1;
            g2.beginPath();
            E.forEach(([a, b]) => {
              const p = cam.P(...a),
                q = cam.P(...b);
              g2.moveTo(p[0], p[1]);
              g2.lineTo(q[0], q[1]);
            });
            g2.stroke();
            g2.restore();
            const top = [
              cam.P(x0, y0, z1),
              cam.P(x1, y0, z1),
              cam.P(x0, y1, z1),
              cam.P(x1, y1, z1),
            ].reduce((m, p) => (p[1] < m[1] ? p : m));
            haloText(
              g2,
              env.isC
                ? `Container ${fmt(env.L)} × ${fmt(env.W)} × ${fmt(env.H)} mm`
                : `Max load height ${fmt(env.H)} mm`,
              top[0],
              top[1] - 6,
              env.isC ? "#44546a" : "#b3261e",
              "center",
              "bottom",
            );
            if (env.isC) {
              const dp = cam.P(x1, y1 / 2, 0);
              haloText(
                g2,
                "DOORS",
                dp[0] + 6,
                dp[1] + 14,
                "#44546a",
                "left",
                "middle",
              );
            }
            const base = [
              cam.P(x0, y0, -env.deckH),
              cam.P(x1, y0, -env.deckH),
              cam.P(x0, y1, -env.deckH),
              cam.P(x1, y1, -env.deckH),
            ].reduce((m, p) => (p[1] > m[1] ? p : m));
            if (!env.isC)
              haloText(
                g2,
                env.realBase
                  ? `Pallet base ${fmt(env.realBase)} mm`
                  : "Pallet (base height not entered – drawn for reference)",
                base[0],
                base[1] + 6,
                "#6d4c22",
                "center",
                "top",
              );
          }
          function haloText(g2, text, x, y, color, align, baseline) {
            g2.font = "600 11px Segoe UI, Arial, sans-serif";
            g2.textAlign = align;
            g2.textBaseline = baseline;
            g2.lineWidth = 4;
            g2.strokeStyle = "rgba(255,255,255,.92)";
            g2.lineJoin = "round";
            g2.strokeText(text, x, y);
            g2.fillStyle = color;
            g2.fillText(text, x, y);
          }

          function render(canvas, state, scene, W, H) {
            const g2 = canvas.getContext("2d");
            const dpr = window.devicePixelRatio || 1;
            g2.setTransform(dpr, 0, 0, dpr, 0, 0);
            g2.clearRect(0, 0, W, H);
            const bg = g2.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, "#f7f9fc");
            bg.addColorStop(1, "#e6ecf3");
            g2.fillStyle = bg;
            g2.fillRect(0, 0, W, H);
            const cam = camera(state, scene, W, H),
              e = scene.env;
            const deck = {
              deck: true,
              min: [0, 0, -e.deckH],
              max: [e.L, e.W, 0],
              col: e.isC ? [150, 160, 172] : [185, 139, 82],
              hAxis: 2,
              p: { sku: "" },
            };
            drawBox(g2, deck, cam, 1, {}, null);
            const shown = [],
              ghosts = [];
            for (const b of scene.boxes) {
              b.hot = false;
              b._shown = false;
              if (b.seq > state.seqMax) continue;
              if (state.mode === "upto" && b.p.layer > state.layer) continue;
              if (state.mode === "only" && b.p.layer !== state.layer) {
                ghosts.push(b);
                continue;
              }
              shown.push(b);
            }
            if (state.seqMax < scene.boxes.length) {
              const last = scene.seq[state.seqMax - 1];
              if (last) last.hot = true;
            }
            if (state.mode === "upto")
              shown.forEach((b) => {
                if (b.p.layer === state.layer) b.hot = true;
              });
            shown.forEach((b) => {
              b._shown = true;
            });
            const faceVisible = (b) =>
              FACES.some(
                ([ax, sg], fi) =>
                  sg * cam.d[ax] > 1e-6 && !(b.nb[fi] && b.nb[fi]._shown),
              );
            const visible = shown.filter((b) => b.hot || faceVisible(b));
            const ghostSet = new Set(ghosts);
            const all = orderBoxes(visible.concat(ghosts), cam);
            const hits = [];
            for (const b of all)
              drawBox(
                g2,
                b,
                cam,
                ghostSet.has(b) ? 0.12 : 1,
                state,
                ghostSet.has(b) ? null : hits,
              );
            drawEnvelope(g2, e, cam);
            return hits;
          }

          function inPoly(x, y, pts) {
            let c = false;
            for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
              if (
                pts[i][1] > y !== pts[j][1] > y &&
                x <
                  ((pts[j][0] - pts[i][0]) * (y - pts[i][1])) /
                    (pts[j][1] - pts[i][1]) +
                    pts[i][0]
              )
                c = !c;
            }
            return c;
          }

          function mount(host, plan, opts) {
            opts = opts || {};
            const scene = buildScene(plan),
              n = scene.boxes.length;
            const lab = tierWord(plan);
            host.innerHTML = `
        <div class="v3d-bar">
          <div class="seg" data-v="view"><button data-view="iso" class="on">3D</button><button data-view="back">3D back</button><button data-view="front">Front</button><button data-view="side">Side</button><button data-view="top">Top</button></div>
          <select data-v="mode" aria-label="What to show"><option value="all">Whole load</option><option value="upto">Build up to selected ${lab.toLowerCase()}</option><option value="only">Selected ${lab.toLowerCase()} only</option></select>
          <label class="chk small"><input type="checkbox" data-v="labels" checked> Labels</label>
          <label class="chk small" title="Arrows on the carton sides point to the carton's original top – like the ‘this way up’ print on a real carton"><input type="checkbox" data-v="arrows" checked> “This way up” arrows</label>
        </div>
        <div class="v3d-stage"><canvas aria-label="3D view of the load – drag to rotate"></canvas><div class="v3d-tip" hidden></div>
          <div class="v3d-help">Drag to rotate · Shift+drag to move · scroll to zoom · double-click to reset</div></div>
        <div class="v3d-seq">
          <button class="btn small" data-v="play">▶ Play loading sequence</button>
          <input type="range" data-v="seq" min="0" max="${n}" value="${n}" aria-label="Loading sequence step">
          <span class="small muted" data-v="seqinfo">All ${n} cartons shown</span>
        </div>`;
            const cv = $("canvas", host),
              tip = $(".v3d-tip", host),
              stage = $(".v3d-stage", host);
            const state = {
              yaw: PRESETS.iso[0],
              pitch: PRESETS.iso[1],
              zoom: 1,
              panX: 0,
              panY: 0,
              mode: "all",
              layer: 1,
              seqMax: n,
              labels: true,
              arrows: true,
            };
            let hits = [],
              raf = 0,
              timer = null,
              W = 0,
              H = 0;
            const draw = () => {
              raf = 0;
              W = stage.clientWidth || 600;
              H = opts.height || (plan.geom.kind === "container" ? 400 : 480);
              const dpr = window.devicePixelRatio || 1;
              if (
                cv.width !== Math.round(W * dpr) ||
                cv.height !== Math.round(H * dpr)
              ) {
                cv.width = Math.round(W * dpr);
                cv.height = Math.round(H * dpr);
                cv.style.width = W + "px";
                cv.style.height = H + "px";
              }
              hits = render(cv, state, scene, W, H);
            };
            const redraw = () => {
              if (!raf) raf = requestAnimationFrame(draw);
            };
            const seqInfo = () => {
              const info = $('[data-v="seqinfo"]', host);
              if (state.seqMax >= n) {
                info.textContent = `All ${n} cartons shown`;
                return;
              }
              const b = scene.seq[state.seqMax - 1];
              info.textContent = b
                ? `Step ${state.seqMax} of ${n}: carton #${b.p.id} ${b.p.sku} → ${lab.toLowerCase()} ${b.p.layer}, x ${fmt(b.p.x)} · y ${fmt(b.p.y)} · z ${fmt(b.p.z)} mm (${b.p.orientationDesc})`
                : "Empty – press play";
            };
            const stop = () => {
              if (timer) {
                clearInterval(timer);
                timer = null;
                $('[data-v="play"]', host).textContent =
                  "▶ Play loading sequence";
              }
            };
            $(".v3d-bar", host).addEventListener("click", (e) => {
              const b = e.target.closest("button[data-view]");
              if (!b) return;
              const [y, p] = PRESETS[b.dataset.view];
              Object.assign(state, {
                yaw: y,
                pitch: p,
                zoom: 1,
                panX: 0,
                panY: 0,
              });
              $$("[data-view]", host).forEach((x) =>
                x.classList.toggle("on", x === b),
              );
              redraw();
            });
            $('[data-v="mode"]', host).addEventListener("change", (e) => {
              state.mode = e.target.value;
              redraw();
            });
            $('[data-v="labels"]', host).addEventListener("change", (e) => {
              state.labels = e.target.checked;
              redraw();
            });
            $('[data-v="arrows"]', host).addEventListener("change", (e) => {
              state.arrows = e.target.checked;
              redraw();
            });
            const seqEl = $('[data-v="seq"]', host);
            seqEl.addEventListener("input", () => {
              stop();
              state.seqMax = +seqEl.value;
              seqInfo();
              redraw();
            });
            $('[data-v="play"]', host).addEventListener("click", (e) => {
              if (timer) {
                stop();
                return;
              }
              state.mode = "all";
              $('[data-v="mode"]', host).value = "all";
              if (state.seqMax >= n) state.seqMax = 0;
              e.target.textContent = "❚❚ Pause";
              const step = Math.max(1, Math.ceil(n / 160));
              timer = setInterval(
                () => {
                  state.seqMax = Math.min(n, state.seqMax + step);
                  seqEl.value = state.seqMax;
                  seqInfo();
                  redraw();
                  if (state.seqMax >= n) stop();
                },
                n > 400 ? 30 : 180,
              );
            });
            let drag = null;
            cv.addEventListener("pointerdown", (e) => {
              drag = {
                x: e.clientX,
                y: e.clientY,
                pan: e.shiftKey || e.button === 2,
              };
              cv.setPointerCapture(e.pointerId);
              tip.hidden = true;
            });
            cv.addEventListener("pointerup", (e) => {
              drag = null;
              try {
                cv.releasePointerCapture(e.pointerId);
              } catch (err) {
                /* ignore */
              }
            });
            cv.addEventListener("contextmenu", (e) => e.preventDefault());
            cv.addEventListener("pointermove", (e) => {
              if (drag) {
                const dx = e.clientX - drag.x,
                  dy = e.clientY - drag.y;
                drag.x = e.clientX;
                drag.y = e.clientY;
                if (drag.pan) {
                  state.panX += dx;
                  state.panY += dy;
                } else {
                  state.yaw -= dx * 0.45;
                  state.pitch = clamp(state.pitch + dy * 0.35, 0, 89.5);
                  $$("[data-view]", host).forEach((x) =>
                    x.classList.remove("on"),
                  );
                }
                redraw();
                return;
              }
              const rect = cv.getBoundingClientRect(),
                x = e.clientX - rect.left,
                y = e.clientY - rect.top;
              let found = null;
              for (let i = hits.length - 1; i >= 0 && !found; i--)
                if (hits[i].polys.some((pts) => inPoly(x, y, pts)))
                  found = hits[i].b;
              if (!found) {
                tip.hidden = true;
                return;
              }
              const p = found.p;
              tip.innerHTML = `<b>#${p.id} ${esc(p.sku)}</b><br>${esc(p.orientationDesc)} (${esc(p.orientation)})<br>${p.l} × ${p.w} × ${p.h} mm · ${fmt(p.weight, 2)} kg<br>${lab} ${p.layer} · x ${fmt(p.x)} · y ${fmt(p.y)} · z ${fmt(p.z)} mm<br>Loading step ${found.seq}`;
              tip.hidden = false;
              tip.style.left = Math.min(x + 14, W - 230) + "px";
              tip.style.top = Math.max(4, y - 10) + "px";
            });
            cv.addEventListener("pointerleave", () => {
              tip.hidden = true;
            });
            cv.addEventListener(
              "wheel",
              (e) => {
                e.preventDefault();
                state.zoom = clamp(
                  state.zoom * Math.exp(-e.deltaY * 0.0015),
                  0.4,
                  8,
                );
                redraw();
              },
              { passive: false },
            );
            cv.addEventListener("dblclick", () => {
              Object.assign(state, {
                yaw: PRESETS.iso[0],
                pitch: PRESETS.iso[1],
                zoom: 1,
                panX: 0,
                panY: 0,
              });
              $$("[data-view]", host).forEach((x) =>
                x.classList.toggle("on", x.dataset.view === "iso"),
              );
              redraw();
            });
            const ro =
              typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(redraw)
                : null;
            if (ro) ro.observe(stage);
            draw();
            return {
              host,
              setLayer(no, mode) {
                state.layer = no;
                if (mode) {
                  state.mode = mode;
                  $('[data-v="mode"]', host).value = mode;
                }
                redraw();
              },
              destroy() {
                stop();
                if (ro) ro.disconnect();
              },
            };
          }

          function snapshot(plan, W, H) {
            const cv = document.createElement("canvas");
            const dpr = window.devicePixelRatio || 1;
            cv.width = Math.round(W * dpr);
            cv.height = Math.round(H * dpr);
            const scene = buildScene(plan);
            render(
              cv,
              {
                yaw: PRESETS.iso[0],
                pitch: PRESETS.iso[1],
                zoom: 1,
                panX: 0,
                panY: 0,
                mode: "all",
                layer: 1,
                seqMax: scene.boxes.length,
                labels: true,
                arrows: true,
              },
              scene,
              W,
              H,
            );
            try {
              return cv.toDataURL("image/png");
            } catch (e) {
              return "";
            }
          }
          return { mount, snapshot };
        })();

        /* ====================== STATUS & FILL-UP PANELS ====================== */
        const ST_ICON = { green: "✔", amber: "!", red: "✖" };
        const stCls = (v) => (v === "green" || v === "red" ? v : "amber");
        function spaceBarHTML(s) {
          if (!s) return "";
          const used = Math.min(100, s.capUtil),
            col =
              used >= ASSESS().greenSpace
                ? "var(--solid-green)"
                : used >= ASSESS().amberSpace
                  ? "var(--solid-amber)"
                  : "var(--solid-red)";
          return `<div class="spacebar" role="img" aria-label="Space used ${fmt(used, 0)} percent">
      <div class="spacebar-track"><div class="spacebar-fill" style="width:${used}%;background:${col}"></div><div class="spacebar-mark" style="left:${ASSESS().greenSpace}%" title="Green threshold ${ASSESS().greenSpace}%"></div></div>
      <div class="spacebar-legend"><span><b>${fmt(used, 0)}%</b> ${s.basis === "positions" ? "of pallet positions used" : `used${s.wUtil > s.volUtil + 0.05 ? " (by weight)" : ""}`}</span><span>${s.freeText ? esc(s.freeText) : `${fmt(s.freeM3, 2)} m³ free${s.remainingHeight > 0.5 ? ` · ${fmt(s.remainingHeight)} mm height left` : ""}`}</span></div></div>`;
        }
        function statusCardHTML(a, opts) {
          if (!a) return "";
          opts = opts || {};
          return `<div class="status-card st-${stCls(a.status)}${opts.compact ? " compact" : ""}" role="status">
      <div class="status-head"><span class="status-icon" aria-hidden="true">${ST_ICON[stCls(a.status)]}</span><div><div class="status-title">${opts.prefix ? esc(opts.prefix) + " – " : ""}${esc(a.title)}</div><div class="status-sub">${esc(a.summary)}</div></div></div>
      ${spaceBarHTML(a.space)}
      ${opts.compact ? "" : `<ul class="checks">${a.checks.map((c) => `<li class="ck ck-${stCls(c.status)}"><span class="ck-dot" aria-label="${stCls(c.status)}"></span><div><b>${esc(c.label)}</b> – ${esc(c.message)}${c.action ? `<div class="ck-action">→ ${esc(c.action)}</div>` : ""}</div></li>`).join("")}</ul>`}
    </div>`;
        }
        const statusPill = (a) =>
          a
            ? `<span class="pill pill-${stCls(a.status)}" title="${esc(a.title)}">${ST_ICON[stCls(a.status)]} ${a.status === "green" ? "READY" : a.safety !== "green" ? (a.safety === "red" ? "NOT SAFE" : "CARE") : a.status === "red" ? "WASTED SPACE" : "IMPROVE"}</span>`
            : "";
        function fillPanelHTML(fill, mode, ref) {
          if (!fill) return "";
          const rows = [];
          if (fill.combined)
            rows.push({ s: fill.combined, key: "c", best: true });
          fill.suggestions.forEach((s, i) => rows.push({ s, key: String(i) }));
          const verb =
            mode === "exact" || mode === "multi"
              ? "Add to shipment"
              : "Add to plan";
          const body = rows.length
            ? `<div class="table-wrap"><table class="fill-table"><thead><tr><th>Suggestion</th><th class="num">+ Cartons</th><th class="num">+ Units</th><th class="num">+ kg</th><th>Space used after</th><th>Effect on target mix</th><th></th></tr></thead><tbody>
      ${rows
        .map(
          ({
            s,
            key,
            best,
          }) => `<tr${best ? ' class="best"' : ""}><td>${best ? '<span class="badge ok">BEST FILL</span> ' : ""}${s.adds.map((a) => `<b>${a.add} ×</b> ${esc(a.sku)}${a.inMix ? "" : ' <span class="badge info">EXTRA</span>'}`).join(" + ")}</td>
        <td class="num">${fmt(s.addCartons)}</td><td class="num">${fmt(s.addUnits)}</td><td class="num">${fmt(s.addWeight, 1)}</td>
        <td><div class="mini-bar"><span style="width:${Math.min(100, s.newCapUtil)}%"></span></div> <b>${fmt(s.newCapUtil, 0)}%</b> <span class="muted small">(+${fmt(s.gain, 1)})</span></td>
        <td class="small">${s.mixEffect ? `${s.mixEffect.within} of ${s.mixEffect.of} SKUs within tolerance (largest gap ${fmt(s.mixEffect.maxDev, 1)} pts)` : s.extraOutsideMix && s.extraOutsideMix.length ? "Not part of the target mix – added as extra cartons" : "–"}</td>
        <td><button class="btn small primary" data-action="fill-add" data-mode="${mode}" data-ref="${esc(ref || "")}" data-key="${key}">${verb}</button></td></tr>`,
        )
        .join("")}
      </tbody></table></div>`
            : `<div class="msg info">Nothing more fits physically: the free space is made of gaps smaller than any active product, or it is blocked by the height or weight limit.${fill.note ? " " + esc(fill.note) : ""}</div>`;
          return `<div class="panel fill-panel"><div class="panel-head"><h2>What else fits? – fill the ${fill.freeM3 !== undefined ? `${fmt(fill.freeM3, 2)} m³ still free` : "free space"}</h2><span class="small muted">Now ${fmt(fill.current.cap, 0)}% used</span></div>
      ${body}
      <p class="small muted">SKUs from your mix are suggested first, then other active products (${fill.extrasConsidered || 0} checked). Every suggestion was re-planned and passed the physical check. ${verb === "Add to plan" ? "Adding re-plans the whole layout as a new “Adjusted plan”; extra SKUs are fixed quantities and do not count towards the target mix." : "Adding increases the quantity in the table and re-plans the shipment."}</p></div>`;
        }

        function renderPlanView(host, plan, title) {
          if (host._v3d) {
            host._v3d.destroy();
            liveViews.delete(host._v3d);
            host._v3d = null;
          }
          if (!plan || !plan.placements.length) {
            host.innerHTML = `<h2>${esc(title || "Loading plan")}</h2><div class="empty">No cartons placed.</div>`;
            return;
          }
          const lab = tierWord(plan);
          const state = { layer: 1, axis: "x" };
          host.innerHTML = `
      <div class="panel-head"><h2>${esc(title || "Loading plan")}</h2>${validationHTML(plan.validation)}</div>
      <h4 style="margin:4px 0 2px">3D view – drawn from the calculated carton positions</h4>
      <div class="v3d-host"></div>
      <h4 style="margin:16px 0 2px">${lab} plans (top view)</h4>
      <div class="small muted">Select a ${lab.toLowerCase()} to see its exact top-down loading pattern (drawn from the calculated carton coordinates). ${plan.layerGroups
        .filter((gr) => gr.to > gr.from)
        .map((gr) => `${lab}s ${gr.from}–${gr.to} use the same layout.`)
        .join(" ")}</div>
      <div class="layerbar">${plan.layers.map((L) => `<button data-layer="${L.no}">${lab} ${L.no}</button>`).join("")}</div>
      <div class="pv-grid"><div class="pv-top"></div><div class="pv-info"></div></div>
      <div class="pv-elev-head"><h4>Side elevation (actual heights)</h4><div class="seg"><button data-axis="x" class="on">Front – along length</button><button data-axis="y">Side – along width</button></div></div>
      <div class="pv-elev"></div>
      <div class="legend">${legendHTML(plan)}</div>
      ${plan.meta && plan.meta.blocks ? blocksTableHTML(plan) : ""}`;
          const draw = () => {
            $$(".layerbar button", host).forEach((b) =>
              b.classList.toggle("on", +b.dataset.layer === state.layer),
            );
            $$(".pv-elev-head .seg button", host).forEach((b) =>
              b.classList.toggle("on", b.dataset.axis === state.axis),
            );
            $(".pv-top", host).innerHTML = topViewSVG(plan, state.layer);
            const L = plan.layers.find((x) => x.no === state.layer);
            $(".pv-info", host).innerHTML = L
              ? `<h3>${lab} ${L.no}</h3>
        <dl class="dl" style="margin-top:8px">
          <dt>${lab} height</dt><dd>${fmt(L.height)} mm</dd><dt>From – to</dt><dd>${fmt(L.z)} – ${fmt(L.top)} mm</dd>
          <dt>Cartons</dt><dd>${L.cartons}</dd><dt>Saleable units</dt><dd>${fmt(L.units)}</dd><dt>${lab} weight</dt><dd>${fmt(L.weight, 2)} kg</dd><dt>${lab} utilisation</dt><dd>${fmt(L.util, 1)}%</dd>
        </dl>
        <h4 style="margin-top:12px">Products in ${lab.toLowerCase()}</h4>
        <div>${Object.keys(L.products)
          .map((k) => `<div>${esc(k)} × ${L.products[k]}</div>`)
          .join("")}</div>
        <p class="small" style="margin-top:10px;color:var(--heading)">${esc(groupNote(plan, L.no))}</p>`
              : "";
            $(".pv-elev", host).innerHTML = elevationSVG(plan, state.axis);
          };
          $(".layerbar", host).addEventListener("click", (e) => {
            const b = e.target.closest("button[data-layer]");
            if (b) {
              state.layer = +b.dataset.layer;
              draw();
              if (host._v3d) host._v3d.setLayer(state.layer, "upto");
            }
          });
          $(".pv-elev-head .seg", host).addEventListener("click", (e) => {
            const b = e.target.closest("button[data-axis]");
            if (b) {
              state.axis = b.dataset.axis;
              draw();
            }
          });
          draw();
          liveViews.forEach((v) => {
            if (!v.host.isConnected) {
              v.destroy();
              liveViews.delete(v);
            }
          });
          try {
            host._v3d = View3D.mount($(".v3d-host", host), plan);
            liveViews.add(host._v3d);
          } catch (err) {
            console.error(err);
            $(".v3d-host", host).innerHTML =
              '<div class="msg warn">The 3D view could not be drawn in this browser.</div>';
          }
        }
        function tierWord(plan) {
          return plan.geom.kind === "container" ||
            (plan.meta && plan.meta.method === "blocks")
            ? "Tier"
            : "Layer";
        }
        function blocksTableHTML(plan) {
          const meta = plan.meta,
            isC = plan.geom.kind === "container";
          return `<h4 style="margin-top:14px">${isC ? "Container blocks – load in this order from the closed end" : "Column blocks – each block is stacked column by column"}</h4>
      <div class="table-wrap"><table><thead><tr><th>Block</th><th>SKU (bottom → top)</th><th class="num">X from–to (mm)</th><th class="num">Y from–to (mm)</th><th class="num">Column positions</th><th>Cartons</th><th>Orientation</th></tr></thead><tbody>
      ${meta.blocks.map((z, i) => `<tr><td>${i + 1}</td><td><span class="sw" style="display:inline-block;width:11px;height:11px;border-radius:2px;background:${colorFor(z.productId)};margin-right:6px"></span>${esc(z.sku)}${z.nested ? ' <span class="badge info">NESTED</span>' : ""}</td><td class="num">${fmt(z.x)} – ${fmt(z.x + z.l)}</td><td class="num">${fmt(z.y)} – ${fmt(z.y + z.w)}</td><td class="num">${z.positions}</td><td class="small">${esc(z.cartons)}</td><td class="small">${esc(z.stance)}</td></tr>`).join("")}</tbody></table></div>
      <p class="small muted">Build each block tier by tier. In a nested block the smaller carton is centred on the larger carton directly below it, so it is fully supported. Unused ${meta.axis === "y" ? "width" : "length"} at the end: ${fmt(meta.freeLength)} mm.</p>`;
        }
        function kpiCards(k, extra) {
          const cards = [
            ["Total cartons", fmt(k.totalCartons), ""],
            ["Saleable units", fmt(k.totalUnits), ""],
            ["Net product weight", fmt(k.netWeight, 1) + " kg", ""],
            [
              "Gross weight",
              fmt(k.grossWeight, 1) + " kg",
              k.maxGross ? `limit ${fmt(k.maxGross)} kg` : "no weight limit",
            ],
            [
              "Stack height",
              fmt(k.stackHeight) + " mm",
              `usable ${fmt(k.usableHeight)} mm`,
            ],
            [
              "Remaining height",
              fmt(k.remainingHeight) + " mm",
              `max ${fmt(k.maxHeight)} mm, base ${fmt(k.baseHeight)} mm`,
            ],
            [
              "Floor utilisation",
              fmt(k.floorUtil, 1) + "%",
              "bottom layer footprint",
            ],
            [
              "Volume utilisation",
              fmt(k.volumeUtil, 1) + "%",
              `${fmt(k.loadedVolumeM3, 3)} of ${fmt(k.availableVolumeM3, 3)} m³`,
            ],
          ].concat(extra || []);
          return `<div class="kpis">${cards.map((c) => `<div class="kpi"><div class="k">${esc(c[0])}</div><div class="v">${esc(c[1])}</div><div class="s">${esc(c[2])}</div></div>`).join("")}</div>`;
        }
        function heightList(k) {
          return `<dl class="dl"><dt>Maximum allowed height</dt><dd>${fmt(k.maxHeight)} mm</dd><dt>Pallet base height</dt><dd>${fmt(k.baseHeight)} mm</dd><dt>Actual product stack height</dt><dd>${fmt(k.stackHeight)} mm</dd><dt>Total loaded height</dt><dd>${fmt(k.totalHeight)} mm</dd><dt>Remaining vertical clearance</dt><dd>${fmt(k.remainingHeight)} mm</dd></dl>`;
        }

        /* ============================ MODE 1 — SINGLE ========================= */
        const S = {
          single: null,
          mix: null,
          mixSel: 0,
          exact: null,
          exactSel: 0,
          multi: null,
          multiSel: 0,
          contpal: null,
          last: null,
        };
        async function runSingle() {
          const st = readSettings("single");
          const prod = productById($("#single-sku").value);
          const errs = (st.errors || []).slice();
          if (!prod) errs.push("No SKU selected.");
          if (errs.length) {
            $("#single-results").innerHTML = msgBox(
              "err",
              "Please correct the following:",
              errs,
            );
            return;
          }
          const res = await runEngine(
            "Calculating single-SKU capacity…",
            "calcSingle",
            Object.assign(st.req, { product: prod }),
          );
          if (!res) return;
          S.single = {
            res,
            req: st.req,
            inputs: getInputs("single"),
            adjusted: null,
          };
          renderSingle();
        }
        function renderSingle() {
          const host = $("#single-results");
          const res = S.single && S.single.res;
          if (!res) return;
          if (!res.ok) {
            host.innerHTML = msgBox("err", "Cannot calculate:", res.errors);
            return;
          }
          rememberLast(res.plan, "Single SKU");
          const s = res.summary,
            k = res.plan.kpis;
          host.innerHTML = `
      <div class="panel">
        <div class="panel-head"><h2>${esc(res.sku)} on ${esc(res.plan.geom.name)}</h2>
          <div class="btn-row"><button class="btn small" data-action="save-plan" data-mode="single">Save plan</button><button class="btn small" data-action="csv" data-mode="single">Export CSV</button><button class="btn small" data-action="print" data-mode="single">Print / Save PDF</button></div></div>
        ${(res.warnings || []).length ? msgBox("warn", "", res.warnings) : ""}
        ${statusCardHTML(res.assessment)}
        ${kpiCards(k, [
          ["Cartons per layer", fmt(s.perLayer), s.arrangement],
          [
            "Number of layers",
            fmt(s.layers + s.topUpLayers),
            s.topUpLayers ? `${s.layers} + ${s.topUpLayers} top-up` : "",
          ],
          ["Units per carton", fmt(s.unitsPerCarton), ""],
          [
            "Constrained by",
            res.constraint,
            s.weightLimited ? `weight cap ${s.weightCap} cartons` : "",
          ],
        ])}
        <div class="layout-2" style="grid-template-columns: minmax(0,1fr) minmax(0,1fr)">
          <div><h4>Best orientation</h4><p>${esc(s.bestOrientation)}</p><h4>Arrangement</h4><p>${esc(s.arrangement)}</p></div>
          <div><h4>Height</h4>${heightList(k)}</div>
        </div>
        <h4 style="margin-top:12px">Orientations &amp; arrangements tested</h4>
        <div class="table-wrap"><table><thead><tr><th>Orientation</th><th class="num">Per layer (best)</th><th class="num">Simple grid</th><th class="num">Layers</th><th class="num">Top-up layers</th><th class="num">Total cartons</th><th class="num">Stack height</th></tr></thead>
        <tbody>${res.alternatives.map((a) => `<tr><td>${esc(a.stance)}</td><td class="num">${a.perLayer}</td><td class="num">${a.simpleGrid}</td><td class="num">${a.baseLayers}</td><td class="num">${a.topUpLayers}</td><td class="num"><b>${a.total}</b></td><td class="num">${fmt(a.height)} mm</td></tr>`).join("")}</tbody></table></div>
      </div>
      ${fillPanelHTML(res.fill, "single", "base")}
      <div class="panel" id="single-plan"></div>
      <div class="panel"><details><summary>SHOW CALCULATION DETAILS</summary><div class="details-body">
        <h4>Load unit</h4><p>${esc(res.plan.geom.name)}: ${esc(res.details.limits)}.</p>
        <h4>Allowed orientations</h4><ul>${res.details.allowedOrientations.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>
        <h4>Method &amp; result</h4><ul>${res.explanation.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>
      </div></details></div>`;
          renderPlanView($("#single-plan"), res.plan, "Loading plan");
          const adj = S.single.adjusted;
          if (adj) {
            host.insertAdjacentHTML(
              "afterbegin",
              adjustedBlockHTML(adj, "single", "single-adj-plan"),
            );
            renderPlanView(
              $("#single-adj-plan"),
              adj.plan,
              "Adjusted loading plan",
            );
            rememberLast(adj.plan, "Single SKU – adjusted plan");
          }
        }

        function adjustedBlockHTML(sc, mode, planId) {
          return `<div class="panel adjusted-note"><div class="panel-head"><h2>Adjusted plan – with the added cartons</h2><button class="btn small danger" data-action="adj-discard" data-mode="${mode}">Discard additions</button></div>
      ${statusCardHTML(sc.assessment)}
      <div class="table-wrap"><table><thead><tr><th>SKU</th><th class="num">Cartons</th><th class="num">Saleable units</th><th class="num">Net kg</th></tr></thead><tbody>
      ${sc.rows
        .filter((r) => r.cartons)
        .map(
          (r) =>
            `<tr><td><span class="sw" style="display:inline-block;width:11px;height:11px;border-radius:2px;background:${colorFor(r.productId)};margin-right:6px"></span>${esc(r.sku)}${r.added ? ' <span class="badge info">ADDED</span>' : r.locked ? ' <span class="badge info">LOCKED</span>' : ""}</td><td class="num">${fmt(r.cartons)}</td><td class="num">${fmt(r.units)}</td><td class="num">${fmt(r.weight, 2)}</td></tr>`,
        )
        .join("")}
      </tbody><tfoot><tr><td>TOTAL</td><td class="num">${fmt(sc.plan.kpis.totalCartons)}</td><td class="num">${fmt(sc.plan.kpis.totalUnits)}</td><td class="num">${fmt(sc.plan.kpis.netWeight, 2)}</td></tr></tfoot></table></div></div>
      ${fillPanelHTML(sc.fill, mode, "adj")}
      <div class="panel" id="${planId}"></div>`;
        }
        const rowsFromScenario = (sc) =>
          sc.rows.map((r) => ({
            product: productById(r.productId),
            target: r.locked ? null : r.target,
            priority: r.priority,
            locked: r.locked,
            added: !!r.added,
            lockedQty: r.locked ? r.cartons : null,
            min: r.min ?? null,
            max: r.max ?? null,
          }));
        async function applyFill(mode, ref, key) {
          let fill, baseCounts, rows, reqBase;
          if (mode === "mix") {
            const sc = S.mix && S.mix.res.scenarios[+ref];
            if (!sc) return;
            fill = sc.fill;
            baseCounts = sc.counts;
            rows = rowsFromScenario(sc);
            reqBase = S.mix.req || collectMixRequest().req;
          } else if (mode === "single") {
            if (!S.single) return;
            const adj = ref === "adj" ? S.single.adjusted : null;
            if (adj) {
              fill = adj.fill;
              baseCounts = adj.counts;
              rows = rowsFromScenario(adj);
            } else {
              fill = S.single.res.fill;
              baseCounts = [S.single.res.plan.kpis.totalCartons];
              rows = [
                {
                  product: productById(S.single.res.productId),
                  target: 100,
                  priority: "Normal",
                  locked: false,
                },
              ];
            }
            reqBase = Object.assign(
              {},
              S.single.req || readSettings("single").req,
              { basis: "cartons", tolerance: 5, mode: "balanced" },
            );
          } else {
            const u = S[mode] && S[mode].res.units[+ref];
            if (!u) return;
            fill = u.fill;
          }
          const sug =
            fill && (key === "c" ? fill.combined : fill.suggestions[+key]);
          if (!sug) return;
          if (mode === "exact" || mode === "multi") {
            const basis = $(`#${mode}-basis`).value;
            sug.adds.forEach((a) => {
              const p = productById(a.productId);
              if (!p) return;
              const q =
                basis === "units"
                  ? a.add * (Number(p.unitsPerCarton) || 1)
                  : a.add;
              const row = qtyRows[mode].find(
                (r) => r.productId === a.productId,
              );
              if (row) row.qty = String((Number(row.qty) || 0) + q);
              else
                qtyRows[mode].push({ productId: a.productId, qty: String(q) });
            });
            renderQtyTable(mode);
            toast(
              `Added ${sug.adds.map((a) => `${a.add} × ${a.sku}`).join(" + ")} to the quantities – re-planning…`,
            );
            await runQty(mode);
            return;
          }
          if (
            rows.some((r) => !r.product) ||
            sug.adds.some((a) => !productById(a.productId))
          ) {
            toast(
              "A product in this plan no longer exists in the Product Master.",
            );
            return;
          }
          const counts = baseCounts.slice();
          rows = rows.map((r) => Object.assign({}, r));
          sug.adds.forEach((a) => {
            const i = rows.findIndex((r) => r.product.id === a.productId);
            if (i >= 0) {
              counts[i] += a.add;
              if (rows[i].locked) rows[i].lockedQty = counts[i];
            } else {
              rows.push({
                product: productById(a.productId),
                target: null,
                priority: "Normal",
                locked: true,
                added: true,
                lockedQty: a.add,
              });
              counts.push(a.add);
            }
          });
          const req = Object.assign({}, reqBase, {
            rows,
            fixedCounts: counts,
            assessment: ASSESS(),
            fillProducts: activeProducts(),
          });
          const res = await runEngine(
            "Re-planning with the added cartons…",
            "optimiseMix",
            req,
          );
          if (!res) return;
          if (!res.ok) {
            toast(res.errors[0]);
            return;
          }
          const nsc = res.scenarios[0];
          if (mode === "mix") {
            nsc.label = `Adjusted plan (from scenario ${+ref + 1})`;
            nsc.recommended = false;
            const dup = S.mix.res.scenarios.findIndex((o) => o.key === nsc.key);
            nsc.sameAs = dup >= 0 ? dup : null;
            S.mix.res.scenarios.push(nsc);
            S.mixSel = S.mix.res.scenarios.length - 1;
            renderMix();
            $("#mix-results").scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          } else {
            S.single.adjusted = nsc;
            renderSingle();
            $("#single-results").scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
          toast(
            "Added – the whole layout was re-planned and passed the physical check.",
          );
        }

        /* ========================== MODE 2 — TARGET MIX ======================= */
        let mixRows = [];
        function defaultMixRows() {
          const pick = [
            ["P12C2D0", 35, "Normal"],
            ["P17C2D2", 25, "Normal"],
            ["P24C2D2", 15, "Normal"],
            ["Carbon Filters", 10, "Normal"],
            ["POSTreat", 10, "Normal"],
            ["Refill Media", 5, "Normal"],
          ];
          const rows = [];
          pick.forEach(([sku, t, pr]) => {
            const p = DB.products.find((x) => x.sku === sku);
            if (p)
              rows.push({
                productId: p.id,
                include: true,
                target: t,
                priority: pr,
                min: "",
                max: "",
                locked: false,
                lockedQty: "",
              });
          });
          return rows;
        }
        function renderMixTable() {
          const tb = $("#mix-table tbody");
          tb.innerHTML =
            mixRows
              .map(
                (r, i) => `<tr data-i="${i}">
      <td><input type="checkbox" data-f="include"${r.include ? " checked" : ""} aria-label="Include"></td>
      <td><select data-f="productId">${productOptionsHTML(r.productId)}</select></td>
      <td><input type="number" data-f="target" min="0" max="100" step="0.1" value="${esc(r.target)}"${r.locked ? ' disabled title="Locked SKUs keep a fixed quantity"' : ""}></td>
      <td><select data-f="priority">${["High", "Normal", "Low"].map((p) => `<option${r.priority === p ? " selected" : ""}>${p}</option>`).join("")}</select></td>
      <td><input type="number" data-f="min" min="0" step="1" value="${esc(r.min)}" placeholder="–"${r.locked ? " disabled" : ""}></td>
      <td><input type="number" data-f="max" min="0" step="1" value="${esc(r.max)}" placeholder="–"${r.locked ? " disabled" : ""}></td>
      <td><input type="checkbox" data-f="locked"${r.locked ? " checked" : ""} aria-label="Lock quantity"></td>
      <td><input type="number" data-f="lockedQty" min="0" step="1" value="${esc(r.lockedQty)}"${r.locked ? "" : " disabled"} placeholder="–"></td>
      <td><button class="btn small danger" data-action="mix-remove" data-i="${i}" title="Remove row">✕</button></td></tr>`,
              )
              .join("") ||
            `<tr><td colspan="9" class="muted">No SKUs yet – click “Add SKU”.</td></tr>`;
          updateMixTotal();
        }
        function updateMixTotal() {
          const inc = mixRows.filter((r) => r.include && !r.locked);
          const total = inc.reduce((s, r) => s + (Number(r.target) || 0), 0);
          const ok = inc.length > 0 && Math.abs(total - 100) <= 0.01;
          const locked = mixRows.filter((r) => r.include && r.locked).length;
          const el = $("#mix-total");
          el.className = "total-bar " + (ok ? "ok" : "bad");
          el.innerHTML = `<span>Target distribution total: ${fmt(total, 2)}%${locked ? ` <span class="small">(${locked} locked SKU${locked > 1 ? "s" : ""} excluded)</span>` : ""}</span><span>${ok ? "✔ Equals 100%" : inc.length ? "Target distribution must equal 100%." : "Select at least one unlocked SKU."}</span>`;
        }
        $("#mix-table").addEventListener("input", onMixEdit);
        $("#mix-table").addEventListener("change", onMixEdit);
        function onMixEdit(e) {
          const tr = e.target.closest("tr[data-i]"),
            f = e.target.dataset.f;
          if (!tr || !f) return;
          const r = mixRows[+tr.dataset.i];
          r[f] =
            e.target.type === "checkbox" ? e.target.checked : e.target.value;
          if (f === "locked" && e.type === "change") {
            if (r.locked && r.lockedQty === "") r.lockedQty = 0;
            renderMixTable();
            return;
          }
          updateMixTotal();
        }
        function normaliseMix() {
          const inc = mixRows.filter((r) => r.include && !r.locked);
          const total = inc.reduce((s, r) => s + (Number(r.target) || 0), 0);
          if (!inc.length || total <= 0) {
            toast("Enter target percentages greater than zero first.");
            return;
          }
          const scaled = inc.map(
            (r) => Math.round(((Number(r.target) || 0) / total) * 10000) / 100,
          );
          const diff =
            Math.round((100 - scaled.reduce((a, v) => a + v, 0)) * 100) / 100;
          let big = 0;
          scaled.forEach((v, i) => {
            if (v > scaled[big]) big = i;
          });
          scaled[big] =
            Math.round((scaled[big] + diff) * 100) /
            100; /* rounding remainder goes to the largest share */
          inc.forEach((r, i) => {
            r.target = scaled[i];
          });
          renderMixTable();
        }
        function collectMixRequest() {
          const st = readSettings("mix");
          const errors = (st.errors || []).slice();
          const inc = mixRows.filter((r) => r.include);
          if (!inc.length)
            errors.push(
              "No SKU selected. Tick “Include” for at least one SKU.",
            );
          let tol =
            $("#mix-tol").value === "custom"
              ? numOrNull($("#mix-tol-custom").value)
              : Number($("#mix-tol").value);
          if (tol === null || !(tol >= 0 && tol <= 100))
            errors.push(
              "Invalid tolerance: enter a custom tolerance between 0 and 100 percentage points.",
            );
          inc.forEach((r) => {
            if (!productById(r.productId))
              errors.push(
                `Mix table row ${mixRows.indexOf(r) + 1}: its product was deleted from the Product Master – choose another SKU or remove the row.`,
              );
          });
          const rows = inc.map((r) => ({
            product: productById(r.productId),
            target: r.target === "" ? null : Number(r.target),
            priority: r.priority,
            min: numOrNull(r.min),
            max: numOrNull(r.max),
            locked: !!r.locked,
            lockedQty: numOrNull(r.lockedQty),
          }));

          const unl = rows.filter((r) => !r.locked);
          const total = unl.reduce((s, r) => s + (r.target || 0), 0);
          if (unl.length && Math.abs(total - 100) > 0.01)
            errors.push(
              `Target distribution must equal 100% (currently ${fmt(total, 2)}%). Use NORMALISE TO 100% to scale proportionally.`,
            );
          return {
            errors,
            req: st.req
              ? Object.assign(st.req, {
                  rows,
                  basis: $("#mix-basis").value,
                  tolerance: tol,
                  mode: $("#mix-mode").value,
                })
              : null,
          };
        }
        async function runMix() {
          const { errors, req } = collectMixRequest();
          $("#mix-validation").innerHTML = errors.length
            ? msgBox("err", "Please correct the following:", errors)
            : "";
          if (errors.length) return;
          const res = await runEngine(
            "Optimising pallet mix…",
            "optimiseMix",
            req,
          );
          if (!res) return;
          S.mix = { res, req, inputs: getInputs("mix") };
          S.mixSel = res.ok ? res.recommended : 0;
          renderMix();
        }
        function statusClass(s) {
          return /Within|Locked|Added/.test(s)
            ? "st-ok"
            : /Not loaded/.test(s)
              ? "st-bad"
              : "st-warn";
        }
        function renderMix() {
          const host = $("#mix-results"),
            sum = $("#mix-summary");
          const res = S.mix && S.mix.res;
          if (!res) return;
          if (!res.ok) {
            host.innerHTML =
              msgBox(
                "err",
                "The optimiser could not produce a valid pallet:",
                res.errors,
              ) +
              ((res.warnings || []).length
                ? msgBox("warn", "", res.warnings)
                : "");
            sum.innerHTML =
              '<h2>Optimised summary</h2><div class="empty">No valid result – see the messages below the table.</div>';
            return;
          }
          const sc = res.scenarios[S.mixSel];
          rememberLast(sc.plan, "Target Mix – " + sc.label);
          const k = sc.plan.kpis,
            m = sc.metrics;
          const qCls = /EXACT/.test(sc.quality)
            ? "exact"
            : /WITHIN/.test(sc.quality)
              ? "within"
              : "approx";
          sum.innerHTML = `<h2>Optimised summary</h2>
      <div class="small muted">Scenario ${S.mixSel + 1}: <b>${esc(sc.label)}</b>${sc.recommended ? ' · <span class="badge info">RECOMMENDED</span>' : ""}</div>
      <div style="margin-top:8px">${statusCardHTML(sc.assessment, { compact: true })}</div>
      <div class="quality ${qCls}" style="margin-top:8px">${esc(sc.quality)}</div>
      <ul class="facts">${sc.facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      <dl class="dl">
        <dt>Total cartons</dt><dd>${fmt(k.totalCartons)}</dd><dt>Saleable units</dt><dd>${fmt(k.totalUnits)}</dd>
        <dt>Net weight</dt><dd>${fmt(k.netWeight, 1)} kg</dd><dt>Gross weight</dt><dd>${fmt(k.grossWeight, 1)} kg</dd>
        <dt>Stack height</dt><dd>${fmt(k.stackHeight)} mm</dd><dt>Unused height</dt><dd>${fmt(k.remainingHeight)} mm</dd>
        <dt>Floor utilisation</dt><dd>${fmt(k.floorUtil, 1)}%</dd><dt>Volume utilisation</dt><dd>${fmt(k.volumeUtil, 1)}%</dd>
        <dt>Layers</dt><dd>${k.layerCount}</dd><dt>Constrained by</dt><dd>${esc(sc.constraint.primary)}</dd>
      </dl>
      ${sc.constraint.factors.length > 1 ? `<p class="small muted">Factors: ${sc.constraint.factors.map(esc).join(", ")}</p>` : ""}
      <div style="margin-top:10px">${validationHTML(sc.plan.validation)}</div>`;
          const hasLocks = sc.rows.some((r) => r.locked);
          const cards = res.scenarios
            .map(
              (
                s,
                i,
              ) => `<button class="scen${i === S.mixSel ? " sel" : ""}" data-action="mix-select" data-i="${i}">
        <div class="t"><span>Scenario ${i + 1} · ${esc(s.label)}</span><span>${statusPill(s.assessment)} ${s.recommended ? '<span class="badge info">RECOMMENDED</span>' : ""}</span></div>
        ${s.sameAs !== null ? `<div class="small muted">Same combination as scenario ${s.sameAs + 1}.</div>` : ""}
        <dl class="dl"><dt>Cartons</dt><dd>${fmt(s.plan.kpis.totalCartons)}</dd><dt>Units</dt><dd>${fmt(s.plan.kpis.totalUnits)}</dd><dt>Gross weight</dt><dd>${fmt(s.plan.kpis.grossWeight, 1)} kg</dd>
        <dt>Weighted mix deviation</dt><dd>${fmt(s.metrics.E, 1)}</dd><dt>Max SKU deviation</dt><dd>${fmt(s.metrics.maxDev, 1)} pp</dd><dt>SKUs within tolerance</dt><dd>${fmt(s.metrics.within)} / ${fmt(s.metrics.of)}</dd>
        <dt>Volume utilisation</dt><dd>${fmt(s.plan.kpis.volumeUtil, 1)}%</dd><dt>Stack height</dt><dd>${fmt(s.plan.kpis.stackHeight)} mm</dd></dl>
        <div class="small" style="margin-top:6px">${s.rows.map((r) => `${esc(r.sku)} ${r.cartons}`).join(" · ")}</div></button>`,
            )
            .join("");
          host.innerHTML = `
      ${(res.warnings || []).length ? msgBox("warn", "", res.warnings) : ""}
      ${statusCardHTML(sc.assessment, { prefix: `Scenario ${S.mixSel + 1}` })}
      <div class="panel"><div class="panel-head"><h2>Scenario comparison</h2>
        <div class="btn-row"><button class="btn small" data-action="save-plan" data-mode="mix">Save plan</button><button class="btn small" data-action="csv" data-mode="mix">Export CSV</button><button class="btn small" data-action="print" data-mode="mix">Print pallet plan / PDF</button></div></div>
        <div class="scen-grid">${cards}</div></div>
      ${fillPanelHTML(sc.fill, "mix", String(S.mixSel))}
      <div class="panel"><h2>Target vs achieved — scenario ${S.mixSel + 1}: ${esc(sc.label)}</h2>
        <div class="table-wrap"><table><thead><tr><th>SKU</th><th class="num">Target %</th><th>Priority</th><th class="num">Cartons</th><th class="num">Units / carton</th><th class="num">Total saleable units</th><th class="num">Net weight (kg)</th><th class="num">Achieved %</th><th class="num">Deviation (pp)</th>${hasLocks ? '<th class="num">Share of load %</th>' : ""}<th>Status</th></tr></thead>
        <tbody>${sc.rows
          .map(
            (
              r,
            ) => `<tr><td><span class="sw" style="display:inline-block;width:11px;height:11px;border-radius:2px;background:${colorFor(r.productId)};margin-right:6px"></span>${esc(r.sku)}</td>
          <td class="num">${r.added ? "Extra" : r.locked ? "Locked" : fmt(r.target, 1)}</td><td>${esc(r.priority)}</td><td class="num"><b>${fmt(r.cartons)}</b></td><td class="num">${fmt(r.unitsPerCarton)}</td><td class="num">${fmt(r.units)}</td><td class="num">${fmt(r.weight, 2)}</td>
          <td class="num">${r.locked ? "–" : fmt(r.achieved, 1)}</td><td class="num ${r.deviation > 0 ? "dev-pos" : "dev-neg"}">${r.locked ? "–" : signed(r.deviation, 1)}</td>${hasLocks ? `<td class="num">${fmt(r.share, 1)}</td>` : ""}<td class="${statusClass(r.status)}">${esc(r.status)}</td></tr>`,
          )
          .join("")}</tbody>
        <tfoot><tr><td>TOTAL</td><td class="num">${fmt(sc.targetTotal, 1)}</td><td></td><td class="num">${fmt(k.totalCartons)}</td><td></td><td class="num">${fmt(k.totalUnits)}</td><td class="num">${fmt(k.netWeight, 2)}</td><td class="num">${fmt(sc.achievedTotal, 1)}</td><td></td>${hasLocks ? '<td class="num">100.0</td>' : ""}<td></td></tr></tfoot></table></div>
        ${hasLocks ? '<p class="small muted">Achieved % and deviation are measured across the optimised (unlocked) SKUs; “Share of load” includes locked SKUs.</p>' : ""}
        <div class="layout-2" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:12px">
          <dl class="dl"><dt>Total cartons</dt><dd>${fmt(k.totalCartons)}</dd><dt>Total saleable units</dt><dd>${fmt(k.totalUnits)}</dd><dt>Total net weight</dt><dd>${fmt(k.netWeight, 2)} kg</dd><dt>Gross pallet weight</dt><dd>${fmt(k.grossWeight, 2)} kg</dd><dt>Target distribution total</dt><dd>${fmt(sc.targetTotal, 1)}%</dd><dt>Actual distribution total</dt><dd>${fmt(sc.achievedTotal, 1)}%</dd></dl>
          <dl class="dl"><dt>Overall weighted mix deviation</dt><dd>${fmt(m.E, 2)}</dd><dt>Pallet floor utilisation</dt><dd>${fmt(k.floorUtil, 1)}%</dd><dt>Pallet volume utilisation</dt><dd>${fmt(k.volumeUtil, 1)}%</dd><dt>Actual stack height</dt><dd>${fmt(k.stackHeight)} mm</dd><dt>Unused height</dt><dd>${fmt(k.remainingHeight)} mm</dd><dt>Primary constraint</dt><dd>${esc(sc.constraint.primary)}</dd></dl>
        </div></div>
      <div class="panel" id="mix-plan"></div>
      <div class="panel"><details><summary>SHOW CALCULATION DETAILS</summary><div class="details-body">${mixDetailsHTML(res, sc)}</div></details></div>`;
          renderPlanView(
            $("#mix-plan"),
            sc.plan,
            `Pallet layout — scenario ${S.mixSel + 1}: ${sc.label}`,
          );
        }
        function mixDetailsHTML(res, sc) {
          const d = res.details,
            basisName = {
              cartons: "Carton quantity",
              units: "Saleable unit quantity",
              weight: "Product weight",
            }[d.basis];
          const mw = d.modeWeights;
          return `
      <h4>Why this result</h4><ul>${sc.explanation.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>
      <h4>Load unit</h4><p>${esc(d.unit.name)}: ${esc(d.limits)}. Clearance between cartons ${fmt(d.unit.c)} mm.</p>
      <h4>Selected products &amp; allowed orientations</h4>
      <div class="table-wrap"><table><thead><tr><th>SKU</th><th>Carton (mm)</th><th class="num">Units</th><th class="num">kg</th><th>Allowed orientations</th><th class="num">Max alone</th><th class="num">Min</th><th class="num">Max</th><th>Priority (weight)</th></tr></thead><tbody>
      ${d.products.map((p) => `<tr><td>${esc(p.sku)}</td><td>${esc(p.dims)}</td><td class="num">${p.units}</td><td class="num">${p.weight}</td><td class="small">${p.orientations.map(esc).join("<br>")}</td><td class="num">${p.singleCap}</td><td class="num">${p.min}</td><td class="num">${p.max === null ? "–" : p.max}</td><td>${p.locked ? "Locked" : `${esc(p.priority)} (${p.priorityWeight})`}</td></tr>`).join("")}</tbody></table></div>
      <h4>Target distribution vs achieved (${esc(basisName)} basis)</h4>
      <p>${sc.rows
        .filter((r) => !r.locked)
        .map(
          (r) =>
            `${esc(r.sku)}: target ${fmt(r.target, 1)}% → achieved ${fmt(r.achieved, 1)}% (${signed(r.deviation, 1)} pp)`,
        )
        .join(" · ")}</p>
      <p class="small muted">Achieved % = SKU ${d.basis === "cartons" ? "cartons" : d.basis === "units" ? "cartons × units per carton" : "cartons × carton weight"} ÷ total of optimised SKUs × 100. Tolerance ±${fmt(d.tolerance, 1)} pp.</p>
      <h4>Candidate carton combinations tested</h4>
      <p>${fmt(d.search.evaluations)} physical packing attempts, ${fmt(d.search.combinationsChecked)} distinct integer combinations screened (weight, volume and dominance pruning), ${fmt(d.search.candidatesKept)} physically feasible combinations ranked, in ${fmt(d.search.ms / 1000, 1)} s.</p>
      <h4>Scenario ranking</h4>
      <p class="small">Score = capacity utilisation % − λ × weighted deviation − μ × weighted deviation beyond tolerance + 0.01 × cartons. Closest Target Match λ=${mw.match.lambda}, μ=${mw.match.tolPenalty}; Balanced λ=${mw.balanced.lambda}, μ=${mw.balanced.tolPenalty}; Maximum Utilisation λ=${mw.util.lambda}, μ=${mw.util.tolPenalty}. Capacity utilisation = the higher of volume utilisation and weight utilisation.</p>
      <h4>Selected layer arrangement</h4>
      <p>${sc.plan.layers
        .map(
          (L) =>
            `${tierWord(sc.plan)} ${L.no} (${fmt(L.height)} mm): ${Object.keys(
              L.products,
            )
              .map((k2) => `${esc(k2)} × ${L.products[k2]}`)
              .join(", ")}`,
        )
        .join("<br>")}</p>
      <p class="small muted">Packing strategy: ${esc(sc.plan.meta.strategy || "")}.</p>
      <h4>Weight &amp; height constraints</h4>
      <p>Net ${fmt(sc.plan.kpis.netWeight, 2)} kg + tare ${fmt(sc.plan.kpis.tare, 1)} kg = gross ${fmt(sc.plan.kpis.grossWeight, 2)} kg${sc.plan.kpis.maxGross ? ` (limit ${fmt(sc.plan.kpis.maxGross)} kg)` : " (no limit)"}. Stack ${fmt(sc.plan.kpis.stackHeight)} mm of ${fmt(sc.plan.kpis.usableHeight)} mm usable; ${fmt(sc.plan.kpis.remainingHeight)} mm clearance.</p>
      <p>Why no further carton was added: ${sc.constraint.perSku.map((p) => `${esc(p.sku)} – ${esc(p.reason)}`).join("; ") || "–"}.</p>`;
        }

        /* ===================== MODE 3 / 4 — QUANTITY TABLES =================== */
        const qtyRows = { exact: [], multi: [] };
        function renderQtyTable(mode) {
          const basis = $(`#${mode}-basis`).value;
          const tb = $(`#${mode}-table tbody`);
          tb.innerHTML =
            qtyRows[mode]
              .map((r, i) => {
                const p = productById(r.productId);
                const q = Number(r.qty);
                const cartons =
                  p && isFinite(q) && r.qty !== ""
                    ? basis === "units"
                      ? Math.ceil(q / (Number(p.unitsPerCarton) || 1) - 1e-9)
                      : q
                    : "–";
                return `<tr data-i="${i}"><td><select data-f="productId">${productOptionsHTML(r.productId)}</select></td>
        <td><input type="number" data-f="qty" min="0" step="1" value="${esc(r.qty)}" style="width:100px"> <span class="small muted">${basis === "units" ? "units" : "cartons"}</span></td>
        <td class="num">${p ? esc(p.unitsPerCarton) : "–"}</td><td class="num">${esc(cartons)}</td>
        <td><button class="btn small danger" data-action="qty-remove" data-mode="${mode}" data-i="${i}">✕</button></td></tr>`;
              })
              .join("") ||
            `<tr><td colspan="5" class="muted">No SKUs yet – click “Add SKU”.</td></tr>`;
        }
        ["exact", "multi"].forEach((mode) => {
          $(`#${mode}-table`).addEventListener("change", (e) => {
            const tr = e.target.closest("tr[data-i]"),
              f = e.target.dataset.f;
            if (!tr || !f) return;
            qtyRows[mode][+tr.dataset.i][f] = e.target.value;
            renderQtyTable(mode);
          });
          $(`#${mode}-basis`).addEventListener("change", () =>
            renderQtyTable(mode),
          );
        });
        function collectQtyRequest(mode) {
          const st = readSettings(mode);
          const errors = (st.errors || []).slice();
          const rows = qtyRows[mode].map((r) => ({
            product: productById(r.productId),
            qty: r.qty === "" ? null : Number(r.qty),
          }));
          if (!rows.length)
            errors.push(
              "No SKU selected. Add at least one SKU with a quantity.",
            );
          rows.forEach((r, i) => {
            if (!r.product)
              errors.push(
                `Row ${i + 1}: its product was deleted from the Product Master – choose another SKU or remove the row.`,
              );
            else if (r.qty === null || !(r.qty >= 0))
              errors.push(`${r.product.sku}: enter a quantity of 0 or more.`);
          });
          const ids = rows.map((r) => r.product && r.product.id);
          if (new Set(ids).size !== ids.length)
            errors.push(
              "The same SKU appears more than once – combine the quantities into one row.",
            );
          return {
            errors,
            req: st.req
              ? Object.assign(st.req, {
                  rows,
                  basis: $(`#${mode}-basis`).value,
                  strategy:
                    mode === "multi" ? $("#multi-strategy").value : undefined,
                })
              : null,
          };
        }
        async function runQty(mode) {
          const { errors, req } = collectQtyRequest(mode);
          $(`#${mode}-validation`).innerHTML = errors.length
            ? msgBox("err", "Please correct the following:", errors)
            : "";
          if (errors.length) return;
          const res = await runEngine(
            mode === "exact"
              ? "Checking fit…"
              : "Allocating cartons to pallets…",
            mode === "exact" ? "planExact" : "planMulti",
            req,
          );
          if (!res) return;
          S[mode] = { res, inputs: getInputs(mode) };
          S[mode + "Sel"] = 0;
          renderQty(mode);
        }
        function renderQty(mode) {
          const host = $(`#${mode}-results`);
          const res = S[mode] && S[mode].res;
          if (!res) return;
          if (!res.ok) {
            host.innerHTML =
              msgBox("err", "Cannot plan:", res.errors) +
              ((res.warnings || []).length
                ? msgBox("warn", "", res.warnings)
                : "");
            return;
          }
          const unitWord =
            res.unit.kind === "container" ? "container" : "pallet";
          const sel = Math.min(S[mode + "Sel"], res.units.length - 1);
          const u = res.units[sel];
          if (u && u.plan)
            rememberLast(
              u.plan,
              (mode === "exact" ? "Exact Quantity" : "Multi-Pallet") +
                ` – ${unitWord} ${u.no}`,
            );
          let head = "";
          if (mode === "exact") {
            head = res.fits
              ? `<div class="msg info"><b>✔ Everything fits on one ${unitWord}.</b></div>`
              : `<div class="msg warn"><b>Not everything fits on one ${unitWord}.</b> Loaded on ${unitWord} 1: ${fmt(res.loaded.reduce((s, v) => s + v, 0))} cartons · Remaining: ${fmt(res.remaining.reduce((s, v) => s + v, 0))} cartons · Additional ${unitWord}s required: <b>${res.additionalUnits}</b></div>`;
            head += `<div class="table-wrap"><table><thead><tr><th>SKU</th><th class="num">Requested</th><th class="num">Required cartons</th><th class="num">Loaded on ${unitWord} 1</th><th class="num">Remaining</th><th class="num">Saleable units required</th></tr></thead><tbody>
        ${res.required.map((r, i) => `<tr><td>${esc(r.sku)}</td><td class="num">${fmt(r.qty)} ${res.basis === "units" ? "units" : "ctn"}</td><td class="num">${fmt(r.cartons)}</td><td class="num">${fmt(res.loaded[i])}</td><td class="num">${fmt(res.remaining[i])}</td><td class="num">${fmt(r.units)}</td></tr>`).join("")}</tbody></table></div>`;
          } else {
            head = `<div class="kpis">
        <div class="kpi"><div class="k">${unitWord}s required</div><div class="v">${res.unitCount}</div><div class="s">volume/weight lower bound ${res.lowerBound}</div></div>
        <div class="kpi"><div class="k">Total cartons</div><div class="v">${fmt(res.totals.cartons)}</div></div>
        <div class="kpi"><div class="k">Saleable units</div><div class="v">${fmt(res.totals.units)}</div></div>
        <div class="kpi"><div class="k">Net weight</div><div class="v">${fmt(res.totals.weight, 1)} kg</div></div>
        <div class="kpi"><div class="k">Mix rule used</div><div class="v" style="font-size:14px">${res.strategy === "perUnit" ? "Same mix on each pallet" : "Across shipment"}</div></div></div>`;
          }
          const skus = res.required.map((r) => r.sku);
          const compTable = `<div class="table-wrap"><table><thead><tr><th>${unitWord}</th>${skus.map((s) => `<th class="num">${esc(s)}</th>`).join("")}<th class="num">Cartons</th><th class="num">Gross kg</th><th class="num">Stack mm</th><th class="num">Volume %</th><th>Status</th><th></th></tr></thead><tbody>
      ${res.units.map((x, i) => `<tr${i === sel ? ' style="background:var(--sel-row)"' : ""}><td>${unitWord} ${x.no}</td>${x.counts.map((c) => `<td class="num">${c ? fmt(c) : ""}</td>`).join("")}<td class="num">${x.plan ? fmt(x.plan.kpis.totalCartons) : "–"}</td><td class="num">${x.plan ? fmt(x.plan.kpis.grossWeight, 1) : "–"}</td><td class="num">${x.plan ? fmt(x.plan.kpis.stackHeight) : "–"}</td><td class="num">${x.plan ? fmt(x.plan.kpis.volumeUtil, 1) : "–"}</td><td>${statusPill(x.assessment)}${x.ok ? "" : ' <span class="badge bad">CHECK</span>'}</td><td><button class="btn small" data-action="unit-select" data-mode="${mode}" data-i="${i}">View layout</button></td></tr>`).join("")}</tbody></table></div>`;
          host.innerHTML = `${(res.warnings || []).length ? msgBox("warn", "", res.warnings) : ""}${res.error ? msgBox("err", res.error) : ""}
      <div class="panel"><div class="panel-head"><h2>${mode === "exact" ? "Fit result" : "Allocation result"} — ${esc(res.unit.name)}</h2>
        <div class="btn-row"><button class="btn small" data-action="save-plan" data-mode="${mode}">Save plan</button><button class="btn small" data-action="csv" data-mode="${mode}">Export CSV</button><button class="btn small" data-action="print" data-mode="${mode}">Print / Save PDF</button></div></div>
        ${head}<h4 style="margin:14px 0 6px">${unitWord.toUpperCase()} COMPOSITION</h4>${compTable}</div>
      ${u && u.plan ? `${statusCardHTML(u.assessment, { prefix: `${unitWord[0].toUpperCase() + unitWord.slice(1)} ${u.no}` })}${fillPanelHTML(u.fill, mode, String(sel))}<div class="panel">${kpiCards(u.plan.kpis)}</div><div class="panel" id="${mode}-plan"></div>` : ""}`;
          if (u && u.plan)
            renderPlanView(
              $(`#${mode}-plan`),
              u.plan,
              `${unitWord[0].toUpperCase() + unitWord.slice(1)} ${u.no}: ${u.description}`,
            );
        }

        /* ===================== PALLETS INTO A CONTAINER ====================== */
        function rememberLast(plan, source) {
          if (!plan || plan.geom.kind !== "pallet") return;
          S.last = {
            palletName: plan.geom.name,
            loadedHeight: Math.ceil(plan.kpis.totalHeight),
            gross: plan.kpis.grossWeight,
            source,
            L: plan.geom.L,
            W: plan.geom.W,
            baseHeight: plan.geom.baseHeight,
          };
          $("#cp-last-info").textContent =
            `Last pallet: ${source} – ${plan.geom.name}, loaded height ${fmt(S.last.loadedHeight)} mm, gross ${fmt(S.last.gross, 1)} kg.`;
        }
        function useLastPallet() {
          if (!S.last) {
            toast("Calculate a pallet in another tab first.");
            return;
          }
          $("#cp-height").value = S.last.loadedHeight;
          $("#cp-gross").value = S.last.gross;
          const pal = DB.pallets.find((p) => p.name === S.last.palletName);
          if (pal) $("#cp-pallet").value = pal.id;
          if (S.last.baseHeight === 0)
            toast(
              "Note: the source pallet has a base height of 0 mm – add the physical pallet deck height to the loaded height if needed.",
            );
        }
        async function runContPal() {
          const c = DB.containers.find(
              (x) => x.id === $("#cp-container").value,
            ),
            p = DB.pallets.find((x) => x.id === $("#cp-pallet").value);
          if (!c || !p) {
            toast("Select a container and a pallet type.");
            return;
          }
          const req = {
            container: c,
            pallet: p,
            loadedHeight: numOrNull($("#cp-height").value),
            grossPerPallet: numOrNull($("#cp-gross").value),
            maxTiers: Number($("#cp-tiers").value),
            quantity: numOrNull($("#cp-qty").value) || 0,
            clearance: numOrNull($("#cp-clear").value) || 0,
            assessment: ASSESS(),
          };
          const res = await runEngine(
            "Calculating container load…",
            "planPalletsInContainer",
            req,
          );
          if (!res) return;
          S.contpal = { res, inputs: getInputs("contpal") };
          renderContPal();
        }
        function renderContPal() {
          const host = $("#contpal-results");
          const res = S.contpal && S.contpal.res;
          if (!res) return;
          if (!res.ok) {
            host.innerHTML = msgBox("err", "Cannot calculate:", res.errors);
            return;
          }
          host.innerHTML = `${(res.warnings || []).length ? msgBox("warn", "", res.warnings) : ""}
      ${statusCardHTML(res.assessment)}
      <div class="panel"><div class="panel-head"><h2>${esc(res.pallet.name)} → ${esc(res.container.name)}</h2><div class="btn-row"><button class="btn small" data-action="print" data-mode="contpal">Print / Save PDF</button></div></div>
      <div class="kpis">
        <div class="kpi"><div class="k">Pallets per floor</div><div class="v">${res.perFloor}</div><div class="s">simple grid ${res.simpleGrid}</div></div>
        <div class="kpi"><div class="k">Stack tiers</div><div class="v">${res.tiers}</div></div>
        <div class="kpi"><div class="k">Pallets per container</div><div class="v">${res.perContainer}</div><div class="s">space ${res.spaceCap}${res.weightCap !== null ? ` · payload ${res.weightCap}` : ""}</div></div>
        <div class="kpi"><div class="k">Containers needed</div><div class="v">${res.containers === null ? "–" : res.containers}</div><div class="s">${res.quantity ? `for ${res.quantity} pallets; last container ${res.lastContainerLoad}` : "enter a quantity"}</div></div>
        <div class="kpi"><div class="k">Floor utilisation</div><div class="v">${fmt(res.floorUtil, 1)}%</div></div>
        <div class="kpi"><div class="k">Gross in container 1</div><div class="v">${fmt(res.grossPerContainer, 0)} kg</div><div class="s">payload ${fmt(res.container.maxPayload)} kg</div></div>
        <div class="kpi"><div class="k">Constrained by</div><div class="v" style="font-size:14px">${esc(res.constraint)}</div></div>
      </div>
      <p class="small muted">Loaded pallet ${res.pallet.length} × ${res.pallet.width} × ${res.pallet.loadedHeight} mm, ${fmt(res.pallet.gross, 1)} kg. Door opening height ${fmt(res.container.doorHeight)} mm. Both pallet orientations and mixed rows are tested.</p></div>
      <div class="panel" id="contpal-plan"></div>`;
          renderPlanView(
            $("#contpal-plan"),
            res.plan,
            "Container floor plan (pallets)",
          );
        }

        /* =============================== MASTERS ============================== */
        const MASTERS = {
          products: {
            title: "Product / SKU Master",
            defaults: D.products,
            fields: [
              { k: "sku", l: "SKU", t: "text", req: true },
              {
                k: "brand",
                l: "Brand",
                t: "select",
                opts: [""].concat(Engine.BRANDS),
                blank: "— Not set —",
              },
              { k: "description", l: "Description", t: "text" },
              { k: "length", l: "Length", t: "number", req: true },
              { k: "width", l: "Width", t: "number", req: true },
              { k: "height", l: "Height", t: "number", req: true },
              {
                k: "dimUnit",
                l: "Dimension unit",
                t: "select",
                opts: ["cm", "mm"],
              },
              {
                k: "unitsPerCarton",
                l: "Units per carton",
                t: "number",
                req: true,
                step: 1,
              },
              {
                k: "weight",
                l: "Net weight per carton (kg)",
                t: "number",
                req: true,
              },
              { k: "keepUpright", l: "Keep upright default", t: "check" },
              {
                k: "maxStackLayers",
                l: "Maximum stack layers (blank = unlimited)",
                t: "number",
                step: 1,
              },
              {
                k: "maxStackWeight",
                l: "Maximum stack weight kg (future)",
                t: "number",
              },
              {
                k: "fragile",
                l: "Fragile (carries nothing on top)",
                t: "check",
              },
              { k: "canSupport", l: "Can support other cartons", t: "check" },
              { k: "active", l: "Active", t: "check" },
            ],
            cols: [
              ["sku", "SKU"],
              [(p) => p.brand || "–", "Brand"],
              ["description", "Description"],
              [(p) => productDims(p), "Dimensions"],
              ["unitsPerCarton", "Units/ctn"],
              ["weight", "kg/ctn"],
              [(p) => (p.keepUpright ? "Yes" : "No"), "Upright"],
              [(p) => p.maxStackLayers || "–", "Max layers"],
              [(p) => (p.fragile ? "Yes" : "No"), "Fragile"],
              [(p) => (p.active !== false ? "Yes" : "No"), "Active"],
            ],
            blank: () => ({
              sku: "",
              brand: "",
              description: "",
              length: "",
              width: "",
              height: "",
              dimUnit: "cm",
              unitsPerCarton: 1,
              weight: "",
              keepUpright: true,
              maxStackLayers: null,
              maxStackWeight: null,
              fragile: false,
              canSupport: true,
              active: true,
            }),
            validate(rec, list) {
              const e = [];
              if (!String(rec.sku || "").trim()) e.push("SKU is required.");
              if (
                list.some(
                  (p) =>
                    p.id !== rec.id &&
                    String(p.sku).trim().toLowerCase() ===
                      String(rec.sku).trim().toLowerCase(),
                )
              )
                e.push("SKU must be unique.");
              return e.concat(Engine.validateProductRecord(rec));
            },
          },
          pallets: {
            title: "Pallet Master",
            defaults: D.pallets,
            fields: [
              { k: "name", l: "Pallet name", t: "text", req: true },
              { k: "standard", l: "Standard / region", t: "text" },
              { k: "length", l: "Length (mm)", t: "number", req: true },
              { k: "width", l: "Width (mm)", t: "number", req: true },
              {
                k: "maxHeight",
                l: "Maximum height (mm)",
                t: "number",
                req: true,
              },
              { k: "baseHeight", l: "Pallet base height (mm)", t: "number" },
              { k: "tare", l: "Pallet tare weight (kg)", t: "number" },
              {
                k: "maxGross",
                l: "Maximum gross weight kg (blank = unrestricted)",
                t: "number",
              },
              { k: "allowOverhang", l: "Allow overhang default", t: "check" },
            ],
            cols: [
              ["name", "Name"],
              ["standard", "Standard / region"],
              [(p) => `${p.length} × ${p.width}`, "L × W (mm)"],
              ["maxHeight", "Max height"],
              [(p) => p.baseHeight || 0, "Base"],
              [(p) => p.tare || 0, "Tare kg"],
              [(p) => p.maxGross || "Unrestricted", "Max gross kg"],
              [(p) => (p.allowOverhang ? "Yes" : "No"), "Overhang"],
            ],
            blank: () => ({
              name: "",
              standard: "",
              length: "",
              width: "",
              maxHeight: 1800,
              baseHeight: 0,
              tare: 0,
              maxGross: null,
              allowOverhang: false,
            }),
            validate(r) {
              const e = [];
              if (!String(r.name || "").trim())
                e.push("Pallet name is required.");
              ["length", "width", "maxHeight"].forEach((k) => {
                if (!(Number(r[k]) > 0))
                  e.push(
                    `Invalid pallet dimensions: ${k} must be greater than zero.`,
                  );
              });
              if (Number(r.baseHeight) < 0)
                e.push("Base height cannot be negative.");
              if (Number(r.baseHeight) >= Number(r.maxHeight))
                e.push("Base height must be lower than the maximum height.");
              if (Number(r.tare) < 0) e.push("Tare weight cannot be negative.");
              if (
                r.maxGross !== null &&
                r.maxGross !== "" &&
                !(Number(r.maxGross) > Number(r.tare || 0))
              )
                e.push(
                  "Maximum gross weight must exceed the tare weight (or be left blank).",
                );
              return e;
            },
          },
          containers: {
            title: "Container Master",
            defaults: D.containers,
            fields: [
              { k: "name", l: "Container name", t: "text", req: true },
              {
                k: "length",
                l: "Internal length (mm)",
                t: "number",
                req: true,
              },
              { k: "width", l: "Internal width (mm)", t: "number", req: true },
              {
                k: "height",
                l: "Internal height (mm)",
                t: "number",
                req: true,
              },
              { k: "doorWidth", l: "Door width (mm)", t: "number" },
              { k: "doorHeight", l: "Door height (mm)", t: "number" },
              {
                k: "maxPayload",
                l: "Maximum payload (kg)",
                t: "number",
                req: true,
              },
              {
                k: "topClearance",
                l: "Top clearance for loose cartons (mm)",
                t: "number",
              },
            ],
            cols: [
              ["name", "Name"],
              [
                (c) => `${c.length} × ${c.width} × ${c.height}`,
                "Internal L × W × H (mm)",
              ],
              [
                (c) => `${c.doorWidth || "–"} × ${c.doorHeight || "–"}`,
                "Door W × H",
              ],
              ["maxPayload", "Payload kg"],
              [(c) => c.topClearance || 0, "Top clearance"],
            ],
            blank: () => ({
              name: "",
              length: "",
              width: "",
              height: "",
              doorWidth: "",
              doorHeight: "",
              maxPayload: "",
              topClearance: 0,
            }),
            validate(r) {
              const e = [];
              if (!String(r.name || "").trim())
                e.push("Container name is required.");
              ["length", "width", "height", "maxPayload"].forEach((k) => {
                if (!(Number(r[k]) > 0))
                  e.push(`${k} must be greater than zero.`);
              });
              if (
                Number(r.topClearance) < 0 ||
                Number(r.topClearance) >= Number(r.height)
              )
                e.push(
                  "Top clearance must be between 0 and the internal height.",
                );
              return e;
            },
          },
        };
        const editing = { products: null, pallets: null, containers: null };
        function renderMaster(kind) {
          const M = MASTERS[kind],
            list = DB[kind],
            host = $(`#${kind}-master`);
          const ed = editing[kind];
          const cell = (rec, c) =>
            esc(typeof c[0] === "function" ? c[0](rec) : rec[c[0]]);
          host.innerHTML = `<div class="panel-head"><h2>${M.title}</h2><div class="btn-row">
        <button class="btn primary small" data-action="m-add" data-kind="${kind}">+ Add</button>
        <button class="btn small danger" data-action="m-reset" data-kind="${kind}">Reset defaults</button></div></div>
      ${kind === "products" ? '<p class="small muted">Dimensions are OUTER carton dimensions; weight is per complete carton; units per carton = saleable units inside one carton. Values entered in cm are converted to mm for every calculation.</p>' : ""}
      ${kind === "containers" ? '<p class="small muted">Typical ISO internal dimensions and payloads – always confirm with your carrier; road weight limits in your country may be lower than the container payload.</p>' : ""}
      ${kind === "pallets" ? '<p class="small muted">Maximum height includes the pallet base. Usable product height = Maximum height − Pallet base height. India sizes are commonly used sizes; confirm with your customer.</p>' : ""}
      <div class="table-wrap"><table><thead><tr>${M.cols.map((c) => `<th>${c[1]}</th>`).join("")}<th></th></tr></thead><tbody>
      ${
        list
          .map(
            (
              rec,
            ) => `<tr>${M.cols.map((c) => `<td>${cell(rec, c)}</td>`).join("")}<td class="nowrap">
        <button class="btn small" data-action="m-edit" data-kind="${kind}" data-id="${esc(rec.id)}">Edit</button>
        <button class="btn small" data-action="m-dup" data-kind="${kind}" data-id="${esc(rec.id)}">Duplicate</button>
        <button class="btn small danger" data-action="m-del" data-kind="${kind}" data-id="${esc(rec.id)}">Delete</button></td></tr>`,
          )
          .join("") ||
        `<tr><td colspan="${M.cols.length + 1}" class="muted">No records.</td></tr>`
      }
      </tbody></table></div>
      ${
        ed
          ? `<form class="master-form" data-kind="${kind}" novalidate>
        <div class="full"><h3>${ed.id ? "Edit" : "Add"} ${kind === "products" ? "product" : kind === "pallets" ? "pallet" : "container"}</h3></div>
        ${M.fields
          .map(
            (f) =>
              `<div class="field">${
                f.t === "check"
                  ? `<label class="chk"><input type="checkbox" name="${f.k}"${ed[f.k] !== false && ed[f.k] ? " checked" : ""}> ${esc(f.l)}</label>`
                  : `<label>${esc(f.l)}${f.req ? " *" : ""}</label>${
                      f.t === "select"
                        ? `<select name="${f.k}">${f.opts
                            .concat(
                              ed[f.k] && !f.opts.includes(ed[f.k])
                                ? [ed[f.k]]
                                : [],
                            )
                            .map(
                              (o) =>
                                `<option value="${esc(o)}"${(ed[f.k] || "") === o ? " selected" : ""}>${esc(o || f.blank || o)}</option>`,
                            )
                            .join("")}</select>`
                        : `<input type="${f.t}" name="${f.k}" value="${esc(ed[f.k] === null || ed[f.k] === undefined ? "" : ed[f.k])}"${f.t === "number" ? ` step="${f.step || "any"}" min="0"` : ""}>`
                    }`
              }</div>`,
          )
          .join("")}
        <div class="full" id="${kind}-form-msg"></div>
        <div class="full btn-row"><button class="btn primary" type="submit">Save</button><button class="btn" type="button" data-action="m-cancel" data-kind="${kind}">Cancel</button></div>
      </form>`
          : ""
      }`;
          const form = $("form", host);
          if (form)
            form.addEventListener("submit", (e) => {
              e.preventDefault();
              saveMasterForm(kind, form);
            });
        }
        function saveMasterForm(kind, form) {
          const M = MASTERS[kind],
            ed = editing[kind];
          const rec = Object.assign({}, ed);
          M.fields.forEach((f) => {
            /* querySelector, not form.elements[...]: a field named "length" would return the collection size. */
            const el = form.querySelector(`[name="${f.k}"]`);
            if (f.t === "check") rec[f.k] = el.checked;
            else if (f.t === "number")
              rec[f.k] = el.value === "" ? null : Number(el.value);
            else rec[f.k] = el.value.trim();
          });
          const errs = M.validate(rec, DB[kind]);
          if (errs.length) {
            $(`#${kind}-form-msg`).innerHTML = msgBox(
              "err",
              "Please correct:",
              errs,
            );
            return;
          }
          if (!rec.id) {
            rec.id = kind[0] + "-" + uid();
            DB[kind].push(rec);
          } else {
            const i = DB[kind].findIndex((x) => x.id === rec.id);
            if (i < 0) DB[kind].push(rec);
            else DB[kind][i] = rec;
          }
          if (kind === "products") ensureProductColors();
          const ok = persist(kind);
          editing[kind] = null;
          renderMaster(kind);
          refreshAllSelects();
          if (ok) toast("Saved.");
        }
        function masterAction(action, kind, id) {
          const list = DB[kind],
            M = MASTERS[kind];
          if (action === "m-add") editing[kind] = M.blank();
          else if (action === "m-edit")
            editing[kind] = clone(list.find((x) => x.id === id));
          else if (action === "m-cancel") editing[kind] = null;
          else if (action === "m-dup") {
            const src = clone(list.find((x) => x.id === id));
            src.id = kind[0] + "-" + uid();
            delete src.color;
            if (kind === "products") {
              let n = 2;
              while (
                list.some(
                  (p) => p.sku === `${src.sku} (copy${n > 2 ? " " + n : ""})`,
                )
              )
                n++;
              src.sku = `${src.sku} (copy${n > 2 ? " " + n : ""})`;
            } else src.name = src.name + " (copy)";
            list.push(src);
            if (kind === "products") ensureProductColors();
            if (persist(kind)) toast("Duplicated.");
            refreshAllSelects();
          } else if (action === "m-del") {
            if (list.length <= 1 && kind !== "products") {
              toast("At least one record must remain.");
              return;
            }
            const rec = list.find((x) => x.id === id);
            if (
              !confirm(
                `Delete "${rec.sku || rec.name}"? This cannot be undone (use Reset defaults to restore the built-in records).`,
              )
            )
              return;
            if (editing[kind] && editing[kind].id === id) editing[kind] = null;
            DB[kind] = list.filter((x) => x.id !== id);
            if (persist(kind)) toast("Deleted.");
            refreshAllSelects();
          } else if (action === "m-reset") {
            if (
              !confirm(
                `Replace all ${M.title} records with the built-in defaults?`,
              )
            )
              return;
            DB[kind] = clone(M.defaults);
            if (kind === "products") ensureProductColors();
            editing[kind] = null;
            if (persist(kind)) toast("Defaults restored.");
            refreshAllSelects();
          }
          renderMaster(kind);
        }
        function refreshAllSelects() {
          SETTINGS_PREFIXES.forEach((p) => {
            const sel = $(`#${p}-unit`),
              cur = sel.value;
            sel.innerHTML = unitOptionsHTML(cur);
            if (cur && sel.value === cur) {
              updateUnitInfo(p);
              return;
            } /* same unit: keep what the user typed */
            if (!sel.value && sel.options.length) sel.selectedIndex = 0;
            applyUnitDefaults(p);
          });
          const bsel = $("#mix-brand"),
            bcur = bsel.value || "*";
          bsel.innerHTML = brandFilterHTML();
          bsel.value = [...bsel.options].some((o) => o.value === bcur)
            ? bcur
            : "*";
          const sku = $("#single-sku"),
            cur = sku.value;
          sku.innerHTML = productOptionsHTML(cur);
          const cpC = $("#cp-container").value,
            cpP = $("#cp-pallet").value;
          $("#cp-container").innerHTML = DB.containers
            .map(
              (c) =>
                `<option value="${esc(c.id)}"${c.id === cpC ? " selected" : ""}>${esc(c.name)}</option>`,
            )
            .join("");
          $("#cp-pallet").innerHTML = DB.pallets
            .map(
              (p) =>
                `<option value="${esc(p.id)}">${esc(p.name)} — ${esc(p.length)}×${esc(p.width)}</option>`,
            )
            .join("");
          if ([...$("#cp-pallet").options].some((o) => o.value === cpP))
            $("#cp-pallet").value = cpP;
          cpInfo();
          renderMixTable();
          renderQtyTable("exact");
          renderQtyTable("multi");
        }
        function cpInfo() {
          const c = DB.containers.find(
            (x) => x.id === $("#cp-container").value,
          );
          $("#cp-container-info").textContent = c
            ? `Internal ${c.length} × ${c.width} × ${c.height} mm · door ${c.doorWidth || "–"} × ${c.doorHeight || "–"} mm · payload ${fmt(c.maxPayload)} kg`
            : "";
        }
        $("#cp-container").addEventListener("change", cpInfo);

        /* ============================ SAVED PLANS ============================ */
        function getInputs(mode) {
          if (mode === "single")
            return {
              settings: readSettingsRaw("single"),
              sku: $("#single-sku").value,
            };
          if (mode === "mix")
            return {
              settings: readSettingsRaw("mix"),
              rows: clone(mixRows),
              basis: $("#mix-basis").value,
              tol: $("#mix-tol").value,
              tolCustom: $("#mix-tol-custom").value,
              mode: $("#mix-mode").value,
              name: $("#mix-name").value,
            };
          if (mode === "exact" || mode === "multi")
            return {
              settings: readSettingsRaw(mode),
              rows: clone(qtyRows[mode]),
              basis: $(`#${mode}-basis`).value,
              strategy:
                mode === "multi" ? $("#multi-strategy").value : undefined,
            };
          if (mode === "contpal")
            return {
              container: $("#cp-container").value,
              pallet: $("#cp-pallet").value,
              qty: $("#cp-qty").value,
              tiers: $("#cp-tiers").value,
              height: $("#cp-height").value,
              gross: $("#cp-gross").value,
              clear: $("#cp-clear").value,
            };
          return {};
        }
        function setInputs(mode, inp) {
          if (!inp) return;
          if (inp.settings) writeSettingsRaw(mode, inp.settings);
          if (mode === "single") {
            $("#single-sku").value = inp.sku;
          }
          if (mode === "mix") {
            mixRows = clone(inp.rows || []);
            $("#mix-basis").value = inp.basis || "cartons";
            $("#mix-tol").value = inp.tol || "5";
            $("#mix-tol-custom").value = inp.tolCustom || "";
            $("#mix-tol-custom").hidden = $("#mix-tol").value !== "custom";
            $("#mix-mode").value = inp.mode || "balanced";
            $("#mix-name").value = inp.name || "";
            renderMixTable();
          }
          if (mode === "exact" || mode === "multi") {
            qtyRows[mode] = clone(inp.rows || []);
            $(`#${mode}-basis`).value = inp.basis || "cartons";
            if (mode === "multi")
              $("#multi-strategy").value = inp.strategy || "shipment";
            renderQtyTable(mode);
          }
        }
        /* Saved plans keep placements as compact arrays (about 5× smaller) and expand them on load. */
        function compactPlanData(plan) {
          if (!plan || !Array.isArray(plan.placements)) return plan;
          const orients = [],
            idx = new Map();
          const rows = plan.placements.map((p) => {
            const key = p.orientation + "|" + p.orientationDesc;
            if (!idx.has(key)) {
              idx.set(key, orients.length);
              orients.push([p.orientation, p.orientationDesc]);
            }
            return [
              p.itemIdx,
              p.layer,
              p.x,
              p.y,
              p.z,
              p.l,
              p.w,
              p.h,
              idx.get(key),
            ];
          });
          const out = Object.assign({}, plan, { _packed: { orients, rows } });
          delete out.placements;
          return out;
        }
        function expandPlanData(plan) {
          if (!plan || !plan._packed) return plan;
          const { orients, rows } = plan._packed;
          const placements = rows.map((r, i) => {
            const it = plan.items[r[0]] || {},
              o = orients[r[8]] || ["", ""];
            return {
              itemIdx: r[0],
              productId: it.id,
              sku: it.sku,
              layer: r[1],
              x: r[2],
              y: r[3],
              z: r[4],
              l: r[5],
              w: r[6],
              h: r[7],
              weight: it.weight,
              units: it.units,
              orientation: o[0],
              orientationDesc: o[1],
              id: i + 1,
            };
          });
          const out = Object.assign({}, plan, { placements });
          delete out._packed;
          return out;
        }
        function mapResultPlans(res, fn) {
          if (!res) return res;
          const out = Object.assign({}, res);
          if (out.plan) out.plan = fn(out.plan);
          if (Array.isArray(out.scenarios))
            out.scenarios = out.scenarios.map((sc) =>
              Object.assign({}, sc, { plan: fn(sc.plan) }),
            );
          if (Array.isArray(out.units))
            out.units = out.units.map((u) =>
              Object.assign({}, u, { plan: fn(u.plan) }),
            );
          return out;
        }
        const STORAGE_LIMIT_CHARS = 5 * 1024 * 1024;
        function storageChars() {
          let n = 0;
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              n += k.length + (localStorage.getItem(k) || "").length;
            }
          } catch (e) {
            /* ignore */
          }
          return n;
        }
        const MODE_NAMES = {
          single: "Single SKU",
          mix: "Target Mix",
          exact: "Exact Quantity",
          multi: "Multi-Pallet",
        };
        function savePlan(mode) {
          const st = S[mode];
          if (!st || !st.res || !st.res.ok) {
            toast("Run a calculation first.");
            return;
          }
          const def =
            mode === "mix" && $("#mix-name").value.trim()
              ? $("#mix-name").value.trim()
              : `${MODE_NAMES[mode]} ${new Date().toLocaleDateString("en-GB")}`;
          const name = prompt("Save plan as:", def);
          if (!name) return;
          const inputs = clone(st.inputs);
          if (mode === "mix") {
            $("#mix-name").value = name;
            inputs.name = name;
          }
          const packed = mapResultPlans(st.res, compactPlanData);
          const adjusted =
            mode === "single" && st.adjusted
              ? Object.assign({}, st.adjusted, {
                  plan: compactPlanData(st.adjusted.plan),
                })
              : null;
          const tooBig =
            JSON.stringify(packed).length +
              (adjusted ? JSON.stringify(adjusted).length : 0) >
            1000000;
          const rec = {
            id: uid(),
            name,
            mode,
            created: new Date().toISOString(),
            unitName: resultUnitName(mode),
            inputs,
            result: tooBig ? null : packed,
            adjusted: tooBig ? null : adjusted,
            selected: S[mode + "Sel"] || 0,
          };
          DB.plans.unshift(rec);
          if (tooBig) {
            if (persist("plans"))
              toast(
                "Very large layout: the inputs were saved – click Load and recalculate to rebuild the layout.",
              );
          } else if (!persist("plans")) {
            rec.result = null;
            DB.plans[0] = rec;
            if (persist("plans"))
              toast(
                "Plan saved without the calculated layout (browser storage is full) – it will be recalculated when loaded.",
              );
          } else toast("Plan saved.");
          renderPlans();
        }
        function resultUnitName(mode) {
          const r = S[mode] && S[mode].res;
          if (!r) return "";
          if (mode === "single") return r.plan.geom.name;
          if (mode === "mix") return r.input.unitName;
          return r.unit ? r.unit.name : "";
        }
        function renderPlans() {
          const host = $("#plans-list");
          const used = storageChars(),
            pct = Math.min(100, (100 * used) / STORAGE_LIMIT_CHARS);
          host.innerHTML = `<div class="panel-head"><h2>Saved plans</h2><span class="small muted">Stored in this browser. Use “Export data (JSON)” to share with colleagues.</span></div>
      <div class="spacebar" style="max-width:520px;margin-bottom:10px" role="img" aria-label="Browser storage used"><div class="spacebar-track"><div class="spacebar-fill" style="width:${pct}%;background:${pct > 85 ? "var(--solid-red)" : pct > 70 ? "var(--solid-amber)" : "var(--solid-green)"}"></div></div>
        <div class="spacebar-legend"><span>Browser storage used: <b>${fmt(used / 1048576, 2)} MB</b> of about 5 MB (${fmt(pct, 0)}%)</span><span>${pct > 70 ? "Nearly full – export and delete old plans" : "Plenty of room"}</span></div></div>
      <div class="table-wrap"><table><thead><tr><th>Name</th><th>Mode</th><th>Load unit</th><th>Saved</th><th>Summary</th><th></th></tr></thead><tbody>
      ${
        DB.plans
          .map((p) => {
            let summ = "";
            try {
              const r = p.result;
              if (r && p.mode === "mix") {
                const sc = r.scenarios[p.selected || 0];
                summ = sc.rows.map((x) => `${x.sku} ${x.cartons}`).join(", ");
              } else if (r && p.mode === "single")
                summ = `${r.sku}: ${r.summary.maxCartons} cartons`;
              else if (r && (p.mode === "exact" || p.mode === "multi"))
                summ = `${r.units.length} unit(s)`;
              else if (!r) summ = "Inputs only";
            } catch (e) {
              summ = "";
            }
            return `<tr><td><b>${esc(p.name)}</b></td><td>${esc(MODE_NAMES[p.mode] || p.mode)}</td><td>${esc(p.unitName || "")}</td><td>${esc(new Date(p.created).toLocaleString("en-GB"))}</td><td class="small">${esc(summ)}</td>
          <td class="nowrap"><button class="btn small" data-action="plan-load" data-id="${esc(p.id)}">Load</button> <button class="btn small" data-action="plan-dup" data-id="${esc(p.id)}">Duplicate</button> <button class="btn small danger" data-action="plan-del" data-id="${esc(p.id)}">Delete</button></td></tr>`;
          })
          .join("") ||
        '<tr><td colspan="6" class="muted">No saved plans yet. Run a calculation and click “Save plan”.</td></tr>'
      }
      </tbody></table></div>`;
        }
        function planAction(action, id) {
          const p = DB.plans.find((x) => x.id === id);
          if (!p) return;
          if (action === "plan-del") {
            if (!confirm(`Delete saved plan "${p.name}"?`)) return;
            DB.plans = DB.plans.filter((x) => x.id !== id);
            if (persist("plans")) toast("Deleted.");
            renderPlans();
            return;
          }
          if (action === "plan-dup") {
            const c = clone(p);
            c.id = uid();
            c.name = p.name + " (copy)";
            c.created = new Date().toISOString();
            DB.plans.unshift(c);
            if (persist("plans")) toast("Duplicated.");
            else DB.plans.shift();
            renderPlans();
            return;
          }
          if (action === "plan-load") {
            showTab(p.mode);
            setInputs(p.mode, p.inputs);
            if (!p.result) {
              S[p.mode] = null;
              if (p.mode === "mix") {
                $("#mix-results").innerHTML = "";
                $("#mix-summary").innerHTML =
                  '<h2>Optimised summary</h2><div class="empty">Recalculating…</div>';
              } else
                $(`#${p.mode}-results`).innerHTML =
                  '<div class="empty">Recalculating…</div>';
              toast(`Inputs of "${p.name}" loaded – recalculating the layout…`);
              if (p.mode === "single") runSingle();
              else if (p.mode === "mix") runMix();
              else runQty(p.mode);
              return;
            }
            S[p.mode] = {
              res: mapResultPlans(p.result, expandPlanData),
              inputs: clone(p.inputs),
              adjusted: p.adjusted
                ? Object.assign({}, p.adjusted, {
                    plan: expandPlanData(p.adjusted.plan),
                  })
                : null,
            };
            S[p.mode + "Sel"] = p.selected || 0;
            if (p.mode === "single") renderSingle();
            else if (p.mode === "mix") renderMix();
            else renderQty(p.mode);
            toast(`Loaded "${p.name}".`);
          }
        }

        /* =============================== EXPORT ============================== */
        const csvCell = (v) => {
          let s = v === null || v === undefined ? "" : String(v);
          if (typeof v === "string" && /^[=+\-@\t\r]/.test(s))
            s = "'" + s; /* neutralise spreadsheet formulas */
          return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const csvLine = (arr) => arr.map(csvCell).join(",");
        function planCSVRows(plan, scenarioName, skuInfo, dateStr) {
          const g = plan.geom,
            k = plan.kpis,
            out = [];
          const groups = new Map();
          for (const p of plan.placements) {
            const key = `${p.layer}|${p.sku}|${p.orientation}`;
            if (!groups.has(key))
              groups.set(key, {
                layer: p.layer,
                sku: p.sku,
                productId: p.productId,
                orientation: p.orientation,
                desc: p.orientationDesc,
                n: 0,
              });
            groups.get(key).n++;
          }
          for (const gr of [...groups.values()].sort(
            (a, b) => a.layer - b.layer || a.sku.localeCompare(b.sku),
          )) {
            const si = skuInfo[gr.productId] || {};
            out.push(
              csvLine([
                dateStr,
                scenarioName,
                g.name,
                `${g.L} x ${g.W} x ${g.maxHeight}`,
                gr.sku,
                si.requested ?? "",
                si.achieved ?? "",
                si.deviation ?? "",
                si.cartons ?? "",
                si.units ?? "",
                si.weight ?? "",
                gr.layer,
                gr.n,
                `${gr.orientation} (${gr.desc})`,
                k.totalCartons,
                k.netWeight,
                k.grossWeight,
                k.stackHeight,
                k.volumeUtil,
                k.floorUtil,
              ]),
            );
          }
          return out;
        }
        function skuInfoFromPlan(plan) {
          const info = {};
          plan.placements.forEach((p) => {
            const s = (info[p.productId] = info[p.productId] || {
              cartons: 0,
              units: 0,
              weight: 0,
            });
            s.cartons++;
            s.units += p.units;
            s.weight = Math.round((s.weight + p.weight) * 100) / 100;
          });
          return info;
        }
        const CSV_HEAD = [
          "Date",
          "Scenario Name",
          "Load Unit",
          "Unit Dimensions (mm)",
          "SKU",
          "Requested %",
          "Achieved %",
          "Deviation (pp)",
          "SKU Cartons",
          "SKU Saleable Units",
          "SKU Weight (kg)",
          "Layer Number",
          "Cartons in Layer",
          "Orientation",
          "Total Cartons",
          "Total Net Weight (kg)",
          "Gross Weight (kg)",
          "Stack Height (mm)",
          "Volume Utilisation %",
          "Floor Utilisation %",
        ];
        function placementCSV(plan, label) {
          const lines = [
            "",
            csvLine([`CARTON PLACEMENTS – ${label}`]),
            csvLine([
              "Carton ID",
              "SKU",
              "Layer",
              "X (mm)",
              "Y (mm)",
              "Z (mm)",
              "Placed Length",
              "Placed Width",
              "Placed Height",
              "Orientation",
              "Weight (kg)",
            ]),
          ];
          plan.placements.forEach((p) =>
            lines.push(
              csvLine([
                p.id,
                p.sku,
                p.layer,
                p.x,
                p.y,
                p.z,
                p.l,
                p.w,
                p.h,
                `${p.orientation} (${p.orientationDesc})`,
                p.weight,
              ]),
            ),
          );
          return lines;
        }
        function exportCSV(mode) {
          const st = S[mode];
          if (!st || !st.res || !st.res.ok) {
            toast("Run a calculation first.");
            return;
          }
          const res = st.res,
            dateStr = new Date().toLocaleString("en-GB");
          let lines = [csvLine(CSV_HEAD)],
            name = "";
          if (mode === "mix") {
            const sc = res.scenarios[S.mixSel];
            name = $("#mix-name").value.trim() || "Target mix";
            const info = {};
            sc.rows.forEach((r) => {
              info[r.productId] = {
                requested: r.locked ? "Locked" : r.target,
                achieved: r.locked ? "" : Math.round(r.achieved * 100) / 100,
                deviation: r.locked ? "" : Math.round(r.deviation * 100) / 100,
                cartons: r.cartons,
                units: r.units,
                weight: r.weight,
              };
            });
            lines = lines.concat(
              planCSVRows(
                sc.plan,
                `${name} – Scenario ${S.mixSel + 1} ${sc.label}`,
                info,
                dateStr,
              ),
            );
            lines.push(
              "",
              csvLine(["SUMMARY BY SKU"]),
              csvLine([
                "SKU",
                "Requested %",
                "Achieved %",
                "Deviation (pp)",
                "Cartons",
                "Saleable Units",
                "Weight (kg)",
                "Status",
              ]),
            );
            sc.rows.forEach((r) =>
              lines.push(
                csvLine([
                  r.sku,
                  r.locked ? "Locked" : r.target,
                  r.locked ? "" : Math.round(r.achieved * 100) / 100,
                  r.locked ? "" : Math.round(r.deviation * 100) / 100,
                  r.cartons,
                  r.units,
                  r.weight,
                  r.status,
                ]),
              ),
            );
            lines.push(
              csvLine([
                "Weighted mix deviation",
                Math.round(sc.metrics.E * 100) / 100,
              ]),
              csvLine(["Quality", sc.quality]),
            );
            if (sc.assessment) {
              lines.push(
                csvLine([
                  "Load status",
                  sc.assessment.title,
                  sc.assessment.summary,
                ]),
              );
              sc.assessment.checks.forEach((c) =>
                lines.push(
                  csvLine([
                    `Check – ${c.label}`,
                    c.status.toUpperCase(),
                    c.message,
                    c.action,
                  ]),
                ),
              );
            }
            lines = lines.concat(placementCSV(sc.plan, sc.label));
          } else if (mode === "single") {
            const adj = st.adjusted;
            const plan = adj ? adj.plan : res.plan;
            name = adj ? `${res.sku} + additions` : `${res.sku} capacity`;
            lines = lines.concat(
              planCSVRows(plan, name, skuInfoFromPlan(plan), dateStr),
              placementCSV(plan, name),
            );
          } else {
            name = MODE_NAMES[mode];
            res.units.forEach((u) => {
              if (u.plan)
                lines = lines.concat(
                  planCSVRows(
                    u.plan,
                    `${name} – unit ${u.no}`,
                    skuInfoFromPlan(u.plan),
                    dateStr,
                  ),
                );
            });
            res.units.forEach((u) => {
              if (u.plan)
                lines = lines.concat(placementCSV(u.plan, `unit ${u.no}`));
            });
          }
          downloadFile(
            `${safeName(name)}-${new Date().toISOString().slice(0, 10)}.csv`,
            "﻿" + lines.join("\r\n"),
            "text/csv;charset=utf-8",
          );
        }
        function printPlanBlock(plan, title, assessment) {
          const lab = tierWord(plan);
          const k = plan.kpis;
          const layersHTML = plan.layerGroups
            .map((gr) => {
              const L = plan.layers.find((x) => x.no === gr.from);
              return `<div class="print-layer"><b>${lab}${gr.to > gr.from ? `s ${gr.from}–${gr.to} (same layout)` : ` ${gr.from}`}</b> – ${fmt(L.height)} mm, ${L.cartons} cartons, ${fmt(L.weight, 1)} kg: ${Object.keys(
                L.products,
              )
                .map((s) => `${esc(s)} × ${L.products[s]}`)
                .join(
                  ", ",
                )}<br>${topViewSVG(plan, gr.from, { maxW: 330, maxH: 260 })}</div>`;
            })
            .join("");
          const snap = View3D.snapshot(plan, 640, 360);
          return `<h2>${esc(title)}</h2>
      ${assessment ? statusCardHTML(assessment) : ""}
      ${snap ? `<img class="snap" src="${snap}" alt="3D view of the load">` : ""}
      <p>${esc(plan.geom.name)} ${plan.geom.L} × ${plan.geom.W} mm · ${k.totalCartons} cartons · ${fmt(k.totalUnits)} units · net ${fmt(k.netWeight, 1)} kg · gross ${fmt(k.grossWeight, 1)} kg · stack ${fmt(k.stackHeight)} mm (+ base ${fmt(k.baseHeight)} mm, max ${fmt(k.maxHeight)} mm, remaining ${fmt(k.remainingHeight)} mm) · floor ${fmt(k.floorUtil, 1)}% · volume ${fmt(k.volumeUtil, 1)}% · ${plan.validation.ok ? "Physical validation passed" : "VALIDATION FAILED"}</p>
      <div>${elevationSVG(plan, "x", { maxW: 620, maxH: 220 })}</div>
      <div>${layersHTML}</div>
      <div class="small">${legendHTML(plan)}</div>`;
        }
        function printReport(mode) {
          const st = S[mode];
          if (!st || !st.res || !st.res.ok) {
            toast("Run a calculation first.");
            return;
          }
          const res = st.res,
            date = new Date().toLocaleString("en-GB");
          let body = "";
          if (mode === "mix") {
            const sc = res.scenarios[S.mixSel];
            body =
              `<h1>Loading plan – ${esc($("#mix-name").value.trim() || "Target mix")}</h1><p>${esc(date)} · Scenario ${S.mixSel + 1}: ${esc(sc.label)} · ${esc(sc.quality)} · basis: ${esc(res.input.basis)} · tolerance ±${fmt(res.input.tolerance, 1)} pp</p>
        <table><thead><tr><th>SKU</th><th>Target %</th><th>Priority</th><th>Cartons</th><th>Units/ctn</th><th>Units</th><th>Net kg</th><th>Achieved %</th><th>Deviation pp</th><th>Status</th></tr></thead><tbody>
        ${sc.rows.map((r) => `<tr><td>${esc(r.sku)}</td><td>${r.locked ? "Locked" : fmt(r.target, 1)}</td><td>${esc(r.priority)}</td><td><b>${r.cartons}</b></td><td>${r.unitsPerCarton}</td><td>${fmt(r.units)}</td><td>${fmt(r.weight, 2)}</td><td>${r.locked ? "–" : fmt(r.achieved, 1)}</td><td>${r.locked ? "–" : signed(r.deviation, 1)}</td><td>${esc(r.status)}</td></tr>`).join("")}</tbody></table>
        <p>${sc.facts.map(esc).join(" · ")} · Constraint: ${esc(sc.constraint.primary)}</p>` +
              printPlanBlock(sc.plan, "Loading plan", sc.assessment);
          } else if (mode === "single") {
            const adj = st.adjusted;
            body = adj
              ? `<h1>Adjusted plan – ${esc(res.sku)} + added cartons</h1><p>${esc(date)} · ${esc(
                  adj.rows
                    .filter((r) => r.cartons)
                    .map((r) => `${r.sku} × ${r.cartons}`)
                    .join(", "),
                )}</p>` +
                printPlanBlock(
                  adj.plan,
                  "Adjusted loading plan",
                  adj.assessment,
                )
              : `<h1>Single-SKU plan – ${esc(res.sku)}</h1><p>${esc(date)} · ${esc(res.summary.bestOrientation)} · ${esc(res.summary.arrangement)} · constrained by ${esc(res.constraint)}</p>` +
                printPlanBlock(res.plan, "Loading plan", res.assessment);
          } else if (mode === "contpal") {
            body =
              `<h1>Container load – ${esc(res.pallet.name)} in ${esc(res.container.name)}</h1><p>${esc(date)} · ${res.perFloor} pallets per floor × ${res.tiers} tier(s) = ${res.perContainer} per container${res.containers ? ` · ${res.quantity} pallets → ${res.containers} container(s)` : ""} · constrained by ${esc(res.constraint)}</p>` +
              printPlanBlock(res.plan, "Container floor plan", res.assessment);
          } else {
            body =
              `<h1>${esc(MODE_NAMES[mode])} plan – ${esc(res.unit.name)}</h1><p>${esc(date)} · ${res.units.length} unit(s)</p>` +
              res.units
                .map((u, i) =>
                  u.plan
                    ? `<div class="${i ? "print-break" : ""}">${printPlanBlock(u.plan, `Unit ${u.no}: ${u.description}`, u.assessment)}</div>`
                    : "",
                )
                .join("");
          }
          $("#print-report").innerHTML =
            `<div class="print-head">${RAMA_LOGO ? `<img src="${RAMA_LOGO}" alt="RAMA">` : ""}<div><b style="font-size:15px">Packaging Genie</b><br><span style="font-size:10px">Pallet &amp; container loading plan</span></div></div>` +
            body;
          window.print();
        }
        function exportData() {
          const data = {
            app: "packaging-genie",
            version: Engine.CONFIG.VERSION,
            exported: new Date().toISOString(),
            products: DB.products,
            pallets: DB.pallets,
            containers: DB.containers,
            plans: DB.plans,
          };
          downloadFile(
            `packaging-genie-data-${new Date().toISOString().slice(0, 10)}.json`,
            JSON.stringify(data, null, 2),
            "application/json",
          );
        }
        /* Imported files are untrusted: every record is rebuilt from known fields with the right types. */
        const sStr = (v, max) =>
          String(v === null || v === undefined ? "" : v).slice(0, max || 200);
        const sNum = (v) =>
          v === null || v === undefined || v === "" || !isFinite(Number(v))
            ? null
            : Number(v);
        const sId = (v) =>
          /^[\w.:-]{1,80}$/.test(String(v || "")) ? String(v) : null;
        const sanitizeProduct = (p) => ({
          id: sId(p.id) || "p-" + uid(),
          sku: sStr(p.sku, 80),
          brand: sStr(p.brand, 60),
          description: sStr(p.description),
          length: sNum(p.length),
          width: sNum(p.width),
          height: sNum(p.height),
          dimUnit: p.dimUnit === "mm" ? "mm" : "cm",
          unitsPerCarton: sNum(p.unitsPerCarton),
          weight: sNum(p.weight),
          keepUpright: p.keepUpright !== false,
          maxStackLayers: sNum(p.maxStackLayers),
          maxStackWeight: sNum(p.maxStackWeight),
          fragile: p.fragile === true,
          canSupport: p.canSupport !== false,
          active: p.active !== false,
          color: /^#[0-9a-f]{6}$/i.test(p.color || "") ? p.color : undefined,
        });
        const sanitizePallet = (p) => ({
          id: sId(p.id) || "p-" + uid(),
          name: sStr(p.name, 100),
          standard: sStr(p.standard, 120),
          length: sNum(p.length),
          width: sNum(p.width),
          maxHeight: sNum(p.maxHeight),
          baseHeight: sNum(p.baseHeight) || 0,
          tare: sNum(p.tare) || 0,
          maxGross: sNum(p.maxGross),
          allowOverhang: p.allowOverhang === true,
        });
        const sanitizeContainer = (c) => ({
          id: sId(c.id) || "c-" + uid(),
          name: sStr(c.name, 100),
          length: sNum(c.length),
          width: sNum(c.width),
          height: sNum(c.height),
          doorWidth: sNum(c.doorWidth),
          doorHeight: sNum(c.doorHeight),
          maxPayload: sNum(c.maxPayload),
          topClearance: sNum(c.topClearance) || 0,
        });
        /* Saved plans keep their inputs only; the layout is recalculated from your data when loaded. */
        const sanitizePlan = (pl) => ({
          id: sId(pl.id) || uid(),
          name: sStr(pl.name, 120) || "Imported plan",
          mode: ["single", "mix", "exact", "multi"].includes(pl.mode)
            ? pl.mode
            : "mix",
          created: isNaN(Date.parse(pl.created))
            ? new Date().toISOString()
            : new Date(pl.created).toISOString(),
          unitName: sStr(pl.unitName, 100),
          inputs:
            pl.inputs && typeof pl.inputs === "object"
              ? JSON.parse(JSON.stringify(pl.inputs))
              : {},
          result: null,
          selected: 0,
        });
        function importData(file) {
          const fr = new FileReader();
          fr.onload = () => {
            try {
              const raw = JSON.parse(fr.result);
              if (
                !raw ||
                !["packaging-genie", "pallet-mix-optimiser"].includes(
                  raw.app,
                ) ||
                !Array.isArray(raw.products) ||
                !Array.isArray(raw.pallets)
              )
                throw new Error("This is not a Packaging Genie data file.");
              const d = {
                products: raw.products.map(sanitizeProduct),
                pallets: raw.pallets.map(sanitizePallet),
                containers: Array.isArray(raw.containers)
                  ? raw.containers.map(sanitizeContainer)
                  : null,
                plans: Array.isArray(raw.plans)
                  ? raw.plans.map(sanitizePlan)
                  : null,
              };
              const bad = d.products
                .map((p) => Engine.validateProductRecord(p))
                .flat()
                .concat(
                  d.pallets
                    .map((p) => MASTERS.pallets.validate(p, d.pallets))
                    .flat(),
                  (d.containers || [])
                    .map((c) => MASTERS.containers.validate(c, d.containers))
                    .flat(),
                );
              if (!d.pallets.length) bad.push("The file contains no pallets.");
              if (bad.length)
                throw new Error(
                  "Invalid records in file: " + bad.slice(0, 3).join(" "),
                );
              if (
                !confirm(
                  `Import ${d.products.length} products, ${d.pallets.length} pallets, ${(d.containers || []).length} containers and ${(d.plans || []).length} saved plans? This replaces the current data in this browser.`,
                )
              )
                return;
              DB.products = d.products;
              DB.pallets = d.pallets;
              if (d.containers && d.containers.length)
                DB.containers = d.containers;
              if (d.plans) DB.plans = d.plans;
              ensureProductColors();
              const ok = ["products", "pallets", "containers", "plans"]
                .map(persist)
                .every(Boolean);
              ["products", "pallets", "containers"].forEach(renderMaster);
              refreshAllSelects();
              renderPlans();
              if (ok)
                toast(
                  "Data imported. Saved plans from the file are recalculated when you load them.",
                );
            } catch (e) {
              alert("Import failed: " + e.message);
            }
          };
          fr.readAsText(file);
          $("#import-file").value = "";
        }

        /* =============================== TESTS =============================== */
        async function runTests() {
          const res = await runEngine(
            "Running self-tests…",
            "runSelfTests",
            null,
          );
          if (!res) return;
          const groups = [];
          res.results.forEach((r) => {
            let g = groups.find((x) => x.name === r.group);
            if (!g) groups.push((g = { name: r.group, rows: [] }));
            g.rows.push(r);
          });
          $("#tests-results").innerHTML =
            `<div class="msg ${res.failed ? "err" : "info"}"><b>${res.passed} of ${res.total} checks passed</b>${res.failed ? ` – ${res.failed} failed` : ""} (${fmt(res.ms / 1000, 1)} s).</div>
      ${groups
        .map(
          (
            g,
          ) => `<h4 style="margin:14px 0 6px">${esc(g.name)}</h4><div class="table-wrap"><table><thead><tr><th style="width:28%">Check</th><th style="width:70px">Result</th><th>Details</th></tr></thead><tbody>
      ${g.rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${r.pass ? '<span class="badge ok">PASS</span>' : '<span class="badge bad">FAIL</span>'}</td><td class="small">${esc(r.detail)}</td></tr>`).join("")}</tbody></table></div>`,
        )
        .join("")}`;
        }
        function renderMethod() {
          const C = Engine.CONFIG;
          $("#method-panel").innerHTML = `<h2>How the optimiser works</h2>
      <div class="details-body">
      <h4>1 · Physical packing engine – “can these exact cartons be placed?”</h4>
      <p>Each carton is placed at real X/Y/Z coordinates. For every layer the engine tests the permitted orientations (upright only, or all six when full rotation is allowed; duplicates removed), and both footprint rotations. A recursive guillotine search over all “normal” positions (combinations of carton lengths and widths) finds the best single-SKU pattern, including mixed-orientation rows and leftover strips – it never relies on FLOOR(L/l) × FLOOR(W/w) alone. Remaining floor space in a layer is filled with other SKUs of equal (preferred) or lower height using maximal-rectangle free-space tracking.</p>
      <h4>2 · Conservative layers and stability</h4>
      <p>A layer’s height is the height of its tallest carton. Nothing is ever placed in the air gap above a shorter carton. The next layer may only stand on cartons whose top is exactly at the layer top and that are allowed to carry load; unsupported areas are blocked as obstacles, so every carton is 100% supported (no bridging, no floating cartons). Fragile cartons carry nothing.</p>
      <h4>3 · Mix optimisation engine – “which whole-carton combination best meets the target?”</h4>
      <p>Only integer carton quantities are considered. Candidate combinations are generated by (a) target-following growth – always adding the carton that keeps the selected basis (cartons, saleable units or weight) closest to the target, in doubling batches; (b) utilisation fill-up; (c) proportional scaling with largest-remainder rounding; and (d) local search with add / remove / swap moves. Every candidate is checked by the physical packing engine; weight, volume and dominance pruning avoid pointless attempts (budget ${fmt(C.MAX_PACK_EVALUATIONS)} packing attempts, run in a background Web Worker).</p>
      <h4>4 · Ranking scenarios</h4>
      <p>Score = capacity utilisation % − λ × weighted deviation − μ × weighted deviation beyond tolerance + 0.01 × cartons, where weighted deviation = Σ priority weight × |achieved % − target %| (High ${C.PRIORITY_WEIGHTS.High}, Normal ${C.PRIORITY_WEIGHTS.Normal}, Low ${C.PRIORITY_WEIGHTS.Low}). Closest Target Match uses λ=${C.MODE_WEIGHTS.match.lambda}, μ=${C.MODE_WEIGHTS.match.tolPenalty}; Balanced λ=${C.MODE_WEIGHTS.balanced.lambda}, μ=${C.MODE_WEIGHTS.balanced.tolPenalty}; Maximum Utilisation λ=${C.MODE_WEIGHTS.util.lambda}, μ=${C.MODE_WEIGHTS.util.tolPenalty}. The best candidate for each objective is re-packed with all layer strategies and independently validated (footprint, overlap, height, weight, orientation, full support, counts) before it is shown.</p>
      <h4>5 · Containers</h4>
      <p>Loose cartons: the container length is cut into strips (loaded wall-by-wall from the closed end) and each strip into single-SKU column blocks; a dynamic programme over SKU subsets finds the shortest total length. The same column-block method is also used on pallets whenever full layers cannot hold a mix of different carton heights. Palletised: each loaded pallet is treated as a rigid box – both orientations, mixed rows, optional 2–3 high stacking, door-height and payload checks.</p>
      <h4>6 · Traffic light (GREEN / AMBER / RED)</h4>
      <p>Every plan is rated on stability (tall free-standing columns – a side counts as braced when a neighbouring stack within 25 mm reaches at least 75% of the column height – top-heavy loads, heavy cartons on much lighter ones, overhang), space used (the higher of volume and weight utilisation), target-mix accuracy, weight and height. The worst check decides the colour. Thresholds can be changed above.</p>
      <h4>7 · What else fits</h4>
      <p>Starting from the planned cartons, the engine adds cartons of each SKU in your mix, then of every other active product, until nothing more fits, and also builds a combined best fill. Each suggestion is re-planned from scratch and physically validated before it is shown. “Add to plan” creates an Adjusted plan with its own layout and traffic light.</p>
      <h4>8 · 3D view</h4>
      <p>The 3D view is drawn from the same carton coordinates as the tables. Arrows on the carton sides point to each carton’s original top, like the “this way up” print on a real carton, so upright and turned cartons are easy to tell apart. “Play loading sequence” shows the order in which to place the cartons.</p>
      <h4>Assumptions (version 1)</h4>
      <ul><li>Dimensions are outer carton dimensions; cm values are converted to mm.</li><li>Maximum height includes the pallet base; usable height = maximum − base.</li><li>Clearance is applied between cartons (not at the pallet edge).</li><li>Overhang, when allowed, applies to the pallet footprint; upper layers still need full support.</li><li>“Maximum stack layers” limits the number of layers a SKU may occupy; maximum stack weight is stored for future use.</li><li>Container weights are payload limits; road limits may be lower.</li></ul>
      </div>`;
        }

        /* ============================ EVENT WIRING =========================== */
        document.addEventListener("click", (e) => {
          const b = e.target.closest("[data-action]");
          if (!b) return;
          const a = b.dataset.action;
          switch (a) {
            case "run-single":
              runSingle();
              break;
            case "run-mix":
              runMix();
              break;
            case "run-exact":
              runQty("exact");
              break;
            case "run-multi":
              runQty("multi");
              break;
            case "run-contpal":
              runContPal();
              break;
            case "run-tests":
              runTests();
              break;
            case "cancel-run":
              Runner.cancel();
              break;
            case "mix-add": {
              const used = new Set(mixRows.map((r) => r.productId));
              const p =
                activeProducts().find((x) => !used.has(x.id)) ||
                activeProducts()[0];
              if (!p) {
                toast("Add products in the Product Master first.");
                break;
              }
              mixRows.push({
                productId: p.id,
                include: true,
                target: 0,
                priority: "Normal",
                min: "",
                max: "",
                locked: false,
                lockedQty: "",
              });
              renderMixTable();
              break;
            }
            case "mix-add-all": {
              const used = new Set(mixRows.map((r) => r.productId));
              const bf = $("#mix-brand").value;
              activeProducts()
                .filter(
                  (p) =>
                    !used.has(p.id) && (bf === "*" || (p.brand || "") === bf),
                )
                .forEach((p) =>
                  mixRows.push({
                    productId: p.id,
                    include: true,
                    target: 0,
                    priority: "Normal",
                    min: "",
                    max: "",
                    locked: false,
                    lockedQty: "",
                  }),
                );
              renderMixTable();
              break;
            }
            case "mix-remove":
              mixRows.splice(+b.dataset.i, 1);
              renderMixTable();
              break;
            case "mix-normalise":
              normaliseMix();
              break;
            case "mix-clear":
              if (confirm("Remove all SKUs from the mix table?")) {
                mixRows = [];
                renderMixTable();
              }
              break;
            case "mix-select":
              S.mixSel = +b.dataset.i;
              renderMix();
              break;
            case "exact-add":
            case "multi-add": {
              const mode = a.split("-")[0];
              const used = new Set(qtyRows[mode].map((r) => r.productId));
              const p =
                activeProducts().find((x) => !used.has(x.id)) ||
                activeProducts()[0];
              if (p) {
                qtyRows[mode].push({ productId: p.id, qty: "" });
                renderQtyTable(mode);
              }
              break;
            }
            case "exact-clear":
            case "multi-clear": {
              const mode = a.split("-")[0];
              qtyRows[mode] = [];
              renderQtyTable(mode);
              break;
            }
            case "qty-remove":
              qtyRows[b.dataset.mode].splice(+b.dataset.i, 1);
              renderQtyTable(b.dataset.mode);
              break;
            case "unit-select":
              S[b.dataset.mode + "Sel"] = +b.dataset.i;
              renderQty(b.dataset.mode);
              break;
            case "cp-use-last":
              useLastPallet();
              break;
            case "fill-add":
              applyFill(b.dataset.mode, b.dataset.ref, b.dataset.key);
              break;
            case "adj-discard":
              if (S.single) {
                S.single.adjusted = null;
                renderSingle();
              }
              break;
            case "assess-reset":
              try {
                localStorage.removeItem(ASSESS_KEY);
              } catch (err) {
                /* ignore */
              }
              renderAssessSettings();
              toast("Thresholds reset to defaults.");
              break;
            case "save-plan":
              savePlan(b.dataset.mode);
              break;
            case "csv":
              exportCSV(b.dataset.mode);
              break;
            case "print":
              printReport(b.dataset.mode);
              break;
            case "export-data":
              exportData();
              break;
            case "theme-toggle":
              toggleTheme();
              break;
            case "m-add":
            case "m-edit":
            case "m-cancel":
            case "m-dup":
            case "m-del":
            case "m-reset":
              masterAction(a, b.dataset.kind, b.dataset.id);
              break;
            case "plan-load":
            case "plan-dup":
            case "plan-del":
              planAction(a, b.dataset.id);
              break;
            default:
              break;
          }
        });
        $("#import-file").addEventListener("change", (e) => {
          if (e.target.files[0]) importData(e.target.files[0]);
        });
        $("#mix-tol").addEventListener("change", () => {
          $("#mix-tol-custom").hidden = $("#mix-tol").value !== "custom";
        });

        /* ================================ INIT =============================== */
        if (ensureProductColors()) persist("products");
        initSettings("single", "pallet:pal-industrial");
        initSettings("mix", "pallet:pal-industrial");
        initSettings("exact", "pallet:pal-industrial");
        initSettings("multi", "pallet:pal-industrial");
        $("#single-sku").innerHTML = productOptionsHTML(
          DB.products[0] && DB.products[0].id,
        );
        mixRows = defaultMixRows();
        const idOf = (sku) => (DB.products.find((p) => p.sku === sku) || {}).id;
        qtyRows.exact = [
          ["P12C2D0", 10],
          ["P17C2D2", 15],
          ["Carbon Filters", 6],
          ["POSTreat", 4],
        ]
          .filter((x) => idOf(x[0]))
          .map(([s, q]) => ({ productId: idOf(s), qty: q }));
        qtyRows.multi = [
          ["P12C2D0", 80],
          ["P17C2D2", 50],
          ["Carbon Filters", 30],
          ["POSTreat", 20],
        ]
          .filter((x) => idOf(x[0]))
          .map(([s, q]) => ({ productId: idOf(s), qty: q }));
        refreshAllSelects();
        if ([...$("#cp-container").options].some((o) => o.value === "c-40hc"))
          $("#cp-container").value = "c-40hc";
        if ([...$("#cp-pallet").options].some((o) => o.value === "pal-euro"))
          $("#cp-pallet").value = "pal-euro";
        cpInfo();
        ["products", "pallets", "containers"].forEach(renderMaster);
        renderPlans();
        renderMethod();
        renderAssessSettings();
        updateThemeButton();
        try {
          const ui = JSON.parse(localStorage.getItem(KEYS.ui) || "{}");
          if (ui.tab && $("#tab-" + ui.tab)) showTab(ui.tab);
        } catch (e) {
          /* ignore */
        }
      })();
