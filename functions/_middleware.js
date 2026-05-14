const COOKIE_NAME = "calendrx_tools_access";
const COOKIE_MAX_AGE = 60 * 60 * 8;

function getPassword(env) {
  return env.TOOLS_PASSWORD || "Cheesecake";
}

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return "";
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function sanitizeRedirectPath(rawPath) {
  if (!rawPath || typeof rawPath !== "string") return "/tools/";
  if (!rawPath.startsWith("/tools")) return "/tools/";
  return rawPath;
}

async function createAccessToken(secret) {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`calendrx-tools:${secret}`)
  );

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function renderLoginPage({ origin, redirectPath, errorMessage = "" }) {
  const safeError = errorMessage
    ? `<p class="auth-error" role="alert">${errorMessage}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Protected Tools | CalendRx</title>
  <link rel="icon" href="${origin}/website-icon.png" type="image/png">
  <link rel="shortcut icon" href="${origin}/website-icon.png" type="image/png">
  <link rel="apple-touch-icon" href="${origin}/website-icon.png">
  <link rel="stylesheet" href="${origin}/style.css">
</head>
<body>
  <div class="auth-shell">
    <section class="card auth-card">
      <img src="${origin}/website-icon.png" alt="CalendRx logo" class="hero-logo auth-logo">
      <p class="section-kicker">Protected Access</p>
      <h1>Other Pharmacy Tools</h1>
      <p class="auth-copy">
        This area is reserved for in-progress tools that are still being built and reviewed before release.
      </p>
      ${safeError}
      <form method="post" class="auth-form">
        <input type="hidden" name="redirectTo" value="${redirectPath}">
        <label>
          <span>Password</span>
          <input
            id="tools-password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
          >
        </label>
        <div class="auth-actions">
          <button type="submit" class="button">Open Tools</button>
          <a href="/" class="button button-secondary">Back to Planner</a>
        </div>
      </form>
    </section>
  </div>
</body>
</html>`;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (!url.pathname.startsWith("/tools")) {
    return next();
  }

  const expectedPassword = getPassword(env);
  const expectedToken = await createAccessToken(expectedPassword);
  const existingToken = getCookieValue(request.headers.get("Cookie"), COOKIE_NAME);

  if (request.method === "POST") {
    const formData = await request.formData();
    const submittedPassword = String(formData.get("password") || "");
    const redirectPath = sanitizeRedirectPath(String(formData.get("redirectTo") || "/tools/"));

    if (submittedPassword === expectedPassword) {
      const response = Response.redirect(new URL(redirectPath, url.origin).toString(), 303);
      response.headers.append(
        "Set-Cookie",
        `${COOKIE_NAME}=${encodeURIComponent(expectedToken)}; Path=/tools; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`
      );
      return response;
    }

    return new Response(
      renderLoginPage({
        origin: url.origin,
        redirectPath,
        errorMessage: "That password was not recognized.",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  if (existingToken === expectedToken) {
    return next();
  }

  return new Response(
    renderLoginPage({
      origin: url.origin,
      redirectPath: `${url.pathname}${url.search}`,
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "no-store",
      },
    }
  );
}
