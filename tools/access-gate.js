const TOOLS_GATE_KEY = "calendrx_tools_dummy_access";
const TOOLS_GATE_PASSWORD = "Pharmacy123";

function clearToolsGatePendingState() {
  document.documentElement.classList.remove("tools-gate-pending");
}

function renderToolsGate() {
  document.body.innerHTML = `
    <div class="app-shell auth-shell">
      <main class="auth-card" aria-labelledby="tools-gate-title">
        <img src="/website-icon.png" alt="CalendRx logo" class="hero-logo auth-logo">
        <p class="section-kicker">Protected Tools</p>
        <h1 id="tools-gate-title">Internal access required</h1>
        <p class="auth-copy">
          This temporary tools area is hidden behind a simple password wall while the pages are still being prepared.
        </p>
        <form id="tools-gate-form" class="auth-form" novalidate>
          <label for="tools-gate-password">
            <span>Password</span>
          </label>
          <div class="password-field">
            <input id="tools-gate-password" name="password" type="password" autocomplete="current-password">
            <button type="button" class="password-toggle" aria-controls="tools-gate-password" aria-label="Show password" title="Show password">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
                <circle cx="12" cy="12" r="3"/>
                <path class="password-eye-slash" d="m3 3 18 18"/>
              </svg>
            </button>
          </div>
          <div class="auth-actions">
            <button type="submit" class="button">Enter Tools</button>
            <a href="/" class="button button-secondary">Back to Planner</a>
          </div>
          <p id="tools-gate-error" class="auth-error" hidden>Incorrect password. Try again.</p>
        </form>
      </main>
    </div>
  `;

  const form = document.getElementById("tools-gate-form");
  const passwordInput = document.getElementById("tools-gate-password");
  const error = document.getElementById("tools-gate-error");

  passwordInput.focus();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const password = passwordInput.value;

    if (password === TOOLS_GATE_PASSWORD) {
      sessionStorage.setItem(TOOLS_GATE_KEY, "granted");
      window.location.reload();
      return;
    }

    error.hidden = false;
    passwordInput.select();
  });
}

if (sessionStorage.getItem(TOOLS_GATE_KEY) === "granted") {
  clearToolsGatePendingState();
} else {
  window.addEventListener("DOMContentLoaded", () => {
    renderToolsGate();
    clearToolsGatePendingState();
  });
}
