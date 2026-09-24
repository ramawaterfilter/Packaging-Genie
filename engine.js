      function PalletEngineFactory() {
        "use strict";

        /* ============================ CONFIGURATION ============================ */
        const CONFIG = {
          VERSION: "1.2.0",
          EPS: 1e-6,
          /* Deviation penalty multipliers per SKU priority (configurable). */
          PRIORITY_WEIGHTS: { High: 3, Normal: 1, Low: 0.5 },
          /* Scenario objective: score = capacityUtil% − lambda × weightedDeviation
       − tolPenalty × weighted deviation beyond tolerance + qty × cartons. */
          MODE_WEIGHTS: {
            match: {
              label: "Closest Target Match",
              lambda: 4,
              tolPenalty: 20,
              qty: 0.01,
            },
            balanced: {
              label: "Balanced Recommendation",
              lambda: 1,
              tolPenalty: 5,
              qty: 0.01,
            },
            util: {
              label: "Maximum Utilisation",
              lambda: 0.15,
              tolPenalty: 0.5,
              qty: 0.01,
            },
          },
          MAX_PACK_EVALUATIONS: 2500 /* physical packing attempts per optimisation */,
          SEARCH_STRATEGIES: 3 /* layer strategies tried during search (all are tried for the final plan) */,
          MAX_NORMAL_VALUES: 260 /* above this the 2-D solver switches to a strip heuristic */,
          LOCAL_SEARCH_MAX_ITER: 150,
          LOCAL_SEARCH_TRIES: 25,
          MAX_LAYERS: 250,
          MAX_LAYER_BASES: 8 /* layer-base candidates tried per layer when many SKUs are loaded */,
          MAX_UNITS: 300,
          EXACT_MATCH_PP: 0.05,
          PROGRESS_EVERY: 15,
        };
        const EPS = CONFIG.EPS;

        /* ============================ DEFAULT DATA ============================= */
        /* Brands offered in the Product Master (extend here if new brands are added). */
        const BRANDS = ["Phoenix Gravity", "RAMA", "C Line"];
        const DEFAULTS = {
          products: [
            {
              id: "p-p12c2d0",
              sku: "P12C2D0",
              brand: "",
              description: "P12C2D0",
              length: 25,
              width: 25,
              height: 37,
              dimUnit: "cm",
              unitsPerCarton: 1,
              weight: 4.03,
              keepUpright: true,
              maxStackLayers: null,
              maxStackWeight: null,
              fragile: false,
              canSupport: true,
              active: true,
            },
            {
              id: "p-p17c2d2",
              sku: "P17C2D2",
              brand: "",
              description: "P17C2D2",
              length: 26.5,
              width: 26.5,
              height: 39,
              dimUnit: "cm",
              unitsPerCarton: 1,
              weight: 4.85,
              keepUpright: true,
              maxStackLayers: null,
              maxStackWeight: null,
              fragile: false,
              canSupport: true,
              active: true,
            },
            {
              id: "p-p24c2d2",
              sku: "P24C2D2",
              brand: "",
              description: "P24C2D2",
              length: 30,
              width: 30,
              height: 47,
              dimUnit: "cm",
              unitsPerCarton: 1,
              weight: 5.75,
              keepUpright: true,
              maxStackLayers: null,
              maxStackWeight: null,
              fragile: false,
              canSupport: true,
              active: true,
            },
            {
              id: "p-carbon",
              sku: "Carbon Filters",
              brand: "",
              description: "Carbon filters (15 per carton)",
              length: 47,
              width: 37,
              height: 34,
              dimUnit: "cm",
              unitsPerCarton: 15,
              weight: 15,
              keepUpright: true,
              maxStackLayers: null,
              maxStackWeight: null,
              fragile: false,
              canSupport: true,
              active: true,
            },
            {
              id: "p-postreat",
              sku: "POSTreat",
              brand: "",
              description: "POSTreat (30 per carton)",
              length: 57,
              width: 57,
              height: 45,
              dimUnit: "cm",
              unitsPerCarton: 30,
              weight: 45,
              keepUpright: true,
              maxStackLayers: null,
              maxStackWeight: null,
              fragile: false,
              canSupport: true,
              active: true,
            },
            {
              id: "p-refill",
              sku: "Refill Media",
              brand: "",
              description: "Refill media (34 per carton)",
              length: 48,
              width: 39,
              height: 35,
              dimUnit: "cm",
              unitsPerCarton: 34,
              weight: 23,
              keepUpright: true,
              maxStackLayers: null,
              maxStackWeight: null,
              fragile: false,
              canSupport: true,
              active: true,
            },
          ],
          pallets: [
            {
              id: "pal-euro",
              name: "Europe Pallet (EUR / EPAL)",
              standard: "Europe – ISO 6780",
              length: 1200,
              width: 800,
              maxHeight: 1800,
              baseHeight: 0,
              tare: 0,
              maxGross: null,
              allowOverhang: false,
            },
            {
              id: "pal-industrial",
              name: "Industrial Pallet",
              standard: "UK / Europe – ISO 6780",
              length: 1200,
              width: 1000,
              maxHeight: 1800,
              baseHeight: 0,
              tare: 0,
              maxGross: null,
              allowOverhang: false,
            },
            {
              id: "pal-us",
              name: "US GMA Pallet (48 × 40 in)",
              standard: "North America – ISO 6780",
              length: 1219,
              width: 1016,
              maxHeight: 1800,
              baseHeight: 0,
              tare: 0,
              maxGross: null,
              allowOverhang: false,
            },
            {
              id: "pal-asia",
              name: "Asia Pallet 1100 × 1100",
              standard: "Asia – ISO 6780",
              length: 1100,
              width: 1100,
              maxHeight: 1800,
              baseHeight: 0,
              tare: 0,
              maxGross: null,
              allowOverhang: false,
            },
            {
              id: "pal-aus",
              name: "Australian Pallet 1165 × 1165",
              standard: "Australia – ISO 6780",
              length: 1165,
              width: 1165,
              maxHeight: 1800,
              baseHeight: 0,
              tare: 0,
              maxGross: null,
              allowOverhang: false,
            },
            {
              id: "pal-in-1210",
              name: "India Pallet 1200 × 1000",
              standard: "India – commonly used size (verify with customer)",
              length: 1200,
              width: 1000,
              maxHeight: 1800,
              baseHeight: 0,
              tare: 0,
              maxGross: null,
              allowOverhang: false,
            },
            {
              id: "pal-in-1208",
              name: "India Pallet 1200 × 800",
              standard: "India – commonly used size (verify with customer)",
              length: 1200,
              width: 800,
              maxHeight: 1800,
              baseHeight: 0,
              tare: 0,
              maxGross: null,
              allowOverhang: false,
            },
          ],
          containers: [
            {
              id: "c-20gp",
              name: "20' Standard (20GP)",
              length: 5898,
              width: 2352,
              height: 2393,
              doorWidth: 2340,
              doorHeight: 2280,
              maxPayload: 28200,
              topClearance: 0,
            },
            {
              id: "c-40gp",
              name: "40' Standard (40GP)",
              length: 12032,
              width: 2352,
              height: 2393,
              doorWidth: 2340,
              doorHeight: 2280,
              maxPayload: 26700,
              topClearance: 0,
            },
            {
              id: "c-40hc",
              name: "40' High Cube (40HC)",
              length: 12032,
              width: 2352,
              height: 2698,
              doorWidth: 2340,
              doorHeight: 2585,
              maxPayload: 26500,
              topClearance: 0,
            },
            {
              id: "c-45hc",
              name: "45' High Cube (45HC)",
              length: 13556,
              width: 2352,
              height: 2698,
              doorWidth: 2340,
              doorHeight: 2585,
              maxPayload: 27700,
              topClearance: 0,
            },
          ],
        };

        /* ============================== HELPERS ================================ */
        const r1 = (v) => Math.round(v * 10) / 10;
        const r2 = (v) => Math.round(v * 100) / 100;
        const r3 = (v) => Math.round(v * 1000) / 1000;
        const isNum = (v) =>
          v !== null && v !== undefined && v !== "" && isFinite(Number(v));
        const num = (v, d = 0) => (isNum(v) ? Number(v) : d);
        const optPos = (v) => (isNum(v) && Number(v) > 0 ? Number(v) : null);
        const fmt = (v, d = 0) =>
          isFinite(v)
            ? Number(v).toLocaleString("en-GB", {
                minimumFractionDigits: d,
                maximumFractionDigits: d,
              })
            : "–";
        const sumArr = (a) => a.reduce((s, v) => s + v, 0);

        /* ============================ PRODUCT DATA ============================= */
        function toMm(v, unit) {
          return unit === "mm" ? r3(Number(v)) : r3(Number(v) * 10);
        }

        function validateProductRecord(p) {
          const e = [];
          const name = (p && p.sku) || "(unnamed SKU)";
          if (!p)
            return [
              "A selected product no longer exists in the Product Master.",
            ];
          ["length", "width", "height"].forEach((k) => {
            if (!isNum(p[k])) e.push(`${name}: ${k} is missing.`);
            else if (Number(p[k]) <= 0)
              e.push(
                `${name}: ${k} must be greater than zero (entered ${p[k]}).`,
              );
          });
          if (!isNum(p.weight))
            e.push(`${name}: net weight per carton is missing.`);
          else if (Number(p.weight) <= 0)
            e.push(`${name}: net weight per carton must be greater than zero.`);
          if (!isNum(p.unitsPerCarton))
            e.push(`${name}: units per carton is missing.`);
          else if (
            Number(p.unitsPerCarton) < 1 ||
            !Number.isInteger(Number(p.unitsPerCarton))
          )
            e.push(
              `${name}: units per carton must be a whole number of at least 1.`,
            );
          if (
            isNum(p.maxStackLayers) &&
            (Number(p.maxStackLayers) < 1 ||
              !Number.isInteger(Number(p.maxStackLayers)))
          )
            e.push(
              `${name}: maximum stack layers must be a whole number of at least 1 (leave it blank for no limit).`,
            );
          return e;
        }

        function normaliseProduct(p) {
          return {
            id: p.id,
            sku: String(p.sku),
            brand: p.brand || "",
            description: p.description || "",
            l: toMm(p.length, p.dimUnit),
            w: toMm(p.width, p.dimUnit),
            h: toMm(p.height, p.dimUnit),
            units: Math.round(num(p.unitsPerCarton, 1)),
            weight: num(p.weight),
            keepUpright: p.keepUpright !== false,
            maxLayers: optPos(p.maxStackLayers)
              ? Math.floor(Number(p.maxStackLayers))
              : null,
            fragile: !!p.fragile,
            /* Conservative v1 rule: fragile cartons never carry other cartons. */
            canSupport: p.canSupport !== false && !p.fragile,
          };
        }

        /* ============================ UNIT GEOMETRY ============================ */
        function buildGeometry(unit, opts) {
          const errors = [];
          const kind = unit.kind === "container" ? "container" : "pallet";
          const L = num(unit.L),
            W = num(unit.W),
            maxHeight = num(unit.maxHeight);
          const baseHeight = Math.max(0, num(unit.baseHeight));
          const topClearance = Math.max(0, num(unit.topClearance));
          if (!(L > 0 && W > 0 && maxHeight > 0))
            errors.push(
              `Invalid ${kind} dimensions: length, width and maximum height must all be greater than zero.`,
            );
          const usableH = r3(maxHeight - baseHeight - topClearance);
          if (maxHeight > 0 && !(usableH > 0))
            errors.push(
              `The base height (${baseHeight} mm) leaves no usable product height below the ${maxHeight} mm maximum.`,
            );
          const c = Math.max(0, num(opts.clearance));
          const ov =
            kind === "pallet" && opts.allowOverhang
              ? Math.max(0, num(opts.overhangMm))
              : 0;
          const tare = kind === "pallet" ? Math.max(0, num(unit.tare)) : 0;
          const maxGross = optPos(unit.maxGross);
          const maxNet = maxGross ? maxGross - tare : Infinity;
          if (maxGross && maxNet <= 0)
            errors.push(
              `Maximum gross weight (${maxGross} kg) must be greater than the tare weight (${tare} kg).`,
            );
          return {
            kind,
            name: unit.name || (kind === "pallet" ? "Pallet" : "Container"),
            L,
            W,
            maxHeight,
            baseHeight,
            topClearance,
            usableH,
            c,
            ov,
            tare,
            maxGross,
            maxNet,
            doorHeight: optPos(unit.doorHeight),
            region: {
              x: -ov,
              y: -ov,
              l: r3(L + 2 * ov + c),
              w: r3(W + 2 * ov + c),
            },
            errors,
          };
        }

        function geomSummary(g) {
          return {
            kind: g.kind,
            name: g.name,
            L: g.L,
            W: g.W,
            maxHeight: g.maxHeight,
            baseHeight: g.baseHeight,
            topClearance: g.topClearance,
            usableH: g.usableH,
            ov: g.ov,
            c: g.c,
            tare: g.tare,
            maxGross: g.maxGross,
            maxNet: isFinite(g.maxNet) ? g.maxNet : null,
          };
        }

        /* A "stance" = which carton dimension is vertical, plus its footprint (a × b).
     Footprint rotation by 90° is handled inside the 2-D packers. */
        function buildItem(prod, idx, geom, policy) {
          const upright =
            policy === "upright"
              ? true
              : policy === "full"
                ? false
                : prod.keepUpright;
          const { l, w, h } = prod;
          const raw = [{ h, a: l, b: w, vertical: "H" }];
          if (!upright)
            raw.push(
              { h: w, a: l, b: h, vertical: "W" },
              { h: l, a: w, b: h, vertical: "L" },
            );
          const seen = new Set(),
            all = [];
          for (const s of raw) {
            const k = `${s.h}|${Math.max(s.a, s.b)}|${Math.min(s.a, s.b)}`;
            if (!seen.has(k)) {
              seen.add(k);
              all.push(s);
            }
          }
          const RL = geom.L + 2 * geom.ov,
            RW = geom.W + 2 * geom.ov;
          const footOk = (s) =>
            (s.a <= RL + EPS && s.b <= RW + EPS) ||
            (s.b <= RL + EPS && s.a <= RW + EPS);
          const stances = all.filter(
            (s) => footOk(s) && s.h <= geom.usableH + EPS,
          );
          let problem = null;
          if (!stances.length) {
            if (!all.some(footOk))
              problem = `Carton larger than ${geom.kind}: ${prod.sku} (${l} × ${w} × ${h} mm) does not fit the ${geom.L} × ${geom.W} mm footprint${geom.ov ? ` (+${geom.ov} mm overhang)` : ""} in any permitted orientation.`;
            else
              problem = `Carton taller than ${geom.kind}: ${prod.sku} is ${Math.min(...all.filter(footOk).map((s) => s.h))} mm high in its lowest permitted orientation, but the usable height is ${geom.usableH} mm.`;
          }
          if (!problem && prod.weight > geom.maxNet + EPS)
            problem = `Maximum weight lower than one carton: ${prod.sku} weighs ${prod.weight} kg, but only ${r2(geom.maxNet)} kg net is allowed (max gross ${geom.maxGross} kg − tare ${geom.tare} kg).`;
          return {
            idx,
            id: prod.id,
            sku: prod.sku,
            prod,
            l,
            w,
            h,
            weight: prod.weight,
            units: prod.units,
            vol: l * w * h,
            upright,
            allStances: all,
            stances,
            maxLayers: prod.maxLayers || Infinity,
            supports: prod.canSupport,
            problem,
          };
        }

        function itemSummary(it) {
          return {
            idx: it.idx,
            id: it.id,
            sku: it.sku,
            l: it.l,
            w: it.w,
            h: it.h,
            weight: it.weight,
            units: it.units,
            upright: it.upright,
          };
        }

        function stanceLabel(s) {
          const how =
            s.vertical === "H"
              ? "upright"
              : s.vertical === "W"
                ? "on its side (width vertical)"
                : "on its end (length vertical)";
          return `${s.a} × ${s.b} mm footprint, ${s.h} mm high – ${how}`;
        }

        function orientationCode(it, l, w, h) {
          const dims = [
            ["L", it.l],
            ["W", it.w],
            ["H", it.h],
          ];
          const used = [false, false, false];
          const take = (v, order) => {
            for (const k of order)
              if (!used[k] && Math.abs(dims[k][1] - v) < 1e-3) {
                used[k] = true;
                return dims[k][0];
              }
            return "?";
          };
          const z = take(h, [2, 1, 0]),
            x = take(l, [0, 1, 2]),
            y = take(w, [0, 1, 2]);
          const desc =
            z === "H"
              ? x === "L"
                ? "Upright"
                : "Upright, rotated 90°"
              : "On side";
          return { code: `${x}×${y}×${z}`, desc };
        }

        /* ===================== PACKING ENGINE — 2-D PATTERNS ===================
     Recursive guillotine dynamic programme over "normal" coordinates
     (all combinations i·a + j·b). It evaluates the uniform grid in both
     rotations, mixed-orientation row/column blocks and remaining strips, so a
     mixed-row arrangement is chosen whenever it holds more cartons. */
        function normalValues(limit, a, b, cap) {
          const set = new Set();
          const na = Math.floor(limit / a + EPS);
          for (let i = 0; i <= na; i++) {
            const base = i * a;
            const nb = Math.floor((limit - base) / b + EPS);
            for (let j = 0; j <= nb; j++) {
              set.add(r3(base + j * b));
              if (set.size > cap) return null;
            }
          }
          return Array.from(set).sort((x, y) => x - y);
        }

        function createPatternSolver(a, b, Lmax, Wmax) {
          const xs = normalValues(Lmax, a, b, CONFIG.MAX_NORMAL_VALUES);
          const ys = normalValues(Wmax, a, b, CONFIG.MAX_NORMAL_VALUES);
          const useDP = !!(xs && ys && xs.length * ys.length <= 40000);
          const memo = new Map(),
            hmemo = new Map();
          const fl = (v) => Math.floor(v + EPS);
          const idxFloor = (vals, v) => {
            let lo = 0,
              hi = vals.length - 1,
              ans = 0;
            while (lo <= hi) {
              const mid = (lo + hi) >> 1;
              if (vals[mid] <= v + EPS) {
                ans = mid;
                lo = mid + 1;
              } else hi = mid - 1;
            }
            return ans;
          };
          const grid = (X, Y, p, q, ox, oy, out) => {
            const nx = fl(X / p),
              ny = fl(Y / q);
            if (out)
              for (let i = 0; i < nx; i++)
                for (let j = 0; j < ny; j++)
                  out.push({
                    x: r3(ox + i * p),
                    y: r3(oy + j * q),
                    l: p,
                    w: q,
                  });
            return nx * ny;
          };
          function G(i, j) {
            const key = i * 100000 + j;
            const hit = memo.get(key);
            if (hit) return hit;
            const X = xs[i],
              Y = ys[j];
            const g1 = grid(X, Y, a, b),
              g2 = grid(X, Y, b, a);
            let best =
              g1 >= g2
                ? { n: g1, t: "g", p: a, q: b }
                : { n: g2, t: "g", p: b, q: a };
            const ub = fl((X * Y) / (a * b));
            if (best.n < ub) {
              for (let k = 1; k < xs.length && xs[k] <= X / 2 + EPS; k++) {
                const rest = idxFloor(xs, X - xs[k]);
                const n = G(k, j).n + G(rest, j).n;
                if (n > best.n) {
                  best = { n, t: "v", k, rest };
                  if (n >= ub) break;
                }
              }
            }
            if (best.n < ub) {
              for (let k = 1; k < ys.length && ys[k] <= Y / 2 + EPS; k++) {
                const rest = idxFloor(ys, Y - ys[k]);
                const n = G(i, k).n + G(i, rest).n;
                if (n > best.n) {
                  best = { n, t: "h", k, rest };
                  if (n >= ub) break;
                }
              }
            }
            memo.set(key, best);
            return best;
          }
          function buildDP(i, j, ox, oy, out) {
            const m = G(i, j);
            if (m.t === "g") grid(xs[i], ys[j], m.p, m.q, ox, oy, out);
            else if (m.t === "v") {
              buildDP(m.k, j, ox, oy, out);
              buildDP(m.rest, j, ox + xs[m.k], oy, out);
            } else {
              buildDP(i, m.k, ox, oy, out);
              buildDP(i, m.rest, ox, oy + ys[m.k], out);
            }
          }
          function heuristicPlan(X, Y) {
            const key = X + "|" + Y;
            const hit = hmemo.get(key);
            if (hit) return hit;
            let best = { n: grid(X, Y, a, b), plan: ["g", a, b] };
            const t = grid(X, Y, b, a);
            if (t > best.n) best = { n: t, plan: ["g", b, a] };
            for (const [p, q] of [
              [a, b],
              [b, a],
            ]) {
              const nq = fl(Y / q);
              for (let k = 1; k * p <= X + EPS; k++) {
                const rest = X - k * p,
                  c1 = grid(rest, Y, a, b),
                  c2 = grid(rest, Y, b, a);
                const n = k * nq + Math.max(c1, c2);
                if (n > best.n)
                  best = {
                    n,
                    plan: ["x", k, p, q, c1 >= c2 ? [a, b] : [b, a]],
                  };
              }
              const np = fl(X / p);
              for (let k = 1; k * q <= Y + EPS; k++) {
                const rest = Y - k * q,
                  c1 = grid(X, rest, a, b),
                  c2 = grid(X, rest, b, a);
                const n = np * k + Math.max(c1, c2);
                if (n > best.n)
                  best = {
                    n,
                    plan: ["y", k, p, q, c1 >= c2 ? [a, b] : [b, a]],
                  };
              }
            }
            hmemo.set(key, best);
            return best;
          }
          function heuristicRects(X, Y) {
            const { plan } = heuristicPlan(X, Y),
              out = [];
            if (plan[0] === "g") grid(X, Y, plan[1], plan[2], 0, 0, out);
            else if (plan[0] === "x") {
              const [, k, p, q, [ra, rb]] = plan;
              grid(k * p, Y, p, q, 0, 0, out);
              grid(X - k * p, Y, ra, rb, k * p, 0, out);
            } else {
              const [, k, p, q, [ra, rb]] = plan;
              grid(X, k * q, p, q, 0, 0, out);
              grid(X, Y - k * q, ra, rb, 0, k * q, out);
            }
            return out;
          }
          const tooSmall = (X, Y) =>
            !((X >= a - EPS && Y >= b - EPS) || (X >= b - EPS && Y >= a - EPS));
          return {
            count(X, Y) {
              if (tooSmall(X, Y)) return 0;
              return useDP
                ? G(idxFloor(xs, X), idxFloor(ys, Y)).n
                : heuristicPlan(X, Y).n;
            },
            rects(X, Y) {
              if (tooSmall(X, Y)) return [];
              if (!useDP) return heuristicRects(X, Y);
              const out = [];
              buildDP(idxFloor(xs, X), idxFloor(ys, Y), 0, 0, out);
              return out;
            },
            method: useDP ? "guillotine-dp" : "strip-heuristic",
          };
        }

        function getSolver(ctx, a, b) {
          const key = a + "|" + b;
          let s = ctx.solvers.get(key);
          if (!s) {
            s = createPatternSolver(a, b, ctx.region.l, ctx.region.w);
            ctx.solvers.set(key, s);
          }
          return s;
        }

        /* ================ PACKING ENGINE — FREE SPACE (MaxRects) ===============
     Maintains the maximal free rectangles of one layer floor. Unsupported
     areas are pre-occupied as obstacles so cartons only land on support. */
        function rectsOverlap(p, f) {
          return (
            p.x < f.x + f.l - EPS &&
            f.x < p.x + p.l - EPS &&
            p.y < f.y + f.w - EPS &&
            f.y < p.y + p.w - EPS
          );
        }
        function rectContains(o, i) {
          return (
            i.x >= o.x - EPS &&
            i.y >= o.y - EPS &&
            i.x + i.l <= o.x + o.l + EPS &&
            i.y + i.w <= o.y + o.w + EPS
          );
        }
        class FreeSpace {
          constructor(rects) {
            this.free = rects.map((r) => ({ x: r.x, y: r.y, l: r.l, w: r.w }));
          }
          clone() {
            const f = new FreeSpace([]);
            f.free = this.free.map((r) => ({ x: r.x, y: r.y, l: r.l, w: r.w }));
            return f;
          }
          occupy(p) {
            const keep = [],
              added = [];
            for (const f of this.free) {
              if (!rectsOverlap(p, f)) {
                keep.push(f);
                continue;
              }
              if (p.x > f.x + EPS)
                added.push({ x: f.x, y: f.y, l: p.x - f.x, w: f.w });
              if (p.x + p.l < f.x + f.l - EPS)
                added.push({
                  x: p.x + p.l,
                  y: f.y,
                  l: f.x + f.l - p.x - p.l,
                  w: f.w,
                });
              if (p.y > f.y + EPS)
                added.push({ x: f.x, y: f.y, l: f.l, w: p.y - f.y });
              if (p.y + p.w < f.y + f.w - EPS)
                added.push({
                  x: f.x,
                  y: p.y + p.w,
                  l: f.l,
                  w: f.y + f.w - p.y - p.w,
                });
            }
            for (let i = 0; i < added.length; i++) {
              const a = added[i];
              let dead = false;
              for (const r of keep)
                if (rectContains(r, a)) {
                  dead = true;
                  break;
                }
              if (!dead)
                for (let j = 0; j < added.length; j++) {
                  if (
                    i !== j &&
                    rectContains(added[j], a) &&
                    (!rectContains(a, added[j]) || j < i)
                  ) {
                    dead = true;
                    break;
                  }
                }
              if (!dead) keep.push(a);
            }
            this.free = keep;
          }
          find(l, w, heur) {
            let best = null,
              s1 = Infinity,
              s2 = Infinity;
            const orients =
              Math.abs(l - w) > EPS
                ? [
                    [l, w],
                    [w, l],
                  ]
                : [[l, w]];
            for (const f of this.free)
              for (const [pl, pw] of orients) {
                if (pl > f.l + EPS || pw > f.w + EPS) continue;
                let a, b;
                if (heur === "BSSF") {
                  const dx = f.l - pl,
                    dy = f.w - pw;
                  a = Math.min(dx, dy);
                  b = Math.max(dx, dy);
                } else {
                  a = f.y;
                  b = f.x;
                }
                if (a < s1 - EPS || (Math.abs(a - s1) <= EPS && b < s2 - EPS)) {
                  s1 = a;
                  s2 = b;
                  best = { x: f.x, y: f.y, l: pl, w: pw };
                }
              }
            return best;
          }
        }

        function freeSpaceFromSupport(region, support) {
          if (support.length === 1 && rectContains(support[0], region))
            return new FreeSpace([region]);
          const xsSet = new Set([r3(region.x), r3(region.x + region.l)]),
            ysSet = new Set([r3(region.y), r3(region.y + region.w)]);
          for (const s of support) {
            xsSet.add(r3(s.x));
            xsSet.add(r3(s.x + s.l));
            ysSet.add(r3(s.y));
            ysSet.add(r3(s.y + s.w));
          }
          const xs = [...xsSet].sort((p, q) => p - q),
            ys = [...ysSet].sort((p, q) => p - q);
          const fs = new FreeSpace([region]);
          for (let j = 0; j < ys.length - 1; j++) {
            let start = -1;
            const cy = (ys[j] + ys[j + 1]) / 2;
            for (let i = 0; i <= xs.length - 1; i++) {
              let covered = true;
              if (i < xs.length - 1) {
                const cx = (xs[i] + xs[i + 1]) / 2;
                covered = support.some(
                  (s) =>
                    cx > s.x && cx < s.x + s.l && cy > s.y && cy < s.y + s.w,
                );
              }
              if (!covered && start < 0) start = i;
              if (covered && start >= 0) {
                fs.occupy({
                  x: xs[start],
                  y: ys[j],
                  l: xs[i] - xs[start],
                  w: ys[j + 1] - ys[j],
                });
                start = -1;
              }
            }
          }
          return fs;
        }

        /* Fill free space with one carton stance: repeatedly place the best 2-D
     pattern into the free rectangle that holds the most cartons. */
        function fillPattern(ctx, fs, a, b, maxN) {
          const solver = getSolver(ctx, a, b);
          const out = [];
          let guard = 0;
          while (out.length < maxN && guard++ < 400) {
            let bestF = null,
              bestN = 0;
            for (const f of fs.free) {
              const n = solver.count(f.l, f.w);
              if (
                n > bestN ||
                (n === bestN && n > 0 && f.l * f.w > bestF.l * bestF.w)
              ) {
                bestN = n;
                bestF = f;
              }
            }
            if (!bestF) break;
            let rects = solver
              .rects(bestF.l, bestF.w)
              .map((r) => ({
                x: r3(r.x + bestF.x),
                y: r3(r.y + bestF.y),
                l: r.l,
                w: r.w,
              }));
            const need = maxN - out.length;
            if (rects.length > need) {
              rects.sort((p, q) => p.x - q.x || p.y - q.y);
              rects = rects.slice(0, need);
            }
            for (const r of rects) {
              fs.occupy(r);
              out.push(r);
            }
          }
          return out;
        }

        function fillGreedy(fs, a, b, maxN, heur) {
          const out = [];
          while (out.length < maxN) {
            const p = fs.find(a, b, heur);
            if (!p) break;
            p.x = r3(p.x);
            p.y = r3(p.y);
            fs.occupy(p);
            out.push(p);
          }
          return out;
        }

        /* ================== PACKING ENGINE — LAYER CONSTRUCTION ================
     Conservative rectangular layers: a layer's height = its primary stance
     height; secondary cartons may be equal or shorter. Only cartons whose top
     equals the layer top (and that may carry load) support the next layer. */
        const STRATEGIES = [
          {
            name: "Dense layers",
            flatOnly: false,
            score: (L, n) =>
              L.density + 0.02 * (n.maxFlat ? L.flatArea / n.maxFlat : 0),
          },
          {
            name: "Heavy at bottom",
            flatOnly: false,
            score: (L, n) =>
              0.6 * L.density +
              0.4 * (n.maxWeight ? L.weight / n.maxWeight : 0),
          },
          { name: "Flat layers", flatOnly: true, score: (L) => L.density },
          {
            name: "Tallest first",
            flatOnly: false,
            score: (L, n) => 0.5 * L.density + (0.5 * L.height) / n.maxHeight,
          },
          {
            name: "Largest footprint first",
            flatOnly: true,
            score: (L, n) =>
              0.6 * L.density + (0.4 * L.primaryFoot) / n.maxFoot,
          },
        ];

        function buildLayer(ctx, st, pIdx, stance, strat, baseFs) {
          const g = ctx.geom,
            c = g.c;
          const layerH = stance.h;
          if (st.z + layerH > g.usableH + EPS) return null;
          const rem = st.remaining.slice();
          const a = r3(stance.a + c),
            b = r3(stance.b + c);
          const fsA = baseFs.clone(),
            ra = fillPattern(ctx, fsA, a, b, rem[pIdx]);
          const fsB = baseFs.clone(),
            rb = fillGreedy(fsB, a, b, rem[pIdx], "BL");
          const useB = rb.length > ra.length;
          const fs = useB ? fsB : fsA,
            rp = useB ? rb : ra;
          if (!rp.length) return null;
          const cartons = rp.map((r) => ({
            itemIdx: pIdx,
            rect: r,
            h: stance.h,
          }));
          rem[pIdx] -= rp.length;
          const cands = [];
          for (const it of ctx.items) {
            if (rem[it.idx] <= 0) continue;
            if (it.idx !== pIdx && st.layersUsed[it.idx] >= it.maxLayers)
              continue;
            for (const s of it.stances) {
              if (s.h > layerH + EPS) continue;
              const flat = Math.abs(s.h - layerH) <= EPS;
              if (strat.flatOnly && !flat) continue;
              if (it.idx === pIdx && s === stance) continue;
              cands.push({ it, s, flat });
            }
          }
          cands.sort(
            (p, q) =>
              q.flat - p.flat ||
              q.s.a * q.s.b - p.s.a * p.s.b ||
              q.it.weight - p.it.weight ||
              p.it.idx - q.it.idx,
          );
          for (const cd of cands) {
            const n = rem[cd.it.idx];
            if (n <= 0) continue;
            if (!fs.free.length) break;
            const A = r3(cd.s.a + c),
              B = r3(cd.s.b + c);
            if (
              !fs.free.some(
                (f) =>
                  (A <= f.l + EPS && B <= f.w + EPS) ||
                  (B <= f.l + EPS && A <= f.w + EPS),
              )
            )
              continue;
            const rs = fillPattern(ctx, fs, A, B, n);
            for (const r of rs)
              cartons.push({ itemIdx: cd.it.idx, rect: r, h: cd.s.h });
            rem[cd.it.idx] -= rs.length;
          }
          /* With clearance > 0 the clearance strip next to a lower carton is air: an upper carton may not
       straddle it. Keep only cartons whose real footprint lies fully on real carton tops. */
          if (c > 0 && st.supportActual) {
            const kept = cartons.filter((cd) => {
              const A = {
                x: cd.rect.x,
                y: cd.rect.y,
                l: cd.rect.l - c,
                w: cd.rect.w - c,
              };
              let cov = 0;
              for (const q of st.supportActual) {
                const ix = Math.min(A.x + A.l, q.x + q.l) - Math.max(A.x, q.x),
                  iy = Math.min(A.y + A.w, q.y + q.w) - Math.max(A.y, q.y);
                if (ix > 0 && iy > 0) cov += ix * iy;
              }
              if (cov >= A.l * A.w - 1) return true;
              rem[cd.itemIdx]++;
              return false;
            });
            if (!kept.length) return null;
            cartons.length = 0;
            kept.forEach((cd) => cartons.push(cd));
          }
          let vol = 0,
            weight = 0,
            flatArea = 0;
          for (const cd of cartons) {
            const it = ctx.items[cd.itemIdx];
            vol += cd.rect.l * cd.rect.w * cd.h;
            weight += it.weight;
            if (it.supports && Math.abs(cd.h - layerH) <= EPS)
              flatArea += cd.rect.l * cd.rect.w;
          }
          return {
            cartons,
            height: layerH,
            rem,
            vol,
            weight,
            flatArea,
            density: vol / (st.supportArea * layerH),
            primaryFoot: stance.a * stance.b,
            count: cartons.length,
          };
        }

        function supportFrom(ctx, layer) {
          return layer.cartons
            .filter(
              (cd) =>
                ctx.items[cd.itemIdx].supports &&
                Math.abs(cd.h - layer.height) <= EPS,
            )
            .map((cd) => cd.rect);
        }

        function runStrategy(ctx, counts, strat) {
          const R = ctx.region;
          const cl = ctx.geom.c;
          const st = {
            remaining: counts.slice(),
            z: 0,
            support: [{ x: R.x, y: R.y, l: R.l, w: R.w }],
            supportActual: null,
            supportArea: R.l * R.w,
            layersUsed: counts.map(() => 0),
          };
          const layers = [];
          while (st.remaining.some((v) => v > 0)) {
            if (layers.length >= CONFIG.MAX_LAYERS || !st.support.length)
              return { ok: false, reason: "SPACE" };
            const baseFs = freeSpaceFromSupport(R, st.support);
            const cands = [];
            /* With many SKUs only the most promising ones are tried as the layer base: the largest remaining
         volumes plus the tallest cartons (keeps big mixed shipments fast; results stay fully valid). */
            let primaries = ctx.items.filter(
              (it) =>
                st.remaining[it.idx] > 0 &&
                st.layersUsed[it.idx] < it.maxLayers,
            );
            if (primaries.length > CONFIG.MAX_LAYER_BASES) {
              const byVol = primaries
                .slice()
                .sort(
                  (p, q) =>
                    st.remaining[q.idx] * q.vol - st.remaining[p.idx] * p.vol ||
                    p.idx - q.idx,
                );
              const byH = primaries
                .slice()
                .sort(
                  (p, q) =>
                    Math.max(...q.stances.map((x) => x.h)) -
                      Math.max(...p.stances.map((x) => x.h)) || p.idx - q.idx,
                );
              const pick = new Set(
                byVol
                  .slice(0, CONFIG.MAX_LAYER_BASES - 2)
                  .concat(byH.slice(0, 2)),
              );
              primaries = primaries.filter((it) => pick.has(it));
            }
            for (const it of primaries) {
              for (const s of it.stances) {
                const L = buildLayer(ctx, st, it.idx, s, strat, baseFs);
                if (L) cands.push(L);
              }
            }
            if (!cands.length) return { ok: false, reason: "SPACE" };
            const norm = {
              maxWeight: Math.max(...cands.map((L) => L.weight)),
              maxHeight: Math.max(...cands.map((L) => L.height)),
              maxFoot: Math.max(...cands.map((L) => L.primaryFoot)),
              maxFlat: Math.max(...cands.map((L) => L.flatArea)),
            };
            let best = null,
              bestScore = -Infinity;
            for (const L of cands) {
              const s = strat.score(L, norm);
              if (s > bestScore + 1e-12) {
                bestScore = s;
                best = L;
              }
            }
            layers.push({
              z: r3(st.z),
              height: best.height,
              cartons: best.cartons,
            });
            st.remaining = best.rem;
            st.z = r3(st.z + best.height);
            new Set(best.cartons.map((cd) => cd.itemIdx)).forEach((i) => {
              st.layersUsed[i]++;
            });
            st.support = supportFrom(ctx, best);
            st.supportActual = st.support.map((r) => ({
              x: r.x,
              y: r.y,
              l: r3(r.l - cl),
              w: r3(r.w - cl),
            }));
            st.supportArea = st.support.reduce((s, r) => s + r.l * r.w, 0);
          }
          return { ok: true, layers, strategy: strat.name };
        }

        function flattenLayers(ctx, r) {
          const cartons = [];
          let height = 0,
            wz = 0,
            wsum = 0;
          r.layers.forEach((L, li) =>
            L.cartons.forEach((cd) => {
              cartons.push({
                itemIdx: cd.itemIdx,
                rect: cd.rect,
                z: r3(L.z),
                h: cd.h,
                layer: li + 1,
              });
              height = Math.max(height, L.z + cd.h);
              const w = ctx.items[cd.itemIdx].weight;
              wz += w * (L.z + cd.h / 2);
              wsum += w;
            }),
          );
          return {
            ok: true,
            cartons,
            meta: {
              method: "layers",
              strategy: `Full layers – ${r.strategy}`,
              height: r3(height),
              cog: wsum ? wz / wsum : 0,
              layerCount: r.layers.length,
            },
          };
        }

        /* ============== PACKING ENGINE — COLUMN BLOCKS (pallets & containers) ==
     Block stacking: the footprint is cut into strips (guillotine level 1) and
     every strip into blocks (level 2). A block is a floor pattern of column
     positions. It holds one SKU, or a "nested chain" of up to three SKUs where
     each upper carton fits inside the footprint of the carton below (e.g.
     P17 on P24, Carbon Filters on POSTreat), so every carton stands fully on
     the carton directly beneath it. Containers are loaded strip by strip from
     the closed end. A dynamic programme over SKU subsets finds the shortest
     total strip length. */
        const sortedFoot = (s) => [Math.max(s.a, s.b), Math.min(s.a, s.b)];
        const footFits = (inner, outer) => {
          const i = sortedFoot(inner),
            o = sortedFoot(outer);
          return i[0] <= o[0] + EPS && i[1] <= o[1] + EPS;
        };

        function getBlockModel(ctx) {
          if (ctx.blockModel) return ctx.blockModel;
          const g = ctx.geom,
            c = g.c,
            RL = ctx.region.l,
            RW = ctx.region.w;
          const lensFor = (limit, opts) => {
            const set = new Set();
            for (const o of opts) {
              const A = r3(o.s.a + c),
                B = r3(o.s.b + c);
              let nv = normalValues(limit, A, B, 4000);
              if (!nv) {
                nv = [];
                for (let v = A; v <= limit + EPS; v += A) nv.push(r3(v));
                for (let v = B; v <= limit + EPS; v += B) nv.push(r3(v));
              }
              nv.forEach((v) => {
                if (v > 0) set.add(v);
              });
            }
            return [...set].sort((p, q) => p - q);
          };
          const per = ctx.items.map((it) => {
            const maxL = it.supports ? it.maxLayers : 1;
            const opts = it.stances
              .map((s) => ({
                s,
                solver: getSolver(ctx, r3(s.a + c), r3(s.b + c)),
                tiers: Math.min(Math.floor(g.usableH / s.h + EPS), maxL),
              }))
              .filter((o) => o.tiers > 0);
            const memo = new Map();
            const cap = (X, Y) => {
              const k = X + "|" + Y;
              let v = memo.get(k);
              if (v === undefined) {
                v = 0;
                for (const o of opts)
                  v = Math.max(v, o.solver.count(X, Y) * o.tiers);
                memo.set(k, v);
              }
              return v;
            };
            return {
              opts,
              maxL,
              lensX: lensFor(RL, opts),
              lensY: lensFor(RW, opts),
              cap,
            };
          });
          const union = (key) =>
            [...new Set(per.flatMap((P) => P[key]))].sort((p, q) => p - q);
          ctx.blockModel = {
            per,
            RL,
            RW,
            allX: union("lensX"),
            allY: union("lensY"),
            chainMemo: new Map(),
            partMemo: new Map(),
            stripMemo: new Map(),
          };
          return ctx.blockModel;
        }

        /* Order SKUs into a nested chain (largest footprint at the bottom) or return null. */
        function makeChain(ctx, bm, ids) {
          const key = ids
            .slice()
            .sort((p, q) => p - q)
            .join(",");
          if (bm.chainMemo.has(key)) return bm.chainMemo.get(key);
          let chain = null;
          if (ids.length === 1) chain = { ids: ids.slice(), key };
          else {
            const baseOpts = (id) => bm.per[id].opts;
            const order = ids.slice().sort((p, q) => {
              const fa = sortedFoot(baseOpts(p)[0].s),
                fb = sortedFoot(baseOpts(q)[0].s);
              return (
                fb[0] * fb[1] - fa[0] * fa[1] ||
                ctx.items[q].weight - ctx.items[p].weight ||
                p - q
              );
            });
            if (
              order.every(
                (id) =>
                  (baseOpts(id).length && ctx.items[id].supports) ||
                  id === order[order.length - 1],
              )
            ) {
              const links = [{ i: order[0], opt: baseOpts(order[0])[0] }];
              let ok = true;
              for (let k = 1; k < order.length && ok; k++) {
                const prev = links[k - 1].opt.s;
                const fit = baseOpts(order[k])
                  .filter((o) => footFits(o.s, prev))
                  .sort((p, q) => p.s.h - q.s.h)[0];
                if (!fit) ok = false;
                else links.push({ i: order[k], opt: fit });
              }
              if (ok) chain = { ids: order, links, key };
            }
          }
          bm.chainMemo.set(key, chain);
          return chain;
        }

        /* Fill column positions tier by tier: every SKU of the chain in turn, each carton on top of its column. */
        function simulateChain(ctx, bm, links, P, counts, emit) {
          const H = ctx.geom.usableH;
          const top = new Array(P).fill(0),
            cnt = new Array(P).fill(0),
            carry = new Array(P).fill(true);
          for (const link of links) {
            const it = ctx.items[link.i],
              maxL = bm.per[link.i].maxL,
              h = link.opt.s.h;
            const used = new Array(P).fill(0);
            let left = counts[link.i];
            while (left > 0) {
              let placed = 0;
              for (let c = 0; c < P && left > 0; c++) {
                if (!carry[c] || top[c] + h > H + EPS || used[c] >= maxL)
                  continue;
                if (emit) emit(c, top[c], link, cnt[c] + 1);
                top[c] = r3(top[c] + h);
                used[c]++;
                cnt[c]++;
                carry[c] = it.supports;
                left--;
                placed++;
              }
              if (!placed) return false;
            }
          }
          return true;
        }

        /* Same result as simulateChain(…, null) but on runs of identical columns instead of
     column by column: O(runs × tiers) instead of O(cartons). Verified equal by tests. */
        function chainFeasible(ctx, bm, links, P, counts) {
          const H = ctx.geom.usableH;
          let runs = [{ len: P, top: 0, carry: true }];
          for (const link of links) {
            const it = ctx.items[link.i],
              maxL = bm.per[link.i].maxL,
              h = link.opt.s.h;
            runs.forEach((r) => {
              r.used = 0;
            });
            let left = counts[link.i];
            while (left > 0) {
              const ok = (r) =>
                r.carry && r.top + h <= H + EPS && r.used < maxL;
              let eligible = 0;
              for (const r of runs) if (ok(r)) eligible += r.len;
              if (!eligible) return false;
              if (left >= eligible) {
                for (const r of runs)
                  if (ok(r)) {
                    r.top = r3(r.top + h);
                    r.used++;
                    r.carry = it.supports;
                  }
                left -= eligible;
              } else {
                const next = [];
                for (const r of runs) {
                  if (left > 0 && ok(r)) {
                    const take = Math.min(r.len, left);
                    next.push({
                      len: take,
                      top: r3(r.top + h),
                      carry: it.supports,
                      used: r.used + 1,
                    });
                    if (take < r.len)
                      next.push({
                        len: r.len - take,
                        top: r.top,
                        carry: r.carry,
                        used: r.used,
                      });
                    left -= take;
                  } else next.push(r);
                }
                runs = next;
              }
            }
          }
          return true;
        }

        function chainFits(ctx, bm, chain, X, Y, counts) {
          if (chain.ids.length === 1) {
            const i = chain.ids[0];
            return bm.per[i].cap(X, Y) >= counts[i];
          }
          const P = chain.links[0].opt.solver.count(X, Y);
          return P > 0 && chainFeasible(ctx, bm, chain.links, P, counts);
        }

        /* Smallest block size across the strip that holds the chain, for a given strip length. */
        function chainSide(ctx, bm, chain, axis, len, counts) {
          /* Numeric memo key for single-SKU blocks (the hot path), string key for nested chains. */
          const memo =
            chain[axis === "x" ? "_mx" : "_my"] ||
            (chain[axis === "x" ? "_mx" : "_my"] = new Map());
          const key =
            chain.ids.length === 1
              ? Math.round(len * 1000) * 1e6 + counts[chain.ids[0]]
              : `${len}|${chain.ids.map((i) => counts[i]).join(",")}`;
          const hit = memo.get(key);
          if (hit !== undefined) return hit;
          const base = chain.ids.length === 1 ? chain.ids[0] : chain.links[0].i;
          const lens = axis === "x" ? bm.per[base].lensY : bm.per[base].lensX;
          const fits = (side) =>
            axis === "x"
              ? chainFits(ctx, bm, chain, len, side, counts)
              : chainFits(ctx, bm, chain, side, len, counts);
          let res = null;
          if (lens.length && fits(lens[lens.length - 1])) {
            let lo = 0,
              hi = lens.length - 1;
            while (lo < hi) {
              const mid = (lo + hi) >> 1;
              if (fits(lens[mid])) hi = mid;
              else lo = mid + 1;
            }
            res = lens[lo];
          }
          memo.set(key, res);
          return res;
        }

        /* All ways to group a strip's SKUs into nested chains (singles always allowed). */
        function chainPartitions(ctx, bm, T, allowChains) {
          const key = T.join(",") + "|" + allowChains;
          if (bm.partMemo.has(key)) return bm.partMemo.get(key);
          const out = [];
          const rec = (idx, groups) => {
            if (idx === T.length) {
              const chains = groups.map((gr) => makeChain(ctx, bm, gr));
              if (chains.every(Boolean)) out.push(chains);
              return;
            }
            if (allowChains)
              groups.forEach((gr, k) => {
                if (gr.length < 3) {
                  groups[k] = gr.concat(T[idx]);
                  rec(idx + 1, groups);
                  groups[k] = gr;
                }
              });
            groups.push([T[idx]]);
            rec(idx + 1, groups);
            groups.pop();
          };
          rec(0, []);
          bm.partMemo.set(key, out);
          return out;
        }

        function stripLength(ctx, bm, T, axis, counts, allowChains) {
          /* The search changes one SKU at a time, so most strips recur with identical counts. */
          const mkey = `${axis}|${allowChains ? 1 : 0}|${T.map((i) => i + ":" + counts[i]).join(",")}`;
          if (bm.stripMemo.has(mkey)) return bm.stripMemo.get(mkey);
          if (bm.stripMemo.size > 200000) bm.stripMemo.clear();
          const cross = axis === "x" ? bm.RW : bm.RL,
            cand = axis === "x" ? bm.allX : bm.allY;
          let best = null;
          for (const part of chainPartitions(
            ctx,
            bm,
            T,
            allowChains && T.length <= 3,
          )) {
            const ok = (len) => {
              let s = 0;
              for (const ch of part) {
                const d = chainSide(ctx, bm, ch, axis, len, counts);
                if (d === null) return false;
                s += d;
                if (s > cross + EPS) return false;
              }
              return true;
            };
            if (!cand.length || !ok(cand[cand.length - 1])) continue;
            let lo = 0,
              hi = cand.length - 1;
            if (best) {
              while (hi > 0 && cand[hi] >= best.len - EPS) hi--;
              if (!ok(cand[hi])) continue;
            }
            while (lo < hi) {
              const mid = (lo + hi) >> 1;
              if (ok(cand[mid])) hi = mid;
              else lo = mid + 1;
            }
            if (!best || cand[lo] < best.len - EPS)
              best = { len: cand[lo], part };
          }
          bm.stripMemo.set(mkey, best);
          return best;
        }

        function blockPack(ctx, counts, axes) {
          const bm = getBlockModel(ctx);
          const act = counts
            .map((n, i) => (n > 0 ? i : -1))
            .filter((i) => i >= 0);
          const k = act.length;
          if (!k) return { ok: true, cartons: [], meta: { height: 0, cog: 0 } };
          const loadOf = (st) =>
            st.part.reduce(
              (s2, ch) =>
                s2 +
                ch.ids.reduce((a, i) => a + counts[i] * ctx.items[i].weight, 0),
              0,
            );
          let plan = null,
            stripList = null;
          if (k > 10) {
            /* Too many SKUs for the subset search: every SKU gets its own strip (valid, slightly less dense). */
            for (const axis of axes) {
              const limit = axis === "x" ? bm.RL : bm.RW;
              const sl = act.map((i) =>
                stripLength(ctx, bm, [i], axis, counts, false),
              );
              if (sl.some((x) => !x)) continue;
              const used = sl.reduce((s2, x) => s2 + x.len, 0);
              if (
                used <= limit + EPS &&
                (!plan || used / limit < plan.used / plan.limit)
              )
                plan = { axis, used, limit, list: sl };
            }
            if (!plan) return { ok: false, reason: "SPACE" };
            stripList = plan.list.slice().sort((p, q) => loadOf(q) - loadOf(p));
          }
          const allowChains = k <= 7;
          const full = k > 10 ? 0 : (1 << k) - 1;
          if (!stripList)
            for (const axis of axes) {
              const limit = axis === "x" ? bm.RL : bm.RW;
              const sl = new Array(full + 1).fill(null);
              for (let m = 1; m <= full; m++) {
                const T = [];
                for (let b = 0; b < k; b++) if (m & (1 << b)) T.push(act[b]);
                sl[m] = stripLength(ctx, bm, T, axis, counts, allowChains);
              }
              const best = new Array(full + 1).fill(Infinity),
                choice = new Array(full + 1).fill(0);
              best[0] = 0;
              for (let m = 1; m <= full; m++) {
                const low = m & -m;
                for (let t = m; t; t = (t - 1) & m) {
                  if (!(t & low) || !sl[t]) continue;
                  const v = sl[t].len + best[m ^ t];
                  if (v < best[m] - EPS) {
                    best[m] = v;
                    choice[m] = t;
                  }
                }
              }
              if (
                best[full] <= limit + EPS &&
                (!plan || best[full] / limit < plan.used / plan.limit)
              )
                plan = {
                  axis,
                  used: best[full],
                  limit,
                  choice: choice.slice(),
                  sl,
                };
            }
          if (!plan) return { ok: false, reason: "SPACE" };
          const { axis } = plan,
            R = ctx.region,
            c = ctx.geom.c;
          if (!stripList) {
            const strips = [];
            for (let m = full; m; m ^= plan.choice[m])
              strips.push(plan.choice[m]);
            stripList = strips
              .map((t) => plan.sl[t])
              .sort((p, q) => loadOf(q) - loadOf(p));
          }
          const cartons = [],
            blocks = [];
          let along = 0,
            height = 0,
            wz = 0,
            wsum = 0;
          for (const { len, part } of stripList) {
            const chains = part
              .slice()
              .sort(
                (p, q) =>
                  q.ids.reduce(
                    (s, i) => s + counts[i] * ctx.items[i].weight,
                    0,
                  ) -
                  p.ids.reduce(
                    (s, i) => s + counts[i] * ctx.items[i].weight,
                    0,
                  ),
              );
            let across = 0;
            for (const ch of chains) {
              const side = chainSide(ctx, bm, ch, axis, len, counts);
              const X = axis === "x" ? len : side,
                Y = axis === "x" ? side : len;
              const ox = R.x + (axis === "x" ? along : across),
                oy = R.y + (axis === "x" ? across : along);
              let links, rects;
              if (ch.ids.length === 1) {
                const i = ch.ids[0];
                let pick = null;
                for (const o of bm.per[i].opts) {
                  const perTier = o.solver.count(X, Y);
                  if (!perTier || perTier * o.tiers < counts[i]) continue;
                  const h = Math.ceil(counts[i] / perTier) * o.s.h;
                  if (
                    !pick ||
                    h < pick.h - EPS ||
                    (Math.abs(h - pick.h) <= EPS && perTier > pick.perTier)
                  )
                    pick = { o, perTier, h };
                }
                links = [{ i, opt: pick.o }];
              } else links = ch.links;
              rects = links[0].opt.solver
                .rects(X, Y)
                .sort((p, q) => p.x - q.x || p.y - q.y);
              simulateChain(
                ctx,
                bm,
                links,
                rects.length,
                counts,
                (col, z, link, tier) => {
                  const r = rects[col],
                    s = link.opt.s,
                    it = ctx.items[link.i];
                  /* Align every carton of a column long-side to long-side with the base position: because each
             upper footprint fits inside the one below (sorted dimensions), centring keeps it fully supported. */
                  const lg = r3(Math.max(s.a, s.b) + c),
                    sh = r3(Math.min(s.a, s.b) + c);
                  const l = r.l >= r.w ? lg : sh,
                    w = r.l >= r.w ? sh : lg;
                  const x = r3(ox + r.x + (r.l - l) / 2),
                    y = r3(oy + r.y + (r.w - w) / 2);
                  cartons.push({
                    itemIdx: link.i,
                    rect: { x, y, l, w },
                    z: r3(z),
                    h: s.h,
                    layer: tier,
                  });
                  height = Math.max(height, z + s.h);
                  wz += it.weight * (z + s.h / 2);
                  wsum += it.weight;
                },
              );
              blocks.push({
                sku: links.map((L) => ctx.items[L.i].sku).join(" + "),
                productId: ctx.items[links[0].i].id,
                x: r3(ox),
                y: r3(oy),
                l: r3(X - c),
                w: r3(Y - c),
                positions: rects.length,
                cartons: links
                  .map((L) => `${ctx.items[L.i].sku} × ${counts[L.i]}`)
                  .join(", "),
                stance: links.map((L) => stanceLabel(L.opt.s)).join(" / "),
                nested: links.length > 1,
              });
              across += side;
            }
            along += len;
          }
          return {
            ok: true,
            cartons,
            meta: {
              method: "blocks",
              strategy: `Column blocks (${axis === "x" ? "strips across the length" : "strips across the width"})`,
              blocks,
              freeLength: r3(plan.limit - plan.used),
              axis,
              height: r3(height),
              cog: wsum ? wz / wsum : 0,
            },
          };
        }

        /* =========================== PACKING FRONT DOOR ========================
     "Can these specific cartons physically be placed?"  */
        function weightOf(ctx, n) {
          let s = 0;
          for (let i = 0; i < n.length; i++) s += n[i] * ctx.items[i].weight;
          return s;
        }
        function volOf(ctx, n) {
          let s = 0;
          for (let i = 0; i < n.length; i++) s += n[i] * ctx.items[i].vol;
          return s;
        }

        function packCounts(ctx, counts, best) {
          const g = ctx.geom;
          if (weightOf(ctx, counts) > g.maxNet + 1e-9)
            return { ok: false, reason: "WEIGHT" };
          if (counts.every((v) => v <= 0))
            return { ok: true, cartons: [], meta: { height: 0, cog: 0 } };
          for (let i = 0; i < counts.length; i++)
            if (counts[i] > 0 && !ctx.items[i].stances.length)
              return { ok: false, reason: "SPACE" };
          if (
            volOf(ctx, counts) >
            (g.L + 2 * g.ov) * (g.W + 2 * g.ov) * g.usableH + 1e-6
          )
            return { ok: false, reason: "SPACE" };
          if (g.kind === "container") return blockPack(ctx, counts, ["x"]);
          /* Search: the fast block packer first, layered packer second.
       Final plan: realistic full layers are preferred; blocks are the fallback. */
          if (!best) {
            const b = blockPack(ctx, counts, ["x", "y"]);
            if (b.ok) return b;
          }
          const strategies = best
            ? STRATEGIES
            : STRATEGIES.slice(0, CONFIG.SEARCH_STRATEGIES);
          let winner = null;
          for (const s of strategies) {
            const r = runStrategy(ctx, counts, s);
            if (!r.ok) continue;
            const f = flattenLayers(ctx, r);
            if (!best) return f;
            if (
              !winner ||
              f.meta.height < winner.meta.height - EPS ||
              (Math.abs(f.meta.height - winner.meta.height) <= EPS &&
                f.meta.cog < winner.meta.cog - EPS)
            )
              winner = f;
          }
          if (winner) return winner;
          return best
            ? blockPack(ctx, counts, ["x", "y"])
            : { ok: false, reason: "SPACE" };
        }

        /* Uniform 2-D grid index over carton footprints: turns "which cartons are near this
     rectangle?" from a scan of every carton into a lookup of a few grid cells. */
        function makeGrid(list, cellHint) {
          let cell = cellHint;
          if (!cell) {
            let s = 0;
            list.forEach((q) => {
              s += Math.max(q.l, q.w);
            });
            cell = Math.max(50, list.length ? s / list.length : 500);
          }
          const map = new Map();
          const K = (i, j) => i * 131071 + j;
          for (const q of list) {
            const i0 = Math.floor(q.x / cell),
              i1 = Math.floor((q.x + q.l - 1e-6) / cell),
              j0 = Math.floor(q.y / cell),
              j1 = Math.floor((q.y + q.w - 1e-6) / cell);
            for (let i = i0; i <= i1; i++)
              for (let j = j0; j <= j1; j++) {
                const k = K(i, j);
                let b = map.get(k);
                if (!b) {
                  b = [];
                  map.set(k, b);
                }
                b.push(q);
              }
          }
          let stamp = 0;
          const seen = new Map();
          return {
            query(x, y, l, w) {
              stamp++;
              const out = [];
              const i0 = Math.floor(x / cell),
                i1 = Math.floor((x + l - 1e-6) / cell),
                j0 = Math.floor(y / cell),
                j1 = Math.floor((y + w - 1e-6) / cell);
              for (let i = i0; i <= i1; i++)
                for (let j = j0; j <= j1; j++) {
                  const b = map.get(K(i, j));
                  if (b)
                    for (const q of b) {
                      if (seen.get(q) !== stamp) {
                        seen.set(q, stamp);
                        out.push(q);
                      }
                    }
                }
              return out;
            },
          };
        }

        /* ========================= PLAN / KPI / VALIDATION ===================== */
        function buildPlan(ctx, packRes, counts) {
          const g = ctx.geom,
            c = g.c;
          const placements = packRes.cartons.map((cd) => {
            const it = ctx.items[cd.itemIdx];
            const l = r3(cd.rect.l - c),
              w = r3(cd.rect.w - c);
            const o = orientationCode(it, l, w, cd.h);
            return {
              itemIdx: cd.itemIdx,
              productId: it.id,
              sku: it.sku,
              layer: cd.layer,
              x: r3(cd.rect.x),
              y: r3(cd.rect.y),
              z: r3(cd.z),
              l,
              w,
              h: cd.h,
              weight: it.weight,
              units: it.units,
              orientation: o.code,
              orientationDesc: o.desc,
            };
          });
          placements.sort(
            (p, q) => p.layer - q.layer || p.y - q.y || p.x - q.x,
          );
          placements.forEach((p, i) => {
            p.id = i + 1;
          });
          const ls = summariseLayers(ctx, placements);
          return {
            geom: geomSummary(g),
            items: ctx.items.map(itemSummary),
            placements,
            layers: ls.layers,
            layerGroups: ls.groups,
            kpis: computeKpis(ctx, placements),
            validation: validatePlacement(ctx, placements, counts),
            meta: packRes.meta || {},
          };
        }

        function summariseLayers(ctx, placements) {
          const g = ctx.geom,
            map = new Map();
          for (const p of placements) {
            if (!map.has(p.layer)) map.set(p.layer, []);
            map.get(p.layer).push(p);
          }
          const layers = [...map.keys()]
            .sort((a, b) => a - b)
            .map((no) => {
              const ps = map.get(no);
              let z = Infinity,
                top = 0,
                area = 0,
                weight = 0,
                units = 0;
              const products = {};
              for (const p of ps) {
                z = Math.min(z, p.z);
                top = Math.max(top, p.z + p.h);
                area += p.l * p.w;
                weight += p.weight;
                units += p.units;
                products[p.sku] = (products[p.sku] || 0) + 1;
              }
              const sig = ps
                .map((p) => `${p.itemIdx}:${p.x}:${p.y}:${p.l}:${p.w}:${p.h}`)
                .sort()
                .join("|");
              return {
                no,
                z: r3(z),
                top: r3(top),
                height: r3(top - z),
                cartons: ps.length,
                weight: r2(weight),
                units,
                products,
                util: r1((100 * area) / (g.L * g.W)),
                sig,
              };
            });
          const groups = [];
          for (const L of layers) {
            const last = groups[groups.length - 1];
            if (last && last.sig === L.sig) last.to = L.no;
            else groups.push({ from: L.no, to: L.no, sig: L.sig });
          }
          layers.forEach((L) => {
            delete L.sig;
          });
          return {
            layers,
            groups: groups.map((gr) => ({ from: gr.from, to: gr.to })),
          };
        }

        function computeKpis(ctx, placements) {
          const g = ctx.geom;
          let units = 0,
            net = 0,
            vol = 0,
            stack = 0,
            baseArea = 0;
          for (const p of placements) {
            units += p.units;
            net += p.weight;
            vol += p.l * p.w * p.h;
            stack = Math.max(stack, p.z + p.h);
            if (p.z <= EPS) baseArea += p.l * p.w;
          }
          return {
            totalCartons: placements.length,
            totalUnits: units,
            netWeight: r2(net),
            grossWeight: r2(net + g.tare),
            tare: g.tare,
            maxGross: g.maxGross,
            stackHeight: r3(stack),
            usableHeight: g.usableH,
            maxHeight: g.maxHeight,
            baseHeight: g.baseHeight,
            totalHeight: r3(stack + g.baseHeight),
            remainingHeight: r3(g.usableH - stack),
            floorUtil: r1((100 * baseArea) / (g.L * g.W)),
            volumeUtil: r1((100 * vol) / (g.L * g.W * g.usableH)),
            weightUtil: isFinite(g.maxNet) ? r1((100 * net) / g.maxNet) : null,
            loadedVolumeM3: r3(vol / 1e9),
            availableVolumeM3: r3((g.L * g.W * g.usableH) / 1e9),
            layerCount: new Set(placements.map((p) => p.layer)).size,
          };
        }

        /* Independent physical validation — runs on every plan before display. */
        function validatePlacement(ctx, placements, counts) {
          const g = ctx.geom,
            c = g.c,
            tol = 1e-3;
          const errors = [];
          const checks = {
            bounds: true,
            overlap: true,
            height: true,
            weight: true,
            orientation: true,
            support: true,
            counts: true,
          };
          const fail = (k, msg) => {
            checks[k] = false;
            if (errors.length < 25) errors.push(msg);
          };
          for (const p of placements) {
            if (
              p.x < -g.ov - tol ||
              p.y < -g.ov - tol ||
              p.x + p.l > g.L + g.ov + tol ||
              p.y + p.w > g.W + g.ov + tol
            )
              fail(
                "bounds",
                `Carton #${p.id} (${p.sku}) extends outside the footprint.`,
              );
            if (p.z < -tol || p.z + p.h > g.usableH + tol)
              fail(
                "height",
                `Carton #${p.id} (${p.sku}) exceeds the usable height.`,
              );
            const it = ctx.items[p.itemIdx];
            const pd = [p.l, p.w, p.h].sort((x, y) => x - y),
              od = [it.l, it.w, it.h].sort((x, y) => x - y);
            if (pd.some((v, i) => Math.abs(v - od[i]) > tol))
              fail(
                "orientation",
                `Carton #${p.id} (${p.sku}) dimensions do not match the SKU.`,
              );
            const okStance = it.stances.some(
              (s) =>
                Math.abs(s.h - p.h) <= tol &&
                ((Math.abs(s.a - p.l) <= tol && Math.abs(s.b - p.w) <= tol) ||
                  (Math.abs(s.b - p.l) <= tol && Math.abs(s.a - p.w) <= tol)),
            );
            if (!okStance)
              fail(
                "orientation",
                `Carton #${p.id} (${p.sku}) uses an orientation that is not permitted.`,
              );
            if (it.upright && Math.abs(p.h - it.h) > tol)
              fail(
                "orientation",
                `Carton #${p.id} (${p.sku}) must stay upright.`,
              );
          }
          const grid = makeGrid(placements);
          for (const A of placements) {
            for (const B of grid.query(A.x, A.y, A.l, A.w)) {
              if (B.id <= A.id) continue;
              if (
                A.x < B.x + B.l - tol &&
                B.x < A.x + A.l - tol &&
                A.y < B.y + B.w - tol &&
                B.y < A.y + A.w - tol &&
                A.z < B.z + B.h - tol &&
                B.z < A.z + A.h - tol
              )
                fail("overlap", `Cartons #${A.id} and #${B.id} overlap.`);
            }
          }
          const byTop = new Map();
          for (const p of placements) {
            if (!ctx.items[p.itemIdx].supports) continue;
            const k = r3(p.z + p.h);
            if (!byTop.has(k)) byTop.set(k, []);
            byTop.get(k).push(p);
          }
          const topGrids = new Map();
          const topGrid = (k) => {
            if (!topGrids.has(k)) topGrids.set(k, makeGrid(byTop.get(k) || []));
            return topGrids.get(k);
          };
          for (const p of placements) {
            if (p.z <= tol) continue;
            /* Strict: the real footprint must rest on real carton tops (clearance gaps are air). */
            const list = byTop.has(r3(p.z))
              ? topGrid(r3(p.z)).query(p.x - 1, p.y - 1, p.l + 2, p.w + 2)
              : [];
            let covered = 0;
            for (const q of list) {
              const ix = Math.min(p.x + p.l, q.x + q.l) - Math.max(p.x, q.x);
              const iy = Math.min(p.y + p.w, q.y + q.w) - Math.max(p.y, q.y);
              if (ix > 0 && iy > 0) covered += ix * iy;
            }
            if (covered < p.l * p.w - 1)
              fail(
                "support",
                `Carton #${p.id} (${p.sku}) is not fully supported (${r1((100 * covered) / (p.l * p.w))}% of its base).`,
              );
          }
          const net = placements.reduce((s, p) => s + p.weight, 0);
          if (net > g.maxNet + 1e-6)
            fail(
              "weight",
              `Net weight ${r2(net)} kg exceeds the allowed ${r2(g.maxNet)} kg.`,
            );
          if (counts) {
            const got = counts.map(() => 0);
            placements.forEach((p) => {
              got[p.itemIdx]++;
            });
            counts.forEach((n, i) => {
              if (got[i] !== n)
                fail(
                  "counts",
                  `${ctx.items[i].sku}: ${got[i]} cartons placed but ${n} reported.`,
                );
            });
          }
          return { ok: errors.length === 0, checks, errors };
        }

        /* ============================ SINGLE-SKU PLAN ========================== */
        function singleSkuPlan(ctx, it) {
          const g = ctx.geom,
            c = g.c,
            R = ctx.region;
          const alternatives = [];
          let best = null;
          for (const s of it.stances) {
            const solver = getSolver(ctx, r3(s.a + c), r3(s.b + c));
            const rects = solver
              .rects(R.l, R.w)
              .map((r) => ({
                x: r3(r.x + R.x),
                y: r3(r.y + R.y),
                l: r.l,
                w: r.w,
              }));
            if (!rects.length) continue;
            const maxL = Math.min(
              Math.floor(g.usableH / s.h + EPS),
              it.supports ? it.maxLayers : 1,
            );
            const A = s.a + c,
              B = s.b + c;
            const simpleGrid = Math.max(
              Math.floor(R.l / A + EPS) * Math.floor(R.w / B + EPS),
              Math.floor(R.l / B + EPS) * Math.floor(R.w / A + EPS),
            );
            const variants = [maxL];
            if (it.stances.length > 1 && maxL >= 1) variants.push(maxL - 1);
            for (const k of variants) {
              const layers = [];
              for (let li = 0; li < k; li++)
                layers.push({
                  z: r3(li * s.h),
                  height: s.h,
                  cartons: rects.map((r) => ({
                    itemIdx: it.idx,
                    rect: r,
                    h: s.h,
                  })),
                });
              let z = r3(k * s.h);
              let support = k ? rects : [{ x: R.x, y: R.y, l: R.l, w: R.w }];
              let used = k;
              while (
                used < (it.supports ? it.maxLayers : 1) &&
                layers.length < CONFIG.MAX_LAYERS &&
                support.length
              ) {
                const onFloor = layers.length === 0;
                const st = {
                  remaining: ctx.items.map((_, j) => (j === it.idx ? 1e9 : 0)),
                  z,
                  support,
                  supportActual: onFloor
                    ? null
                    : support.map((r) => ({
                        x: r.x,
                        y: r.y,
                        l: r3(r.l - c),
                        w: r3(r.w - c),
                      })),
                  supportArea: support.reduce((sa, r) => sa + r.l * r.w, 0),
                  layersUsed: ctx.items.map(() => 0),
                };
                const fs = freeSpaceFromSupport(R, support);
                let bestL = null;
                for (const s2 of it.stances) {
                  const L = buildLayer(ctx, st, it.idx, s2, STRATEGIES[0], fs);
                  if (
                    L &&
                    (!bestL ||
                      L.count > bestL.count ||
                      (L.count === bestL.count && L.height < bestL.height))
                  )
                    bestL = L;
                }
                if (!bestL) break;
                layers.push({
                  z,
                  height: bestL.height,
                  cartons: bestL.cartons,
                });
                z = r3(z + bestL.height);
                used++;
                support = supportFrom(ctx, bestL);
              }
              const total = layers.reduce((sa, L) => sa + L.cartons.length, 0);
              alternatives.push({
                stance: stanceLabel(s),
                vertical: s.vertical,
                perLayer: rects.length,
                simpleGrid,
                baseLayers: k,
                topUpLayers: layers.length - k,
                total,
                height: z,
              });
              if (
                !best ||
                total > best.total ||
                (total === best.total && z < best.height - EPS)
              )
                best = {
                  total,
                  layers,
                  height: z,
                  stance: s,
                  perLayer: rects.length,
                  baseLayers: k,
                  simpleGrid,
                };
            }
          }
          return best ? Object.assign(best, { alternatives }) : null;
        }

        function trimTop(cartons, keep) {
          if (cartons.length <= keep) return cartons;
          const s = cartons
            .slice()
            .sort(
              (p, q) => q.z - p.z || q.rect.y - p.rect.y || q.rect.x - p.rect.x,
            );
          return s.slice(s.length - keep);
        }

        function singleCartons(sp, idx) {
          const out = [];
          sp.layers.forEach((L, li) =>
            L.cartons.forEach((cd) =>
              out.push({
                itemIdx: idx,
                rect: cd.rect,
                z: L.z,
                h: cd.h,
                layer: li + 1,
              }),
            ),
          );
          return out;
        }

        function singleCapacity(ctx, i) {
          ctx.capCache = ctx.capCache || {};
          if (ctx.capCache[i] !== undefined) return ctx.capCache[i];
          const it = ctx.items[i];
          let cap = 0;
          if (it.stances.length) {
            if (ctx.geom.kind === "container") {
              const bm = getBlockModel(ctx);
              cap = bm.per[i].cap(bm.RL, bm.RW);
            } else {
              const sp = singleSkuPlan(ctx, it);
              cap = sp ? sp.total : 0;
            }
          }
          if (isFinite(ctx.geom.maxNet))
            cap = Math.min(cap, Math.floor(ctx.geom.maxNet / it.weight + EPS));
          ctx.capCache[i] = cap;
          return cap;
        }

        /* Build the best-quality plan for a known carton combination. */
        function unitPlanFor(ctx, n) {
          const nz = n.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
          if (nz.length === 1 && ctx.geom.kind === "pallet") {
            const i = nz[0],
              sp = singleSkuPlan(ctx, ctx.items[i]);
            if (sp && sp.total >= n[i])
              return buildPlan(
                ctx,
                {
                  cartons: trimTop(singleCartons(sp, i), n[i]),
                  meta: { strategy: "Single-SKU pattern" },
                },
                n,
              );
          }
          const r = packCounts(ctx, n, true);
          return r.ok ? buildPlan(ctx, r, n) : null;
        }

        /* =============================== PREPARE =============================== */
        function prepare(req, productsRaw) {
          const errors = [],
            warnings = [];
          if (!req.unit) errors.push("No pallet or container selected.");
          const geom = buildGeometry(req.unit || {}, req);
          errors.push(...geom.errors);
          if (!productsRaw.length) errors.push("No SKU selected.");
          productsRaw.forEach((p) => errors.push(...validateProductRecord(p)));
          if (errors.length) return { errors, warnings };
          const items = productsRaw.map((p, i) =>
            buildItem(normaliseProduct(p), i, geom, req.orientationPolicy),
          );
          items.forEach((it) => {
            if (it.problem) errors.push(it.problem);
          });
          if (geom.ov > 0)
            warnings.push(
              `Overhang is enabled: bottom-layer cartons may extend up to ${geom.ov} mm beyond each pallet edge.`,
            );
          const ctx = { geom, items, region: geom.region, solvers: new Map() };
          return { errors, warnings, geom, items, ctx };
        }

        function unitLimitsText(g) {
          const parts = [
            `${fmt(g.L)} × ${fmt(g.W)} mm footprint${g.ov ? ` (+${g.ov} mm overhang allowed)` : ""}`,
            `${fmt(g.usableH)} mm usable height`,
          ];
          parts.push(
            isFinite(g.maxNet)
              ? `${fmt(g.maxGross)} kg maximum gross weight`
              : "no weight limit",
          );
          return parts.join(", ");
        }

        /* ====================== LOAD ASSESSMENT (traffic light) ================
     Turns a validated plan into GREEN / AMBER / RED with plain-language
     advice: stability, space used, target-mix accuracy, weight and height. */
        const ASSESS_DEFAULTS = {
          greenSpace: 85,
          amberSpace: 65,
          columnRatio: 3,
          weightWarnPct: 95,
          topHeavy: 0.58,
          heavyOnLightRatio: 0.5,
          heavyOnLightKg: 5,
          braceGapMm: 25,
        };
        const RANK = { green: 0, amber: 1, red: 2 };
        const worse = (a, b) => (RANK[b] > RANK[a] ? b : a);
        const capFirst = (s) =>
          s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

        function assessOptions(o) {
          const A = Object.assign({}, ASSESS_DEFAULTS);
          if (o)
            Object.keys(ASSESS_DEFAULTS).forEach((k) => {
              if (isNum(o[k])) A[k] = Number(o[k]);
            });
          return A;
        }

        function stabilityInfo(ctx, plan, A) {
          const g = ctx.geom,
            P = plan.placements,
            tol = 1e-3,
            gap =
              g.c +
              A.braceGapMm; /* neighbours within this gap brace a column once stretch-wrapped */
          const res = {
            cogRatio: 0,
            cogHeight: 0,
            columns: [],
            heavyOnLight: [],
            overhang: false,
          };
          if (!P.length) return res;
          let wz = 0,
            ws = 0;
          P.forEach((p) => {
            wz += p.weight * (p.z + p.h / 2);
            ws += p.weight;
          });
          const stack = plan.kpis.stackHeight;
          res.cogHeight = r1(wz / ws);
          res.cogRatio = stack > 0 ? wz / ws / stack : 0;
          const byTop = new Map();
          P.forEach((p) => {
            const k = r3(p.z + p.h);
            if (!byTop.has(k)) byTop.set(k, []);
            byTop.get(k).push(p);
          });
          const overlap = (a, b) => {
            const ix = Math.min(a.x + a.l, b.x + b.l) - Math.max(a.x, b.x),
              iy = Math.min(a.y + a.w, b.y + b.w) - Math.max(a.y, b.y);
            return ix > tol && iy > tol ? ix * iy : 0;
          };
          const supporters = new Map(),
            carried = new Map();
          const topGrids = new Map();
          const topGrid = (k) => {
            if (!topGrids.has(k)) topGrids.set(k, makeGrid(byTop.get(k) || []));
            return topGrids.get(k);
          };
          for (const p of P) {
            if (p.z <= tol) continue;
            const list = byTop.has(r3(p.z))
              ? topGrid(r3(p.z))
                  .query(p.x, p.y, p.l, p.w)
                  .filter((q) => overlap(p, q) > 1)
              : [];
            supporters.set(p.id, list);
            list.forEach((q) =>
              carried.set(q.id, (carried.get(q.id) || 0) + 1),
            );
            if (list.length) {
              const light = list.reduce(
                (m, q) => (q.weight < m.weight ? q : m),
                list[0],
              );
              if (
                light.weight < A.heavyOnLightRatio * p.weight &&
                p.weight - light.weight >= A.heavyOnLightKg
              )
                res.heavyOnLight.push({
                  top: p.sku,
                  topKg: p.weight,
                  below: light.sku,
                  belowKg: light.weight,
                  id: p.id,
                });
            }
          }
          res.overhang = P.some(
            (p) =>
              p.x < -tol ||
              p.y < -tol ||
              p.x + p.l > g.L + tol ||
              p.y + p.w > g.W + tol,
          );
          /* Columns: chains where each carton carries exactly one carton and is carried by exactly one. */
          const above = new Map(),
            children = new Map();
          for (const p of P) {
            const s = supporters.get(p.id);
            if (!s) continue;
            s.forEach((q) => {
              if (!children.has(q.id)) children.set(q.id, []);
              children.get(q.id).push(p);
            });
            if (s.length === 1) {
              if (!above.has(s[0].id)) above.set(s[0].id, []);
              above.get(s[0].id).push(p);
            }
          }
          /* Height of everything stacked on (and including) a carton – a neighbour braces a column by its whole stack. */
          const stackMemo = new Map();
          const stackTop = (q) => {
            if (stackMemo.has(q.id)) return stackMemo.get(q.id);
            let t = q.z + q.h;
            (children.get(q.id) || []).forEach((ch) => {
              t = Math.max(t, stackTop(ch));
            });
            stackMemo.set(q.id, t);
            return t;
          };
          const floorGrid = makeGrid(P);
          for (const b of P) {
            if (b.z > tol) continue;
            const chain = [b];
            let cur = b;
            for (;;) {
              const up = above.get(cur.id);
              if (!up || up.length !== 1 || carried.get(cur.id) !== 1) break;
              cur = up[0];
              chain.push(cur);
            }
            const Hc = cur.z + cur.h,
              minBase = Math.min(b.l, b.w);
            if (Hc <= A.columnRatio * minBase + tol) continue;
            const ids = new Set(chain.map((p) => p.id));
            let braced = 0;
            for (const side of ["-x", "+x", "-y", "+y"]) {
              if (
                g.kind === "container" &&
                ((side === "-x" && b.x <= gap) ||
                  (side === "+x" && b.x + b.l >= g.L - gap) ||
                  (side === "-y" && b.y <= gap) ||
                  (side === "+y" && b.y + b.w >= g.W - gap))
              ) {
                braced++;
                continue;
              }
              let top = 0;
              const near =
                side === "-x"
                  ? floorGrid.query(b.x - gap - 1, b.y, gap + 2, b.w)
                  : side === "+x"
                    ? floorGrid.query(b.x + b.l - 1, b.y, gap + 2, b.w)
                    : side === "-y"
                      ? floorGrid.query(b.x, b.y - gap - 1, b.l, gap + 2)
                      : floorGrid.query(b.x, b.y + b.w - 1, b.l, gap + 2);
              for (const q of near) {
                if (ids.has(q.id)) continue;
                let touch = false;
                if (side === "-x")
                  touch =
                    Math.abs(q.x + q.l - b.x) <= gap &&
                    q.y < b.y + b.w - tol &&
                    q.y + q.w > b.y + tol;
                else if (side === "+x")
                  touch =
                    Math.abs(q.x - (b.x + b.l)) <= gap &&
                    q.y < b.y + b.w - tol &&
                    q.y + q.w > b.y + tol;
                else if (side === "-y")
                  touch =
                    Math.abs(q.y + q.w - b.y) <= gap &&
                    q.x < b.x + b.l - tol &&
                    q.x + q.l > b.x + tol;
                else
                  touch =
                    Math.abs(q.y - (b.y + b.w)) <= gap &&
                    q.x < b.x + b.l - tol &&
                    q.x + q.l > b.x + tol;
                if (touch) top = Math.max(top, stackTop(q));
              }
              if (top >= 0.75 * Hc) braced++;
            }
            if (braced < 2) {
              res.columns.push({
                sku: [...new Set(chain.map((p) => p.sku))].join(" + "),
                height: r3(Hc),
                base: `${b.l} × ${b.w}`,
                ratio: r1(Hc / minBase),
                bracedSides: braced,
                cartons: chain.length,
                severe: braced === 0 && Hc > 2 * A.columnRatio * minBase,
              });
            }
          }
          return res;
        }

        function assessPlan(ctx, plan, mix, opts) {
          const A = assessOptions(opts),
            g = ctx.geom,
            k = plan.kpis;
          const checks = [];
          const add = (key, label, status, message, action) =>
            checks.push({ key, label, status, message, action: action || "" });
          if (!plan.validation.ok)
            add(
              "physical",
              "Physical check",
              "red",
              `The layout failed the physical check: ${plan.validation.errors[0]}`,
              "Do not load this layout – recalculate.",
            );
          /* Stability */
          const st = stabilityInfo(ctx, plan, A);
          let stab = "green";
          const issues = [],
            acts = [];
          if (st.columns.length) {
            stab = st.columns.some((c) => c.severe) ? "red" : "amber";
            const c0 = st.columns[0];
            issues.push(
              `${st.columns.length} tall free-standing column${st.columns.length > 1 ? "s" : ""} (e.g. ${c0.sku}: ${fmt(c0.height)} mm high on a ${c0.base} mm base, braced on ${c0.bracedSides} side${c0.bracedSides === 1 ? "" : "s"})`,
            );
            acts.push(
              "stretch-wrap tightly and add corner boards, or split the SKUs over more pallets",
            );
          }
          if (st.cogRatio > A.topHeavy) {
            stab = worse(stab, st.cogRatio > 0.7 ? "red" : "amber");
            issues.push(
              `top-heavy – the centre of gravity is at ${Math.round(st.cogRatio * 100)}% of the stack height`,
            );
            acts.push("load the heavier cartons at the bottom");
          }
          if (st.heavyOnLight.length) {
            stab = worse(stab, "amber");
            const h = st.heavyOnLight[0];
            issues.push(
              `${st.heavyOnLight.length} heavy carton${st.heavyOnLight.length > 1 ? "s rest" : " rests"} on much lighter cartons (e.g. ${h.top} ${h.topKg} kg on ${h.below} ${h.belowKg} kg)`,
            );
            acts.push(
              "check the crush strength of the lower cartons or swap the stacking order",
            );
          }
          if (st.overhang) {
            stab = worse(stab, "amber");
            issues.push("cartons overhang the pallet edge");
            acts.push("protect the overhanging edges");
          }
          add(
            "stability",
            "Stability",
            stab,
            stab === "green"
              ? `Stable – every carton is fully supported, centre of gravity at ${Math.round(st.cogRatio * 100)}% of the stack height, no free-standing columns.`
              : `${capFirst(issues.join("; "))}.`,
            acts.length ? `${capFirst([...new Set(acts)].join("; "))}.` : "",
          );
          /* Space */
          const volUtil = k.volumeUtil,
            wUtil = k.weightUtil || 0,
            capU = Math.max(volUtil, wUtil);
          const freeM3 = r3(
              Math.max(0, k.availableVolumeM3 - k.loadedVolumeM3),
            ),
            freePct = r1(Math.max(0, 100 - volUtil));
          const space =
            capU >= A.greenSpace
              ? "green"
              : capU >= A.amberSpace
                ? "amber"
                : "red";
          const spaceMsg =
            wUtil >= A.weightWarnPct
              ? `Full by weight (${fmt(wUtil, 0)}% of the weight limit); ${fmt(volUtil, 0)}% of the volume is used.`
              : `${fmt(volUtil, 0)}% of the space is used – ${fmt(freeM3, 2)} m³ (${fmt(freePct, 0)}%) is still free${k.remainingHeight > 0.5 ? `, including ${fmt(k.remainingHeight)} mm of unused height` : ""}.`;
          add(
            "space",
            "Space used",
            space,
            spaceMsg,
            space === "green" ? "" : "See “What else fits” to fill the gap.",
          );
          /* Target mix */
          if (mix && mix.of > 0) {
            const redAt = Math.max(2 * mix.tol, mix.tol + 3);
            let ms = mix.within === mix.of ? "green" : "amber";
            if (mix.notLoaded.length || mix.maxDev > redAt + 1e-9) ms = "red";
            const msg =
              mix.within === mix.of
                ? `All ${mix.of} SKUs are within ±${fmt(mix.tol, 1)} percentage points of the target (largest gap ${fmt(mix.maxDev, 1)} pts).`
                : `${mix.of - mix.within} of ${mix.of} SKUs ${mix.of - mix.within === 1 ? "is" : "are"} outside the ±${fmt(mix.tol, 1)}-point tolerance (largest gap ${fmt(mix.maxDev, 1)} pts${mix.worstSku ? `, ${mix.worstSku}` : ""})${mix.notLoaded.length ? `; not loaded: ${mix.notLoaded.join(", ")}` : ""}.`;
            add(
              "mix",
              "Target mix",
              ms,
              msg,
              ms === "green"
                ? ""
                : "Compare the Closest Target Match scenario, or accept the deviation.",
            );
          }
          /* Weight */
          if (g.maxGross) {
            const pct = (100 * k.grossWeight) / g.maxGross;
            const ws2 =
              pct > 100 + 1e-9
                ? "red"
                : pct >= A.weightWarnPct
                  ? "amber"
                  : "green";
            add(
              "weight",
              "Weight",
              ws2,
              `Gross ${fmt(k.grossWeight, 1)} kg of the ${fmt(g.maxGross)} kg limit (${fmt(pct, 0)}%).`,
              ws2 === "amber"
                ? "Close to the limit – weigh the load before dispatch."
                : ws2 === "red"
                  ? "Remove cartons – over the weight limit."
                  : "",
            );
          } else
            add(
              "weight",
              "Weight",
              "green",
              `Gross ${fmt(k.grossWeight, 1)} kg – no maximum weight has been set.`,
              "Enter the maximum gross weight to have it checked.",
            );
          /* Height */
          const hs = k.stackHeight > k.usableHeight + 1e-6 ? "red" : "green";
          add(
            "height",
            "Height",
            hs,
            `Total loaded height ${fmt(k.totalHeight)} mm of ${fmt(k.maxHeight)} mm maximum${k.baseHeight ? ` (incl. ${fmt(k.baseHeight)} mm base)` : ""}.`,
            hs === "red" ? "Remove the top layer." : "",
          );
          const a = {
            checks,
            kind: g.kind,
            space: {
              volUtil,
              wUtil,
              capUtil: r1(capU),
              freeM3,
              freePct,
              remainingHeight: k.remainingHeight,
              floorUtil: k.floorUtil,
              full: false,
            },
            stability: {
              cogRatio: r2(st.cogRatio),
              cogHeight: st.cogHeight,
              columns: st.columns.slice(0, 10),
              heavyOnLight: st.heavyOnLight.slice(0, 10),
            },
          };
          return summariseAssessment(a);
        }

        /* Safety (physical, stability, weight, height) and efficiency (space, mix) are worded differently:
     a safe but half-empty load is "safe – space wasted", never "not safe". */
        function summariseAssessment(a) {
          const SAFETY = ["physical", "stability", "weight", "height"];
          const status = a.checks.reduce((s, c) => worse(s, c.status), "green");
          const safety = a.checks
            .filter((c) => SAFETY.includes(c.key))
            .reduce((s, c) => worse(s, c.status), "green");
          const bad = a.checks
            .filter((c) => c.status !== "green")
            .map((c) => c.label.toLowerCase());
          const sp = a.checks.find((c) => c.key === "space"),
            mix = a.checks.find((c) => c.key === "mix");
          a.status = status;
          a.safety = safety;
          if (status === "green") a.title = "READY TO LOAD";
          else if (safety === "red") a.title = "NOT SAFE AS PLANNED";
          else if (safety === "amber") a.title = "LOAD WITH CARE";
          else if (status === "amber") a.title = "SAFE – ROOM TO IMPROVE";
          else
            a.title =
              sp && sp.status === "red"
                ? "SAFE – BUT SPACE IS WASTED"
                : mix && mix.status === "red"
                  ? "SAFE – TARGET MIX MISSED"
                  : "SAFE – ROOM TO IMPROVE";
          const used = `${fmt(a.space.capUtil, 0)}% of the ${a.space.basis === "positions" ? "pallet positions" : `${a.kind} capacity`} used`;
          a.summary =
            status === "green"
              ? `Safe and stable – ${used}.`
              : `${safety === "green" ? "Safe and stable. " : ""}Check ${bad.join(", ")} – ${used}.`;
          return a;
        }

        /* ================== FILL-UP ADVICE ("what else fits?") ==================
     Starting from the planned cartons, find how many more of each SKU still
     fit (mix SKUs first, then other active products), plus a combined fill.
     Every suggestion is re-planned and physically validated before it is
     offered. */
        function fillSuggestions(req, baseRaw, counts, opts) {
          opts = opts || {};
          const geom = buildGeometry(req.unit, req);
          if (geom.errors.length) return null;
          const baseIds = new Set(baseRaw.map((p) => p.id));
          const extras = (req.fillProducts || [])
            .filter(
              (p) =>
                p &&
                !baseIds.has(p.id) &&
                p.active !== false &&
                !validateProductRecord(p).length,
            )
            .slice(0, 15);
          const raw = baseRaw.concat(extras);
          const items = raw.map((p, i) =>
            buildItem(normaliseProduct(p), i, geom, req.orientationPolicy),
          );
          const ctx = { geom, items, region: geom.region, solvers: new Map() };
          const nb = baseRaw.length;
          const n0 = counts.concat(extras.map(() => 0));
          const oracle = makeOracle(ctx, null);
          const volNow = volOf(ctx, n0),
            wNow = weightOf(ctx, n0);
          const availVol = geom.L * geom.W * geom.usableH;
          const utilOf = (n) => {
            const v = (100 * volOf(ctx, n)) / availVol,
              w = isFinite(geom.maxNet)
                ? (100 * weightOf(ctx, n)) / geom.maxNet
                : 0;
            return { vol: r1(v), cap: r1(Math.max(v, w)) };
          };
          const current = utilOf(n0);
          if (!oracle(n0).ok)
            return {
              current,
              suggestions: [],
              combined: null,
              note: "The current plan could not be re-planned with additional products.",
            };
          /* Max cartons / locked quantities of mix rows cap what may be added (extras are unlimited). */
          const limitOf = (i) =>
            n0[i] +
            (i < nb && opts.maxAdd && isFinite(opts.maxAdd[i])
              ? Math.max(0, opts.maxAdd[i])
              : Infinity);
          const cands = items
            .filter(
              (it) =>
                !it.problem &&
                it.stances.length &&
                limitOf(it.idx) > n0[it.idx],
            )
            .map((it) => it.idx);
          const describe = (n, kind) => {
            const adds = items
              .map((it, i) => ({
                productId: it.id,
                sku: it.sku,
                add: n[i] - n0[i],
                inMix: i < nb,
              }))
              .filter((a) => a.add > 0);
            const u = utilOf(n);
            const mixEffect =
              opts.mixEval && adds.every((a) => a.inMix)
                ? opts.mixEval(n.slice(0, nb))
                : null;
            return {
              kind,
              adds,
              inMix: adds.every((a) => a.inMix),
              addCartons: adds.reduce((s, a) => s + a.add, 0),
              addUnits: items.reduce(
                (s, it, i) => s + (n[i] - n0[i]) * it.units,
                0,
              ),
              addWeight: r2(weightOf(ctx, n) - wNow),
              newVolUtil: u.vol,
              newCapUtil: u.cap,
              gain: r1(u.cap - current.cap),
              mixEffect,
              extraOutsideMix: adds.filter((a) => !a.inMix).map((a) => a.sku),
            };
          };
          const found = [];
          for (const i of cands) {
            const n = greedyGrow(
              n0,
              (t, blocked) => (blocked.has(i) || t[i] >= limitOf(i) ? -1 : i),
              oracle,
            );
            if (n[i] > n0[i]) found.push({ n, d: describe(n, "single") });
          }
          found.sort(
            (p, q) => q.d.inMix - p.d.inMix || q.d.newCapUtil - p.d.newCapUtil,
          );
          const pickBig = (t, blocked) => {
            let best = -1;
            for (const i of cands) {
              if (blocked.has(i) || t[i] >= limitOf(i)) continue;
              if (best < 0 || items[i].vol > items[best].vol) best = i;
            }
            return best;
          };
          const comb = greedyGrow(n0, pickBig, oracle);
          const verify = (n) => {
            const plan = unitPlanFor(ctx, n);
            return !!(plan && plan.validation.ok);
          };
          const verified = found
            .slice(0, 8)
            .filter((f) => verify(f.n))
            .map((f) => f.d);
          let combined = null;
          if (volOf(ctx, comb) > volNow + EPS) {
            const c = describe(comb, "combined");
            const bestSingle = verified.reduce(
              (m, s) => Math.max(m, s.newCapUtil),
              current.cap,
            );
            if (
              c.adds.length > 1 &&
              c.newCapUtil > bestSingle + 0.05 &&
              verify(comb)
            )
              combined = c;
          }
          return {
            current,
            freeM3: r3(Math.max(0, (availVol - volNow) / 1e9)),
            suggestions: verified,
            combined,
            extrasConsidered: extras.length,
            note: "",
          };
        }

        function applyFillToAssessment(a, fill) {
          if (!a || !fill) return;
          const sp = a.checks.find((c) => c.key === "space");
          if (!sp || sp.status === "green") return;
          if (!fill.suggestions.length && !fill.combined) {
            sp.action =
              "Nothing else fits physically – the free space is in gaps smaller than any available carton, or blocked by the height or weight limit.";
            a.space.full = true;
          } else {
            const best = fill.combined || fill.suggestions[0];
            sp.action = `Add ${best.adds.map((x) => `${x.add} × ${x.sku}`).join(" + ")} to reach ${fmt(best.newCapUtil, 0)}% – see “What else fits”.`;
          }
        }

        /* Assess a hand-made layout (used by self-tests and for future imports). */
        function assessLayout(req) {
          const prep = prepare(req, req.products || []);
          if (prep.errors.length) return { ok: false, errors: prep.errors };
          const { ctx } = prep,
            c = ctx.geom.c;
          const cartons = (req.placements || []).map((p) => ({
            itemIdx: p.itemIdx,
            rect: { x: p.x, y: p.y, l: r3(p.l + c), w: r3(p.w + c) },
            z: p.z,
            h: p.h,
            layer: p.layer || 1,
          }));
          const counts = ctx.items.map(
            (_, i) => cartons.filter((cd) => cd.itemIdx === i).length,
          );
          const plan = buildPlan(ctx, { cartons, meta: {} }, counts);
          return {
            ok: true,
            plan,
            assessment: assessPlan(ctx, plan, null, req.assessment),
          };
        }

        /* ========================= MODE 1 — SINGLE SKU ========================= */
        function calcSingle(req) {
          const prep = prepare(req, req.product ? [req.product] : []);
          if (prep.errors.length)
            return { ok: false, errors: prep.errors, warnings: prep.warnings };
          const { ctx, geom } = prep;
          const it = ctx.items[0];
          const sp = singleSkuPlan(ctx, it);
          if (!sp || !sp.total)
            return {
              ok: false,
              errors: [
                `No carton of ${it.sku} can be placed on this ${geom.kind}.`,
              ],
            };
          let cartons = singleCartons(sp, 0);
          const physicalMax = cartons.length;
          const capW = isFinite(geom.maxNet)
            ? Math.floor(geom.maxNet / it.weight + EPS)
            : Infinity;
          const weightLimited = cartons.length > capW;
          if (weightLimited) cartons = trimTop(cartons, capW);
          const plan = buildPlan(
            ctx,
            { cartons, meta: { strategy: "Single-SKU pattern" } },
            [cartons.length],
          );
          const minH = Math.min(...it.stances.map((s) => s.h));
          const constraints = [];
          if (weightLimited) constraints.push("WEIGHT");
          else {
            constraints.push("FOOTPRINT");
            if (plan.kpis.remainingHeight < minH - EPS)
              constraints.push("HEIGHT");
            if (isFinite(it.maxLayers) && sp.baseLayers >= it.maxLayers)
              constraints.push("SKU MAX STACK LAYERS");
            if (!it.supports)
              constraints.push("FRAGILE / NON-SUPPORTING (single layer)");
          }
          const layer1 = plan.placements.filter((p) => p.layer === 1);
          const rotations = new Set(layer1.map((p) => p.orientation));
          const arrangement =
            rotations.size > 1
              ? `Mixed-row arrangement (${[...rotations].join(" + ")}) – ${sp.perLayer - sp.simpleGrid > 0 ? `${sp.perLayer - sp.simpleGrid} more per layer than` : "same as"} the best uniform grid (${sp.simpleGrid})`
              : `Uniform grid (${[...rotations][0] || ""})`;
          const explanation = [
            `Tested ${it.stances.length} permitted vertical orientation(s) × 2 footprint rotations, uniform grids, mixed-orientation row blocks and remaining strips (guillotine search).`,
            `Best layer: ${sp.perLayer} cartons (${arrangement}). Simple FLOOR(L/l) × FLOOR(W/w) grid would give ${sp.simpleGrid}.`,
            `${sp.baseLayers} identical layer(s) of ${sp.stance.h} mm${sp.layers.length > sp.baseLayers ? ` plus ${sp.layers.length - sp.baseLayers} top-up layer(s) in another orientation` : ""} → ${physicalMax} cartons physically fit within ${fmt(geom.usableH)} mm.`,
          ];
          if (weightLimited)
            explanation.push(
              `Weight limit: ${fmt(geom.maxNet, 2)} kg net ÷ ${it.weight} kg = ${capW} cartons, so ${physicalMax - capW} carton(s) were removed from the top of the stack.`,
            );
          const assessment = assessPlan(ctx, plan, null, req.assessment);
          const fill = req.noFill
            ? null
            : fillSuggestions(req, [req.product], [cartons.length]);
          applyFillToAssessment(assessment, fill);
          return {
            assessment,
            fill,
            ok: true,
            warnings: prep.warnings,
            sku: it.sku,
            productId: it.id,
            plan,
            summary: {
              bestOrientation: stanceLabel(sp.stance),
              arrangement,
              perLayer: sp.perLayer,
              layers: sp.baseLayers,
              topUpLayers: sp.layers.length - sp.baseLayers,
              simpleGrid: sp.simpleGrid,
              physicalMax,
              weightCap: isFinite(capW) ? capW : null,
              maxCartons: plan.kpis.totalCartons,
              unitsPerCarton: it.units,
              totalUnits: plan.kpis.totalUnits,
              weightLimited,
            },
            alternatives: sp.alternatives,
            constraints,
            constraint: weightLimited ? "WEIGHT" : constraints.join(" + "),
            explanation,
            details: {
              unit: geomSummary(geom),
              limits: unitLimitsText(geom),
              allowedOrientations: it.stances.map(stanceLabel),
            },
          };
        }

        /* ================== ORACLE (cached feasibility checks) ================= */
        function makeOracle(ctx, hooks) {
          const cache = new Map(),
            bad = [];
          let evals = 0;
          const fn = (n) => {
            const key = n.join(",");
            const hit = cache.get(key);
            if (hit) return hit;
            for (const b of bad) {
              let dom = true;
              for (let i = 0; i < n.length; i++)
                if (n[i] < b[i]) {
                  dom = false;
                  break;
                }
              if (dom) {
                const r = { ok: false, reason: "DOMINATED" };
                cache.set(key, r);
                return r;
              }
            }
            evals++;
            if (hooks && hooks.progress && evals % CONFIG.PROGRESS_EVERY === 0)
              hooks.progress(evals);
            const res = packCounts(ctx, n, false);
            const r = { ok: res.ok, reason: res.reason };
            cache.set(key, r);
            if (!r.ok && bad.length < 600) bad.push(n.slice());
            return r;
          };
          fn.stats = () => ({
            evaluations: evals,
            combinationsChecked: cache.size,
          });
          fn.exhausted = () => evals >= CONFIG.MAX_PACK_EVALUATIONS;
          return fn;
        }

        /* Adds cartons chosen by `pick` in doubling batches, halving on failure. */
        function greedyGrow(start, pick, oracle, onAccept) {
          let n = start.slice();
          const blocked = new Set();
          let k = 1,
            guard = 0;
          while (guard++ < 20000 && !oracle.exhausted()) {
            const trial = n.slice();
            let first = -1,
              added = 0;
            for (let t = 0; t < k; t++) {
              const i = pick(trial, blocked);
              if (i < 0) break;
              if (first < 0) first = i;
              trial[i]++;
              added++;
            }
            if (!added) break;
            if (oracle(trial).ok) {
              n = trial;
              if (onAccept) onAccept(n);
              k = Math.min(k * 2, 512);
            } else if (k > 1) k = Math.max(1, Math.floor(k / 2));
            else blocked.add(first);
          }
          return n;
        }

        /* ================= MODE 2 — MIXED SKU TARGET PERCENTAGE ================
     "Which carton combination best satisfies the requested mix?"  */
        function optimiseMix(req, hooks) {
          const t0 = Date.now();
          const rows = req.rows || [];
          const errors = [];
          if (!rows.length)
            errors.push(
              "No SKU selected. Add at least one SKU to the mix table.",
            );
          const tol = Number(req.tolerance);
          if (!isFinite(tol) || tol < 0 || tol > 100)
            errors.push(
              "Invalid tolerance: enter a value between 0 and 100 percentage points.",
            );
          const seenSku = new Set();
          rows.forEach((r) => {
            const sku = r.product ? r.product.sku : "(missing)";
            if (r.product && seenSku.has(r.product.id))
              errors.push(`${sku} appears more than once in the mix table.`);
            if (r.product) seenSku.add(r.product.id);
            if (!r.locked && (!isNum(r.target) || Number(r.target) < 0))
              errors.push(`${sku}: target % must be a number of 0 or more.`);
            if (
              isNum(r.min) &&
              (Number(r.min) < 0 || !Number.isInteger(Number(r.min)))
            )
              errors.push(
                `${sku}: minimum cartons must be a whole number ≥ 0.`,
              );
            if (
              isNum(r.max) &&
              (Number(r.max) < 0 || !Number.isInteger(Number(r.max)))
            )
              errors.push(
                `${sku}: maximum cartons must be a whole number ≥ 0.`,
              );
            if (isNum(r.min) && isNum(r.max) && Number(r.min) > Number(r.max))
              errors.push(
                `${sku}: minimum cartons (${r.min}) is greater than maximum cartons (${r.max}).`,
              );
            if (
              r.locked &&
              (!isNum(r.lockedQty) ||
                Number(r.lockedQty) < 0 ||
                !Number.isInteger(Number(r.lockedQty)))
            )
              errors.push(
                `${sku}: locked quantity must be a whole number of cartons ≥ 0.`,
              );
          });
          const unlockedRows = rows.filter((r) => !r.locked);
          const tsum = unlockedRows.reduce((s, r) => s + num(r.target), 0);
          if (unlockedRows.length && Math.abs(tsum - 100) > 0.01)
            errors.push(
              `Target distribution must equal 100%. The unlocked SKUs currently total ${r2(tsum)}%.`,
            );
          if (errors.length) return { ok: false, errors };
          const prep = prepare(
            req,
            rows.map((r) => r.product),
          );
          if (prep.errors.length)
            return { ok: false, errors: prep.errors, warnings: prep.warnings };
          const { ctx, geom, items } = prep;
          const warnings = prep.warnings.slice();
          const S = items.length;
          const basis = ["units", "weight"].includes(req.basis)
            ? req.basis
            : "cartons";
          const f = items.map((it) =>
            basis === "units" ? it.units : basis === "weight" ? it.weight : 1,
          );
          const locked = rows.map((r) => !!r.locked);
          const M = items.map((_, i) => i).filter((i) => !locked[i]);
          const targets = rows.map((r) => (r.locked ? null : num(r.target)));
          const prio = rows.map((r) =>
            CONFIG.PRIORITY_WEIGHTS[r.priority] !== undefined
              ? r.priority
              : "Normal",
          );
          const pw = prio.map((p) => CONFIG.PRIORITY_WEIGHTS[p]);
          const rowMax = rows.map((r) =>
            r.locked
              ? Number(r.lockedQty)
              : isNum(r.max)
                ? Number(r.max)
                : Infinity,
          );
          const lo = rows.map((r) =>
            r.locked ? Number(r.lockedQty) : isNum(r.min) ? Number(r.min) : 0,
          );
          const capSingle = items.map((_, i) => singleCapacity(ctx, i));
          const hi = rows.map((r, i) =>
            r.locked ? Number(r.lockedQty) : Math.min(rowMax[i], capSingle[i]),
          );
          items.forEach((it, i) => {
            if (lo[i] > capSingle[i])
              errors.push(
                `${locked[i] ? "Locked quantity" : "Minimum carton requirement"} impossible: ${it.sku} requires ${lo[i]} cartons, but at most ${capSingle[i]} fit on this ${geom.kind} even on their own.`,
              );
          });
          if (errors.length) return { ok: false, errors, warnings };
          const oracle = makeOracle(ctx, hooks);
          if (lo.some((v) => v > 0) && !oracle(lo).ok) {
            return {
              ok: false,
              warnings,
              errors: [
                `The minimum / locked quantities (${items
                  .map((it, i) => (lo[i] ? `${it.sku} × ${lo[i]}` : null))
                  .filter(Boolean)
                  .join(
                    ", ",
                  )}) cannot be physically placed together on this ${geom.kind} (${weightOf(ctx, lo) > geom.maxNet ? "weight limit exceeded" : "no valid layer arrangement found"}).`,
              ],
            };
          }
          const L = geom.L,
            W = geom.W,
            H = geom.usableH;
          const availVol = L * W * H;
          /* "Add to plan": evaluate one given carton combination instead of searching. */
          const fixed = Array.isArray(req.fixedCounts)
            ? req.fixedCounts.map(Number)
            : null;
          if (
            fixed &&
            (fixed.length !== S ||
              fixed.some((v) => !Number.isInteger(v) || v < 0))
          )
            return { ok: false, errors: ["Invalid carton combination."] };

          function metrics(n) {
            let B = 0;
            for (const i of M) B += n[i] * f[i];
            const ach = items.map((_, i) =>
              locked[i] ? null : B > 0 ? (100 * n[i] * f[i]) / B : 0,
            );
            const dev = ach.map((a, i) => (a === null ? null : a - targets[i]));
            let E = 0,
              excess = 0,
              maxDev = 0,
              within = 0;
            for (const i of M) {
              const d = Math.abs(dev[i]);
              E += pw[i] * d;
              excess += pw[i] * Math.max(0, d - tol);
              maxDev = Math.max(maxDev, d);
              if (d <= tol + 1e-9) within++;
            }
            const vol = volOf(ctx, n),
              weight = weightOf(ctx, n);
            const volUtil = (100 * vol) / availVol,
              wUtil = isFinite(geom.maxNet) ? (100 * weight) / geom.maxNet : 0;
            return {
              B,
              ach,
              dev,
              E,
              excess,
              maxDev,
              within,
              vol,
              weight,
              total: sumArr(n),
              volUtil,
              wUtil,
              capUtil: Math.max(volUtil, wUtil),
            };
          }
          function errorOnly(n) {
            let B = 0,
              E = 0;
            for (const i of M) B += n[i] * f[i];
            for (const i of M)
              E +=
                pw[i] *
                Math.abs((B > 0 ? (100 * n[i] * f[i]) / B : 0) - targets[i]);
            return E;
          }
          function score(n, mode) {
            const m = metrics(n),
              w = CONFIG.MODE_WEIGHTS[mode];
            return (
              m.capUtil -
              w.lambda * m.E -
              w.tolPenalty * m.excess +
              w.qty * m.total
            );
          }
          const inBounds = (v) => v.every((x, i) => x >= lo[i] && x <= hi[i]);

          const pool = new Map();
          const record = (n) => {
            pool.set(n.join(","), n.slice());
          };
          if (fixed) record(fixed);
          else if (oracle(lo).ok) record(lo);

          if (M.length && !fixed) {
            /* A1 — target-following growth: always add the carton that keeps the mix closest to target. */
            const pickTarget = (trial, blocked) => {
              let best = -1,
                bestE = Infinity,
                bestTie = -Infinity;
              for (const i of M) {
                if (blocked.has(i) || trial[i] >= hi[i] || targets[i] <= 0)
                  continue;
                trial[i]++;
                const E = errorOnly(trial);
                trial[i]--;
                const tie = pw[i] * 1e12 + items[i].vol;
                if (
                  E < bestE - 1e-9 ||
                  (Math.abs(E - bestE) <= 1e-9 && tie > bestTie)
                ) {
                  best = i;
                  bestE = E;
                  bestTie = tie;
                }
              }
              return best;
            };
            const tfgEnd = greedyGrow(lo, pickTarget, oracle, record);
            /* A2 — utilisation fill-up: keep adding whatever still fits. */
            const pickUtil = (trial, blocked) => {
              let best = -1,
                bestS = -Infinity;
              for (const i of M) {
                if (blocked.has(i) || trial[i] >= hi[i]) continue;
                trial[i]++;
                const s = score(trial, "util");
                trial[i]--;
                if (s > bestS + 1e-12) {
                  bestS = s;
                  best = i;
                }
              }
              return best;
            };
            greedyGrow(tfgEnd, pickUtil, oracle, record);
            /* A3 — proportional scaling (largest-remainder rounding of the ideal ratio). */
            const rsum = M.reduce(
              (s, i) => s + (targets[i] > 0 ? targets[i] / f[i] : 0),
              0,
            );
            if (rsum > 0) {
              const r = items.map((_, i) =>
                !locked[i] && targets[i] > 0 ? targets[i] / f[i] / rsum : 0,
              );
              const apportion = (T) => {
                const v = lo.slice();
                const raw = M.map((i) => ({ i, x: T * r[i] }));
                raw.forEach((o) => {
                  v[o.i] = Math.min(
                    hi[o.i],
                    Math.max(lo[o.i], Math.floor(o.x)),
                  );
                });
                let left = T - M.reduce((s, i) => s + v[i], 0);
                raw.sort(
                  (p, q) => q.x - Math.floor(q.x) - (p.x - Math.floor(p.x)),
                );
                for (const o of raw) {
                  if (left <= 0) break;
                  if (v[o.i] < hi[o.i] && r[o.i] > 0) {
                    v[o.i]++;
                    left--;
                  }
                }
                return v;
              };
              let a = 0,
                b = M.reduce((s, i) => s + (isFinite(hi[i]) ? hi[i] : 0), 0);
              while (a < b && !oracle.exhausted()) {
                const mid = Math.ceil((a + b) / 2),
                  v = apportion(mid);
                if (oracle(v).ok) {
                  record(v);
                  a = mid;
                } else b = mid - 1;
              }
            }
            /* B — local search per objective (swap / add / remove moves). */
            const localSearch = (start, mode) => {
              let cur = start.slice(),
                curS = score(cur, mode);
              for (
                let it = 0;
                it < CONFIG.LOCAL_SEARCH_MAX_ITER && !oracle.exhausted();
                it++
              ) {
                const moves = [],
                  seen = new Set();
                const add = (v) => {
                  const k = v.join(",");
                  if (seen.has(k) || !inBounds(v)) return;
                  seen.add(k);
                  const s = score(v, mode);
                  if (s > curS + 1e-9) moves.push({ v, s });
                };
                for (const i of M) {
                  const step = Math.max(2, Math.round(cur[i] * 0.1));
                  for (const d of [1, -1, step, -step]) {
                    const v = cur.slice();
                    v[i] += d;
                    add(v);
                  }
                  for (const j of M)
                    if (j !== i)
                      for (const [di, dj] of [
                        [-1, 1],
                        [-1, 2],
                        [-2, 1],
                        [-1, 3],
                        [-3, 1],
                      ]) {
                        const v = cur.slice();
                        v[i] += di;
                        v[j] += dj;
                        add(v);
                      }
                }
                moves.sort((p, q) => q.s - p.s);
                let moved = false;
                for (
                  let t = 0;
                  t < Math.min(moves.length, CONFIG.LOCAL_SEARCH_TRIES);
                  t++
                ) {
                  if (oracle(moves[t].v).ok) {
                    cur = moves[t].v;
                    curS = moves[t].s;
                    record(cur);
                    moved = true;
                    break;
                  }
                }
                if (!moved) break;
              }
              return cur;
            };
            for (const mode of ["match", "balanced", "util"]) {
              const ranked = [...pool.values()].sort(
                (p, q) => score(q, mode) - score(p, mode),
              );
              ranked.slice(0, 2).forEach((start) => localSearch(start, mode));
            }
          }
          if (!pool.size)
            return {
              ok: false,
              warnings,
              errors: [
                `No carton combination could be placed on this ${geom.kind}.`,
              ],
            };

          /* C — scenario assembly: best physically-validated combination per objective. */
          const modes = fixed
            ? [CONFIG.MODE_WEIGHTS[req.mode] ? req.mode : "balanced"]
            : M.length
              ? ["match", "balanced", "util"]
              : ["balanced"];
          const scenarios = [];
          for (const mode of modes) {
            const ranked = [...pool.values()].sort(
              (p, q) =>
                score(q, mode) - score(p, mode) || sumArr(q) - sumArr(p),
            );
            for (const n of ranked.slice(0, 8)) {
              const plan = unitPlanFor(ctx, n);
              if (!plan || !plan.validation.ok) continue;
              scenarios.push(makeScenario(mode, n, plan));
              break;
            }
          }
          if (!scenarios.length)
            return {
              ok: false,
              warnings,
              errors: [
                fixed
                  ? "The adjusted carton combination could not be placed physically – choose a smaller addition."
                  : "No candidate passed physical validation.",
              ],
            };
          if (fixed) scenarios[0].label = "Adjusted plan";
          /* Traffic-light assessment and fill-up advice for each distinct scenario. */
          const mixEval = (nb) => {
            const m = metrics(nb);
            return { within: m.within, of: M.length, maxDev: r1(m.maxDev) };
          };
          const fillCache = new Map();
          scenarios.forEach((sc) => {
            if (req.noFill) {
              sc.fill = null;
              return;
            }
            const maxAdd = items.map((_, i) =>
              rows[i].added
                ? Infinity
                : locked[i]
                  ? 0
                  : isFinite(rowMax[i])
                    ? rowMax[i] - sc.counts[i]
                    : Infinity,
            );
            if (!fillCache.has(sc.key))
              fillCache.set(
                sc.key,
                fillSuggestions(
                  req,
                  rows.map((r) => r.product),
                  sc.counts,
                  { mixEval, maxAdd },
                ),
              );
            sc.fill = fillCache.get(sc.key);
            applyFillToAssessment(sc.assessment, sc.fill);
          });
          scenarios.forEach((sc, k) => {
            const same = scenarios.findIndex((o) => o.key === sc.key);
            sc.sameAs = same < k ? same : null;
          });
          const recIdx = Math.max(
            0,
            scenarios.findIndex(
              (s) => s.mode === (M.length ? req.mode : "balanced"),
            ),
          );
          scenarios.forEach((sc, k) => {
            sc.recommended = k === recIdx;
            sc.explanation = explain(sc, k);
          });
          if (oracle.exhausted())
            warnings.push(
              `Search budget of ${CONFIG.MAX_PACK_EVALUATIONS} packing attempts reached – results are the best found within the budget.`,
            );
          const st = oracle.stats();

          function makeScenario(mode, n, plan) {
            const m = metrics(n);
            let Ball = 0;
            items.forEach((_, i) => {
              Ball += n[i] * f[i];
            });
            const rowsOut = items.map((it, i) => {
              const d = m.dev[i];
              let status;
              if (rows[i].added) status = "Added (extra)";
              else if (locked[i]) status = "Locked quantity";
              else if (n[i] === 0 && targets[i] > 0)
                status = "Not loaded – below target";
              else if (Math.abs(d) <= tol + 1e-9) status = "Within tolerance";
              else status = d > 0 ? "Above target" : "Below target";
              return {
                productId: it.id,
                sku: it.sku,
                target: targets[i],
                priority: prio[i],
                locked: locked[i],
                added: !!rows[i].added,
                min: isNum(rows[i].min) ? Number(rows[i].min) : null,
                max: isNum(rows[i].max) ? Number(rows[i].max) : null,
                cartons: n[i],
                unitsPerCarton: it.units,
                units: n[i] * it.units,
                weight: r2(n[i] * it.weight),
                achieved: m.ach[i],
                deviation: d,
                share: Ball > 0 ? (100 * n[i] * f[i]) / Ball : 0,
                status,
              };
            });
            const exact = M.every(
              (i) => Math.abs(m.dev[i]) <= CONFIG.EXACT_MATCH_PP,
            );
            const quality = !M.length
              ? "LOCKED QUANTITIES ONLY"
              : exact
                ? "EXACT TARGET MATCH"
                : m.within === M.length
                  ? "WITHIN TARGET TOLERANCE"
                  : "TARGET APPROXIMATION REQUIRED";
            const achievedTotal = M.reduce((s, i) => s + m.ach[i], 0);
            return {
              key: n.join(","),
              mode,
              label: CONFIG.MODE_WEIGHTS[mode].label,
              counts: n.slice(),
              rows: rowsOut,
              metrics: {
                E: m.E,
                maxDev: m.maxDev,
                within: m.within,
                of: M.length,
                excess: m.excess,
                volUtil: m.volUtil,
                wUtil: m.wUtil,
                capUtil: m.capUtil,
                total: m.total,
                weight: m.weight,
                score: score(n, mode),
              },
              targetTotal: M.reduce((s, i) => s + targets[i], 0),
              achievedTotal,
              quality,
              facts: [
                `${m.within} of ${M.length} SKUs are within ±${fmt(tol, 1)} percentage-point tolerance.`,
                `Maximum SKU deviation: ${fmt(m.maxDev, 1)} percentage points.`,
                `Weighted total deviation: ${fmt(m.E, 1)} (Σ priority weight × |achieved − target|).`,
              ],
              constraint: analyseConstraints(n, plan),
              plan,
              assessment: assessPlan(
                ctx,
                plan,
                {
                  within: m.within,
                  of: M.length,
                  maxDev: m.maxDev,
                  tol,
                  notLoaded: M.filter((i) => n[i] === 0 && targets[i] > 0).map(
                    (i) => items[i].sku,
                  ),
                  worstSku: M.length
                    ? items[
                        M.reduce(
                          (w, i) =>
                            Math.abs(m.dev[i]) > Math.abs(m.dev[w]) ? i : w,
                          M[0],
                        )
                      ].sku
                    : "",
                },
                req.assessment,
              ),
            };
          }

          function analyseConstraints(n, plan) {
            const reasons = new Set(),
              perSku = [];
            const clearance = plan.kpis.remainingHeight;
            const cands = M.length
              ? M
              : items.map((_, i) => i).filter((i) => !locked[i]);
            for (const i of cands) {
              let r;
              if (n[i] >= rowMax[i]) r = "SKU MAXIMUM";
              else {
                const v = n.slice();
                v[i]++;
                if (weightOf(ctx, v) > geom.maxNet + 1e-9) r = "WEIGHT";
                else if (packCounts(ctx, v, false).ok) r = "TARGET MIX";
                else
                  r =
                    clearance <
                    Math.min(...items[i].stances.map((s) => s.h)) - EPS
                      ? "HEIGHT"
                      : "FOOTPRINT";
              }
              reasons.add(r);
              perSku.push({ sku: items[i].sku, reason: r });
            }
            const factors = [...reasons];
            return {
              primary:
                factors.length === 1
                  ? factors[0]
                  : factors.length
                    ? "COMBINATION OF FACTORS"
                    : "LOCKED QUANTITIES",
              factors,
              perSku,
            };
          }

          function explain(sc, k) {
            const w = CONFIG.MODE_WEIGHTS[sc.mode],
              m = sc.metrics;
            if (fixed) {
              const out = [
                `This adjusted plan uses exactly the cartons you chose (the plan it came from plus the added cartons). It was re-planned from scratch and passed the physical check within the ${unitLimitsText(geom)}.`,
                `${sc.quality}: ${sc.facts[0]}`,
              ];
              if (sc.constraint.perSku.length)
                out.push(
                  `Why not one more carton? ${sc.constraint.perSku.map((p) => `${p.sku}: ${p.reason.toLowerCase()}`).join("; ")}.`,
                );
              return out;
            }
            const txt = [
              `Scenario ${k + 1} (${w.label}) has the highest "${w.label}" score among all physically valid combinations found: capacity utilisation ${fmt(m.capUtil, 1)}% − ${w.lambda} × weighted deviation ${fmt(m.E, 1)} − ${w.tolPenalty} × out-of-tolerance deviation ${fmt(m.excess, 1)} (+ ${w.qty} per carton).`,
              `It fits within the ${unitLimitsText(geom)}. ${sc.quality}: ${sc.facts[0]}`,
            ];
            if (sc.recommended)
              txt.push(
                `It is the recommended scenario because the selected optimisation priority is "${req.mode === "match" ? "Best match to target mix" : req.mode === "util" ? "Maximum pallet utilisation" : "Balanced"}".`,
              );
            const c = sc.constraint;
            if (c.perSku.length)
              txt.push(
                `Why not one more carton? ${c.perSku.map((p) => `${p.sku}: ${p.reason.toLowerCase()}`).join("; ")}.`,
              );
            return txt;
          }

          return {
            ok: true,
            warnings,
            errors: [],
            scenarios,
            recommended: recIdx,
            input: {
              basis,
              tolerance: tol,
              mode: req.mode,
              unitName: geom.name,
            },
            details: {
              unit: geomSummary(geom),
              limits: unitLimitsText(geom),
              products: items.map((it, i) => ({
                sku: it.sku,
                dims: `${it.l} × ${it.w} × ${it.h} mm`,
                units: it.units,
                weight: it.weight,
                orientations: it.stances.map(stanceLabel),
                singleCap: capSingle[i],
                min: lo[i],
                max: isFinite(hi[i]) ? hi[i] : null,
                locked: locked[i],
                target: targets[i],
                priority: prio[i],
                priorityWeight: pw[i],
              })),
              search: Object.assign(st, {
                candidatesKept: pool.size,
                ms: Date.now() - t0,
                budget: CONFIG.MAX_PACK_EVALUATIONS,
              }),
              basis,
              tolerance: tol,
              modeWeights: CONFIG.MODE_WEIGHTS,
              priorityWeights: CONFIG.PRIORITY_WEIGHTS,
            },
          };
        }

        /* ================ MODE 3 / 4 — EXACT & MULTI-UNIT PLANNING ============= */
        function countsFromRows(rows, items, basis, errors) {
          return rows.map((r, i) => {
            const q = Number(r.qty);
            if (!isNum(r.qty) || q < 0) {
              errors.push(`${items[i].sku}: quantity must be a number ≥ 0.`);
              return 0;
            }
            if (basis === "units") return Math.ceil(q / items[i].units - 1e-9);
            if (!Number.isInteger(q)) {
              errors.push(
                `${items[i].sku}: carton quantity must be a whole number.`,
              );
              return 0;
            }
            return q;
          });
        }

        function fillOneUnit(ctx, oracle, rem) {
          const zero = rem.map(() => 0);
          const pickProp = (trial, blocked) => {
            let best = -1,
              bestV = Infinity;
            for (let i = 0; i < rem.length; i++) {
              if (blocked.has(i) || trial[i] >= rem[i]) continue;
              const v = (trial[i] + 1) / rem[i];
              if (
                v < bestV - 1e-12 ||
                (Math.abs(v - bestV) <= 1e-12 &&
                  ctx.items[i].vol > ctx.items[best].vol)
              ) {
                bestV = v;
                best = i;
              }
            }
            return best;
          };
          const pickBig = (trial, blocked) => {
            let best = -1;
            for (let i = 0; i < rem.length; i++) {
              if (blocked.has(i) || trial[i] >= rem[i]) continue;
              if (best < 0 || ctx.items[i].vol > ctx.items[best].vol) best = i;
            }
            return best;
          };
          const a = greedyGrow(zero, pickProp, oracle);
          const aFill = greedyGrow(a, pickBig, oracle);
          const b = greedyGrow(zero, pickBig, oracle);
          return volOf(ctx, aFill) >= volOf(ctx, b) ? aFill : b;
        }

        function allocateShipment(ctx, counts, hooks) {
          const S = counts.length;
          let exhausted = false;
          const runVariant = (pureFirst) => {
            const oracle = makeOracle(ctx, hooks);
            const rem = counts.slice(),
              units = [];
            if (pureFirst)
              for (let i = 0; i < S; i++) {
                const cap = singleCapacity(ctx, i);
                while (
                  cap > 0 &&
                  rem[i] >= cap &&
                  units.length < CONFIG.MAX_UNITS
                ) {
                  const u = counts.map(() => 0);
                  u[i] = cap;
                  units.push(u);
                  rem[i] -= cap;
                }
              }
            while (rem.some((v) => v > 0)) {
              if (units.length >= CONFIG.MAX_UNITS)
                return {
                  units,
                  error: `More than ${CONFIG.MAX_UNITS} load units would be required.`,
                };
              let u = oracle.exhausted() ? null : fillOneUnit(ctx, oracle, rem);
              if (!u || sumArr(u) === 0) {
                /* Search budget used up (or nothing found): fall back to a single-SKU load, which always fits. */
                const i = rem.findIndex((v) => v > 0),
                  cap = singleCapacity(ctx, i);
                if (cap <= 0)
                  return {
                    units,
                    error: `${ctx.items[i].sku} cannot be placed even on an empty load unit.`,
                  };
                u = counts.map(() => 0);
                u[i] = Math.min(cap, rem[i]);
              }
              units.push(u);
              for (let i = 0; i < S; i++) rem[i] -= u[i];
            }
            if (oracle.exhausted()) exhausted = true;
            return { units };
          };
          const A = runVariant(true),
            B = runVariant(false);
          const pick =
            A.error && B.error
              ? A
              : A.error
                ? B
                : B.error
                  ? A
                  : B.units.length < A.units.length
                    ? B
                    : A;
          return Object.assign({ exhausted }, pick);
        }

        function evenSplit(ctx, oracle, counts, maxP) {
          const S = counts.length,
            g = ctx.geom;
          const totalVol = volOf(ctx, counts),
            totalW = weightOf(ctx, counts);
          const lb = Math.max(
            1,
            Math.ceil(
              totalVol / ((g.L + 2 * g.ov) * (g.W + 2 * g.ov) * g.usableH) -
                1e-9,
            ),
            isFinite(g.maxNet) ? Math.ceil(totalW / g.maxNet - 1e-9) : 1,
          );
          for (let P = lb; P <= Math.min(maxP, CONFIG.MAX_UNITS); P++) {
            const units = Array.from({ length: P }, () => counts.map(() => 0));
            let offset = 0;
            for (let i = 0; i < S; i++) {
              const base = Math.floor(counts[i] / P),
                extra = counts[i] % P;
              for (let p = 0; p < P; p++) units[p][i] = base;
              for (let e = 0; e < extra; e++) units[(offset + e) % P][i]++;
              offset = (offset + extra) % P;
            }
            if (units.every((u) => sumArr(u) === 0 || oracle(u).ok))
              return {
                units: units.filter((u) => sumArr(u) > 0),
                lowerBound: lb,
              };
            if (oracle.exhausted()) break;
          }
          return null;
        }

        function describeCounts(ctx, n) {
          return ctx.items
            .map((it, i) => (n[i] ? `${it.sku} × ${n[i]}` : null))
            .filter(Boolean)
            .join(", ");
        }

        function unitOutputs(ctx, list, req, rows) {
          return list.map((n, k) => {
            const plan = unitPlanFor(ctx, n);
            const u = {
              no: k + 1,
              counts: n,
              description: describeCounts(ctx, n),
              plan,
              ok: !!(plan && plan.validation.ok),
            };
            if (plan) {
              u.assessment = assessPlan(ctx, plan, null, req && req.assessment);
              u.fill =
                req && rows && !req.noFill && list.length <= 20
                  ? fillSuggestions(
                      req,
                      rows.map((r) => r.product),
                      n,
                    )
                  : null;
              applyFillToAssessment(u.assessment, u.fill);
            }
            return u;
          });
        }

        function planExact(req, hooks) {
          const rows = req.rows || [];
          if (!rows.length)
            return {
              ok: false,
              errors: [
                "No SKU selected. Add at least one SKU with a quantity.",
              ],
            };
          const prep = prepare(
            req,
            rows.map((r) => r.product),
          );
          if (prep.errors.length)
            return { ok: false, errors: prep.errors, warnings: prep.warnings };
          const { ctx, geom, items } = prep;
          const errors = [];
          const counts = countsFromRows(rows, items, req.basis, errors);
          if (!errors.length && counts.every((v) => v === 0))
            errors.push("All quantities are zero.");
          if (errors.length) return { ok: false, errors };
          const oracle = makeOracle(ctx, hooks);
          const base = {
            ok: true,
            warnings: prep.warnings,
            basis: req.basis,
            required: items.map((it, i) => ({
              sku: it.sku,
              productId: it.id,
              qty: Number(rows[i].qty),
              cartons: counts[i],
              units: counts[i] * it.units,
              unitsPerCarton: it.units,
            })),
            unit: geomSummary(geom),
            limits: unitLimitsText(geom),
          };
          const whole = unitPlanFor(ctx, counts);
          if (whole && whole.validation.ok)
            return Object.assign(base, {
              fits: true,
              loaded: counts,
              remaining: counts.map(() => 0),
              additionalUnits: 0,
              units: unitOutputs(ctx, [counts], req, rows),
              evaluations: oracle.stats(),
            });
          let first = fillOneUnit(ctx, oracle, counts);
          if (sumArr(first) === 0) {
            const i = counts.findIndex((v) => v > 0);
            first = counts.map(() => 0);
            first[i] = Math.min(counts[i], singleCapacity(ctx, i));
          }
          const remaining = counts.map((v, i) => v - first[i]);
          const rest = allocateShipment(ctx, remaining, hooks);
          const units = unitOutputs(ctx, [first].concat(rest.units), req, rows);
          if (rest.exhausted || oracle.exhausted())
            base.warnings = base.warnings.concat([
              "Large order: the search budget was reached, so the split over several load units may use slightly more units than the minimum.",
            ]);
          return Object.assign(base, {
            fits: false,
            loaded: first,
            remaining,
            additionalUnits: rest.units.length,
            units,
            error: rest.error || null,
            evaluations: oracle.stats(),
          });
        }

        function planMulti(req, hooks) {
          const rows = req.rows || [];
          if (!rows.length)
            return {
              ok: false,
              errors: [
                "No SKU selected. Add at least one SKU with a quantity.",
              ],
            };
          const prep = prepare(
            req,
            rows.map((r) => r.product),
          );
          if (prep.errors.length)
            return { ok: false, errors: prep.errors, warnings: prep.warnings };
          const { ctx, geom, items } = prep;
          const errors = [];
          const counts = countsFromRows(rows, items, req.basis, errors);
          if (!errors.length && counts.every((v) => v === 0))
            errors.push("All quantities are zero.");
          if (errors.length) return { ok: false, errors };
          const oracle = makeOracle(ctx, hooks);
          const warnings = prep.warnings.slice();
          const g = geom;
          const lowerBound = Math.max(
            1,
            Math.ceil(volOf(ctx, counts) / (g.L * g.W * g.usableH) - 1e-9),
            isFinite(g.maxNet)
              ? Math.ceil(weightOf(ctx, counts) / g.maxNet - 1e-9)
              : 1,
          );
          const ship = allocateShipment(ctx, counts, hooks);
          if (ship.exhausted)
            warnings.push(
              "Large shipment: the search budget was reached, so the allocation may use slightly more load units than the minimum.",
            );
          let list = ship.units,
            strategyUsed = "shipment";
          if (req.strategy === "perUnit") {
            const ev = evenSplit(
              ctx,
              oracle,
              counts,
              Math.max(ship.units.length + 3, lowerBound + 3),
            );
            if (ev) {
              list = ev.units;
              strategyUsed = "perUnit";
            } else
              warnings.push(
                "An even split with the same proportions on every pallet could not be found within the search limit; the minimum-pallet shipment allocation is shown instead.",
              );
          }
          if (ship.error && strategyUsed === "shipment")
            return { ok: false, errors: [ship.error], warnings };
          const units = unitOutputs(ctx, list, req, rows);
          const totals = {
            cartons: sumArr(counts),
            units: counts.reduce((s, n, i) => s + n * items[i].units, 0),
            weight: r2(weightOf(ctx, counts)),
          };
          return {
            ok: true,
            warnings,
            strategy: strategyUsed,
            requestedStrategy: req.strategy,
            basis: req.basis,
            required: items.map((it, i) => ({
              sku: it.sku,
              productId: it.id,
              qty: Number(rows[i].qty),
              cartons: counts[i],
              units: counts[i] * it.units,
            })),
            units,
            unitCount: units.length,
            lowerBound,
            totals,
            unit: geomSummary(geom),
            limits: unitLimitsText(geom),
            evaluations: oracle.stats(),
          };
        }

        /* ================== LOADED PALLETS INTO A CONTAINER ====================
     Treats each loaded pallet as one rigid box and re-uses the same 2-D
     pattern solver, stacking tiers and validation. */
        function planPalletsInContainer(req) {
          const errors = [],
            warnings = [];
          const C = req.container || {},
            P = req.pallet || {};
          const loadedH = num(req.loadedHeight),
            gross = num(req.grossPerPallet),
            qty = Math.max(0, Math.floor(num(req.quantity)));
          const tiersAllowed = Math.max(1, Math.floor(num(req.maxTiers, 1)));
          if (!(num(C.length) > 0 && num(C.width) > 0 && num(C.height) > 0))
            errors.push("Invalid container dimensions.");
          if (!(num(P.length) > 0 && num(P.width) > 0))
            errors.push("Invalid pallet dimensions.");
          if (!(loadedH > 0))
            errors.push(
              "Enter the loaded pallet height (including the pallet base).",
            );
          if (!(gross > 0))
            errors.push("Enter the gross weight per loaded pallet.");
          if (loadedH > num(C.height))
            errors.push(
              `Loaded pallet height ${loadedH} mm exceeds the container internal height ${C.height} mm.`,
            );
          if (optPos(C.doorHeight) && loadedH > Number(C.doorHeight))
            errors.push(
              `Loaded pallet height ${loadedH} mm exceeds the door opening height ${C.doorHeight} mm – the pallet cannot be loaded.`,
            );
          if (optPos(C.maxPayload) && gross > Number(C.maxPayload))
            errors.push(
              `One pallet (${gross} kg) is heavier than the container payload (${C.maxPayload} kg).`,
            );
          if (errors.length) return { ok: false, errors };
          const unit = {
            kind: "container",
            name: C.name,
            L: num(C.length),
            W: num(C.width),
            maxHeight: num(C.height),
            baseHeight: 0,
            topClearance: 0,
            maxGross: C.maxPayload,
          };
          const pseudo = {
            id: "__pallet",
            sku: P.name || "Pallet",
            length: P.length,
            width: P.width,
            height: loadedH,
            dimUnit: "mm",
            unitsPerCarton: 1,
            weight: gross,
            keepUpright: true,
            maxStackLayers: tiersAllowed,
            canSupport: true,
          };
          const prep = prepare(
            { unit, orientationPolicy: "upright", clearance: req.clearance },
            [pseudo],
          );
          if (prep.errors.length) return { ok: false, errors: prep.errors };
          const { ctx, geom } = prep;
          const it = ctx.items[0];
          const sp = singleSkuPlan(ctx, it);
          if (!sp)
            return {
              ok: false,
              errors: [
                "The pallet footprint does not fit inside the container.",
              ],
            };
          const perFloor = sp.perLayer,
            tiers = sp.baseLayers;
          const spaceCap = sp.total;
          const weightCap = isFinite(geom.maxNet)
            ? Math.floor(geom.maxNet / gross + EPS)
            : Infinity;
          const perContainer = Math.min(spaceCap, weightCap);
          if (perContainer < 1)
            return {
              ok: false,
              errors: ["No pallet can be loaded into this container."],
            };
          const containers = qty ? Math.ceil(qty / perContainer) : null;
          const load1 = qty ? Math.min(qty, perContainer) : perContainer;
          const cartons = trimTop(singleCartons(sp, 0), load1);
          const plan = buildPlan(
            ctx,
            { cartons, meta: { strategy: "Pallet floor pattern" } },
            [cartons.length],
          );
          const RL = num(C.length),
            RW = num(C.width),
            PL = num(P.length),
            PW = num(P.width);
          const simpleGrid = Math.max(
            Math.floor(RL / PL) * Math.floor(RW / PW),
            Math.floor(RL / PW) * Math.floor(RW / PL),
          );
          const constraint =
            weightCap < spaceCap
              ? "WEIGHT (payload)"
              : tiers < tiersAllowed
                ? "FLOOR SPACE + HEIGHT"
                : tiersAllowed === 1
                  ? "FLOOR SPACE (pallets not stackable)"
                  : "FLOOR SPACE";
          const assessment = assessPlan(ctx, plan, null, req.assessment);
          const spare = qty ? containers * perContainer - qty : 0;
          /* For loaded pallets the meaningful "space used" is pallet positions, not cubic volume. */
          const A = assessOptions(req.assessment);
          const posUtil = r1((100 * load1) / perContainer);
          const spaceCheck = assessment.checks.find((c) => c.key === "space");
          spaceCheck.status =
            posUtil >= A.greenSpace
              ? "green"
              : posUtil >= A.amberSpace
                ? "amber"
                : "red";
          spaceCheck.message = `${load1} of ${perContainer} pallet positions used in container 1 (${fmt(posUtil, 0)}%); floor area covered ${fmt((100 * perFloor * PL * PW) / (RL * RW), 0)}%.`;
          spaceCheck.action =
            qty && spare > 0
              ? `${spare} more pallet${spare > 1 ? "s" : ""} of this size would still fit in the last container.`
              : qty
                ? "Every pallet position is used."
                : "";
          Object.assign(assessment.space, {
            capUtil: posUtil,
            basis: "positions",
            freeText: `${perContainer - load1} of ${perContainer} pallet positions free in container 1`,
          });
          summariseAssessment(assessment);
          if (tiersAllowed > 1 && tiers < tiersAllowed)
            warnings.push(
              `Stacking ${tiersAllowed} high is not possible: ${tiersAllowed} × ${loadedH} mm exceeds the ${C.height} mm internal height.`,
            );
          return {
            ok: true,
            warnings,
            plan,
            assessment,
            spare,
            perFloor,
            tiers,
            spaceCap,
            weightCap: isFinite(weightCap) ? weightCap : null,
            perContainer,
            containers,
            quantity: qty,
            lastContainerLoad: qty
              ? qty - (containers - 1) * perContainer
              : null,
            simpleGrid,
            constraint,
            floorUtil: r1((100 * perFloor * PL * PW) / (RL * RW)),
            grossPerContainer: r2(load1 * gross),
            container: {
              name: C.name,
              length: RL,
              width: RW,
              height: num(C.height),
              doorHeight: C.doorHeight,
              maxPayload: C.maxPayload,
            },
            pallet: {
              name: P.name,
              length: PL,
              width: PW,
              loadedHeight: loadedH,
              gross,
            },
          };
        }

        /* =============================== SELF-TESTS ============================ */
        function runSelfTests(data, hooks) {
          const t0 = Date.now();
          data = data && data.products ? data : DEFAULTS;
          const out = [];
          const add = (group, name, pass, detail) =>
            out.push({ group, name, pass: !!pass, detail });
          const P = (sku) => data.products.find((p) => p.sku === sku);
          const pal = (id) => data.pallets.find((p) => p.id === id);
          const unitOf = (p) => ({
            kind: "pallet",
            name: p.name,
            L: p.length,
            W: p.width,
            maxHeight: p.maxHeight,
            baseHeight: p.baseHeight,
            tare: p.tare,
            maxGross: p.maxGross,
          });
          const euro = pal("pal-euro"),
            ind = pal("pal-industrial");
          /* Verified lower bounds (uniform grid × FLOOR(1800 / height)); the solver may only meet or beat them. */
          const expected = {
            P12C2D0: { euro: 48, ind: 64 },
            P17C2D2: { euro: 48, ind: 48 },
            P24C2D2: { euro: 24, ind: 36 },
            "Carbon Filters": { euro: 20, ind: 30 },
            POSTreat: { euro: 8, ind: 8 },
            "Refill Media": { euro: 20, ind: 30 },
          };
          for (const sku of Object.keys(expected))
            for (const [key, pl] of [
              ["euro", euro],
              ["ind", ind],
            ]) {
              const r = calcSingle({
                unit: unitOf(pl),
                product: P(sku),
                orientationPolicy: "sku",
                clearance: 0,
              });
              const exp = expected[sku][key];
              const ok =
                r.ok &&
                r.plan.validation.ok &&
                r.summary.maxCartons >= exp &&
                r.plan.kpis.stackHeight <= pl.maxHeight;
              add(
                "Single SKU",
                `${sku} on ${pl.name}`,
                ok,
                r.ok
                  ? `${r.summary.perLayer}/layer × ${r.summary.layers} layers = ${r.summary.maxCartons} cartons, ${fmt(r.summary.totalUnits)} units, ${fmt(r.plan.kpis.netWeight, 2)} kg, stack ${r.plan.kpis.stackHeight} mm (expected ≥ ${exp}); validation ${r.plan.validation.ok ? "passed" : "FAILED: " + r.plan.validation.errors.join(" ")}`
                  : r.errors.join(" "),
              );
            }
          const mixTests = [
            {
              name: "TEST A",
              title: "Europe · P12C2D0 50% / P17C2D2 50% · basis cartons",
              pallet: euro,
              basis: "cartons",
              rows: [
                ["P12C2D0", 50],
                ["P17C2D2", 50],
              ],
            },
            {
              name: "TEST B",
              title:
                "Industrial · P12C2D0 40 / P17C2D2 25 / Carbon 20 / POSTreat 15 · cartons",
              pallet: ind,
              basis: "cartons",
              rows: [
                ["P12C2D0", 40],
                ["P17C2D2", 25],
                ["Carbon Filters", 20],
                ["POSTreat", 15],
              ],
            },
            {
              name: "TEST C",
              title:
                "Industrial · Carbon 50 / POSTreat 30 / Refill 20 · saleable units",
              pallet: ind,
              basis: "units",
              rows: [
                ["Carbon Filters", 50],
                ["POSTreat", 30],
                ["Refill Media", 20],
              ],
            },
            {
              name: "TEST D",
              title:
                "Europe · P24C2D2 50 / Carbon 25 / POSTreat 25 · cartons · max gross 500 kg",
              pallet: euro,
              basis: "cartons",
              maxGross: 500,
              rows: [
                ["P24C2D2", 50],
                ["Carbon Filters", 25],
                ["POSTreat", 25],
              ],
            },
            {
              name: "TEST E",
              title: "Industrial · six-SKU example 35/25/15/10/10/5 · cartons",
              pallet: ind,
              basis: "cartons",
              rows: [
                ["P12C2D0", 35],
                ["P17C2D2", 25],
                ["P24C2D2", 15],
                ["Carbon Filters", 10],
                ["POSTreat", 10],
                ["Refill Media", 5],
              ],
            },
          ];
          for (const t of mixTests) {
            const unit = unitOf(t.pallet);
            if (t.maxGross) unit.maxGross = t.maxGross;
            const tsum = t.rows.reduce((s, r) => s + r[1], 0);
            const group = `${t.name} – ${t.title}`;
            add(
              group,
              "Target percentages total 100%",
              Math.abs(tsum - 100) < 1e-9,
              `${tsum}%`,
            );
            const req = {
              unit,
              orientationPolicy: "sku",
              clearance: 0,
              basis: t.basis,
              tolerance: 5,
              mode: "balanced",
              rows: t.rows.map(([sku, target]) => ({
                product: P(sku),
                target,
                priority: "Normal",
                min: null,
                max: null,
                locked: false,
                lockedQty: null,
              })),
            };
            const r = optimiseMix(req, hooks);
            if (!r.ok) {
              add(group, "Optimisation", false, r.errors.join(" "));
              continue;
            }
            const items = req.rows.map((x) => normaliseProduct(x.product));
            const f = items.map((it) =>
              t.basis === "units"
                ? it.units
                : t.basis === "weight"
                  ? it.weight
                  : 1,
            );
            r.scenarios.forEach((sc, k) => {
              const v = sc.plan.validation,
                kp = sc.plan.kpis;
              const got = sc.counts.map(() => 0);
              sc.plan.placements.forEach((p) => {
                got[p.itemIdx]++;
              });
              const countsOk =
                got.every((g, i) => g === sc.counts[i]) &&
                sc.rows.every((row, i) => row.cartons === sc.counts[i]);
              const B = sc.counts.reduce((s, n, i) => s + n * f[i], 0);
              let pctOk = true,
                sumAch = 0;
              sc.rows.forEach((row, i) => {
                const ach = B > 0 ? (100 * sc.counts[i] * f[i]) / B : 0;
                sumAch += ach;
                if (
                  Math.abs(ach - row.achieved) > 1e-9 ||
                  Math.abs(ach - t.rows[i][1] - row.deviation) > 1e-9
                )
                  pctOk = false;
              });
              if (Math.abs(sumAch - 100) > 1e-6) pctOk = false;
              const heightOk =
                kp.stackHeight <=
                t.pallet.maxHeight - (t.pallet.baseHeight || 0) + 1e-6;
              const weightOk =
                !t.maxGross || kp.grossWeight <= t.maxGross + 1e-9;
              const unitsOk =
                kp.totalUnits ===
                sc.counts.reduce((s, n, i) => s + n * items[i].units, 0);
              add(
                group,
                `Scenario ${k + 1} – ${sc.label}${sc.recommended ? " (recommended)" : ""}`,
                v.ok && countsOk && pctOk && heightOk && weightOk && unitsOk,
                `${sc.rows.map((row) => `${row.sku} ${row.cartons} ctn = ${fmt(row.achieved, 1)}% (target ${row.target}%, ${row.deviation >= 0 ? "+" : ""}${fmt(row.deviation, 1)} pp)`).join(" · ")} | ${kp.totalCartons} cartons, ${fmt(kp.totalUnits)} units, ${fmt(kp.grossWeight, 2)} kg gross, stack ${kp.stackHeight} mm, volume ${kp.volumeUtil}% | fit ${v.checks.bounds ? "✓" : "✗"} overlap-free ${v.checks.overlap ? "✓" : "✗"} supported ${v.checks.support ? "✓" : "✗"} height ${heightOk ? "✓" : "✗"} weight ${weightOk ? "✓" : "✗"} % recalculated ${pctOk ? "✓" : "✗"} counts ${countsOk && unitsOk ? "✓" : "✗"}`,
              );
            });
          }
          {
            const rows = [
              ["P12C2D0", 10],
              ["P17C2D2", 15],
              ["Carbon Filters", 6],
              ["POSTreat", 4],
            ].map(([sku, qty]) => ({ product: P(sku), qty }));
            const r = planExact({
              unit: unitOf(ind),
              orientationPolicy: "sku",
              clearance: 0,
              basis: "cartons",
              rows,
            });
            add(
              "Exact quantity",
              "Industrial · P12 10 / P17 15 / Carbon 6 / POSTreat 4",
              r.ok && r.units.every((u) => u.ok),
              r.ok
                ? `${r.fits ? "Fits on one pallet" : `Does not fit – ${r.additionalUnits} additional pallet(s)`}; ${r.units.map((u) => `pallet ${u.no}: ${u.description} (stack ${u.plan.kpis.stackHeight} mm, validation ${u.ok ? "passed" : "FAILED"})`).join(" | ")}`
                : r.errors.join(" "),
            );
            const r2u = planExact({
              unit: unitOf(euro),
              orientationPolicy: "sku",
              clearance: 0,
              basis: "units",
              rows: [{ product: P("Refill Media"), qty: 700 }],
            });
            add(
              "Exact quantity",
              "Europe · Refill Media 700 saleable units (→ CEILING(700/34) = 21 cartons)",
              r2u.ok &&
                r2u.required[0].cartons === 21 &&
                r2u.units.every((u) => u.ok),
              r2u.ok
                ? `${r2u.required[0].cartons} cartons required; ${r2u.fits ? "fits" : `loaded ${sumArr(r2u.loaded)}, remaining ${sumArr(r2u.remaining)}, additional pallets ${r2u.additionalUnits}`}`
                : r2u.errors.join(" "),
            );
          }
          {
            const rows = [
              ["P12C2D0", 80],
              ["P17C2D2", 50],
              ["Carbon Filters", 30],
              ["POSTreat", 20],
            ].map(([sku, qty]) => ({ product: P(sku), qty }));
            for (const strategy of ["shipment", "perUnit"]) {
              const r = planMulti({
                unit: unitOf(ind),
                orientationPolicy: "sku",
                clearance: 0,
                basis: "cartons",
                strategy,
                rows,
              });
              const sums = r.ok
                ? rows.map((_, i) =>
                    r.units.reduce((s, u) => s + u.counts[i], 0),
                  )
                : [];
              const ok =
                r.ok &&
                r.units.every((u) => u.ok) &&
                sums.every((s, i) => s === rows[i].qty);
              add(
                "Multi-pallet",
                `Industrial · 80/50/30/20 cartons · ${strategy === "shipment" ? "mix across shipment" : "mix on each pallet"}`,
                ok,
                r.ok
                  ? `${r.unitCount} pallets (volume lower bound ${r.lowerBound}, rule used: ${r.strategy}); all quantities allocated exactly: ${sums.every((s, i) => s === rows[i].qty) ? "yes" : "NO"}; ${r.units.map((u) => `P${u.no}: ${u.description}`).join(" | ")}`
                  : r.errors.join(" "),
              );
            }
          }
          {
            const c40 = data.containers.find((c) => c.id === "c-40hc");
            const cu = {
              kind: "container",
              name: c40.name,
              L: c40.length,
              W: c40.width,
              maxHeight: c40.height,
              topClearance: c40.topClearance,
              maxGross: c40.maxPayload,
              doorHeight: c40.doorHeight,
            };
            const r = calcSingle({
              unit: cu,
              product: P("P12C2D0"),
              orientationPolicy: "sku",
              clearance: 0,
            });
            add(
              "Container – loose cartons",
              `P12C2D0 in ${c40.name}`,
              r.ok && r.plan.validation.ok,
              r.ok
                ? `${r.summary.perLayer}/layer × ${r.summary.layers} = ${r.summary.maxCartons} cartons, ${fmt(r.plan.kpis.grossWeight, 0)} kg, volume ${r.plan.kpis.volumeUtil}%`
                : r.errors.join(" "),
            );
            const m = optimiseMix(
              {
                unit: cu,
                orientationPolicy: "sku",
                clearance: 0,
                basis: "cartons",
                tolerance: 5,
                mode: "balanced",
                rows: [
                  ["P12C2D0", 40],
                  ["Carbon Filters", 30],
                  ["POSTreat", 30],
                ].map(([sku, target]) => ({
                  product: P(sku),
                  target,
                  priority: "Normal",
                  locked: false,
                })),
              },
              hooks,
            );
            const sc = m.ok ? m.scenarios[m.recommended] : null;
            add(
              "Container – loose cartons",
              `Target mix 40/30/30 in ${c40.name}`,
              m.ok && m.scenarios.every((s) => s.plan.validation.ok),
              sc
                ? `${sc.rows.map((row) => `${row.sku} ${row.cartons} (${fmt(row.achieved, 1)}%)`).join(" · ")}; ${sc.plan.kpis.totalCartons} cartons, ${fmt(sc.plan.kpis.grossWeight, 0)} kg, volume ${sc.plan.kpis.volumeUtil}%`
                : (m.errors || []).join(" "),
            );
            const pc = planPalletsInContainer({
              container: c40,
              pallet: euro,
              loadedHeight: 1650,
              grossPerPallet: 600,
              maxTiers: 1,
              quantity: 40,
              clearance: 0,
            });
            add(
              "Container – palletised",
              `Europe pallets (1650 mm, 600 kg) in ${c40.name}`,
              pc.ok && pc.plan.validation.ok && pc.perFloor >= 24,
              pc.ok
                ? `${pc.perFloor} pallets per floor (simple grid ${pc.simpleGrid}), ${pc.perContainer} per container, 40 pallets → ${pc.containers} container(s)`
                : pc.errors.join(" "),
            );
          }
          {
            const bad = optimiseMix({
              unit: unitOf(euro),
              orientationPolicy: "sku",
              clearance: 0,
              basis: "cartons",
              tolerance: 5,
              mode: "balanced",
              rows: [
                { product: P("P12C2D0"), target: 60, priority: "Normal" },
                { product: P("POSTreat"), target: 30, priority: "Normal" },
              ],
            });
            add(
              "Validation",
              "Targets totalling 90% are rejected with a message",
              !bad.ok && bad.errors.some((e) => /100%/.test(e)),
              (bad.errors || []).join(" "),
            );
            const heavy = calcSingle({
              unit: Object.assign(unitOf(euro), { maxGross: 30 }),
              product: P("POSTreat"),
              orientationPolicy: "sku",
              clearance: 0,
            });
            add(
              "Validation",
              "Max weight lower than one carton is reported",
              !heavy.ok &&
                heavy.errors.some((e) => /lower than one carton/.test(e)),
              (heavy.errors || []).join(" "),
            );
            const big = calcSingle({
              unit: {
                kind: "pallet",
                name: "Tiny",
                L: 400,
                W: 400,
                maxHeight: 1800,
              },
              product: P("POSTreat"),
              orientationPolicy: "sku",
              clearance: 0,
            });
            add(
              "Validation",
              "Carton larger than pallet is reported",
              !big.ok && big.errors.some((e) => /larger than/.test(e)),
              (big.errors || []).join(" "),
            );
            const minImp = optimiseMix({
              unit: unitOf(euro),
              orientationPolicy: "sku",
              clearance: 0,
              basis: "cartons",
              tolerance: 5,
              mode: "balanced",
              rows: [
                {
                  product: P("POSTreat"),
                  target: 100,
                  priority: "Normal",
                  min: 20,
                },
              ],
            });
            add(
              "Validation",
              "Impossible minimum carton requirement is reported",
              !minImp.ok && minImp.errors.some((e) => /impossible/i.test(e)),
              (minImp.errors || []).join(" "),
            );
            const lockMix = optimiseMix({
              unit: unitOf(ind),
              orientationPolicy: "sku",
              clearance: 0,
              basis: "cartons",
              tolerance: 5,
              mode: "balanced",
              rows: [
                {
                  product: P("P12C2D0"),
                  locked: true,
                  lockedQty: 8,
                  priority: "Normal",
                },
                {
                  product: P("Carbon Filters"),
                  target: 60,
                  priority: "Normal",
                },
                { product: P("POSTreat"), target: 40, priority: "Normal" },
              ],
            });
            add(
              "Locked quantity",
              "P12C2D0 locked at 8 cartons stays exactly 8 in every scenario",
              lockMix.ok &&
                lockMix.scenarios.every(
                  (s) => s.counts[0] === 8 && s.plan.validation.ok,
                ),
              lockMix.ok
                ? lockMix.scenarios
                    .map(
                      (s) =>
                        `${s.label}: ${s.rows.map((row) => `${row.sku} ${row.cartons}`).join(", ")}`,
                    )
                    .join(" | ")
                : lockMix.errors.join(" "),
            );
          }
          {
            const G = "Traffic light & fill-up advice";
            const okStatus = (a) =>
              a &&
              ["green", "amber", "red"].includes(a.status) &&
              a.checks.length >= 4;
            const s1 = calcSingle({
              unit: unitOf(ind),
              product: P("P12C2D0"),
              orientationPolicy: "sku",
              clearance: 0,
              fillProducts: data.products,
            });
            const stab =
              s1.ok && s1.assessment.checks.find((c) => c.key === "stability");
            add(
              G,
              "Uniform P12C2D0 pallet is rated stable",
              s1.ok && okStatus(s1.assessment) && stab.status === "green",
              s1.ok
                ? `${s1.assessment.title}: ${stab.message}`
                : s1.errors.join(" "),
            );
            const near = calcSingle({
              unit: Object.assign(unitOf(euro), { maxGross: 470 }),
              product: P("Refill Media"),
              orientationPolicy: "sku",
              clearance: 0,
              noFill: true,
            });
            const wc =
              near.ok && near.assessment.checks.find((c) => c.key === "weight");
            add(
              G,
              "Gross weight within 5% of the limit is amber",
              near.ok && wc.status === "amber",
              near.ok ? wc.message : near.errors.join(" "),
            );
            const box = {
              id: "t-col",
              sku: "COLUMN",
              length: 30,
              width: 30,
              height: 47,
              dimUnit: "cm",
              unitsPerCarton: 1,
              weight: 5,
              keepUpright: true,
            };
            const col = assessLayout({
              unit: unitOf(euro),
              products: [box],
              orientationPolicy: "sku",
              clearance: 0,
              placements: [0, 1, 2].map((k) => ({
                itemIdx: 0,
                x: 450,
                y: 250,
                z: k * 470,
                l: 300,
                w: 300,
                h: 470,
                layer: k + 1,
              })),
            });
            const cs =
              col.ok &&
              col.assessment.checks.find((c) => c.key === "stability");
            add(
              G,
              "A lone 1,410 mm column on a 300 mm base is flagged",
              col.ok &&
                col.plan.validation.ok &&
                cs.status !== "green" &&
                col.assessment.stability.columns.length === 1,
              col.ok
                ? `${cs.status.toUpperCase()}: ${cs.message}`
                : col.errors.join(" "),
            );
            const heavy = {
              id: "t-heavy",
              sku: "HEAVY",
              length: 40,
              width: 40,
              height: 30,
              dimUnit: "cm",
              unitsPerCarton: 1,
              weight: 40,
              keepUpright: true,
            };
            const light = {
              id: "t-light",
              sku: "LIGHT",
              length: 40,
              width: 40,
              height: 30,
              dimUnit: "cm",
              unitsPerCarton: 1,
              weight: 3,
              keepUpright: true,
            };
            const hol = assessLayout({
              unit: unitOf(euro),
              products: [heavy, light],
              orientationPolicy: "sku",
              clearance: 0,
              placements: [
                { itemIdx: 1, x: 0, y: 0, z: 0, l: 400, w: 400, h: 300 },
                {
                  itemIdx: 0,
                  x: 0,
                  y: 0,
                  z: 300,
                  l: 400,
                  w: 400,
                  h: 300,
                  layer: 2,
                },
              ],
            });
            add(
              G,
              "A 40 kg carton on a 3 kg carton is flagged",
              hol.ok &&
                hol.assessment.stability.heavyOnLight.length === 1 &&
                hol.assessment.checks.find((c) => c.key === "stability")
                  .status !== "green",
              hol.ok
                ? hol.assessment.checks.find((c) => c.key === "stability")
                    .message
                : hol.errors.join(" "),
            );
            const rowsA = [
              { product: P("P12C2D0"), target: 50, priority: "Normal" },
              { product: P("P17C2D2"), target: 50, priority: "Normal" },
            ];
            const bad = optimiseMix({
              unit: unitOf(euro),
              orientationPolicy: "sku",
              clearance: 0,
              basis: "cartons",
              tolerance: 5,
              mode: "balanced",
              rows: rowsA,
              fixedCounts: [48, 0],
              noFill: true,
            });
            const mc =
              bad.ok &&
              bad.scenarios[0].assessment.checks.find((c) => c.key === "mix");
            add(
              G,
              "A mix with a target SKU not loaded is red",
              bad.ok &&
                mc.status === "red" &&
                bad.scenarios[0].assessment.status === "red",
              bad.ok ? mc.message : bad.errors.join(" "),
            );
            const rowsB = [
              ["P12C2D0", 40],
              ["P17C2D2", 25],
              ["Carbon Filters", 20],
              ["POSTreat", 15],
            ].map(([sku, target]) => ({
              product: P(sku),
              target,
              priority: "Normal",
            }));
            const reqB = {
              unit: unitOf(ind),
              orientationPolicy: "sku",
              clearance: 0,
              basis: "cartons",
              tolerance: 5,
              mode: "balanced",
              fillProducts: data.products,
              rows: rowsB,
            };
            const mixB = optimiseMix(reqB);
            const allFill = mixB.ok
              ? mixB.scenarios.flatMap((sc) =>
                  sc.fill.suggestions
                    .concat(sc.fill.combined ? [sc.fill.combined] : [])
                    .map((sg) => ({ sc, sg })),
                )
              : [];
            let applied = 0,
              appliedOk = 0;
            const notes = [];
            for (const { sc, sg } of allFill) {
              const rows = rowsB.slice(),
                counts = sc.counts.slice();
              sg.adds.forEach((a) => {
                const i = rows.findIndex((r) => r.product.id === a.productId);
                if (i >= 0) counts[i] += a.add;
                else {
                  rows.push({
                    product: data.products.find((p) => p.id === a.productId),
                    locked: true,
                    lockedQty: a.add,
                    priority: "Normal",
                  });
                  counts.push(a.add);
                }
              });
              const adj = optimiseMix(
                Object.assign({}, reqB, {
                  rows,
                  fixedCounts: counts,
                  noFill: true,
                }),
              );
              applied++;
              const good =
                adj.ok &&
                adj.scenarios[0].plan.validation.ok &&
                adj.scenarios[0].plan.kpis.totalCartons ===
                  counts.reduce((s, v) => s + v, 0) &&
                Math.abs(adj.scenarios[0].metrics.capUtil - sg.newCapUtil) <
                  0.1;
              if (good) appliedOk++;
              notes.push(
                `${sg.adds.map((a) => `+${a.add} ${a.sku}`).join(" ")} → ${sg.newCapUtil}% ${good ? "✓" : "✗"}`,
              );
            }
            add(
              G,
              "Test B: every “what else fits” suggestion re-plans into a valid layout",
              mixB.ok && applied > 0 && applied === appliedOk,
              `${appliedOk} of ${applied} suggestions verified by re-planning: ${notes.slice(0, 8).join(" · ")}`,
            );
            const pc = planPalletsInContainer({
              container: data.containers.find((c) => c.id === "c-40hc"),
              pallet: euro,
              loadedHeight: 1650,
              grossPerPallet: 600,
              maxTiers: 1,
              quantity: 40,
            });
            const pcs =
              pc.ok && pc.assessment.checks.find((c) => c.key === "space");
            add(
              G,
              "A full container of pallets is rated green for space",
              pc.ok && pcs.status === "green",
              pc.ok ? `${pcs.message} ${pcs.action}` : pc.errors.join(" "),
            );
          }
          {
            const G = "Audit regressions";
            const eleven = Array.from({ length: 11 }, (_, i) => ({
              id: "a" + i,
              sku: "A" + i,
              length: 20 + i,
              width: 15,
              height: 12,
              dimUnit: "cm",
              unitsPerCarton: 1,
              weight: 2,
              keepUpright: true,
            }));
            const c20 = data.containers.find((c) => c.id === "c-20gp");
            const r11 = planExact({
              unit: {
                kind: "container",
                name: c20.name,
                L: c20.length,
                W: c20.width,
                maxHeight: c20.height,
                maxGross: c20.maxPayload,
              },
              orientationPolicy: "sku",
              clearance: 0,
              basis: "cartons",
              noFill: true,
              rows: eleven.map((p) => ({ product: p, qty: 2 })),
            });
            add(
              G,
              "A container holds more than 10 different SKUs",
              r11.ok && r11.fits && r11.units[0].ok,
              r11.ok
                ? r11.fits
                  ? "11 SKUs × 2 cartons fit in one 20GP"
                  : "did not fit"
                : r11.errors.join(" "),
            );
            let unsupported = 0,
              checked = 0;
            for (const cl of [20, 50]) {
              const r = planExact({
                unit: unitOf(ind),
                orientationPolicy: "full",
                clearance: cl,
                basis: "cartons",
                noFill: true,
                rows: [
                  ["P12C2D0", 9],
                  ["Refill Media", 7],
                  ["POSTreat", 5],
                ].map(([sku, qty]) => ({ product: P(sku), qty })),
              });
              if (!r.ok) continue;
              r.units.forEach((u) =>
                u.plan.placements.forEach((p) => {
                  if (p.z < 1e-3) return;
                  checked++;
                  let cov = 0;
                  u.plan.placements.forEach((q) => {
                    if (Math.abs(q.z + q.h - p.z) > 1e-3) return;
                    const ix =
                        Math.min(p.x + p.l, q.x + q.l) - Math.max(p.x, q.x),
                      iy = Math.min(p.y + p.w, q.y + q.w) - Math.max(p.y, q.y);
                    if (ix > 0 && iy > 0) cov += ix * iy;
                  });
                  if (cov < p.l * p.w - 1) unsupported++;
                }),
              );
            }
            add(
              G,
              "With 20–50 mm clearance every raised carton rests fully on cartons below",
              unsupported === 0,
              `${checked} raised cartons checked, ${unsupported} not fully supported`,
            );
            const capped = optimiseMix({
              unit: unitOf(ind),
              orientationPolicy: "sku",
              clearance: 0,
              basis: "cartons",
              tolerance: 5,
              mode: "balanced",
              fillProducts: data.products,
              rows: [
                { product: P("P12C2D0"), target: 60, priority: "Normal" },
                {
                  product: P("POSTreat"),
                  target: 40,
                  priority: "Normal",
                  max: 2,
                },
                {
                  product: P("Carbon Filters"),
                  locked: true,
                  lockedQty: 4,
                  priority: "Normal",
                },
              ],
            });
            const viol = capped.ok
              ? capped.scenarios.flatMap((s2) =>
                  s2.fill.suggestions
                    .concat(s2.fill.combined ? [s2.fill.combined] : [])
                    .filter((x) =>
                      x.adds.some(
                        (a) =>
                          a.sku === "Carbon Filters" ||
                          (a.sku === "POSTreat" && s2.counts[1] + a.add > 2),
                      ),
                    ),
                )
              : [1];
            add(
              G,
              "“What else fits” respects Max cartons and Locked quantities",
              capped.ok && viol.length === 0,
              `${viol.length} suggestions break a max or lock`,
            );
            add(
              G,
              "Maximum stack layers must be a whole number ≥ 1",
              validateProductRecord({
                sku: "X",
                length: 1,
                width: 1,
                height: 1,
                weight: 1,
                unitsPerCarton: 1,
                maxStackLayers: 0.5,
              }).length === 1,
              "value 0.5 is rejected",
            );
          }
          const mm = _checkChainFeasibility(5000);
          add(
            "Engine integrity",
            "Fast column-block check gives the same answer as the step-by-step simulation (5,000 random cases)",
            mm === 0,
            `${mm} mismatches`,
          );
          const passed = out.filter((o) => o.pass).length;
          return {
            results: out,
            passed,
            failed: out.length - passed,
            total: out.length,
            ms: Date.now() - t0,
          };
        }

        /* Test hook: compares the fast and the column-by-column chain feasibility on random inputs. */
        function _checkChainFeasibility(trials) {
          let mismatches = 0;
          let seed = 7;
          const rnd = () =>
            (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
          for (let t = 0; t < (trials || 2000); t++) {
            const H = 600 + Math.round(rnd() * 2400);
            const k = 1 + Math.floor(rnd() * 3);
            const items = [],
              per = [],
              links = [];
            for (let i = 0; i < k; i++) {
              const h = 50 + Math.round(rnd() * 500);
              items.push({ supports: rnd() > 0.15 || i === k - 1 });
              per.push({
                maxL: rnd() < 0.2 ? 1 + Math.floor(rnd() * 3) : Infinity,
              });
              links.push({ i, opt: { s: { h } } });
            }
            const ctx = { geom: { usableH: H }, items },
              bm = { per };
            const P = 1 + Math.floor(rnd() * 40);
            const counts = items.map(() => Math.floor(rnd() * P * 6));
            if (
              chainFeasible(ctx, bm, links, P, counts) !==
              simulateChain(ctx, bm, links, P, counts, null)
            )
              mismatches++;
          }
          return mismatches;
        }

        return {
          _checkChainFeasibility,
          CONFIG,
          DEFAULTS,
          BRANDS,
          ASSESS_DEFAULTS,
          assessLayout,
          calcSingle,
          optimiseMix,
          planExact,
          planMulti,
          planPalletsInContainer,
          runSelfTests,
          normaliseProduct,
          validateProductRecord,
        };
      }
