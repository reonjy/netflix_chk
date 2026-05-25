/**
 * Cookie Parser Utilities
 * Handles JSON, Netscape tab-separated, and Combo cookie formats,
 * auto-detection, and splitting bulk cookie files.
 */

/**
 * Parse Netscape tab-delimited cookies into JSON array.
 * Each line: domain\tflag\tpath\tsecure\texpiration\tname\tvalue
 */
export function parseNetscapeCookies(text) {
  const cookies = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const fields = trimmed.split("\t");
    if (fields.length >= 7) {
      cookies.push({
        domain: fields[0].replace(/^www\./, ""),
        flag: fields[1],
        path: fields[2],
        secure: fields[3].toUpperCase() === "TRUE",
        expiration: fields[4],
        name: fields[5],
        value: fields[6],
      });
    }
  }
  return cookies;
}

/**
 * Parse JSON cookie array string.
 * Accepts both raw JSON arrays and EditThisCookie-style exports.
 */
export function parseJsonCookies(text) {
  try {
    const parsed = JSON.parse(text.trim());
    if (Array.isArray(parsed)) return parsed;
    throw new Error("Not an array");
  } catch {
    throw new Error("Invalid JSON cookie format");
  }
}

/**
 * Parse Combo format where cookies are on a single line separated by ` | `
 * Example: email:pass | Country = BR | ... | NetflixCookies = NetflixId=...
 */
export function parseComboFormat(text) {
  const cookies = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Look for NetflixCookies = ...
    const match = trimmed.match(/NetflixCookies\s*=\s*(.+)$/i);
    if (match) {
      const cookieStr = match[1].trim();
      
      const parts = cookieStr.split(';');
      for (const part of parts) {
        const idx = part.indexOf('=');
        if (idx > 0) {
          const name = part.slice(0, idx).trim();
          const value = part.slice(idx + 1).trim();
          cookies.push({
             domain: ".netflix.com",
             name: name,
             value: value,
             path: "/",
             secure: true
          });
        }
      }
    }
  }
  return cookies;
}

/**
 * Auto-detect format and parse cookies.
 * Returns { format: 'json'|'netscape'|'combo', cookies: [] }
 */
export function autoDetectAndParse(text) {
  const trimmed = text.trim();
  if (!trimmed) return { format: null, cookies: [] };

  // Try JSON first
  if (trimmed.startsWith("[")) {
    try {
      return { format: "json", cookies: parseJsonCookies(trimmed) };
    } catch {
      // Fall through
    }
  }

  // Try Combo Format
  if (trimmed.includes(' | ') && /NetflixCookies\s*=/i.test(trimmed)) {
    const cookies = parseComboFormat(trimmed);
    if (cookies.length > 0) {
      return { format: "combo", cookies };
    }
  }

  // Try Netscape
  const cookies = parseNetscapeCookies(trimmed);
  if (cookies.length > 0) {
    return { format: "netscape", cookies };
  }

  throw new Error(
    "Could not detect cookie format. Please use JSON array, Netscape format, or Combo format."
  );
}

/**
 * Split a bulk text into individual cookie sets.
 * Cookie sets are separated by blank lines, "---", or "===".
 * Returns array of raw text blocks.
 */
export function splitCookieSets(text) {
  const trimmedText = text.trim();
  if (!trimmedText) return [];

  // If the whole thing is one JSON array, treat it as one set
  if (trimmedText.startsWith("[") && trimmedText.endsWith("]")) {
    try {
      JSON.parse(trimmedText);
      return [trimmedText];
    } catch {
      // Not valid as one block, proceed with splits
    }
  }

  // Check if we have combo format lines (e.g., "... | NetflixCookies = ...")
  // If so, treat each combo line as its own block, ignoring blank line rules for them.
  const lines = trimmedText.split('\n');
  const hasComboFormat = lines.some(line => line.includes(' | ') && /NetflixCookies\s*=/i.test(line));
  
  if (hasComboFormat) {
    const blocks = [];
    let currentBlock = [];
    
    for (const line of lines) {
      if (line.includes(' | ') && /NetflixCookies\s*=/i.test(line)) {
        // This is a combo line. It's its own block.
        if (currentBlock.length > 0) {
          blocks.push(currentBlock.join('\n'));
          currentBlock = [];
        }
        blocks.push(line.trim());
      } else {
        currentBlock.push(line);
      }
    }
    if (currentBlock.length > 0) {
      blocks.push(currentBlock.join('\n'));
    }
    
    return blocks.filter(b => b.trim());
  }

  // Fallback: Split on blank lines or divider lines
  const blocks = trimmedText
    .split(/\n\s*\n|\n-{3,}\n|\n={3,}\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length === 0) return [trimmedText];

  return blocks;
}

/**
 * Build a cookie header string from cookie array for HTTP requests.
 */
export function buildCookieHeader(cookies) {
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}
