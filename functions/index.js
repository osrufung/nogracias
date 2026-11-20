// Cloudflare Pages Function for the home page only ("/"). Sends people to the site in
// their language: the one they picked with the language switcher (a "lang" cookie), or
// else the first supported one in their browser's Accept-Language. Spanish is the root,
// so Spanish speakers, crawlers and anyone without a match stay here. Every other URL is
// served as it is, so shared links open what was shared.

const SUPPORTED = ["es", "ca", "en", "eu", "gl"];
// Search engines and AI assistants index each language at its own URL (hreflang), so
// they always get the page they asked for.
const CRAWLER = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|gpt|perplexity|claude|anthropic|google-|bing|yandex|duckduck|applebot/i;

export async function onRequestGet({ request, next }) {
  const lang = chosenLanguage(request) ?? browserLanguage(request);
  if (lang && lang !== "es") {
    const url = new URL(request.url);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/${lang}/${url.search}`,
        "Cache-Control": "private, no-store",
        Vary: "Accept-Language, Cookie",
      },
    });
  }
  const response = await next();
  const headers = new Headers(response.headers);
  headers.set("Vary", "Accept-Language, Cookie");
  return new Response(response.body, { status: response.status, headers });
}

function chosenLanguage(request) {
  const match = /(?:^|;\s*)lang=([a-z]{2})/.exec(request.headers.get("Cookie") ?? "");
  return match && SUPPORTED.includes(match[1]) ? match[1] : null;
}

function browserLanguage(request) {
  if (CRAWLER.test(request.headers.get("User-Agent") ?? "")) return "es";
  const header = request.headers.get("Accept-Language");
  if (!header) return "es";
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { base: tag.split("-")[0], q: q ? parseFloat(q.slice(2)) || 0 : 1 };
    })
    .filter((entry) => entry.base && entry.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { base } of ranked) {
    if (base === "va") return "ca"; // Valencian reads the Catalan pages
    if (SUPPORTED.includes(base)) return base;
  }
  // Someone who reads none of our languages is better served in English.
  return ranked.length ? "en" : "es";
}
