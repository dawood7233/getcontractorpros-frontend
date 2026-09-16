// @ts-nocheck
// @ts-nocheck
/**
 * Lead telemetry — passive capture for CRM (mobile + desktop safe defaults).
 * Call initLeadTelemetry() on page load, harvestLeadTelemetry() on submit.
 */

const JS_CHALLENGE_SALT = "leadfp-v1";
const ORPHAN_TOUCH_WINDOW_MS = 100;
const FOCUS_TOUCH_WINDOW_MS = 500;
// Tight window: distinct human backspace presses arrive >=100ms apart;
// scripted bursts arrive 0-20ms apart (held-key auto-repeat is excluded)
const BACKSPACE_BURST_WINDOW_MS = 80;
// A scroll counts as user-driven only if real input happened this recently
const USER_SCROLL_WINDOW_MS = 1500;
// Cap value_set_without_input_detail so CRM stays readable
const VALUE_SET_DETAIL_MAX_HITS = 12;
const VALUE_SET_DETAIL_MAX_CHARS = 500;
const VALUE_SET_PREVIEW_CHARS = 40;

function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

function detectInAppBrowser() {
  try {
    const ua = (navigator.userAgent || "").toLowerCase();
    if (ua.includes("fban") || ua.includes("fbav")) return "facebook";
    if (ua.includes("instagram")) return "instagram";
    // Check browser-specific tokens BEFORE the generic iphone/ipad check:
    // CriOS/FxOS UAs also contain "iphone", so order matters.
    if (ua.includes("crios")) return "chrome_ios";
    if (ua.includes("fxios")) return "firefox_ios";
    if (ua.includes("samsungbrowser")) return "samsung";
    if (/iphone|ipad|ipod/.test(ua)) return "safari";
    if (ua.includes("android")) return "chrome";
    return "other";
  } catch {
    return "unknown";
  }
}

function detectPlatform() {
  try {
    const ua = (navigator.userAgent || "").toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return "ios";
    // iPadOS 13+ Safari reports "Macintosh" but has real touch support
    if (ua.includes("macintosh") && (navigator.maxTouchPoints || 0) > 1) return "ios";
    if (ua.includes("android")) return "android";
    return "desktop";
  } catch {
    return "desktop";
  }
}

function isMobileDevice() {
  try {
    const ua = (navigator.userAgent || "").toLowerCase();
    const mtp = navigator.maxTouchPoints || 0;
    if (/mobile|android|iphone|ipod|fban|fbav|instagram/.test(ua)) return true;
    // iPadOS 13+ Safari: "Macintosh" UA with real touch — mobile regardless of viewport width
    if (ua.includes("macintosh") && mtp > 1) return true;
    return mtp > 0 && window.innerWidth < 1024;
  } catch {
    return false;
  }
}

/** Effective connection class only (4g/3g/…). Do not fall back to connection.type. */
function getConnectionType() {
  try {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c || !c.effectiveType) return "unknown";
    return String(c.effectiveType).toLowerCase();
  } catch {
    return "unknown";
  }
}

function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

/** Device screen CSS size (not layout/visual viewport). */
function getScreenSize() {
  try {
    if (typeof screen === "undefined") return { w: 0, h: 0 };
    return {
      w: Math.round(Number(screen.width) || 0),
      h: Math.round(Number(screen.height) || 0),
    };
  } catch {
    return { w: 0, h: 0 };
  }
}

function touchCoordinateEntropy(points) {
  if (!points || points.length < 2) return 0;
  const counts = {};
  for (const p of points) {
    const key = Math.floor(p.x / 24) + "," + Math.floor(p.y / 24);
    counts[key] = (counts[key] || 0) + 1;
  }
  const n = points.length;
  let entropy = 0;
  for (const c of Object.values(counts)) {
    const prob = c / n;
    entropy -= prob * Math.log2(prob);
  }
  const maxEntropy = Math.log2(Math.min(n, 64));
  if (maxEntropy <= 0) return 0;
  const normalized = Math.min(1, entropy / maxEntropy);
  return Math.round(normalized * 1000);
}

function distinctRounded(arr) {
  return new Set((arr || []).map((v) => Math.round(Number(v) * 100))).size;
}

function median(nums) {
  if (!nums || !nums.length) return 0;
  const s = nums.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function variance(nums) {
  if (!nums || nums.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < nums.length; i++) sum += nums[i];
  const mean = sum / nums.length;
  let acc = 0;
  for (let i = 0; i < nums.length; i++) {
    const d = nums[i] - mean;
    acc += d * d;
  }
  return Math.round(acc / nums.length);
}

function mean(nums) {
  if (!nums || !nums.length) return 0;
  let sum = 0;
  for (let i = 0; i < nums.length; i++) sum += nums[i];
  return sum / nums.length;
}

function backspaceBurstScore(backspaceTimes) {
  const t = backspaceTimes || [];
  if (t.length <= 1) return 0;
  let clustered = 0;
  for (let i = 0; i < t.length; i++) {
    const prev = i > 0 ? t[i] - t[i - 1] : Infinity;
    const next = i < t.length - 1 ? t[i + 1] - t[i] : Infinity;
    if (prev <= BACKSPACE_BURST_WINDOW_MS || next <= BACKSPACE_BURST_WINDOW_MS) clustered++;
  }
  return Math.round((clustered / t.length) * 1000);
}

function parseMobileDeviceModel() {
  try {
    const ua = navigator.userAgent || "";
    const platform = detectPlatform();
    if (platform === "desktop") return "desktop";
    if (/iphone/.test(ua.toLowerCase())) return "iPhone";
    if (/ipad/.test(ua.toLowerCase())) return "iPad";
    const android = ua.match(/;\s*([^;)]+)\s*Build\//);
    if (android && android[1]) return android[1].trim();
    return platform === "ios" ? "iPhone" : "Android";
  } catch {
    return "";
  }
}

async function fetchUaClientHints() {
  const empty = { model: "", bitness: "", arch: "" };
  try {
    const nav = navigator;
    if (!nav.userAgentData || typeof nav.userAgentData.getHighEntropyValues !== "function") {
      return empty;
    }
    const data = await nav.userAgentData.getHighEntropyValues([
      "model",
      "platform",
      "bitness",
      "architecture",
    ]);
    if (!data) return empty;
    return {
      model: data.model ? String(data.model) : "",
      bitness: data.bitness ? String(data.bitness) : "",
      arch: data.architecture ? String(data.architecture) : "",
    };
  } catch {
    return empty;
  }
}

function perfNow() {
  try {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
  } catch {
    /* no-op */
  }
  return Date.now();
}

/** Short safe preview of a field value for CRM detail (no newlines). */
function valueSetPreview(raw) {
  return String(raw || "")
    .replace(/[\r\n|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, VALUE_SET_PREVIEW_CHARS);
}

/**
 * Record one value_set_without_input hit into a compact CRM detail string:
 * count=N | field:t=MS:len=L:delta=D:itype=TYPE:v=PREVIEW | ...
 * t = ms since form/page load (performance.now from init).
 */
function recordValueSetWithoutInput(state, fieldName, valLen, delta, inputType, value) {
  try {
    const b = state.behaviour;
    if (!b) return;
    b.valueSetWithoutInput = true;
    b.valueSetWithoutInputCount = (b.valueSetWithoutInputCount || 0) + 1;
    if (!Array.isArray(b.valueSetWithoutInputHits)) b.valueSetWithoutInputHits = [];
    if (b.valueSetWithoutInputHits.length >= VALUE_SET_DETAIL_MAX_HITS) return;
    const tMs = Math.max(0, Math.round(perfNow() - (state.loadPerf || 0)));
    const hit =
      String(fieldName || "unknown") +
      ":t=" +
      tMs +
      ":len=" +
      (Number(valLen) || 0) +
      ":delta=" +
      (Number(delta) || 0) +
      ":itype=" +
      String(inputType || "") +
      ":v=" +
      valueSetPreview(value);
    b.valueSetWithoutInputHits.push(hit);
  } catch {
    /* observe-only */
  }
}

function formatValueSetWithoutInputDetail(behaviour) {
  try {
    const b = behaviour || {};
    const count = Number(b.valueSetWithoutInputCount) || 0;
    if (count <= 0) return "";
    const hits = Array.isArray(b.valueSetWithoutInputHits) ? b.valueSetWithoutInputHits : [];
    let detail = "count=" + count;
    if (hits.length) detail += " | " + hits.join(" | ");
    if (count > hits.length) detail += " | +truncated";
    if (detail.length > VALUE_SET_DETAIL_MAX_CHARS) {
      return detail.slice(0, VALUE_SET_DETAIL_MAX_CHARS - 1) + "…";
    }
    return detail;
  } catch {
    return "";
  }
}

/** Raw navigator.connection.type (wifi/cellular/ethernet/…); unknown if missing. */
function getNetworkType() {
  try {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c || c.type == null || String(c.type).trim() === "") return "unknown";
    return String(c.type).toLowerCase().trim();
  } catch {
    return "unknown";
  }
}

function issueJsChallenge() {
  const issued = Date.now();
  const origin = typeof window !== "undefined" && window.location ? window.location.origin : "";
  const token = issued + "." + cyrb53(issued + "::" + origin + "::" + JS_CHALLENGE_SALT);
  return { issued, token };
}

function startTouchWatch(state) {
  try {
    window.addEventListener(
      "touchstart",
      (e) => {
        const now = Date.now();
        if (e && e.isTrusted === false) state.behaviour.untrustedEvents++;
        state.lastUserInputTs = now;
        state.touch.starts++;
        // Time from page load to the FIRST touch (ms); clamp to >=1 so a
        // real touch can never look like "no touch" (0)
        if (!state.touch.firstTouchMs) {
          state.touch.firstTouchMs = Math.max(1, Math.round(perfNow() - (state.loadPerf || 0)));
        }
        state.touch.times.push(now);
        if (state.touch.times.length > 200) state.touch.times.shift();
        const list = e.touches || [];
        for (let i = 0; i < list.length; i++) {
          const t = list[i];
          if (typeof t.force === "number") state.touch.forces.push(t.force);
          if (typeof t.radiusX === "number") state.touch.radii.push(t.radiusX);
          state.touch.points.push({ x: t.clientX || 0, y: t.clientY || 0 });
        }
      },
      { passive: true }
    );
    window.addEventListener(
      "touchmove",
      (e) => {
        state.lastUserInputTs = Date.now();
        state.touch.moves++;
        const list = e.touches || [];
        for (let i = 0; i < list.length; i++) {
          const t = list[i];
          state.touch.points.push({ x: t.clientX || 0, y: t.clientY || 0 });
        }
      },
      { passive: true }
    );
  } catch {
    /* no-op */
  }
}

function hadRecentTouch(state, now, windowMs) {
  const win = windowMs || ORPHAN_TOUCH_WINDOW_MS;
  const times = (state.touch && state.touch.times) || [];
  for (let i = times.length - 1; i >= 0; i--) {
    if (now - times[i] <= win) return true;
    if (now - times[i] > win) break;
  }
  return false;
}

function startViewportWatch(state) {
  try {
    const vv = window.visualViewport;
    const readH = () => {
      try {
        if (vv && typeof vv.height === "number") return Math.round(vv.height);
        return Math.round(window.innerHeight || 0);
      } catch {
        return 0;
      }
    };
    state.viewport.baselineH = readH();
    state.viewport.focusH = 0;

    const onResize = () => {
      if (!state.viewport.focusH) return;
      const h = readH();
      const shrink = Math.max(0, state.viewport.focusH - h);
      if (shrink > state.viewport.maxShrink) state.viewport.maxShrink = shrink;
    };

    if (vv && typeof vv.addEventListener === "function") {
      vv.addEventListener("resize", onResize);
    } else {
      window.addEventListener("resize", onResize, { passive: true });
    }
    state.viewport._onResize = onResize;
  } catch {
    /* no-op */
  }
}

function startBehaviourWatch(state, opts) {
  const briefNames = new Set([
    (opts && opts.briefFieldName) || "BriefRequirement",
    "BriefRequirement",
    "Brief data about requirements",
    "serviceRequirements",
  ]);
  const identityNames = new Set([
    "firstName",
    "lastName",
    "email",
    "phone",
    "FirstName",
    "LastName",
    "Email",
    "Phone",
  ]);

  const nameOf = (el) =>
    (el && (el.name || el.id || (el.getAttribute && el.getAttribute("data-field")))) || "";

  const isField = (el) => el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || "");

  // value_set_without_input is for text-like fields only. Checkboxes (agreement /
  // TCPA) never get keydown, so a normal click would always false-positive.
  const VALUE_SET_SKIP_NAMES = new Set([
    "agreement",
    "leadid_tcpa_disclosure",
    "tcpa",
    "tcpaConsent",
    "tcpa_consent",
  ]);
  const isValueSetTrackable = (el, fieldName) => {
    if (!el) return false;
    const tag = String(el.tagName || "").toUpperCase();
    if (tag === "TEXTAREA") return true;
    if (tag === "SELECT") return false;
    if (tag !== "INPUT") return false;
    const type = String(el.type || "text").toLowerCase();
    if (
      type === "checkbox" ||
      type === "radio" ||
      type === "hidden" ||
      type === "submit" ||
      type === "button" ||
      type === "reset" ||
      type === "image" ||
      type === "file"
    ) {
      return false;
    }
    const n = String(fieldName || "").trim();
    if (!n) return false;
    if (VALUE_SET_SKIP_NAMES.has(n)) return false;
    if (VALUE_SET_SKIP_NAMES.has(n.toLowerCase())) return false;
    return true;
  };

  try {
    // Mark real user input so scrolls can be classified as user-driven
    const markUserInput = () => {
      state.lastUserInputTs = Date.now();
    };
    window.addEventListener("wheel", markUserInput, { passive: true });
    window.addEventListener("pointerdown", markUserInput, { passive: true });

    document.addEventListener(
      "scroll",
      () => {
        // Count only user-driven scrolls (touch/wheel/pointer/key within
        // 1.5s). Ignores browser auto-scroll when the soft keyboard opens
        // and programmatic scrollTo() on form step changes.
        if (Date.now() - (state.lastUserInputTs || 0) <= USER_SCROLL_WINDOW_MS) {
          state.behaviour.scrolled = true;
        }
      },
      { passive: true, capture: true }
    );

    document.addEventListener(
      "focusin",
      (e) => {
        if (!isField(e.target)) return;
        const n = nameOf(e.target);
        if (!n) return;
        if (
          !state.behaviour.focusOrder.length ||
          state.behaviour.focusOrder[state.behaviour.focusOrder.length - 1] !== n
        ) {
          state.behaviour.focusOrder.push(n);
        }
        const nowTs = Date.now();
        const startLen = ((e.target && e.target.value) || "").length;
        state.behaviour._focus[n] = {
          ts: nowTs,
          keys: 0,
          hadInput: false,
          hadKey: false,
          firstKeyTs: null,
          lastKeyTs: null,
          // Was this focus preceded by a touch within ~500ms? (tap-to-focus)
          focusHadTouch: hadRecentTouch(state, nowTs, FOCUS_TOUCH_WINDOW_MS),
          // Value length snapshot at focus (autofill/back-nav detection)
          valLenAtFocus: startLen,
          lastLen: startLen,
        };
        try {
          const vv = window.visualViewport;
          const h =
            vv && typeof vv.height === "number"
              ? Math.round(vv.height)
              : Math.round(window.innerHeight || 0);
          state.viewport.focusH = h;
        } catch {
          /* no-op */
        }
      },
      true
    );

    document.addEventListener(
      "keydown",
      (e) => {
        const now = Date.now();
        if (e && e.isTrusted === false) state.behaviour.untrustedEvents++;
        state.lastUserInputTs = now;
        const key = e.key || "";
        const isBackspace = key === "Backspace" || e.keyCode === 8;
        const isSpace = key === " " || key === "Spacebar" || e.keyCode === 32;
        // Soft IME: Android keyCode 229 / "Unidentified", or any key event
        // fired mid-composition (isComposing — works on iOS too)
        if (e.keyCode === 229 || key === "Unidentified" || e.isComposing === true) {
          state.behaviour.imeKeydown229++;
        }

        state.behaviour.keyTimes.push(now);
        state.behaviour.keystrokes++;
        state.behaviour.keyEvents.push({
          t: now,
          space: isSpace ? 1 : 0,
          backspace: isBackspace ? 1 : 0,
        });
        if (state.behaviour.keyEvents.length > 500) state.behaviour.keyEvents.shift();

        const n = nameOf(e.target);

        // Orphan key: on a mobile device, keys landing in a field whose focus
        // was NOT preceded by a touch (tap-to-focus), or in a session with
        // zero touches at all. Humans type in bursts after one tap, so we
        // no longer require a touch within 100ms of every keystroke.
        if (isMobileDevice()) {
          const fRec = n ? state.behaviour._focus[n] : null;
          const noTouchSession = !(state.touch && state.touch.starts > 0);
          if (noTouchSession || (fRec && fRec.focusHadTouch === false)) {
            state.behaviour.orphanKeys++;
          }
        }

        if (isBackspace) {
          state.behaviour.backspaces++;
          // Exclude held-key auto-repeat: only distinct presses feed the
          // burst score, so humans holding backspace never look like bursts
          if (e.repeat !== true) state.behaviour.backspaceTimes.push(now);
        }

        if (n && state.behaviour._focus[n]) {
          const f = state.behaviour._focus[n];
          f.keys++;
          f.hadKey = true;
          if (f.firstKeyTs == null) f.firstKeyTs = now;
          f.lastKeyTs = now;
          if (briefNames.has(n)) f.kind = "brief";
          else if (identityNames.has(n)) f.kind = "identity";
        }
      },
      true
    );

    const bumpComposition = () => {
      state.behaviour.imeComposition++;
    };
    document.addEventListener("compositionstart", bumpComposition, true);
    document.addEventListener("compositionupdate", bumpComposition, true);
    document.addEventListener("compositionend", bumpComposition, true);

    document.addEventListener(
      "paste",
      (e) => {
        if (e && e.isTrusted === false) state.behaviour.untrustedEvents++;
        const n = nameOf(e.target);
        if (!n) return;
        state.behaviour.pastedFields[n] = true;
        if (briefNames.has(n)) state.behaviour.briefPasted = true;
      },
      true
    );

    document.addEventListener(
      "input",
      (e) => {
        if (e && e.isTrusted === false) state.behaviour.untrustedEvents++;
        // Soft-keyboard / IME inputType taxonomy:
        // - insertComposition*  → classic composition IME (CJK / some predictors)
        // - insertText          → normal English soft/hard typing (FB WebView path)
        // - insertReplacementText → autocorrect / predictive replace (mobile signature)
        const itype = e.inputType ? String(e.inputType) : "";
        if (itype.indexOf("insertComposition") === 0) {
          state.behaviour.imeComposition++;
        } else if (itype === "insertText") {
          state.behaviour.imeInsertText++;
        } else if (itype === "insertReplacementText") {
          state.behaviour.imeReplacement++;
        }
        if (!isField(e.target)) return;
        const n = nameOf(e.target);
        if (!n) return;
        const f = state.behaviour._focus[n] || {
          keys: 0,
          hadKey: false,
          hadInput: false,
          firstKeyTs: null,
          lastKeyTs: null,
          valLenAtFocus: 0,
          lastLen: 0,
        };
        const valLen = ((e.target && e.target.value) || "").length;
        state.behaviour.inputEvents++;
        const prevLen = typeof f.lastLen === "number" ? f.lastLen : 0;
        const delta = Math.abs(valLen - prevLen);
        if (delta > state.behaviour.maxInputDelta) state.behaviour.maxInputDelta = delta;
        f.lastLen = valLen;
        if (
          !f.hadKey &&
          !f.hadInput &&
          e.target.value &&
          isValueSetTrackable(e.target, n)
        ) {
          recordValueSetWithoutInput(state, n, valLen, delta, itype, e.target.value);
        }
        f.hadInput = true;
        state.behaviour._focus[n] = f;
      },
      true
    );

    document.addEventListener(
      "focusout",
      (e) => {
        if (!isField(e.target)) return;
        const n = nameOf(e.target);
        if (!n) return;
        const f = state.behaviour._focus[n];
        if (!f) return;
        if (briefNames.has(n)) {
          const ms = Date.now() - f.ts;
          const endLen = ((e.target && e.target.value) || "").length;
          const startLen = typeof f.valLenAtFocus === "number" ? f.valLenAtFocus : 0;
          // Content must have APPEARED during this focus. A pre-filled field
          // (back-navigation, browser restore) that is tabbed through quickly
          // is not autofill — the value existed before focus.
          const grewDuringFocus = endLen > startLen;
          if (state.behaviour.briefPasted) {
            /* keep */
          } else if (
            f.keys <= 2 &&
            ms < 500 &&
            grewDuringFocus &&
            ((e.target.value || "").trim().length > 0)
          ) {
            state.behaviour.briefAutofill = true;
          } else if (f.keys >= 3 && f.keys < 8 && ms < 2000) {
            state.behaviour.swipeSuggest = true;
          }
        }
        try {
          const vv = window.visualViewport;
          const h =
            vv && typeof vv.height === "number"
              ? Math.round(vv.height)
              : Math.round(window.innerHeight || 0);
          if (state.viewport.focusH) {
            const shrink = Math.max(0, state.viewport.focusH - h);
            if (shrink > state.viewport.maxShrink) state.viewport.maxShrink = shrink;
          }
          state.viewport.focusH = 0;
        } catch {
          /* no-op */
        }
      },
      true
    );
  } catch {
    /* no-op */
  }
}

function deriveTypingBehaviour(state) {
  const b = state.behaviour;
  const flags = [];
  if (b.briefPasted || Object.keys(b.pastedFields).length) flags.push("paste");
  if (b.briefAutofill) flags.push("autofill");
  if (b.swipeSuggest) flags.push("swipe_suggest");
  if (b.keystrokes > 0) flags.push("manual");
  // No flags at all implies zero keystrokes (keystrokes > 0 always adds "manual")
  if (!flags.length) return "none";
  if (flags.includes("paste")) return flags.includes("manual") ? "mixed" : "paste";
  if (flags.includes("autofill")) return flags.includes("manual") ? "mixed" : "autofill";
  if (flags.includes("swipe_suggest")) return "swipe_suggest";
  return "manual";
}

function computeKbMetrics(state) {
  const events = (state.behaviour && state.behaviour.keyEvents) || [];
  const postSpace = [];
  const midWord = [];
  const gaps = [];

  for (let i = 1; i < events.length; i++) {
    const gap = events[i].t - events[i - 1].t;
    if (gap < 0 || gap > 30000) continue;
    gaps.push(gap);
    if (events[i - 1].space) postSpace.push(gap);
    else if (!events[i - 1].backspace) midWord.push(gap);
  }

  // Fallback gaps from keyTimes if keyEvents empty (older path)
  if (!gaps.length) {
    const times = (state.behaviour && state.behaviour.keyTimes) || [];
    for (let i = 1; i < times.length; i++) {
      const gap = times[i] - times[i - 1];
      if (gap >= 0 && gap <= 30000) gaps.push(gap);
    }
  }

  const midMean = mean(midWord);
  const postMean = mean(postSpace);
  let postSpaceRatio = 0;
  if (midMean > 0 && postSpace.length > 0) {
    postSpaceRatio = Math.round((postMean / midMean) * 100);
  }

  // Cross-field speed: chars/sec brief vs identity
  let briefChars = 0;
  let briefMs = 0;
  let idChars = 0;
  let idMs = 0;
  const focus = (state.behaviour && state.behaviour._focus) || {};
  for (const n of Object.keys(focus)) {
    const f = focus[n];
    if (!f || !f.keys || f.firstKeyTs == null || f.lastKeyTs == null) continue;
    const dur = Math.max(0, f.lastKeyTs - f.firstKeyTs);
    if (f.kind === "brief") {
      briefChars += f.keys;
      briefMs += Math.max(dur, 1);
    } else if (f.kind === "identity") {
      idChars += f.keys;
      idMs += Math.max(dur, 1);
    }
  }
  let crossRatio = 0;
  if (briefChars > 0 && idChars > 0 && briefMs > 0 && idMs > 0) {
    const briefRate = briefChars / (briefMs / 1000);
    const idRate = idChars / (idMs / 1000);
    if (idRate > 0) crossRatio = Math.round((briefRate / idRate) * 100);
  }

  const screen = getScreenSize();
  const baselineH = (state.viewport && state.viewport.baselineH) || 0;
  const shrinkPx = (state.viewport && state.viewport.maxShrink) || 0;

  return {
    kb_gap_variance: variance(gaps),
    kb_post_space_gap_ratio: postSpaceRatio,
    kb_orphan_key_count: (state.behaviour && state.behaviour.orphanKeys) || 0,
    kb_backspace_burst_score: backspaceBurstScore(
      (state.behaviour && state.behaviour.backspaceTimes) || []
    ),
    kb_cross_field_speed_ratio: crossRatio,
    screen_w: screen.w,
    screen_h: screen.h,
    kb_shrink_px: shrinkPx,
    kb_viewport_baseline_h: baselineH,
    // Shrink as per-mille of baseline height (0-1000); portable across devices
    kb_shrink_ratio: baselineH > 0 ? Math.round((shrinkPx / baselineH) * 1000) : 0,
    _gaps: gaps,
  };
}

/**
 * @param {object} [options]
 * @param {string} [options.briefFieldName]
 * @param {string} [options.honeypotName]
 * @param {string} [options.formSelector] CSS selector of the lead form the honeypot should be injected into (falls back to first <form> on the page)
 */
export function initLeadTelemetry(options = {}) {
  const honeypotName = options.honeypotName || "company_website";
  const jsChallenge = issueJsChallenge();
  const state = {
    honeypotName,
    jsChallenge,
    lastUserInputTs: 0,
    // Wall clock + monotonic clock captured at page load; used to compute a
    // load-anchored client_ts at harvest (clock skew detection)
    loadTs: Date.now(),
    loadPerf: perfNow(),
    touch: { starts: 0, moves: 0, firstTouchMs: 0, forces: [], radii: [], points: [], times: [] },
    viewport: { baselineH: 0, focusH: 0, maxShrink: 0 },
    behaviour: {
      scrolled: false,
      keystrokes: 0,
      keyTimes: [],
      keyEvents: [],
      backspaces: 0,
      backspaceTimes: [],
      orphanKeys: 0,
      imeKeydown229: 0,
      imeComposition: 0,
      imeInsertText: 0,
      imeReplacement: 0,
      inputEvents: 0,
      maxInputDelta: 0,
      untrustedEvents: 0,
      focusOrder: [],
      pastedFields: {},
      briefPasted: false,
      briefAutofill: false,
      swipeSuggest: false,
      valueSetWithoutInput: false,
      valueSetWithoutInputCount: 0,
      valueSetWithoutInputHits: [],
      _focus: {},
    },
  };
  startTouchWatch(state);
  startViewportWatch(state);
  startBehaviourWatch(state, options);
  ensureHoneypot(honeypotName, options.formSelector || "");
  return state;
}

function ensureHoneypot(name, formSelector) {
  try {
    if (document.querySelector('[name="' + name + '"]')) return;
    const el = document.createElement("input");
    el.name = name;
    el.tabIndex = -1;
    el.autocomplete = "off";
    el.setAttribute("aria-hidden", "true");
    el.style.cssText =
      "position:absolute;left:-9999px;width:0;height:0;opacity:0;pointer-events:none;border:0;padding:0;margin:0";
    let form = null;
    if (formSelector) {
      try {
        form = document.querySelector(formSelector);
      } catch {
        form = null;
      }
    }
    if (!form) form = document.querySelector("form");
    if (form) form.appendChild(el);
    else document.body.appendChild(el);
  } catch {
    /* no-op */
  }
}

function readHoneypot(name) {
  try {
    const el = document.querySelector('[name="' + name + '"]');
    return !!(el && String(el.value || "").trim().length > 0);
  } catch {
    return false;
  }
}

/**
 * @param {ReturnType<typeof initLeadTelemetry>|null} state
 */
export async function harvestLeadTelemetry(state) {
  const s = state || {};
  const platform = detectPlatform();
  const mobile = isMobileDevice();
  const inApp = mobile ? detectInAppBrowser() : "desktop";
  const uaHints = await fetchUaClientHints();
  const uaModel = uaHints.model;
  const deviceModel = uaModel || parseMobileDeviceModel();

  // Load-anchored client timestamp: wall clock at page load projected forward
  // by the monotonic clock. Detects clock tampering mid-session.
  const clientTs = s.loadTs
    ? Math.round(s.loadTs + (perfNow() - (s.loadPerf || 0)))
    : Date.now();

  const kb = computeKbMetrics(s);
  const gaps = kb._gaps || [];

  return {
    client_ts: clientTs,
    js_challenge_token: (s.jsChallenge && s.jsChallenge.token) || "",
    js_challenge_issued: (s.jsChallenge && s.jsChallenge.issued) || 0,
    telemetry_platform: platform,
    is_mobile_lead: mobile ? 1 : 0,
    in_app_browser: inApp,
    // touch_starts = ms from page load to FIRST touch (0 = never touched)
    touch_starts: (s.touch && s.touch.firstTouchMs) || 0,
    // total_touches = count of touchstart events (former touch_starts meaning)
    total_touches: (s.touch && s.touch.starts) || 0,
    touch_moves: (s.touch && s.touch.moves) || 0,
    touch_force_distinct: distinctRounded(s.touch && s.touch.forces),
    touch_radius_distinct: distinctRounded(s.touch && s.touch.radii),
    touch_coordinate_entropy: touchCoordinateEntropy(s.touch && s.touch.points),
    scrolled: s.behaviour && s.behaviour.scrolled ? 1 : 0,
    connection_type: getConnectionType(),
    max_touch_points: (typeof navigator !== "undefined" && navigator.maxTouchPoints) || 0,
    motion_supported: typeof DeviceMotionEvent !== "undefined" ? 1 : 0,
    median_keystroke_gap_ms: median(gaps),
    brief_pasted: s.behaviour && s.behaviour.briefPasted ? 1 : 0,
    brief_autofill: s.behaviour && s.behaviour.briefAutofill ? 1 : 0,
    mobile_device_model: deviceModel,
    typing_behaviour: deriveTypingBehaviour(s),
    value_set_without_input: s.behaviour && s.behaviour.valueSetWithoutInput ? 1 : 0,
    // count=N | field:t=msSinceLoad:len=:delta=:itype=:v=preview | ...
    value_set_without_input_detail: formatValueSetWithoutInputDetail(s.behaviour),
    backspace_count: (s.behaviour && s.behaviour.backspaces) || 0,
    honeypot_filled: readHoneypot(s.honeypotName || "company_website") ? 1 : 0,
    browser_timezone: getBrowserTimezone(),
    ua_ch_model: uaModel,
    // Client Hints (Chromium-only; empty on Safari/Firefox)
    ua_ch_bitness: uaHints.bitness || "",
    ua_ch_arch: uaHints.arch || "",
    // Raw physical network medium from Network Information API
    network_type: getNetworkType(),
    field_focus_order: (s.behaviour && s.behaviour.focusOrder.join(",")) || "",
    kb_gap_variance: kb.kb_gap_variance || 0,
    kb_post_space_gap_ratio: kb.kb_post_space_gap_ratio || 0,
    kb_orphan_key_count: kb.kb_orphan_key_count || 0,
    kb_backspace_burst_score: kb.kb_backspace_burst_score || 0,
    kb_cross_field_speed_ratio: kb.kb_cross_field_speed_ratio || 0,
    screen_w: kb.screen_w || 0,
    screen_h: kb.screen_h || 0,
    kb_shrink_px: kb.kb_shrink_px || 0,
    kb_viewport_baseline_h: kb.kb_viewport_baseline_h || 0,
    kb_shrink_ratio: kb.kb_shrink_ratio || 0,
    // Input-event granularity (observe-only; autofill vs typed vs injected)
    input_event_count: (s.behaviour && s.behaviour.inputEvents) || 0,
    max_single_input_delta: (s.behaviour && s.behaviour.maxInputDelta) || 0,
    // IME / soft-keyboard signature (observe-only)
    // Classic composition path (often 0 on English FB Android WebView):
    ime_keydown_229_count: (s.behaviour && s.behaviour.imeKeydown229) || 0,
    ime_composition_count: (s.behaviour && s.behaviour.imeComposition) || 0,
    // English soft-keyboard path (what FB Android WebView actually emits):
    ime_insert_text_count: (s.behaviour && s.behaviour.imeInsertText) || 0,
    ime_replacement_count: (s.behaviour && s.behaviour.imeReplacement) || 0,
    // Synthetic (script-dispatched) key/touch/input/paste events; humans = 0
    untrusted_event_count: (s.behaviour && s.behaviour.untrustedEvents) || 0,
  };
}

export { isMobileDevice, detectPlatform, cyrb53, JS_CHALLENGE_SALT };
