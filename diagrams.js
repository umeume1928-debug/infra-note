/* 用語の図解（SVG）。色は style.css の .d-* クラスで指定し、ダークモードにも対応。 */
const DIAGRAMS = (() => {
  const arrow = id => `<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="d-head"/></marker></defs>`;
  const box = (x, y, w, h, label, cls = "d-box", sub = "") =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" class="${cls}"/>` +
    `<text x="${x + w / 2}" y="${y + h / 2 + (sub ? -3 : 5)}" text-anchor="middle" class="d-txt">${label}</text>` +
    (sub ? `<text x="${x + w / 2}" y="${y + h / 2 + 13}" text-anchor="middle" class="d-sub">${sub}</text>` : "");
  const line = (x1, y1, x2, y2, m, cls = "d-line") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" marker-end="url(#${m})"/>`;
  const t = (x, y, s, cls = "d-sub", anchor = "middle") => `<text x="${x}" y="${y}" text-anchor="${anchor}" class="${cls}">${s}</text>`;

  const osiLayers = [
    ["7", "アプリケーション層", "HTTP / DNS / SMTP"],
    ["6", "プレゼンテーション層", "文字コード・暗号化"],
    ["5", "セッション層", "通信の開始〜終了"],
    ["4", "トランスポート層", "TCP / UDP（ポート番号）"],
    ["3", "ネットワーク層", "IP / ルーター"],
    ["2", "データリンク層", "Ethernet / MAC / スイッチ"],
    ["1", "物理層", "ケーブル・電気信号"]
  ];
  const osi = `<svg viewBox="0 0 340 300" role="img" aria-label="OSI参照モデルの7階層">` +
    osiLayers.map((l, i) => {
      const y = 8 + i * 41, acc = l[0] === "3" || l[0] === "4" || l[0] === "2";
      return `<rect x="8" y="${y}" width="324" height="35" rx="8" class="${acc ? "d-acc" : "d-box"}"/>` +
        `<text x="26" y="${y + 23}" text-anchor="middle" class="d-num">L${l[0]}</text>` +
        `<text x="46" y="${y + 16}" class="d-txt">${l[1]}</text>` +
        `<text x="46" y="${y + 29}" class="d-sub">${l[2]}</text>`;
    }).join("") + `</svg>`;

  const tcp = `<svg viewBox="0 0 340 230" role="img" aria-label="TCPの3ウェイハンドシェイク">${arrow("ah-tcp")}` +
    box(10, 8, 110, 38, "クライアント", "d-acc") + box(220, 8, 110, 38, "サーバー", "d-acc") +
    `<line x1="65" y1="46" x2="65" y2="222" class="d-life"/><line x1="275" y1="46" x2="275" y2="222" class="d-life"/>` +
    line(65, 72, 273, 104, "ah-tcp") + t(170, 78, "① SYN（つないでいい？）", "d-txt") +
    line(275, 122, 67, 154, "ah-tcp") + t(170, 128, "② SYN / ACK（いいよ）", "d-txt") +
    line(65, 172, 273, 204, "ah-tcp") + t(170, 178, "③ ACK（了解、送るね）", "d-txt") +
    `</svg>`;

  const dns = `<svg viewBox="0 0 340 300" role="img" aria-label="DNSの名前解決の流れ">${arrow("ah-dns")}` +
    box(8, 120, 82, 50, "PC", "d-box", "スタブリゾルバ") +
    box(128, 120, 90, 50, "リゾルバ", "d-acc", "キャッシュDNS") +
    box(250, 10, 84, 46, "ルート", "d-box", "「.」") +
    box(250, 122, 84, 46, "TLD", "d-box", "「.com」") +
    box(250, 234, 84, 46, "権威", "d-box", "example.com") +
    line(90, 138, 126, 138, "ah-dns") + t(108, 132, "①") +
    line(218, 128, 250, 46, "ah-dns") + t(226, 78, "②") +
    line(218, 145, 248, 145, "ah-dns") + t(234, 139, "③") +
    line(218, 162, 250, 248, "ah-dns") + t(226, 220, "④") +
    line(126, 156, 92, 156, "ah-dns") + t(108, 172, "⑤") +
    t(8, 205, "① www.example.com のIPは？", "d-sub", "start") +
    t(8, 222, "②③ 次に聞く先を順に教わる", "d-sub", "start") +
    t(8, 239, "④ 権威サーバーが答えを返す", "d-sub", "start") +
    t(8, 256, "⑤ 結果をPCに返し、キャッシュ", "d-sub", "start") +
    `</svg>`;

  const nat = `<svg viewBox="0 0 340 250" role="img" aria-label="NAPTによるアドレス変換">${arrow("ah-nat")}` +
    box(8, 20, 100, 42, "PC-A", "d-box", "192.168.1.10:50001") +
    box(8, 100, 100, 42, "PC-B", "d-box", "192.168.1.11:50001") +
    box(136, 60, 74, 42, "ルーター", "d-acc", "NAPT") +
    box(240, 60, 92, 42, "Webサーバー", "d-box", "203.0.113.5:443") +
    line(108, 41, 134, 72, "ah-nat") + line(108, 121, 134, 92, "ah-nat") + line(210, 81, 238, 81, "ah-nat") +
    `<rect x="8" y="160" width="324" height="82" rx="9" class="d-box"/>` +
    t(18, 180, "変換表（送信元を書き換える）", "d-txt", "start") +
    t(18, 200, "192.168.1.10:50001 → 198.51.100.1:60001", "d-sub", "start") +
    t(18, 218, "192.168.1.11:50001 → 198.51.100.1:60002", "d-sub", "start") +
    t(18, 236, "1つのグローバルIPをポート番号で区別して共有", "d-sub", "start") +
    `</svg>`;

  const lb = `<svg viewBox="0 0 340 220" role="img" aria-label="ロードバランサーによる負荷分散">${arrow("ah-lb")}` +
    box(8, 88, 78, 44, "利用者", "d-box", "ブラウザ") +
    box(120, 82, 92, 56, "LB", "d-acc", "振り分け") +
    box(246, 10, 86, 42, "Web #1", "d-box", "正常") +
    box(246, 89, 86, 42, "Web #2", "d-box", "正常") +
    box(246, 168, 86, 42, "Web #3", "d-err", "応答なし") +
    line(86, 110, 118, 110, "ah-lb") +
    line(212, 96, 244, 34, "ah-lb") + line(212, 110, 244, 110, "ah-lb") +
    `<line x1="212" y1="124" x2="244" y2="186" class="d-line d-dash"/>` +
    t(122, 165, "ヘルスチェックで", "d-sub", "start") + t(122, 181, "異常な #3 を外す", "d-sub", "start") +
    `</svg>`;

  return { osi, tcp, dns, nat, lb };
})();
