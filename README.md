# Tracky-OSINT

**Tracky-OSINT** is a modular Open-Source Intelligence (OSINT) tool designed to automatically analyze various information based on usernames, email addresses, and phone numbers.

> **Important Notice:** This tool may only be used for legal purposes. Use is only permitted within the bounds of applicable law. The user bears full responsibility for how this tool is used.

## Table of Contents

1. [Features](#features)
2. [Performance & Optimizations](#performance--optimizations)
3. [How It Works](#how-it-works)
4. [Supported Platforms](#supported-platforms)
5. [Technical Architecture](#technical-architecture)
6. [Cache & Database System](#cache--database-system)
7. [Detection Logic](#detection-logic)
8. [Query Flow](#query-flow)
9. [Installation](#installation)
10. [Usage](#usage)
11. [Configuration](#configuration)

---

## 1. Features

- Automatic search for social media profiles based on usernames
- Automatic search for registered accounts based on email addresses
- Analysis of mobile and landline numbers with country and carrier information
- Combination of Axios and Puppeteer for fast and dynamic requests
- Parallel processing with optimized concurrency
- Dynamic header generation per request for improved anti-bot evasion
- Login redirect detection prevents false positives (false-true)
- Use of JSON databases for area code and carrier data (DE, US, FR)
- Intelligent detection of "profile does not exist"
- Three detection methods for email checks: public APIs, validation endpoints, error code analysis
- 10-minute cache for fast repeated lookups
- Proxy support for anonymous requests
- Error and timeout handling
- Sorted output: Found, not found, errors
- Clear console output

---

## 2. Performance & Optimizations

### Social Media Search

Average search time for 114 social media platforms: **approx. 60 seconds**

| Phase | Method | URLs | Time |
|-------|--------|------|------|
| Axios scan | 20 parallel | 114 | 5–8s |
| Puppeteer check | 3 browsers parallel | 30–40 | 50–60s |
| **Total** | | **114** | **~60s** |

### Email Search

Average search time for 16 platforms: **approx. 8 seconds**

| Phase | Method | Platforms | Time |
|-------|--------|-----------|------|
| API checks | 10 parallel | 16 | 5–10s |
| **Total** | | **16** | **~8s** |

No Puppeteer needed — all checks run via direct HTTPS requests to public endpoints.

### Technical Optimizations

#### Axios Optimizations (Social Media)
- Parallel batch processing: 20 URLs simultaneously
- Reduced timeout: 3 seconds for fast error detection
- Efficient error handling without blocking
- Dynamic headers per request: anti-bot detection is harder to trigger, as each URL receives its own randomly generated User-Agent (previously: one header for all ~110 URLs)
- Login redirect detection: prevents false-true results caused by login redirects

#### Puppeteer Optimizations (Social Media)
- Separate browser instances: each browser loads only 1 tab
- Batch processing: 3 browsers in parallel
- No resource contention between tabs
- Each browser receives full CPU/RAM/network resources
- Twitch: additional `waitForSelector` for complete React rendering

#### Mail Checker Optimizations
- Custom `runWithConcurrency()` function: 10 requests simultaneously
- Timeout: 8 seconds per request
- No Puppeteer needed — all endpoints respond directly
- In-memory cache: repeated checks under 1 second

#### Why Separate Browsers? (Social Media)

**Problem with multiple tabs in the same browser:**
```
1 browser with 3 tabs:
  - CPU: 33% per tab
  - Shared memory
  - Shared network bandwidth
  → Slower loading
  → Timeouts on heavy pages
```

**Solution with separate browsers:**
```
3 browsers with 1 tab each:
  - CPU: 100% per browser
  - Dedicated memory
  - Full network bandwidth
  → Faster loading
  → No timeouts
```

---

## 3. How It Works

### Social Media Search
1. User enters a **username**
2. Cache is checked (instant response if available)
3. Axios performs fast HTTP requests (parallel, with individual headers per URL)
4. After each request: login redirect check via `isLoginRedirect()`
5. Ambiguous results (status 200) are verified with Puppeteer
6. Puppeteer checks HTML for login walls and platform-specific not-found patterns
7. Results are sorted: found, not found, errors
8. Results are saved and displayed in the console

### Email Search
1. User enters an **email address**
2. Format is validated
3. Cache is checked (instant response if available)
4. All checkers run in parallel with a concurrency limit
5. Each checker uses one of three methods: public API, validation endpoint, or error code analysis
6. Results are sorted: found, not found, errors
7. Results are saved and displayed in the console

### Phone Number Analysis
1. User enters a **phone number**
2. `libphonenumber-js` determines type, country, and area code
3. Landline numbers are analyzed with the Python script `Festnetz_Analyse.py`
4. Result is displayed in the console

---

## 4. Supported Platforms

### Social Media (114 Platforms)

- Instagram, Facebook, X (Twitter), GitHub, Reddit
- LinkedIn, YouTube, TikTok, Pinterest, Snapchat
- WhatsApp, Telegram, Discord, Signal, Twitch
- Steam, and 100+ additional platforms

### Email Checker (16 Platforms)

| Platform         | Category         | Method                               |
|------------------|------------------|--------------------------------------|
| Gravatar         | Profile          | MD5 hash lookup via public API       |
| GitHub           | Developer        | User search API (`in:email`)         |
| HaveIBeenPwned   | Security         | Breach API (API key required)        |
| ProtonMail       | Email            | PGP keyserver lookup                 |
| Microsoft        | Tech             | GetCredentialType endpoint           |
| Spotify          | Music            | Account validation endpoint          |
| Firefox Accounts | Browser          | Mozilla account status API           |
| Duolingo         | Education        | Public users API                     |
| Imgur            | Images           | Email availability check             |
| LastPass         | Password Manager | Iterations endpoint                  |
| Mailchimp        | Marketing        | Email check API                      |
| WordPress.com    | CMS              | Auth options endpoint                |
| Patreon          | Creator          | Login error code analysis            |
| Adobe            | Design           | IMS CheckToken endpoint              |
| Snapchat         | Social Media     | Login error code analysis            |

---

## 5. Technical Architecture

### Libraries Used (Node.js)

- **axios** → HTTP requests (social media)
- **puppeteer** → Headless browser for dynamic pages (social media)
- **https-proxy-agent** → Proxy support
- **user-agents** → Random, realistic User-Agent generation per request
- **chalk** → Colored console output
- **dotenv** → Loading environment variables from `.env`
- **cli-progress** → Progress bar display
- **readline** → CLI input
- **libphonenumber-js** → Phone number parsing and validation
- **https** *(built-in)* → HTTP requests in the mail checker (no external package)
- **crypto** *(built-in)* → MD5 hash for Gravatar lookup

### Python Dependency

- **phonenumbers** → Regional analysis of landline numbers

### Project Structure
```text
tracky-osint/
├─ Tracky.js                      # Main CLI
├─ Profile_Check_Socialmedia.js   # Social media module
├─ Mail_Checker.js                # Email module
├─ Number_Check.js                # Phone number analysis
├─ Festnetz_Analyse.py            # Python landline analysis
├─ google_Dorking_phonenumber.py  # Python DuckDuckGo scraper for phone numbers
├─ Vorwahl_Mobilfunk_DE_US.json   # DE & US carrier database
├─ Vorwahl_Mobilfunk_FR.json      # FR carrier database
├─ setup.js                       # Creates project directory Tracky-OSINT
├─ .env                           # API keys (not in Git!)
├─ .gitignore                     # Protects .env and node_modules
├─ package.json                   # Node project definition
└─ README.md                      # Documentation
```

---

## 6. Cache & Database System

### In-Memory Cache
- Social media and email results are cached for 10 minutes
- Format: `cache_<username>` or `cache_<email>` → result object
- Automatic cleanup of expired entries
- Reduces network load and improves performance

### JSON Databases
- Contain area code and carrier information for DE, US, FR
- Fast lookup without external API calls
- Reduces API load and improves performance

---

## 7. Detection Logic

### Social Media

HTML content is analyzed and checked for typical error indicators:

- `page not found`
- `sorry, this page isn't available`
- `profile does not exist`
- `this account does not exist`
- `this account has been suspended`
- `sorry. unless you've got a time machine, that content is unavailable.`

#### Login Wall Detection (Two Stages)

Many platforms redirect unauthenticated visitors to login pages instead of returning a clear 404 response. Without countermeasures, the tool would incorrectly classify these login pages as "found" (false-true). Therefore, two detection stages exist:

**Stage 1 — Axios (URL check via `isLoginRedirect()`):**
After each request, the `isLoginRedirect()` function checks whether the final URL points to a login page. Recognized URL patterns include `/login`, `/signin`, `/auth`, `/accounts/login`, `next=`, `redirect=`, `/checkpoint`, and `/challenge`. It also checks whether a domain change occurred (e.g. `instagram.com` → `accounts.instagram.com`). On match → `[?] Error` instead of a false `[+] FOUND`.

**Stage 2 — Puppeteer (HTML content):**
`contentIndicatesNotFound()` first checks the loaded HTML content for login patterns such as `log in to continue`, `<input type="password">`, `please log in`, `forgot your password`, etc. On match → `[?] Error`.

**Exceptions from login wall detection:**
The following platforms display login forms in HTML even when a profile exists — they are excluded from the general login check and instead use their own platform-specific detection:

| Platform | Reason |
|---|---|
| Instagram | Displays profile metadata and login form simultaneously in HTML |
| Facebook | Login DOM is always present, regardless of profile status |
| LinkedIn | Partial content + login wall appear together |
| Threads | Same behavior as Instagram (same infrastructure) |

#### Platform-Specific Analysis

| Platform | Method | Note |
|---|---|---|
| Instagram | Meta tag `og:title` | Login wall check skipped |
| Facebook | Title, body & text content (3-stage) | Login wall check skipped |
| GitHub | `<title>` | — |
| Reddit | `<title>` | — |
| LinkedIn | `<title>` + placeholder pattern | Login wall check skipped |
| TikTok | `<title>` | — |
| YouTube | `<title>` | — |
| X (Twitter) | `<title>` & body | — |
| Twitch | `<title>` (React SPA) | Special handling, see below |
| All others | General pattern check across full HTML | — |

#### Why Twitch Requires Special Handling

Twitch is a React single-page application. The initial HTML source is identical for every request — regardless of whether the searched user exists or not. Only after full JavaScript rendering does the `<title>` differ:

- `shroud - Twitch` → user exists
- `Twitch` → user does not exist

Puppeteer therefore uses `waitForSelector` to wait for the rendered page element before evaluating the title.

### Email Checker

Three detection methods depending on the platform:

**Public APIs**
Platforms like GitHub and Duolingo offer public APIs that can be queried directly. GitHub uses the `in:email` query parameter to search the public email field. Duolingo returns the username and profile link on a match.

**Validation Endpoints**
Many services check server-side whether an email address is already taken during registration. These endpoints are technically publicly accessible (Spotify, Imgur, Mailchimp, Firefox Accounts, WordPress.com).

**Error Code Analysis**
Some platforms return different error messages during a login attempt — "wrong email" vs. "wrong password". This reveals whether an account exists without actually logging in (Patreon, Snapchat).

### Phone Numbers

- Type (mobile / landline)
- Country
- Area code
- Carrier
- Region (for landlines via Python)

---

## 8. Query Flow

### Social Media
```text
Input (Username) → Check cache
   ↓ not found
Axios phase (parallel, 20 concurrent)
   ↓ Per request: individual header + isLoginRedirect() check
   ↓ 5–8 seconds
Status sorting
   ↓ 404/406 → false | Login redirect → null | 200 → Puppeteer
Puppeteer phase (3 browsers parallel)
   ↓ Login wall check → null
   ↓ Platform-specific not-found check
   ↓ 50–60 seconds
Sort results (Found → Not found → Errors)
   ↓
Save to cache
   ↓
Console output
```

### Email
```text
Input (Email) → Validation → Check cache
   ↓ not found
HTTPS requests (parallel, 10 concurrent)
   ↓ 5–10 seconds
Sort results (Found → Not found → Errors)
   ↓
Save to cache
   ↓
Console output
```

---

## 9. Installation

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Python 3.x
- pip

### Clone the Repository
```bash
git clone <repo-url>
cd tracky-osint
```

### Install Node.js Dependencies
```bash
npm install
```

### Automatically Create Project Directory
```bash
npm run setup
```

This command automatically creates the required directory `Tracky-OSINT` if it does not yet exist.

### Install Python Dependencies
```bash
pip install phonenumbers
pip install requests beautifulsoup4
```

### Configure API Keys (Optional)

Create a `.env` file in the project folder:
```
HIBP_API_KEY=your-key-here
```

A HaveIBeenPwned API key is available at: https://haveibeenpwned.com/API/Key

Ensure `.gitignore` contains:
```
node_modules/
.env
```

---

## 10. Usage

### Show Help
```bash
node Tracky.js --help
```

### Social Media Search
```bash
node Tracky.js --search JohnDoe
```

Example (sorted output):
```text
--- Social Media Search Results ---

[+] FOUND:    https://www.github.com/JohnDoe
[+] FOUND:    https://www.reddit.com/user/JohnDoe

[-] NOTHING:  https://www.instagram.com/JohnDoe/
[-] NOTHING:  https://www.facebook.com/JohnDoe

[?] Error:    https://www.x.com/JohnDoe
```

### Email Search
```bash
node Tracky.js --email john@example.com
```

Example (sorted output):
```text
--- Email Search Results ---

[+] FOUND:    https://www.gravatar.com/abc123  (@johndoe)
[+] FOUND:    https://github.com/johndoe  (@johndoe)
[+] FOUND:    https://open.spotify.com  (Account registered)

[-] NOTHING:  Duolingo
[-] NOTHING:  Firefox Accounts
[-] NOTHING:  Mailchimp

[?] Error:    Adobe  (Timeout / Error)
[?] Error:    HaveIBeenPwned  (API key missing (HIBP_API_KEY))

  Matches: 3 / 16 platforms
```

### Using a Proxy
```bash
node Tracky.js --search JohnDoe --proxy http://proxy-server:8080
node Tracky.js --email john@example.com --proxy http://proxy-server:8080
```

### Analyze a Phone Number
```bash
node Tracky.js --number +4915112345678
```

Example:
```text
Number:    +49 151 12345678
Type:      MOBILE
Country:   DE
Carrier:   Telekom
```

### Calling Modules Directly
```bash
node Profile_Check_Socialmedia.js JohnDoe
node Profile_Check_Socialmedia.js JohnDoe http://proxy-server:8080

node Mail_Checker.js john@example.com
node Mail_Checker.js john@example.com http://proxy-server:8080
```

---

## 11. Configuration

### Adjusting Social Media Concurrency

In `Profile_Check_Socialmedia.js`:
```javascript
// Axios concurrency (default: 20)
const axiosResults = await fetchWithAxios(username, Proxy_URL, 20);

// Puppeteer concurrency (default: 3)
const puppeteerResults = await fetchWithPuppeteer(
    username,
    Proxy_URL,
    urlsNeedingPuppeteer,
    3  // Number of parallel browsers
);
```

**Recommendations:**
- Fast machine: increase Puppeteer to 4–5
- Slow machine: reduce Puppeteer to 2
- Axios: 20 is optimal (watch out for rate limiting)

### Adjusting Email Concurrency

In `Mail_Checker.js`:
```javascript
const CONFIG = {
    timeout:     8000,  // ms per request
    concurrency: 10,    // parallel requests at a time
};
```

**Recommendations:**
- Default: 10 is optimal
- Under rate limiting: reduce to 5
- Timeout on slow connections: increase to 12000ms

### Adjusting Puppeteer Timeout
```javascript
// Puppeteer timeout (default: 10000ms)
await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
```

Increase to 15000–20000ms for slow connections.

### Adjusting Cache Duration
```javascript
// Cache duration (default: 10 minutes)
const CACHE_DURATION = 10 * 60 * 1000;
```

---

## Performance Notes

- Repeated searches use the cache (under 1 second)
- Proxies increase latency
- On timeouts: reduce concurrency or increase timeout
- A fast internet connection improves scan speed
- GitHub check only finds accounts with a publicly visible email address
- HaveIBeenPwned requires a paid API key (~$3.50/month)
- ProtonMail check only works for @proton.me and @protonmail.com addresses
