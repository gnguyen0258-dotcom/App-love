const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const chromePath =
  process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.HEARTSYNC_URL || "http://127.0.0.1:5173";

async function main() {
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "heartsync-cdp-"));
  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--no-first-run",
      "--disable-extensions",
      "--hide-scrollbars",
      "--remote-debugging-port=0",
      "--user-data-dir=" + profileDir,
      baseUrl + "/?preview=app",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  let stderr = "";
  const browserWebSocket = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Chrome startup timed out")), 15_000);
    chrome.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    chrome.on("exit", (code) => reject(new Error("Chrome exited early: " + code)));
  });

  const socket = new WebSocket(browserWebSocket);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let sequence = 0;
  const pending = new Map();
  const runtimeErrors = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") {
      runtimeErrors.push(message.params.exceptionDetails.text);
    }
    if (!message.id) return;
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
    else waiter.resolve(message.result);
  });

  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      socket.send(JSON.stringify(payload));
    });
  }

  let targets;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    targets = (await send("Target.getTargets")).targetInfos;
    if (targets.some((target) => target.type === "page" && target.url.includes("127.0.0.1"))) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const target = targets.find(
    (item) => item.type === "page" && item.url.includes("127.0.0.1"),
  );
  if (!target) throw new Error("Page target not found");
  const attached = await send("Target.attachToTarget", {
    targetId: target.targetId,
    flatten: true,
  });
  const sessionId = attached.sessionId;
  await send("Runtime.enable", {}, sessionId);
  await send("Page.enable", {}, sessionId);
  await send(
    "Emulation.setDeviceMetricsOverride",
    {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
      screenWidth: 390,
      screenHeight: 844,
    },
    sessionId,
  );
  await send("Page.reload", { ignoreCache: true }, sessionId);
  await new Promise((resolve) => setTimeout(resolve, 1_200));

  async function evaluate(expression) {
    const result = await send(
      "Runtime.evaluate",
      { expression, returnByValue: true, awaitPromise: true },
      sessionId,
    );
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }

  async function screenshot(name) {
    const result = await send(
      "Page.captureScreenshot",
      { format: "png", fromSurface: true, captureBeyondViewport: false },
      sessionId,
    );
    fs.writeFileSync(path.join(os.tmpdir(), name), Buffer.from(result.data, "base64"));
  }

  function collectAudit() {
    const width = innerWidth;
    const overflowing = Array.from(document.querySelectorAll("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          cls: typeof element.className === "string" ? element.className.slice(0, 80) : "",
          text: (element.innerText || "").trim().replace(/\s+/g, " ").slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((item) => item.right > width + 1 || item.left < -1)
      .slice(0, 20);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      overflowing,
    };
  }

  const auditExpression = "(" + collectAudit.toString() + ")()";
  async function audit(label) {
    const value = await evaluate(auditExpression);
    return Object.assign({ label }, value);
  }

  const audits = [];
  const interactions = {};
  audits.push(await audit("today"));
  await screenshot("heartsync-cdp-today.png");

  for (const view of ["chat", "tools", "couple", "settings"]) {
    const expression =
      "document.querySelector('[data-action=\"navigate\"][data-view=\"" +
      view +
      "\"]').click()";
    await evaluate(expression);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const label = view === "tools" ? "tools-days" : view;
    audits.push(await audit(label));
    await screenshot("heartsync-cdp-" + label + ".png");
  }

  await evaluate(
    "document.querySelector('[data-action=\"navigate\"][data-view=\"tools\"]').click()",
  );
  for (const tool of ["vault", "cycle", "calendar", "love"]) {
    await evaluate(
      "document.querySelector('[data-action=\"select-tool\"][data-tool=\"" + tool + "\"]').click()",
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    audits.push(await audit("tools-" + tool));
    await screenshot("heartsync-cdp-tools-" + tool + ".png");
  }

  await evaluate(
    "document.querySelector('[data-action=\"select-tool\"][data-tool=\"days\"]').click()",
  );
  await evaluate(`(() => {
    const input = document.getElementById("relationship-date");
    input.value = "2024-01-15";
    input.closest("form").requestSubmit();
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 350));
  interactions.relationshipSaved = await evaluate(
    "document.getElementById('relationship-date')?.value === '2024-01-15'",
  );

  await evaluate(
    "document.querySelector('[data-action=\"select-tool\"][data-tool=\"vault\"]').click()",
  );
  await evaluate(`(() => {
    const notes = document.getElementById("vault-notes");
    notes.value = "Ghi chú kiểm thử kho chung";
    notes.closest("form").requestSubmit();
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 350));
  interactions.vaultSaved = await evaluate(
    "document.getElementById('vault-notes')?.value === 'Ghi chú kiểm thử kho chung'",
  );

  await evaluate(
    "document.querySelector('[data-action=\"select-tool\"][data-tool=\"cycle\"]').click()",
  );
  await evaluate(`(() => {
    const day = Array.from(document.querySelectorAll('[data-action="toggle-period-day"]'))
      .find((button) => button.getAttribute("aria-pressed") === "false");
    window.__cycleTestDate = day.dataset.date;
    day.click();
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 350));
  interactions.cycleSaved = await evaluate(
    "document.querySelector('[data-action=\"toggle-period-day\"][data-date=\"' + window.__cycleTestDate + '\"]')?.getAttribute('aria-pressed') === 'true'",
  );

  await evaluate(
    "document.querySelector('[data-action=\"select-tool\"][data-tool=\"calendar\"]').click()",
  );
  await evaluate(`(() => {
    const form = document.querySelector('[data-form="calendar-event"]');
    form.querySelector('[name="title"]').value = "Kỷ niệm kiểm thử";
    form.querySelector('[name="note"]').value = "Sự kiện từ smoke test";
    form.requestSubmit();
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 350));
  interactions.calendarEventSaved = await evaluate(
    "Array.from(document.querySelectorAll('.event-row__copy > strong')).some((node) => node.textContent === 'Kỷ niệm kiểm thử')",
  );

  await evaluate(
    "document.querySelector('[data-action=\"select-tool\"][data-tool=\"love\"]').click()",
  );
  await evaluate(`(() => {
    const form = document.querySelector('[data-form="daily-question"]');
    form.querySelector('[name="answer"]').value = "Mình thấy được yêu khi bạn nhớ những điều rất nhỏ.";
    form.requestSubmit();
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 350));
  interactions.dailyAnswerRevealed = await evaluate(
    "document.querySelector('.daily-answer--partner p')?.textContent.includes('Lúc anh để ý') === true",
  );

  await evaluate(`(() => {
    const form = document.querySelector('[data-form="date-idea"]');
    form.querySelector('[name="idea"]').value = "Đi ngắm thành phố lúc sáng sớm";
    form.requestSubmit();
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 350));
  interactions.dateIdeaSaved = await evaluate(
    "Array.from(document.querySelectorAll('.date-idea-row p')).some((node) => node.textContent === 'Đi ngắm thành phố lúc sáng sớm')",
  );
  await evaluate("document.querySelector('[data-action=\"draw-date-idea\"]').click()");
  await new Promise((resolve) => setTimeout(resolve, 300));
  interactions.dateIdeaDrawn = await evaluate(
    "Boolean(document.querySelector('.date-draw--ready strong')?.textContent.trim())",
  );

  await evaluate(`(() => {
    const button = document.querySelector('[data-action="redeem-coupon"]');
    window.__couponTitle = button.closest('.coupon-row').querySelector('strong').textContent;
    button.click();
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 350));
  interactions.couponRedeemed = await evaluate(
    "Array.from(document.querySelectorAll('.coupon-row--redeemed strong')).some((node) => node.textContent === window.__couponTitle)",
  );
  await evaluate(`(() => {
    const form = document.querySelector('[data-form="love-coupon"]');
    form.querySelector('[name="title"]').value = "Một buổi hẹn bí mật";
    form.querySelector('[name="note"]').value = "Dùng vào ngày bạn cần vui";
    form.requestSubmit();
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 350));
  interactions.couponSent = await evaluate(
    "Array.from(document.querySelectorAll('.coupon-row strong')).some((node) => node.textContent === 'Một buổi hẹn bí mật')",
  );
  await evaluate("document.querySelector('[data-action=\"send-surprise\"]').click()");
  await new Promise((resolve) => setTimeout(resolve, 350));
  interactions.surpriseSent = await evaluate(
    "Array.from(document.querySelectorAll('.toast')).some((node) => node.textContent.includes('Bất ngờ nhỏ'))",
  );

  await evaluate(
    "document.querySelector('[data-action=\"navigate\"][data-view=\"chat\"]').click()",
  );
  await evaluate(`(() => {
    const input = document.getElementById("message-input");
    input.value = "Tin nhắn kiểm thử";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.closest("form").requestSubmit();
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 350));
  interactions.messageSent = await evaluate(
    "Array.from(document.querySelectorAll('.message-bubble p')).some((node) => node.textContent === 'Tin nhắn kiểm thử')",
  );

  await evaluate(
    "document.querySelector('[data-action=\"navigate\"][data-view=\"today\"]').click()",
  );
  await evaluate(`(() => {
    document.querySelector('[data-action="choose-mood"][data-value="Vui vẻ"]').click();
    document.querySelector('[data-action="choose-need"][data-value="Cần một cái ôm"]').click();
    const note = document.getElementById("checkin-note");
    note.value = "Check-in kiểm thử";
    note.dispatchEvent(new Event("input", { bubbles: true }));
    note.closest("form").requestSubmit();
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 350));
  interactions.checkinSaved = await evaluate(
    "document.querySelector('.pulse-person > span:last-child').textContent.trim() === 'Vui vẻ'",
  );

  await evaluate(
    "document.querySelector('[data-action=\"navigate\"][data-view=\"couple\"]').click()",
  );
  await evaluate(`(() => {
    const form = document.querySelector('[data-form="nicknames"]');
    form.querySelectorAll('[data-nickname-uid]').forEach((input) => {
      input.value = input.dataset.nicknameUid === "demo-giang" ? "Mình" : "Bé yêu";
    });
    form.requestSubmit();
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 350));
  interactions.nicknamesSynced = await evaluate(
    "document.querySelector('.topbar__pair strong')?.textContent.trim() === 'Mình & Bé yêu'",
  );

  await evaluate(
    "document.querySelector('[data-action=\"navigate\"][data-view=\"settings\"]').click()",
  );
  interactions.refreshAvailable = await evaluate(
    "Boolean(document.querySelector('[data-action=\"refresh-app\"]')?.getAttribute('aria-label'))",
  );
  await evaluate(`new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    context.fillStyle = "#287f76";
    context.fillRect(0, 0, 64, 64);
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not create avatar fixture"));
        return;
      }
      const input = document.getElementById("avatar-file-input");
      const transfer = new DataTransfer();
      transfer.items.add(new File([blob], "avatar.png", { type: "image/png" }));
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      resolve();
    }, "image/png");
  })`);
  await new Promise((resolve) => setTimeout(resolve, 500));
  interactions.avatarUpdated = await evaluate(
    "Boolean(document.querySelector('.avatar--profile img[src^=\"data:image/\"]'))",
  );
  await evaluate("document.querySelector('[data-action=\"remove-avatar\"]').click()");
  await new Promise((resolve) => setTimeout(resolve, 350));
  interactions.avatarRemoved = await evaluate(
    "!document.querySelector('.avatar--profile img[src^=\"data:image/\"]')",
  );
  await evaluate("document.querySelector('[data-action=\"logout\"]').click()");
  await new Promise((resolve) => setTimeout(resolve, 20));
  interactions.logoutReleasedAuthForm = await evaluate(`(() => {
    const google = document.querySelector('[data-action="google-auth"]');
    const submit = document.querySelector('[data-form="auth"] button[type="submit"]');
    return Boolean(google && !google.disabled && submit && !submit.disabled && !submit.textContent.includes("Đang xử lý"));
  })()`);
  await evaluate("document.querySelector('[data-action=\"google-auth\"]').click()");
  await new Promise((resolve) => setTimeout(resolve, 250));
  interactions.googleReloginCompleted = await evaluate(
    "Boolean(document.querySelector('[data-action=\"navigate\"][data-view=\"today\"]'))",
  );

  for (const viewport of [
    { width: 320, height: 700, mobile: true },
    { width: 768, height: 1024, mobile: true },
    { width: 1440, height: 900, mobile: false },
  ]) {
    await send(
      "Emulation.setDeviceMetricsOverride",
      {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
        screenWidth: viewport.width,
        screenHeight: viewport.height,
      },
      sessionId,
    );
    for (const tool of ["days", "vault", "cycle", "calendar", "love"]) {
      await send(
        "Page.navigate",
        { url: baseUrl + "/?preview=app&view=tools&tool=" + tool },
        sessionId,
      );
      await new Promise((resolve) => setTimeout(resolve, 350));
      audits.push(await audit(tool + "-" + viewport.width));
      if (viewport.width === 1440) {
        await screenshot("heartsync-cdp-" + tool + "-desktop.png");
      }
    }
  }

  for (const viewport of [
    { width: 320, height: 700, mobile: true },
    { width: 768, height: 1024, mobile: true },
    { width: 1440, height: 900, mobile: false },
  ]) {
    await send(
      "Emulation.setDeviceMetricsOverride",
      {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
        screenWidth: viewport.width,
        screenHeight: viewport.height,
      },
      sessionId,
    );
    await send("Page.navigate", { url: baseUrl + "/?preview=pair" }, sessionId);
    await new Promise((resolve) => setTimeout(resolve, 700));
    audits.push(await audit("pair-" + viewport.width));
    if (viewport.width === 1440) await screenshot("heartsync-cdp-pair-desktop.png");
  }

  await send(
    "Emulation.setDeviceMetricsOverride",
    {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
      screenWidth: 390,
      screenHeight: 844,
    },
    sessionId,
  );

  for (const route of ["auth", "pair"]) {
    await send("Page.navigate", { url: baseUrl + "/?preview=" + route }, sessionId);
    await new Promise((resolve) => setTimeout(resolve, 900));
    if (route === "auth") {
      interactions.authRefreshAvailable = await evaluate(
        "Boolean(document.querySelector('[data-action=\"refresh-app\"][aria-label=\"Làm mới trang\"]'))",
      );
      await evaluate("document.querySelector('[data-action=\"auth-mode\"][data-mode=\"signup\"]').click()");
      interactions.signupMode = await evaluate("Boolean(document.getElementById('auth-name'))");
    }
    if (route === "pair") {
      audits.push(await audit(route));
      await screenshot("heartsync-cdp-" + route + ".png");
      interactions.personalCodeAssigned = await evaluate(
        "document.querySelector('.personal-code')?.textContent.trim() === 'GIAN-G025'",
      );
      interactions.pairRefreshAvailable = await evaluate(
        "Boolean(document.querySelector('[data-action=\"refresh-app\"]'))",
      );
      interactions.pairAvatarEditorAvailable = await evaluate(
        "Boolean(document.getElementById('avatar-file-input'))",
      );
      await evaluate(`(() => {
        const form = document.querySelector('[data-form="mutual-pair"]');
        form.querySelector('[name="code"]').value = "NGAY-AY25";
        form.requestSubmit();
      })()`);
      await new Promise((resolve) => setTimeout(resolve, 400));
      interactions.mutualPairingCompleted = await evaluate(
        "Boolean(document.querySelector('[data-action=\"navigate\"][data-view=\"today\"]'))",
      );
    }
    if (route !== "pair") {
      audits.push(await audit(route));
      await screenshot("heartsync-cdp-" + route + ".png");
    }
  }

  await send("Page.navigate", { url: baseUrl + "/" }, sessionId);
  await new Promise((resolve) => setTimeout(resolve, 1_200));
  interactions.serviceWorkerReady = await evaluate(`Promise.race([
    navigator.serviceWorker.ready.then((registration) => Boolean(registration.active)),
    new Promise((resolve) => setTimeout(() => resolve(false), 2500))
  ])`);

  console.log(JSON.stringify({ audits, interactions, runtimeErrors }, null, 2));
  socket.close();
  chrome.kill();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
