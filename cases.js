"use strict";
/* 案件の解説機能
 * 案件の文章から「構成図」「通信の流れ」「出てくる用語」「確認事項」を自動で作る。
 * すべて端末内で処理し、外部には送信しない。
 */
const LAYER_NAMES = ["利用者", "回線", "境界（入口の守り）", "振り分け・社内LAN", "サーバー", "データ・運用"];

/* 構成図の部品。kw は案件の文章から自動で見つけるためのキーワード */
const COMPONENTS = [
  { id: "users", name: "利用者", sub: "PC・スマホ", layer: 0, kw: /利用者|ユーザー|顧客|お客様|閲覧者|会員/, role: "サービスを使う人。ブラウザやアプリからアクセスする。" },
  { id: "remote", name: "テレワーク", sub: "社外の端末", layer: 0, term: "vpn", kw: /テレワーク|リモートワーク|在宅|社外から|外出先/, role: "社外から社内システムを使う端末。VPNなどで暗号化してつなぐ。" },
  { id: "branch", name: "支社・拠点", sub: "別拠点のLAN", layer: 0, term: "lan-wan", kw: /支社|支店|拠点|営業所|工場|店舗/, role: "離れた場所にある別のネットワーク。拠点間はVPNや専用線でつなぐ。" },
  { id: "internet", name: "インターネット", layer: 1, term: "global-ip", kw: /インターネット|外部公開|Web\s*サイト|ホームページ|ECサイト/i, role: "世界中とつながる公共のネットワーク。ここを通る通信は盗聴や攻撃の危険があるため、入口で守る。" },
  { id: "cdn", name: "CDN", sub: "配信の高速化", layer: 1, term: "cdn", kw: /\bCDN\b|CloudFront|配信を高速/i, role: "利用者に近いサーバーから画像などを配信し、表示を速くする。" },
  { id: "wan", name: "専用線・閉域網", layer: 1, term: "lan-wan", kw: /専用線|閉域|\bWAN\b/, role: "インターネットを通らずに拠点同士を結ぶ回線。安全で安定しているが費用は高め。" },
  { id: "router", name: "ルーター", layer: 2, term: "router", kw: /ルーター|ルータ(?!ー)/, role: "外のネットワークと社内のネットワークをつなぎ、宛先に応じて通信を中継する。" },
  { id: "firewall", name: "ファイアウォール", sub: "FW・UTM", layer: 2, term: "firewall", kw: /ファイアウォール|\bFW\b|\bUTM\b|不正アクセス/, role: "許可した通信だけを通し、それ以外を遮断する門番。" },
  { id: "vpn", name: "VPN装置", layer: 2, term: "vpn", kw: /VPN/i, role: "拠点やテレワーク端末との通信を暗号化し、インターネット上に専用のトンネルを作る。" },
  { id: "waf", name: "WAF", sub: "Web攻撃対策", layer: 2, term: "waf", kw: /\bWAF\b/, role: "Webアプリへの攻撃（SQLインジェクションなど）を、通信の中身を見て防ぐ。" },
  { id: "lb", name: "ロードバランサー", sub: "負荷分散", layer: 3, term: "load-balancer", kw: /ロードバランサ|負荷分散|\bALB\b|\bELB\b|\bNLB\b/, role: "アクセスを複数のサーバーに振り分ける。故障したサーバーは自動で外す。" },
  { id: "proxy", name: "プロキシ", layer: 3, term: "proxy", kw: /プロキシ|proxy/i, role: "社内からインターネットへのアクセスを代理で行い、危険なサイトの遮断や記録をする。" },
  { id: "switch", name: "スイッチ", sub: "L2・L3", layer: 3, term: "switch", kw: /スイッチ|VLAN|社内LAN|LAN配線|有線LAN/, role: "社内の機器を束ねてつなぐ。VLANで部署ごとにネットワークを分けることもできる。" },
  { id: "wifi", name: "無線LAN", sub: "アクセスポイント", layer: 3, kw: /無線LAN|Wi-?Fi|アクセスポイント/i, role: "PCやスマホを無線で社内ネットワークにつなぐ。暗号化と認証の設定が重要。" },
  { id: "web", name: "Webサーバー", layer: 4, term: "webserver", kw: /Web\s*サーバ|Web\s*サイト|ホームページ|ECサイト|nginx|Apache/i, role: "Webページを利用者に返す。外部に公開するため、DMZなどの区画に置くことが多い。" },
  { id: "ap", name: "APサーバー", sub: "業務アプリ", layer: 4, term: "client-server", kw: /アプリケーションサーバ|APサーバ|業務システム|基幹システム|販売管理|予約システム|会員システム/, role: "業務の処理（注文・予約など）を行うプログラムが動くサーバー。" },
  { id: "mail", name: "メールサーバー", layer: 4, term: "smtp", kw: /メール/, role: "メールの送受信を担当する。迷惑メール・ウイルス対策も検討する。" },
  { id: "dns", name: "DNSサーバー", layer: 4, term: "dns", kw: /\bDNS\b|ドメイン/, role: "ドメイン名とIPアドレスを対応づける。止まるとWebもメールも使えなくなる重要な部品。" },
  { id: "ad", name: "認証サーバー", sub: "AD・LDAP", layer: 4, term: "ldap", kw: /Active\s*Directory|\bAD\b|LDAP|認証基盤|アカウント管理|シングルサインオン|\bSSO\b/i, role: "社員のアカウントを一元管理し、ログインの本人確認を行う。" },
  { id: "file", name: "ファイルサーバー", layer: 4, term: "nas-san", kw: /ファイルサーバ|ファイル共有|\bNAS\b|共有フォルダ/, role: "社内でファイルを共有する。アクセス権の設計とバックアップが大切。" },
  { id: "db", name: "データベース", sub: "DB", layer: 5, term: "rdbms", kw: /データベース|\bDB\b|\bRDS\b|Aurora|DynamoDB|MySQL|PostgreSQL|Oracle|SQL\s*Server|顧客情報|会員情報/i, role: "顧客や注文などのデータを保存する。外部から直接アクセスできない場所に置く。" },
  { id: "storage", name: "ストレージ", layer: 5, term: "object-storage", kw: /ストレージ|\bS3\b|\bSAN\b/, role: "大量のデータを保存する装置・サービス。" },
  { id: "backup", name: "バックアップ", layer: 5, term: "backup", kw: /バックアップ|退避|復旧/, role: "データのコピーを別の場所に保存し、故障や誤操作から復元できるようにする。" },
  { id: "monitor", name: "監視", sub: "障害の検知", layer: 5, term: "monitoring", kw: /監視|アラート|死活|Zabbix|CloudWatch|障害通知/i, role: "サーバーや回線の状態を見張り、異常があれば担当者に知らせる。" }
];
const COMP = Object.fromEntries(COMPONENTS.map(c => [c.id, c]));
const REDUNDANT_KW = /冗長|二重化|\bHA\b|止まらない|止められない|無停止|可用性|フェイル?オーバー|24時間365日/;
const CLOUD_KW = /\bAWS\b|Azure|\bGCP\b|Google Cloud|クラウド/i;
const REDUNDANT_TARGETS = ["firewall", "lb", "web", "ap", "db", "router"];

/* お客さんに確認しておきたいこと（when：どの部品があるときに出すか） */
const CHECKS = [
  { id: "users", q: "利用者数・同時アクセス数はどのくらいを想定しているか？" },
  { id: "schedule", q: "いつまでに使い始めたいか（スケジュール）？予算の目安は？" },
  { id: "ops", q: "構築後の運用・保守はだれが行うか？障害時の連絡体制は？" },
  { id: "existing", q: "今ある機器・システム・ネットワークはどうなっているか？" },
  { id: "web", when: ["web", "internet"], q: "公開するサービスの内容と、アクセスが集中する時期は？" },
  { id: "cert", when: ["web"], q: "HTTPS用のサーバー証明書とドメインは、どちらが用意・管理するか？" },
  { id: "sla", when: ["lb", "@redundant"], q: "止まってはいけない範囲はどこか？目標の稼働率（SLA）は？" },
  { id: "rpo", when: ["db", "backup", "file"], q: "バックアップの頻度と保管期間は？どの時点まで戻せればよいか（RPO）？" },
  { id: "rto", when: ["db", "backup", "@redundant"], q: "障害が起きたら、何時間以内に復旧が必要か（RTO）？" },
  { id: "vpn", when: ["vpn", "remote", "branch"], q: "接続する拠点の数・テレワークの人数は？VPNの方式（IPsec／SSL-VPN）は？" },
  { id: "auth", when: ["vpn", "remote", "ad"], q: "ログインの認証方法は？多要素認証（MFA）は必要か？" },
  { id: "fw", when: ["firewall", "waf"], q: "外部に公開する通信（ポート番号）と、社内から外への通信のルールは？" },
  { id: "policy", when: ["firewall", "db"], q: "個人情報などの機密データはあるか？守るべきセキュリティ規程は？" },
  { id: "cloud", when: ["@cloud"], q: "クラウドの利用リージョンは？費用の上限やアカウントの管理者は？" },
  { id: "monitor", when: ["monitor"], q: "監視する対象と項目は？異常時はだれに、どうやって知らせるか？" },
  { id: "mail", when: ["mail"], q: "メールの利用者数・ドメインは？迷惑メール・ウイルス対策は必要か？" },
  { id: "wifi", when: ["wifi"], q: "無線LANを使う場所と台数は？来客用のWi-Fiは分ける必要があるか？" },
  { id: "dns", when: ["dns"], q: "使用するドメイン名と、DNSを管理するのはだれか？" },
  { id: "net", when: ["switch"], q: "部署ごとにネットワークを分ける（VLAN）必要はあるか？IPアドレスの割り当て方針は？" }
];

const SAMPLE_CASE = {
  title: "【サンプル】Webサイト公開と拠点間接続",
  client: "サンプル商事株式会社",
  text: "従業員50名の会社です。本社と大阪支社をVPNで接続したい。\n社外向けのWebサイトを公開し、会員情報はデータベースで管理する。Webサーバーは2台にして冗長化し、ロードバランサーで負荷分散したい。\nファイアウォールを設置してDMZを作り、データベースは毎日バックアップを取る。\nテレワーク用にSSL-VPNも検討中。サーバーの死活監視も行い、障害時は担当者に通知してほしい。"
};

/* ───────── 解析 ───────── */
function caseAuto(c) {
  const text = `${c.title}\n${c.text}`;
  const auto = new Set(COMPONENTS.filter(x => x.kw.test(text)).map(x => x.id));
  if (auto.has("web") || auto.has("lb") || auto.has("cdn")) { auto.add("users"); auto.add("internet"); }
  if ((auto.has("vpn") || auto.has("remote")) && !auto.has("wan")) auto.add("internet");
  if (auto.has("web") && !auto.has("firewall") && !auto.has("waf")) auto.add("firewall");
  return auto;
}
function caseComps(c) {
  const set = caseAuto(c), man = c.manual || {};
  for (const [id, on] of Object.entries(man)) on ? set.add(id) : set.delete(id);
  return COMPONENTS.filter(x => set.has(x.id));
}
const caseRedundant = c => c.redundant ?? REDUNDANT_KW.test(c.text);
const caseCloud = c => (c.env ?? (CLOUD_KW.test(c.text) ? "cloud" : "onprem")) === "cloud";

const KATA = /[゠-ヿ]/;
function detectKeys(t) {
  return answerKeys(t).filter(k => k.length >= 2 && !/[（）()]/.test(k));
}
function findTermHits(text) {
  const hits = [];
  const lower = text.toLowerCase();
  for (const t of allTerms()) {
    for (const k of detectKeys(t)) {
      const ascii = /^[\x20-\x7E]+$/.test(k);
      const caseless = ascii && k.length >= 3;
      const hay = caseless ? lower : text, needle = caseless ? k.toLowerCase() : k;
      let i = hay.indexOf(needle);
      while (i !== -1) {
        const before = text[i - 1] || "", after = text[i + k.length] || "";
        let ok = true;
        if (ascii && (/[A-Za-z0-9]/.test(before) || /[A-Za-z0-9]/.test(after))) ok = false;
        if (KATA.test(k[0]) && KATA.test(before)) ok = false;
        if (KATA.test(k[k.length - 1]) && KATA.test(after)) ok = false;
        if (ok) hits.push({ s: i, e: i + k.length, id: t.id });
        i = hay.indexOf(needle, i + 1);
      }
    }
  }
  hits.sort((a, b) => a.s - b.s || (b.e - b.s) - (a.e - a.s));
  const out = []; let end = -1;
  for (const h of hits) if (h.s >= end) { out.push(h); end = h.e; }
  return out;
}
function caseTerms(c) {
  const hits = findTermHits(`${c.title}\n${c.text}`);
  const ids = [...new Set(hits.map(h => h.id))];
  // 構成図の部品に対応する用語も加える
  caseComps(c).forEach(x => { if (x.term && !ids.includes(x.term)) ids.push(x.term); });
  return ids.map(getTerm).filter(Boolean);
}
function caseChecks(c) {
  const comps = new Set(caseComps(c).map(x => x.id));
  if (caseRedundant(c)) comps.add("@redundant");
  if (caseCloud(c)) comps.add("@cloud");
  return CHECKS.filter(k => !k.when || k.when.some(w => comps.has(w)));
}

/* ───────── 構成図 ───────── */
function caseDiagram(c) {
  const comps = caseComps(c);
  if (!comps.length) return `<div class="empty"><strong>構成図の部品がありません</strong>下の部品を選ぶと、自動で図ができます。</div>`;
  const red = caseRedundant(c), cloud = caseCloud(c);
  const W = 340, BW = 98, BH = 48, ROW = 96, PER = 3, TOP = 32;
  const rows = [];
  for (let L = 0; L < LAYER_NAMES.length; L++) {
    const items = comps.filter(x => x.layer === L);
    for (let i = 0; i < items.length; i += PER) rows.push({ L, items: items.slice(i, i + PER), first: i === 0 });
  }
  const H = rows.length * ROW + 10;
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="構成図"><defs><marker id="ah-case" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="d-head"/></marker></defs>`;
  // 社内／クラウドの枠
  const inner = rows.map((r, i) => ({ r, i })).filter(x => x.r.L >= 3);
  if (inner.length) {
    const y0 = inner[0].i * ROW + 2, y1 = (inner[inner.length - 1].i + 1) * ROW - 8;
    svg += `<rect x="2" y="${y0}" width="${W - 4}" height="${y1 - y0}" rx="12" class="d-zone"/>` +
      `<text x="${W - 10}" y="${y0 + 14}" text-anchor="end" class="d-zlbl">${cloud ? "クラウド（VPC）" : "社内ネットワーク"}</text>`;
  }
  rows.forEach((r, i) => {
    const top = i * ROW + TOP, n = r.items.length;
    const gap = 10, total = n * BW + (n - 1) * gap, x0 = (W - total) / 2;
    const centers = r.items.map((_, k) => x0 + k * (BW + gap) + BW / 2);
    // 次の行への接続線
    if (i < rows.length - 1) {
      const nx = rows[i + 1], nn = nx.items.length, ntotal = nn * BW + (nn - 1) * gap, nx0 = (W - ntotal) / 2;
      const ncenters = nx.items.map((_, k) => nx0 + k * (BW + gap) + BW / 2);
      const busY = top + BH + 12, nTop = (i + 1) * ROW + TOP;
      if (n > 1) svg += `<line x1="${centers[0]}" y1="${busY}" x2="${centers[n - 1]}" y2="${busY}" class="d-wire"/>`;
      centers.forEach(cx => svg += `<line x1="${cx}" y1="${top + BH}" x2="${cx}" y2="${busY}" class="d-wire"/>`);
      if (nn > 1) svg += `<line x1="${ncenters[0]}" y1="${nTop - 10}" x2="${ncenters[nn - 1]}" y2="${nTop - 10}" class="d-wire"/>`;
      ncenters.forEach(cx => svg += `<line x1="${cx}" y1="${nTop - 10}" x2="${cx}" y2="${nTop - 1}" class="d-line" marker-end="url(#ah-case)"/>`);
      const midA = n > 1 ? W / 2 : centers[0], midB = nn > 1 ? W / 2 : ncenters[0];
      svg += `<path d="M${midA} ${busY} L${midA} ${busY + 6} L${midB} ${nTop - 14} L${midB} ${nTop - 10}" class="d-wire" fill="none"/>`;
    }
    r.items.forEach((x, k) => {
      const bx = x0 + k * (BW + gap), dbl = red && REDUNDANT_TARGETS.includes(x.id);
      const nameSize = Math.min(12.5, (BW - 14) / [...x.name].length);
      const sub = [x.sub, dbl ? "2台構成" : ""].filter(Boolean).join(" ・ ");
      svg += `<g class="d-node" ${x.term ? `data-act="open" data-id="${x.term}"` : ""}>` +
        (dbl ? `<rect x="${bx + 5}" y="${top + 5}" width="${BW}" height="${BH}" rx="9" class="d-box"/>` : "") +
        `<rect x="${bx}" y="${top}" width="${BW}" height="${BH}" rx="9" class="${x.layer === 2 ? "d-acc" : "d-box"}"/>` +
        `<text x="${bx + BW / 2}" y="${top + (sub ? 21 : 29)}" text-anchor="middle" class="d-txt" style="font-size:${nameSize.toFixed(1)}px">${esc(x.name)}</text>` +
        (sub ? `<text x="${bx + BW / 2}" y="${top + 37}" text-anchor="middle" class="${dbl ? "d-num" : "d-sub"}" style="font-size:${Math.min(10.5, (BW - 10) / [...sub].length).toFixed(1)}px">${esc(sub)}</text>` : "") +
        `</g>`;
    });
  });
  // 層の名前は最後に描いて、線より手前に表示する
  rows.forEach((r, i) => { if (r.first) svg += `<text x="8" y="${i * ROW + 14}" class="d-lbl">${LAYER_NAMES[r.L]}</text>`; });
  return svg + `</svg>`;
}

/* ───────── 画面 ───────── */
function getCase(id) { return state.cases.find(c => c.id === id); }
function casesView() {
  const list = state.cases.slice().sort((a, b) => b.updated - a.updated);
  return `<div class="row between"><div><h1>案件</h1><p class="muted small">案件の内容から、構成図と解説を自動で作ります</p></div><button class="btn" data-act="case-new">＋ 新規</button></div>
  <div class="memo small">🔒 案件の内容はこの端末の中だけに保存され、外部には送信されません。バックアップファイルには案件も含まれるので、取り扱いに注意してください。</div>
  ${list.length ? `<div class="card" style="padding:4px 14px">${list.map(c => {
    const comps = caseComps(c).length, terms = caseTerms(c).length;
    return `<button class="termrow" data-act="case-open" data-id="${esc(c.id)}"><span class="grow"><span class="name">${esc(c.title || "無題の案件")}</span>
      <span class="def">${esc(c.client ? c.client + " ・ " : "")}部品 ${comps}・用語 ${terms} ・ ${new Date(c.updated).toLocaleDateString("ja-JP")}</span></span><span class="chev">${icon("chev", 18)}</span></button>`;
  }).join("")}</div>`
    : `<div class="card"><div class="empty"><strong>まだ案件がありません</strong>お客さんからの要件やメールの文面を貼り付けると、構成図・通信の流れ・用語の解説・確認事項を自動で作ります。</div>
      <button class="btn secondary full" data-act="case-sample">サンプル案件で試してみる</button></div>`}`;
}
function caseEditView() {
  const isNew = ui.caseEdit === "new";
  const c = isNew ? { title: "", client: "", text: "" } : getCase(ui.caseEdit);
  if (!c) { ui.caseEdit = null; return casesView(); }
  return `<h1>${isNew ? "新しい案件" : "案件を編集"}</h1>
  <form id="caseForm">
    <label class="f" for="c-title">案件名（必須）</label><input class="field" id="c-title" name="title" required value="${esc(c.title)}" placeholder="例：本社と支社のネットワーク更改">
    <label class="f" for="c-client">お客さん（任意）</label><input class="field" id="c-client" name="client" value="${esc(c.client || "")}" placeholder="例：○○株式会社">
    <label class="f" for="c-text">案件の内容（要件・メールの文面などをそのまま貼り付け）</label>
    <textarea class="field" id="c-text" name="text" style="min-height:220px" placeholder="例：本社と支社をVPNでつなぎたい。Webサイトを公開し、サーバーは冗長化したい…">${esc(c.text)}</textarea>
    <p class="small muted">文中の「VPN」「冗長化」「データベース」などのキーワードから、構成図の部品を自動で推定します。あとから手動で追加・削除もできます。</p>
    <div class="formactions"><button type="button" class="btn ghost" data-act="back">キャンセル</button><button class="btn" type="submit">${isNew ? "解説を作る" : "保存する"}</button></div>
  </form>`;
}
function highlightText(text) {
  const hits = findTermHits(text);
  let out = "", pos = 0;
  for (const h of hits) {
    out += esc(text.slice(pos, h.s)) + `<button class="hl" data-act="open" data-id="${esc(h.id)}">${esc(text.slice(h.s, h.e))}</button>`;
    pos = h.e;
  }
  return out + esc(text.slice(pos));
}
function caseView() {
  const c = getCase(ui.caseView);
  if (!c) { ui.caseView = null; return casesView(); }
  const comps = caseComps(c), terms = caseTerms(c), checks = caseChecks(c), done = checks.filter(k => (c.checks || {})[k.id]).length;
  const red = caseRedundant(c), cloud = caseCloud(c);
  const ids = new Set(comps.map(x => x.id));
  return `<div class="card">
    ${c.client ? `<span class="pill">${esc(c.client)}</span>` : ""}
    <div class="term">${esc(c.title || "無題の案件")}</div>
    <p class="small muted">更新：${new Date(c.updated).toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" })} ・ 部品 ${comps.length} ・ 用語 ${terms.length}</p>
    <div class="row wrap mt" style="gap:8px"><button class="btn secondary sm" data-act="case-edit" data-id="${esc(c.id)}">内容を編集</button><button class="btn ghost sm" data-act="case-copy" data-id="${esc(c.id)}">解説をコピー</button><button class="btn danger sm" data-act="case-delete" data-id="${esc(c.id)}">削除</button></div>
  </div>

  <div class="card"><h2>① 構成図</h2><p class="small muted">部品をタップすると、その用語の解説が開きます。</p>
    <div class="diagram">${caseDiagram(c)}</div>
    <div class="setting"><span class="small">冗長化（重要な機器を2台に）</span><div class="seg"><button class="${red ? "" : "on"}" data-act="case-red" data-v="0">なし</button><button class="${red ? "on" : ""}" data-act="case-red" data-v="1">あり</button></div></div>
    <div class="setting"><span class="small">サーバーの置き場所</span><div class="seg"><button class="${cloud ? "" : "on"}" data-act="case-env" data-v="onprem">社内</button><button class="${cloud ? "on" : ""}" data-act="case-env" data-v="cloud">クラウド</button></div></div>
    <div class="section-label">部品の追加・削除</div>
    <div class="chips wrapall">${COMPONENTS.map(x => `<button class="chip ${ids.has(x.id) ? "on" : ""}" data-act="case-comp" data-id="${x.id}">${esc(x.name)}</button>`).join("")}</div>
    ${c.manual && Object.keys(c.manual).length || c.redundant !== undefined || c.env !== undefined ? `<button class="btn ghost sm mt" data-act="case-auto">自動推定に戻す</button>` : ""}
  </div>

  ${comps.length ? `<div class="card"><h2>② 通信の流れ</h2><p class="small muted">構成図の上から順に、各部品の役割を説明します。</p>
    <ol class="flow">${comps.map(x => `<li><b>${esc(x.name)}</b>${red && REDUNDANT_TARGETS.includes(x.id) ? '<span class="tag">2台で冗長化</span>' : ""}<br><span class="small">${esc(x.role)}</span></li>`).join("")}</ol>
    ${red ? `<div class="memo small">💡 冗長化：同じ役割の機器を2台用意し、1台が壊れても止まらないようにします。どこか1か所でも1台だけの機器が残ると、そこが単一障害点（SPOF）になります。</div>` : ""}
    ${ids.has("firewall") && ids.has("web") && ids.has("db") ? `<div class="memo small">💡 公開するWebサーバーはDMZに、データベースは外部から直接届かない内部に置くのが基本です。</div>` : ""}
  </div>` : ""}

  <div class="card"><h2>③ 案件の内容</h2><p class="small muted">色の付いた言葉をタップすると解説が開きます。</p>
    <div class="casetext">${highlightText(c.text || "")}</div></div>

  <div class="card"><div class="row between"><h2 style="margin:0">④ 出てくる用語（${terms.length}）</h2>${terms.length ? `<button class="btn secondary sm" data-act="case-quiz" data-id="${esc(c.id)}">クイズ</button>` : ""}</div>
    ${terms.length ? terms.map(t => `<button class="termexp" data-act="open" data-id="${esc(t.id)}"><b>${esc(t.term)}</b><span>${esc(t.def)}</span>${t.mem ? `<span class="m">💡 ${esc(t.mem)}</span>` : ""}</button>`).join("")
      : `<p class="muted small">登録済みの用語は見つかりませんでした。知らない言葉は「用語」タブで追加すると、次から自動で解説されます。</p>`}
  </div>

  <div class="card"><div class="row between"><h2 style="margin:0">⑤ 確認しておきたいこと</h2><span class="small muted">${done} / ${checks.length}</span></div>
    <p class="small muted">お客さんへのヒアリングに使えるチェックリストです。</p>
    ${checks.map(k => `<label class="checkitem"><input type="checkbox" data-check="${k.id}" ${(c.checks || {})[k.id] ? "checked" : ""}><span>${esc(k.q)}</span></label>`).join("")}
  </div>

  <div class="card"><h2>⑥ メモ</h2>
    <textarea class="field" id="caseMemo" placeholder="ヒアリングの結果や、調べたことを書いておこう">${esc(c.memo || "")}</textarea>
    <p class="small muted">入力すると自動で保存されます。</p></div>`;
}
function caseSummary(c) {
  const comps = caseComps(c), terms = caseTerms(c), checks = caseChecks(c), red = caseRedundant(c);
  const lines = [`【案件】${c.title}${c.client ? `（${c.client}）` : ""}`, "",
    "■ 構成", comps.map(x => x.name + (red && REDUNDANT_TARGETS.includes(x.id) ? "×2" : "")).join(" → "), "",
    "■ 各部品の役割", ...comps.map((x, i) => `${i + 1}. ${x.name}：${x.role}`), "",
    "■ 出てくる用語", ...terms.map(t => `・${t.term}：${t.def}`), "",
    "■ 確認事項", ...checks.map(k => `${(c.checks || {})[k.id] ? "[x]" : "[ ]"} ${k.q}`)];
  if (c.memo) lines.push("", "■ メモ", c.memo);
  return lines.join("\n");
}

function touchCase(c) { c.updated = Date.now(); save(); }
const CASE_ACTIONS = {
  "case-new": () => { ui.caseEdit = "new"; render(); window.scrollTo(0, 0); },
  "case-sample": () => {
    const c = { id: "case-" + Date.now(), ...SAMPLE_CASE, manual: {}, checks: {}, memo: "", created: Date.now(), updated: Date.now() };
    state.cases.push(c); save(); ui.caseView = c.id; render(); window.scrollTo(0, 0);
  },
  "case-open": el => { ui.caseView = el.dataset.id; render(); window.scrollTo(0, 0); },
  "case-edit": el => { ui.caseEdit = el.dataset.id; render(); window.scrollTo(0, 0); },
  "case-delete": el => {
    const c = getCase(el.dataset.id); if (!c || !confirm(`「${c.title}」を削除しますか？`)) return;
    state.cases = state.cases.filter(x => x !== c); save(); ui.caseView = null; render(); toast("案件を削除しました");
  },
  "case-comp": el => {
    const c = getCase(ui.caseView), id = el.dataset.id, auto = caseAuto(c).has(id), on = caseComps(c).some(x => x.id === id);
    c.manual = c.manual || {};
    if (on === auto) c.manual[id] = !on; else delete c.manual[id];
    touchCase(c); render();
  },
  "case-red": el => { const c = getCase(ui.caseView); c.redundant = el.dataset.v === "1"; touchCase(c); render(); },
  "case-env": el => { const c = getCase(ui.caseView); c.env = el.dataset.v; touchCase(c); render(); },
  "case-auto": () => { const c = getCase(ui.caseView); c.manual = {}; delete c.redundant; delete c.env; touchCase(c); render(); toast("自動推定に戻しました"); },
  "case-quiz": el => { const ts = caseTerms(getCase(el.dataset.id)); startSession({ title: "案件の用語クイズ", sources: termSources(ts, Math.max(state.settings.quizSize, Math.min(ts.length, 20))) }); },
  "case-copy": async el => {
    const text = caseSummary(getCase(el.dataset.id));
    try { await navigator.clipboard.writeText(text); toast("解説をコピーしました"); }
    catch (e) {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast("解説をコピーしました"); } catch (e2) { alert(text); }
      ta.remove();
    }
  }
};
function saveCaseForm(f) {
  const title = String(f.get("title")).trim(), client = String(f.get("client")).trim(), text = String(f.get("text"));
  if (!title) return toast("案件名を入力してください");
  let c;
  if (ui.caseEdit === "new") {
    c = { id: "case-" + Date.now(), title, client, text, manual: {}, checks: {}, memo: "", created: Date.now() };
    state.cases.push(c);
  } else { c = getCase(ui.caseEdit); Object.assign(c, { title, client, text }); }
  touchCase(c); ui.caseEdit = null; ui.caseView = c.id; render(); window.scrollTo(0, 0); toast("解説を作りました");
}
document.addEventListener("change", e => {
  const k = e.target.dataset && e.target.dataset.check;
  if (!k) return;
  const c = getCase(ui.caseView); if (!c) return;
  c.checks = c.checks || {}; c.checks[k] = e.target.checked; touchCase(c);
});
let memoTimer;
document.addEventListener("input", e => {
  if (e.target.id !== "caseMemo") return;
  const c = getCase(ui.caseView); if (!c) return;
  c.memo = e.target.value;
  clearTimeout(memoTimer); memoTimer = setTimeout(() => touchCase(c), 400);
});
