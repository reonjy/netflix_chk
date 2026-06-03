/**
 * Netflix Cookie Checker â€” API Route
 * POST /api/check
 *
 * Accepts cookies, validates them against Netflix,
 * and returns account details.
 */

export const maxDuration = 60; // Vercel Pro: 60s, Free: 10s

export async function POST(request) {
  try {
    const body = await request.json();
    const { cookies } = body;

    if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
      return Response.json(
        { error: "No cookies provided. Send a JSON body with a 'cookies' array." },
        { status: 400 }
      );
    }

    // Build the cookie header string
    const cookieHeader = cookies
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    // Make request to Netflix account page
    const result = await checkCookies(cookieHeader);

    return Response.json(result);
  } catch (err) {
    console.error("Check error:", err);
    return Response.json(
      { status: "error", error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Standard request headers for Netflix requests.
 */
const NETFLIX_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "identity",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

/**
 * Check if a redirect location points to a login/signin page.
 */
function isLoginRedirect(location) {
  if (!location) return false;
  const lower = location.toLowerCase();
  return lower.includes("/login") || lower.includes("/signin") || lower.includes("login?");
}

/**
 * Process a 200 OK HTML response from a Netflix account page.
 * Returns { status, details } object.
 */
function processAccountPage(html) {
  // Check if we're on an actual login/signup page using reliable indicators,
  // not just the generic word "login" which appears in JS bundles on valid pages too.
  if (
    (html.includes('"isNonMember":true') ||
      html.includes('"isLoggedIn":false') ||
      html.includes('"authURL"')) &&
    !html.includes("membershipType") &&
    !html.includes("localizedPlanName") &&
    !html.includes("emailAddress") &&
    !html.includes("reactContext")
  ) {
    return { status: "expired", details: null };
  }

  const details = extractInfo(html);

  // If we found any account info, the cookie is working
  if (details.email || details.plan) {
    return { status: "working", details };
  }

  // If page loaded but no info extracted, might still be valid
  // Check for common logged-in indicators
  if (
    html.includes("reactContext") ||
    html.includes("profiles") ||
    html.includes('"memberSince"') ||
    html.includes('"userInfo"')
  ) {
    return {
      status: "working",
      details: {
        plan: details.plan || "Unknown",
        email: details.email || "Hidden",
        country: details.country || "Unknown",
        extraMembers: details.extraMembers,
      },
    };
  }

  return { status: "expired", details: null };
}

/**
 * Fetch a URL with cookies and a timeout. Returns the Response object.
 * Uses redirect: "manual" so we can inspect redirects.
 */
async function fetchWithCookies(url, cookieHeader, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...NETFLIX_HEADERS,
        Cookie: cookieHeader,
      },
      redirect: "manual",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * Check cookies against Netflix by requesting the account page.
 */
async function checkCookies(cookieHeader) {
  const urls = [
    "https://www.netflix.com/YourAccount",
    "https://www.netflix.com/account",
  ];

  for (const url of urls) {
    try {
      const response = await fetchWithCookies(url, cookieHeader);

      const location = response.headers.get("location") || "";
      const status = response.status;

      // Handle redirect responses
      if (status === 301 || status === 302 || status === 303 || status === 307 || status === 308) {
        // If redirected to a login page, the cookies are expired
        if (isLoginRedirect(location)) {
          return { status: "expired", details: null };
        }

        // Non-login redirect (e.g. locale redirect, /YourAccount -> /account)
        // Follow it one hop with the same cookies
        if (location) {
          try {
            const redirectUrl = new URL(location, url);
            const response2 = await fetchWithCookies(redirectUrl.href, cookieHeader);
            const location2 = response2.headers.get("location") || "";

            // Check if the second response also redirects to login
            if (response2.status >= 301 && response2.status <= 308) {
              if (isLoginRedirect(location2)) {
                return { status: "expired", details: null };
              }
              // Two non-login redirects â€” give up on this URL, try next
              continue;
            }

            if (response2.status === 200) {
              const html = await response2.text();
              return processAccountPage(html);
            }
          } catch {
            // Failed to follow redirect, try next URL
            continue;
          }
        }
        continue;
      }

      // If we get a 200, try to extract account info
      if (status === 200) {
        const html = await response.text();
        return processAccountPage(html);
      }

      // Other status codes â€” try next URL
    } catch (err) {
      if (err.name === "AbortError") {
        continue; // timeout, try next URL
      }
      // Network error, try next URL
      continue;
    }
  }

  return { status: "error", error: "Could not reach Netflix", details: null };
}

/**
 * Extract account information from Netflix page HTML.
 * Looks for the reactContext JSON blob inline in the page.
 */
function extractInfo(html) {
  const info = {
    plan: null,
    email: null,
    country: null,
    extraMembers: null,
  };

  try {
    // Extract plan name
    const planMatch = html.match(
      /"localizedPlanName"\s*:\s*\{\s*"fieldType"\s*:\s*"String"\s*,\s*"value"\s*:\s*"([^"]+)"/
    );
    if (planMatch) {
      info.plan = decodeHexEscapes(planMatch[1]);
    }

    // Try alternative plan patterns
    if (!info.plan) {
      const altPlan = html.match(/"planName"\s*:\s*"([^"]+)"/);
      if (altPlan) info.plan = decodeHexEscapes(altPlan[1]);
    }
    if (!info.plan) {
      const altPlan2 = html.match(/"membershipType"\s*:\s*"([^"]+)"/);
      if (altPlan2) info.plan = decodeHexEscapes(altPlan2[1]);
    }

    // Extract email
    const emailMatch = html.match(/"emailAddress"\s*:\s*"([^"]+)"/);
    if (emailMatch) {
      info.email = decodeHexEscapes(emailMatch[1]);
    }

    // Extract country
    const countryMatch = html.match(/"countryOfSignup"\s*:\s*"([^"]+)"/);
    if (countryMatch) {
      info.country = decodeHexEscapes(countryMatch[1]);
    }

    // Extract extra members info
    const extraMatch = html.match(
      /"maxExtraMemberCount"\s*:\s*(\d+)/
    );
    if (extraMatch) {
      info.extraMembers = parseInt(extraMatch[1], 10);
    }
  } catch (err) {
    console.error("Extract error:", err.message);
  }

  return info;
}

/**
 * Decode \xNN and \uNNNN escape sequences.
 */
function decodeHexEscapes(s) {
  if (!s) return s;
  s = s.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  s = s.replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  return s;
}
