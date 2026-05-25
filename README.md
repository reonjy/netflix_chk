# Netflix Cookie Checker 🍪

A premium web-based Netflix cookie checker and validator. Bulk check Netflix cookies, verify login status, and filter working accounts.

**For educational purposes only.**

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)

## Features

- ✅ **Bulk Cookie Checking** — Check multiple cookie sets at once
- 🔄 **Auto Format Detection** — Supports both JSON and Netscape formats
- 📊 **Real-time Progress** — Live progress bar and instant results
- 📋 **Account Details** — Shows plan, email, country for working cookies
- 💾 **Export** — Download working cookies as JSON
- 📁 **Drag & Drop** — Upload cookie files directly
- 🎨 **Netflix-Inspired UI** — Premium dark theme with glassmorphism

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd netflix-cookie-checker

# Install dependencies
npm install

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploy to Vercel

1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Click **Deploy** — no configuration needed!

Or use the Vercel CLI:

```bash
npx -y vercel --prod
```

## Cookie Formats

### JSON Format
```json
[
  {
    "domain": ".netflix.com",
    "name": "NetflixId",
    "value": "your_value_here",
    "path": "/",
    "secure": true
  }
]
```

### Netscape Format
```
.netflix.com	TRUE	/	TRUE	0	NetflixId	your_value_here
.netflix.com	TRUE	/	TRUE	0	SecureNetflixId	your_value_here
```

## Tech Stack

- **Next.js 15** — React framework with App Router
- **Vanilla CSS** — Custom Netflix-inspired design system
- **Vercel** — Serverless deployment

## Disclaimer

This tool is for **educational purposes only**. Use responsibly and in accordance with Netflix's Terms of Service.

## Credits

Inspired by [matheeshapathirana/Netflix-cookie-checker](https://github.com/matheeshapathirana/Netflix-cookie-checker)
