const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../docs/responsive-audit");
const PHASE = process.argv[2] || "before";
const DIR = path.join(ROOT, PHASE);

const screens = [
  { id: "home-live", title: "홈", route: "/", note: "영화 포스터와 로그인 버튼이 있는 첫 화면" },
  { id: "home-menu", title: "홈 메뉴", route: "/", note: "왼쪽 초록 버튼을 눌렀을 때 열리는 전체 메뉴" },
  { id: "login-live", title: "로그인", route: "/auth/login", note: "이메일과 비밀번호로 들어가는 화면" },
  { id: "signup-live", title: "회원가입", route: "/auth/signup", note: "새 계정을 만드는 화면" },
  { id: "selecting", title: "레슨 선택", route: "/sing2/selecting", note: "Watch / Mimic / Guess / Word 를 고르는 화면" },
  { id: "watching", title: "워칭", route: "/sing2/watching", note: "영상을 보는 학습 화면" },
  { id: "mimicking", title: "미믹킹", route: "/sing2/mimicking", note: "따라 말하기 8단계 버튼이 있는 화면" },
  { id: "guessing", title: "게싱", route: "/sing2/guessing", note: "A B C 중에서 고르는 화면" },
  { id: "guess-result", title: "게싱 결과", route: "/sing2/guessing (완료)", note: "맞힌 개수를 보여주는 화면" },
  { id: "word", title: "워드", route: "/sing2/word", note: "단어를 순서대로 맞추는 화면" },
  { id: "admin", title: "학생 현황", route: "/admin", note: "학원 원장이 학생 진도를 보는 화면" },
];

const devices = [
  { id: "mobile", title: "모바일", size: "390 × 844" },
  { id: "tablet", title: "태블릿", size: "768 × 1024" },
  { id: "pc", title: "PC", size: "1440 × 900" },
];

const notesPath = path.join(DIR, "notes.json");
const notes = fs.existsSync(notesPath) ? JSON.parse(fs.readFileSync(notesPath, "utf8")) : {};

const cards = screens
  .map((screen) => {
    const analysis = notes[screen.id] || "";
    const images = devices
      .map((device) => {
        const file = `${screen.id}__${device.id}.png`;
        const exists = fs.existsSync(path.join(DIR, file));
        return `
        <figure>
          <figcaption>${device.title}<span>${device.size}</span></figcaption>
          ${exists ? `<img src="${file}" alt="${screen.title} ${device.title}" />` : `<div class="missing">캡처 없음</div>`}
        </figure>`;
      })
      .join("");
    return `
    <article id="${screen.id}">
      <header>
        <h2>${screen.title}</h2>
        <p class="route">${screen.route}</p>
        <p>${screen.note}</p>
        ${analysis ? `<p class="analysis">${analysis}</p>` : ""}
      </header>
      <div class="grid">${images}</div>
    </article>`;
  })
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mimic 반응형 레이아웃 · ${PHASE}</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, sans-serif;
      background: #0b0b0b;
      color: #f3f3f3;
      line-height: 1.5;
    }
    header.page {
      position: sticky;
      top: 0;
      z-index: 10;
      background: #111;
      border-bottom: 1px solid #333;
      padding: 16px 20px;
    }
    h1 { margin: 0 0 6px; font-size: 22px; color: #60D96C; }
    nav { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    nav a {
      color: #111;
      background: #60D96C;
      text-decoration: none;
      padding: 4px 8px;
      border-radius: 999px;
      font-size: 12px;
    }
    article {
      padding: 24px 20px;
      border-bottom: 1px solid #222;
    }
    article h2 { margin: 0; color: #60D96C; }
    .route { color: #9ca3af; font-family: ui-monospace, monospace; font-size: 13px; }
    .analysis { background: #1a1a1a; border-left: 3px solid #60D96C; padding: 10px 12px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 16px;
    }
    figure { margin: 0; background: #141414; border-radius: 12px; overflow: hidden; }
    figcaption {
      display: flex;
      justify-content: space-between;
      padding: 8px 10px;
      font-size: 13px;
      background: #1f1f1f;
    }
    figcaption span { color: #9ca3af; }
    img { width: 100%; height: auto; display: block; background: #000; }
    .missing { height: 180px; display: grid; place-items: center; color: #777; }
    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header class="page">
    <h1>Mimic 화면 레이아웃 · ${PHASE}</h1>
    <p>같은 화면을 모바일 / 태블릿 / PC 로 나란히 보면, 어디에 글자나 버튼이 넘치는지 한눈에 볼 수 있습니다.</p>
    <nav>
      ${screens.map((s) => `<a href="#${s.id}">${s.title}</a>`).join("")}
    </nav>
  </header>
  ${cards}
</body>
</html>
`;

fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, "index.html"), html);
console.log("wrote", path.join(DIR, "index.html"));
