import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  clamp,
  ease,
  frame,
  go,
  progress,
  range,
  start,
  stop,
  tick as advance,
} from "./scroll";
import "./style.css";

export type Snapshot = {
  lang: string;
  name: string;
  owned: number;
  total: number;
  runs: number;
  kills: number;
  rank: string;
  captain: string;
  guest: boolean;
  calm: boolean;
  version: string;
  checkpointDay: number | null;
};
type Options = {
  slots: Record<string, HTMLElement>;
  action: (id: string) => void;
  legal: () => void;
};
let state: Snapshot = {
  lang: "zh",
  name: "",
  owned: 0,
  total: 966,
  runs: 0,
  kills: 0,
  rank: "R1",
  captain: "",
  guest: false,
  calm: false,
  version: "",
  checkpointDay: null,
};
let options: Options,
  root: Root | null = null,
  host: HTMLElement;
const subscribers = new Set<() => void>();
const subscribe = (fn: () => void) => {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
};
const data = () => state;
const L = (lang: string, zh: string, en: string, es: string) =>
  lang === "zh" ? zh : lang === "es" ? es : en;
const Slot = memo(
  ({ name, className = "" }: { name: string; className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
      const el = options.slots[name];
      if (el && ref.current) ref.current.append(el);
    }, [name]);
    return (
      <div
        className={"home-slot " + className}
        data-home-slot={name}
        ref={ref}
      />
    );
  },
);
function Ball({ size = 23 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 20h11m12 0h11" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="5.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
const arrow = <span aria-hidden="true">↗</span>;
function useReduced() {
  const [value, set] = useState(
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)"),
      fn = () => set(q.matches);
    q.addEventListener("change", fn);
    return () => q.removeEventListener("change", fn);
  }, []);
  return value;
}
function Header({ d, open }: { d: Snapshot; open: () => void }) {
  const l = d.lang;
  return (
    <header className="home-header">
      <a
        translate="no"
        className="home-brand"
        href="#home-top"
        onClick={(e) => {
          e.preventDefault();
          go("home-top");
        }}
        aria-label="PokéSurvivor"
      >
        <Ball size={31} />
        <span>
          POKÉ<span className="home-brand-light">SURVIVOR</span>
          <small>
            {L(
              l,
              "小队远征 · GG版",
              "SQUAD EXPEDITION · GG",
              "EXPEDICIÓN · GG",
            )}
          </small>
        </span>
      </a>
      <nav
        className="home-nav"
        aria-label={L(l, "主页导航", "Home navigation", "Navegación")}
      >
        <a
          href="#home-collection"
          onClick={(e) => {
            e.preventDefault();
            go("home-collection");
          }}
        >
          {L(l, "伙伴档案", "Companions", "Compañeros")}
        </a>
        <a
          href="#home-route"
          onClick={(e) => {
            e.preventDefault();
            go("home-route");
          }}
        >
          {L(l, "远征路线", "The journey", "La ruta")}
        </a>
        <button onClick={open}>
          {L(l, "全部功能", "All functions", "Funciones")}{" "}
          <span aria-hidden="true">☷</span>
        </button>
        <button
          className="home-nav-depart"
          onClick={() =>
            options.action(d.checkpointDay === null ? "play" : "resume")
          }
        >
          {L(
            l,
            d.checkpointDay === null ? "出发" : "继续",
            d.checkpointDay === null ? "Set out" : "Resume",
            d.checkpointDay === null ? "Partir" : "Seguir",
          )}{" "}
          {arrow}
        </button>
      </nav>
      <Slot name="account" className="home-account" />
    </header>
  );
}
function Hero({ d, reduced }: { d: Snapshot; reduced: boolean }) {
  const section = useRef<HTMLElement>(null),
    image = useRef<HTMLDivElement>(null),
    middle = useRef<HTMLDivElement>(null),
    near = useRef<HTMLDivElement>(null),
    veil = useRef<HTMLDivElement>(null),
    signal = useRef<HTMLDivElement>(null),
    dust = useRef<HTMLCanvasElement>(null),
    label = useRef<HTMLSpanElement>(null),
    title = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = dust.current!,
      ctx = c.getContext("2d")!,
      resize = () => {
        const dpr = Math.min(1.5, devicePixelRatio || 1);
        c.width = Math.round(c.clientWidth * dpr);
        c.height = Math.round(c.clientHeight * dpr);
      };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    let seed = 17,
      last = -1;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647,
      motes = Array.from({ length: 66 }, () => ({
        x: rand(),
        y: rand(),
        r: 0.4 + rand() * 1.4,
        a: 0.1 + rand() * 0.5,
      }));
    const off = frame((time) => {
      if (!section.current) return;
      const p = reduced ? 0 : progress(section.current, host),
        clear = 1 - range(p, 0, 0.17),
        rise = ease(range(p, 0.19, 0.68));
      if (p !== last) {
        last = p;
        image.current!.style.transform = `translate3d(0,${p * -22}px,0) scale(${1.06 - p * 0.035})`;
        middle.current!.style.transform = `translate3d(0,${p * -48}px,0)`;
        near.current!.style.transform = `translate3d(0,${p * -76}px,0)`;
        veil.current!.style.opacity = String(reduced ? 0 : clear * 0.52);
        signal.current!.style.transform = `translate3d(0,${(1 - rise) * 45}px,0) rotate(${rise * 9}deg)`;
        signal.current!.style.opacity = String(0.12 + rise * 0.65);
        title.current!.style.transform = `translate3d(0,${p * -32}px,0)`;
        label.current!.textContent = String(Math.round(rise * 60)).padStart(
          2,
          "0",
        );
      }
      const w = c.clientWidth,
        h = c.clientHeight,
        ratio = c.width / Math.max(1, w);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#d8ece7";
      for (const m of motes) {
        const drift = reduced ? 0 : time * 0.000008;
        ctx.globalAlpha = m.a * (0.3 + clear * 0.7);
        ctx.beginPath();
        ctx.arc(
          ((m.x + drift * 0.13) % 1) * w,
          ((m.y - drift + 1000) % 1) * h,
          m.r,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    return () => {
      off();
      ro.disconnect();
    };
  }, [reduced]);
  const l = d.lang;
  return (
    <section
      id="home-top"
      ref={section}
      className={"home-hero " + (reduced ? "is-reduced" : "")}
      aria-labelledby="home-title"
    >
      <div className="home-hero-pin">
        <div className="home-scene home-scene-far" ref={image} />
        <div className="home-scene home-scene-middle" ref={middle} />
        <div className="home-signal" ref={signal}>
          <Ball size={290} />
          <span className="home-signal-orbit" />
        </div>
        <div className="home-scene home-scene-near" ref={near} />
        <div className="home-scene-shade" />
        <div className="home-dust-veil" ref={veil} />
        <canvas ref={dust} className="home-dust" aria-hidden="true" />
        <div className="home-hud">
          <span>
            <i />{" "}
            {L(
              l,
              "远征系统就绪",
              "EXPEDITION SYSTEM READY",
              "EXPEDICIÓN LISTA",
            )}
          </span>
          <span>
            ROUTE / <span ref={label}>00</span> — 60
          </span>
        </div>
        <div className="home-hero-copy" ref={title}>
          <p className="home-eyebrow">
            A WORLD TO DISCOVER. A TEAM TO REMEMBER.
          </p>
          <h1 id="home-title">
            EXPEDITION<span className="home-title-dot">.</span>
          </h1>
          <h2>
            {L(
              l,
              "下一段旅程，和伙伴一起。",
              "The next journey begins together.",
              "El próximo viaje empieza juntos.",
            )}
          </h2>
          <p className="home-hero-description">
            {L(
              l,
              "集结宝可梦，穿越未知。每一次选择，都让小队走向不同的远方。",
              "Gather your Pokémon. Venture into the unknown. Every choice takes your squad somewhere new.",
              "Reúne a tus Pokémon. Explora lo desconocido. Cada elección abre un nuevo camino.",
            )}
          </p>
          <div className="home-departure">
            <Slot name="play" />
            <button
              className="home-text-button"
              onClick={() => go("home-collection")}
            >
              {L(l, "探索营地", "Explore the camp", "Explorar el campamento")}{" "}
              <span aria-hidden="true">↓</span>
            </button>
          </div>
          <div className="home-hero-facts">
            <span>
              <b>60</b>
              {L(l, "日远征", "DAY JOURNEY", "DÍAS DE VIAJE")}
            </span>
            <span>
              <b>09</b>
              {L(l, "大地区", "REGIONS", "REGIONES")}
            </span>
            <span>
              <b>01</b>
              {L(l, "支属于你的小队", "SQUAD OF YOUR OWN", "TU PROPIO EQUIPO")}
            </span>
          </div>
        </div>
        <aside className="home-captain">
          <p className="home-eyebrow">
            {L(l, "同行领队", "YOUR CAPTAIN", "TU CAPITÁN")} <span>01</span>
          </p>
          <Slot name="captain" />
        </aside>
        <div className="home-hero-bottom">
          <span>
            {L(
              l,
              "向远方出发，也记得照顾身边的伙伴。",
              "Go further. Keep your companions close.",
              "Ve más lejos. Cuida de tus compañeros.",
            )}
          </span>
          <button onClick={() => go("home-collection")}>
            {L(l, "滚动以探索", "SCROLL TO EXPLORE", "DESLIZA PARA EXPLORAR")}{" "}
            <span aria-hidden="true">↓</span>
          </button>
        </div>
      </div>
    </section>
  );
}
const entries = [
  {
    id: "dex",
    n: "01",
    art: "dex-art",
    en: "YOUR COMPANIONS",
    zh: "每一位，都值得相遇。",
    title: "伙伴图鉴",
    body: "收藏、属性、成长档案。",
    es: "Compañeros",
    enTitle: "Your collection",
  },
  {
    id: "upgrades",
    n: "02",
    art: "pack-art",
    en: "MAKE IT YOUR JOURNEY",
    zh: "把可能，装进行囊。",
    title: "远征卡包",
    body: "解锁新的选择与永久成长。",
    es: "Paquetes",
    enTitle: "Expedition packs",
  },
  {
    id: "gacha",
    n: "03",
    art: "gacha-art",
    en: "SOMEONE IS WAITING",
    zh: "下一位伙伴，会是谁？",
    title: "宝可梦招募",
    body: "九大地区，等待一场相遇。",
    es: "Reclutamiento",
    enTitle: "Pokémon recruitment",
  },
  {
    id: "ability-gacha",
    n: "04",
    art: "ability-art",
    en: "DISCOVER THEIR POTENTIAL",
    zh: "让天赋，闪闪发光。",
    title: "特性勋章",
    body: "寻找适合领队的独特力量。",
    es: "Medallas",
    enTitle: "Ability medals",
  },
];
function Collection({ d, reduced }: { d: Snapshot; reduced: boolean }) {
  const section = useRef<HTMLElement>(null),
    track = useRef<HTMLDivElement>(null),
    count = useRef<HTMLSpanElement>(null),
    bar = useRef<HTMLSpanElement>(null),
    l = d.lang;
  useEffect(() => {
    if (reduced) return;
    return frame(() => {
      const s = section.current!,
        t = track.current!,
        p = progress(s, host),
        v = host.getBoundingClientRect(),
        r = s.getBoundingClientRect();
      if (r.bottom < v.top || r.top > v.bottom) return;
      const travel = Math.max(
        0,
        t.scrollWidth - t.parentElement!.clientWidth + 24,
      );
      t.style.transform = `translate3d(${-ease(range(p, 0.02, 0.98)) * travel}px,0,0)`;
      let best = Infinity,
        selected = 0;
      const cards = t.querySelectorAll<HTMLElement>(".home-reel-card");
      cards.forEach((card, i) => {
        const c = card.getBoundingClientRect(),
          distance =
            Math.abs(c.left + c.width / 2 - (v.left + v.width * 0.58)) /
            v.width;
        if (distance < best) {
          best = distance;
          selected = i;
        }
        card.style.opacity = String(1 - clamp(distance * 1.2) * 0.45);
        card.style.transform = `scale(${1 - clamp(distance) * 0.035})`;
      });
      count.current!.textContent = "0" + (selected + 1);
      bar.current!.style.transform = `scaleX(${p})`;
    });
  }, [reduced]);
  return (
    <section
      ref={section}
      id="home-collection"
      className={"home-collection " + (reduced ? "is-reduced" : "")}
      aria-labelledby="home-log-title"
    >
      <div className="home-collection-pin">
        <div className="home-section-intro">
          <p className="home-eyebrow">
            01 /{" "}
            {L(
              l,
              "伙伴与行囊",
              "COMPANIONS & SUPPLIES",
              "COMPAÑEROS Y EQUIPAJE",
            )}
          </p>
          <h2 translate="no" id="home-log-title">
            {L(
              l,
              "故事，\n从相遇开始。",
              "Every story starts\nwith a meeting.",
              "Cada historia\nempieza al conocer.",
            )}
          </h2>
          <p>
            {L(
              l,
              "有的伙伴陪你第一次出发，有的带来新的可能。将相遇珍藏，把远方交给小队。",
              "Some companions share your first steps. Others open new possibilities. Collect the encounters. Let your squad carry the story.",
              "Unos compañeros dan los primeros pasos contigo. Otros abren posibilidades. Guarda cada encuentro y sigue el viaje.",
            )}
          </p>
          <div className="home-reel-progress" aria-hidden="true">
            <span ref={count}>01</span>
            <span>/ 04</span>
            <i>
              <span ref={bar} />
            </i>
          </div>
          <button
            className="home-text-button"
            onClick={() => options.action("dex")}
          >
            {L(l, "查看全部伙伴", "Meet your companions", "Ver compañeros")}{" "}
            {arrow}
          </button>
        </div>
        <div className="home-reel-viewport">
          <div className="home-reel-track" ref={track}>
            {entries.map((e) => (
              <article className="home-reel-card" key={e.id}>
                <div className={"home-reel-image home-art-" + e.id}>
                  <span className="home-card-number">{e.n} / FIELD NOTES</span>
                  <div className="home-art-rings" />
                  <Slot name={e.art} />
                  <span className="home-art-word">{e.en.split(" ")[0]}</span>
                </div>
                <p className="home-eyebrow">{e.en}</p>
                <h3>{L(l, e.zh, e.enTitle, e.es)}</h3>
                <Slot name={e.id} className="home-card-action" />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
function Trajectory({ d, reduced }: { d: Snapshot; reduced: boolean }) {
  const section = useRef<HTMLElement>(null),
    paths = useRef<SVGPathElement[]>([]),
    marker = useRef<SVGCircleElement>(null),
    day = useRef<HTMLSpanElement>(null),
    l = d.lang;
  const legs = [
    "M100 180 C150 80 220 80 260 160",
    "M260 160 C310 250 370 250 420 150",
    "M420 150 C490 55 550 75 585 145",
    "M585 145 C660 235 715 180 760 110",
  ];
  useEffect(
    () =>
      frame(() => {
        const p = reduced ? 1 : progress(section.current!, host),
          k = range(p, 0.02, 0.9) * legs.length,
          index = Math.min(legs.length - 1, Math.floor(k)),
          f = clamp(k - index);
        paths.current.forEach((path, i) => {
          path.style.strokeDashoffset = String(1 - clamp(k - i));
        });
        const path = paths.current[index];
        if (path) {
          const pos = path.getPointAtLength(path.getTotalLength() * f);
          marker.current?.setAttribute("cx", String(pos.x));
          marker.current?.setAttribute("cy", String(pos.y));
        }
        if (day.current)
          day.current.textContent = String(
            Math.round(clamp(k / 4) * 60),
          ).padStart(2, "0");
      }),
    [reduced],
  );
  const names = [
    L(l, "集结", "Assemble", "Reunirse"),
    L(l, "探索", "Explore", "Explorar"),
    L(l, "成长", "Grow", "Crecer"),
    L(l, "挑战", "Challenge", "Desafiar"),
  ];
  return (
    <section
      ref={section}
      id="home-route"
      className={"home-route " + (reduced ? "is-reduced" : "")}
      aria-labelledby="home-route-title"
    >
      <div className="home-route-pin">
        <div className="home-route-heading">
          <div>
            <p className="home-eyebrow">
              02 / {L(l, "长征之路", "THE LONG MARCH", "LA LARGA MARCHA")}
            </p>
            <h2 translate="no" id="home-route-title">
              {L(
                l,
                "六十天。\n无数种可能。",
                "Sixty days.\nCountless possibilities.",
                "Sesenta días.\nInfinitas posibilidades.",
              )}
            </h2>
          </div>
          <p className="home-route-readout">
            DAY <span ref={day}>00</span>
            <small>/ 60</small>
          </p>
        </div>
        <div className="home-trajectory">
          <svg
            viewBox="0 0 860 320"
            role="img"
            aria-label={L(
              l,
              "从集结、探索和成长走向关底挑战的远征路线",
              "An expedition route through assembling, exploration, growth and a final challenge",
              "Ruta de reunión, exploración, crecimiento y desafío",
            )}
          >
            <defs>
              <radialGradient id="home-route-glow">
                <stop stopColor="#b9e4c4" stopOpacity=".25" />
                <stop offset="1" stopColor="#b9e4c4" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="180" r="65" fill="url(#home-route-glow)" />
            {legs.map((path, i) => (
              <g key={path}>
                <path
                  d={path}
                  stroke="#ffffff18"
                  fill="none"
                  strokeDasharray="3 7"
                />
                <path
                  d={path}
                  ref={(el) => {
                    if (el) paths.current[i] = el;
                  }}
                  pathLength="1"
                  stroke={i === 3 ? "#d9b987" : "#a3cfc8"}
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="1 1"
                  strokeDashoffset="1"
                />
              </g>
            ))}
            {[
              [100, 180],
              [260, 160],
              [420, 150],
              [585, 145],
              [760, 110],
            ].map(([x, y], i) => (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r={i === 4 ? 17 : 10}
                  fill="#101e25"
                  stroke={i === 4 ? "#d9b987" : "#86a9a5"}
                />
                <circle cx={x} cy={y} r="3" fill="#d1e6dd" />
                <text
                  x={x}
                  y={y + 45}
                  textAnchor="middle"
                  fill="#9facb0"
                  fontSize="12"
                  fontFamily="monospace"
                >
                  {i === 4 ? "BOSS / 60" : "DAY " + [1, 20, 40, 50][i]}
                </text>
              </g>
            ))}
            <circle ref={marker} cx="100" cy="180" r="5" fill="#edecd9" />
          </svg>
        </div>
        <div className="home-route-steps">
          {names.map((name, i) => (
            <div key={name}>
              <small>0{i + 1}</small>
              <h3>{name}</h3>
              <p>
                {
                  [
                    L(
                      l,
                      "挑选领队，整理行囊。",
                      "Choose a captain. Pack your supplies.",
                      "Elige capitán y prepara tu equipo.",
                    ),
                    L(
                      l,
                      "每一天，都有新的选择。",
                      "A new choice, every day.",
                      "Una nueva elección cada día.",
                    ),
                    L(
                      l,
                      "让伙伴与羁绊一同成长。",
                      "Grow your companions and bonds.",
                      "Haz crecer compañeros y vínculos.",
                    ),
                    L(
                      l,
                      "并肩迎接周期首领。",
                      "Face the cycle Boss together.",
                      "Afronta al jefe del ciclo juntos.",
                    ),
                  ][i]
                }
              </p>
            </div>
          ))}
        </div>
        <div className="home-route-footer">
          <span>
            {L(
              l,
              "路线由你选择，故事由小队书写。",
              "You choose the route. Your squad writes the story.",
              "Tú eliges la ruta. Tu equipo escribe la historia.",
            )}
          </span>
          <button
            className="home-text-button"
            onClick={() => options.action("play")}
          >
            {L(
              l,
              "开始你的远征",
              "Begin your expedition",
              "Empieza tu expedición",
            )}{" "}
            {arrow}
          </button>
        </div>
      </div>
    </section>
  );
}
const camp = [
  ["goals", "成长档案", "Your progress", "Tu progreso"],
  ["nursery", "孵蛋屋", "The nursery", "Guardería"],
  ["offline", "营地补给", "Camp supplies", "Suministros"],
  ["friends", "伙伴来信", "Friends & gifts", "Amigos y regalos"],
  ["rank", "联盟榜单", "League rankings", "Clasificación"],
  ["settings", "行前设置", "Settings", "Ajustes"],
];
function Camp({ d }: { d: Snapshot }) {
  const l = d.lang;
  return (
    <section className="home-camp" id="home-camp">
      <div className="home-camp-heading">
        <p className="home-eyebrow">
          03 / {L(l, "回到营地", "BACK AT CAMP", "DE VUELTA AL CAMPAMENTO")}
        </p>
        <h2>
          {L(
            l,
            "出发之前，\n也别忘了这里。",
            "Before you leave,\nmake yourself at home.",
            "Antes de partir,\nsiéntete como en casa.",
          )}
        </h2>
      </div>
      <div className="home-camp-grid">
        {camp.map(([id, zh, en, es], i) => (
          <div className="home-camp-link" key={id}>
            <span className="home-camp-number">0{i + 1}</span>
            <Slot name={id} />
            <span className="home-camp-label">{L(l, zh, en, es)}</span>
          </div>
        ))}
      </div>
      <div className="home-journal">
        <div>
          <p className="home-eyebrow">
            {L(l, "你的远征手账", "YOUR FIELD JOURNAL", "TU DIARIO DE VIAJE")}
          </p>
          <h3>
            <span translate="no" className="home-journal-name">
              {d.name || L(l, "训练家", "Trainer", "Entrenador")}
            </span>
            <span>{d.rank}</span>
          </h3>
        </div>
        <div className="home-journal-stats">
          <span>
            <b>{d.owned.toLocaleString()}</b>
            <small>
              {L(l, "已结识宝可梦", "COMPANIONS MET", "COMPAÑEROS")}
            </small>
          </span>
          <span>
            <b>{d.runs.toLocaleString()}</b>
            <small>{L(l, "次共同出发", "EXPEDITIONS", "EXPEDICIONES")}</small>
          </span>
          <span>
            <b>{d.kills.toLocaleString()}</b>
            <small>
              {L(l, "累计击败敌人", "FOES DEFEATED", "ENEMIGOS VENCIDOS")}
            </small>
          </span>
        </div>
        <Slot name="stats" />
      </div>
      <Slot name="community" className="home-community" />
      {d.guest && (
        <p className="home-guest-note">
          {L(
            l,
            "游客的收藏与段位为临时进度；远征可在此浏览器保存续玩。",
            "Guest collection and rank are temporary; expeditions can be saved in this browser.",
            "La colección y el rango de invitado son temporales; la expedición se guarda en este navegador.",
          )}
        </p>
      )}
    </section>
  );
}
function Drawer({ d, close }: { d: Snapshot; close: () => void }) {
  const ref = useRef<HTMLDivElement>(null),
    l = d.lang;
  useEffect(() => {
    const prior = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
      }
      if (e.key === "Tab") {
        const nodes = [
            ...ref.current!.querySelectorAll<HTMLButtonElement>("button"),
          ],
          i = nodes.indexOf(document.activeElement as HTMLButtonElement);
        e.preventDefault();
        nodes[
          (i + (e.shiftKey ? -1 : 1) + nodes.length) % nodes.length
        ]?.focus();
      }
    };
    addEventListener("keydown", fn, true);
    return () => {
      removeEventListener("keydown", fn, true);
      prior?.focus({ preventScroll: true });
    };
  }, [close]);
  return (
    <div className="home-drawer-backdrop" onClick={close}>
      <div
        className="home-drawer"
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-drawer-title"
      >
        <div className="home-drawer-head">
          <div>
            <p className="home-eyebrow">BASE CAMP / QUICK ACCESS</p>
            <h2 id="home-drawer-title">
              {L(l, "想去哪里？", "Where to next?", "¿Adónde vamos?")}
            </h2>
          </div>
          <button
            onClick={close}
            aria-label={L(
              l,
              "关闭功能导航",
              "Close navigation",
              "Cerrar navegación",
            )}
          >
            ×
          </button>
        </div>
        <div className="home-drawer-journey">
          <button
            onClick={() => {
              close();
              options.action(d.checkpointDay === null ? "play" : "resume");
            }}
          >
            {L(
              l,
              d.checkpointDay === null ? "开始远征" : "继续上次远征",
              d.checkpointDay === null
                ? "Begin expedition"
                : "Resume expedition",
              d.checkpointDay === null
                ? "Iniciar expedición"
                : "Continuar expedición",
            )}{" "}
            {arrow}
          </button>
        </div>
        <div className="home-drawer-grid">
          {[
            ...entries.map((e) => [e.id, e.title, e.enTitle, e.es]),
            ...camp,
          ].map(([id, zh, en, es], i) => (
            <button
              key={id}
              onClick={() => {
                close();
                options.action(id);
              }}
            >
              <small>{String(i + 1).padStart(2, "0")}</small>
              <span>{L(l, zh, en, es)}</span>
              {arrow}
            </button>
          ))}
        </div>
        <div className="home-drawer-tools">
          {[
            ["btn-sound", "声音开关", "Toggle sound", "Alternar sonido"],
            ["btn-full", "切换全屏", "Toggle fullscreen", "Pantalla completa"],
            ["btn-logout", "退出登录", "Log out", "Cerrar sesión"],
          ].map(([id, zh, en, es]) => (
            <button
              key={id}
              onClick={() => {
                close();
                options.action(id);
              }}
            >
              {L(l, zh, en, es)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
function App() {
  const d = useSyncExternalStore(subscribe, data),
    reduced = useReduced() || d.calm,
    [drawer, setDrawer] = useState(false),
    content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    start(host, content.current!, reduced);
    return stop;
  }, [reduced]);
  return (
    <div className="home-content" ref={content} data-home-reduced={reduced}>
      <Header d={d} open={() => setDrawer(true)} />
      <main>
        <Hero d={d} reduced={reduced} />
        <Collection d={d} reduced={reduced} />
        <Trajectory d={d} reduced={reduced} />
        <Camp d={d} />
      </main>
      <footer className="home-footer">
        <div>
          <Ball size={30} />
          <b translate="no">POKÉ SURVIVOR</b>
          <span>
            {L(
              d.lang,
              "与伙伴同行，去更远的地方。",
              "Further, together.",
              "Más lejos, juntos.",
            )}
          </span>
        </div>
        <p>
          JPTER78 · Gugusb &amp; {L(d.lang, "大肥鱼", "Dafeiyu", "Dafeiyu")}
          <small>
            Pokémon © Nintendo / Creatures / GAME FREAK · SpriteCollab CC BY-NC
            4.0
          </small>
        </p>
        <button onClick={options.legal}>
          {L(
            d.lang,
            "素材署名与法律声明",
            "Credits & legal",
            "Créditos y aviso legal",
          )}{" "}
          {arrow}
        </button>
        <span className="home-footer-version">{d.version}</span>
      </footer>
      {drawer && <Drawer d={d} close={() => setDrawer(false)} />}
    </div>
  );
}
export function mount(el: HTMLElement, initial: Snapshot, o: Options) {
  host = el;
  state = initial;
  options = o;
  root = createRoot(host);
  flushSync(() => root!.render(<App />));
}
export function update(next: Snapshot) {
  state = next;
  subscribers.forEach((fn) => fn());
}
export function tick(time: number) {
  advance(time);
}
export function dispose() {
  root?.unmount();
  root = null;
  stop();
}
