document.addEventListener("click", (event) => {
  const button = event.target.closest(".password-toggle");
  if (!button) return;

  const input = document.getElementById(button.getAttribute("aria-controls"));
  if (!input) return;

  const showPassword = input.type === "password";
  input.type = showPassword ? "text" : "password";
  button.setAttribute("aria-label", showPassword ? "Hide password" : "Show password");
  button.title = showPassword ? "Hide password" : "Show password";
  button.classList.toggle("is-visible", showPassword);
});
