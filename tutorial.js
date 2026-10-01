(() => {
  const launch = document.getElementById("tutorial-button");
  const shell = document.querySelector(".app-shell");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const panel = document.createElement("section");
  panel.className = "tutorial-panel no-print";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "tutorial-title");
  panel.innerHTML = `
    <div class="tutorial-topline"><span id="tutorial-progress"></span><button type="button" data-tour="exit" class="tutorial-exit">Exit & restore inputs</button></div>
    <div aria-live="polite" aria-atomic="true"><h2 id="tutorial-title"></h2><p id="tutorial-copy"></p></div>
    <p class="tutorial-caption">Demonstration only. Your original inputs are saved until you choose to keep this example.</p>
    <div class="tutorial-controls">
      <button type="button" class="button button-secondary" data-tour="back">Back</button>
      <button type="button" class="button button-secondary" data-tour="pause">Pause</button>
      <button type="button" class="button" data-tour="next">Start demo</button>
      <button type="button" class="button" data-tour="keep" hidden>Keep this example</button>
    </div>`;
  document.body.append(panel);
  const control = name => panel.querySelector(`[data-tour="${name}"]`);
  let saved, index = 0, token = 0, paused = false, busy = false, highlighted;
  let background = [];
  const steps = [
    { title: "Try an advanced taper", copy: "Watch the real form fill in, one step at a time. Use Next to continue, Back to replay, or Exit to restore your inputs.", target: ".form-card" },
    { title: "Name the medication", copy: "Enter Prednisone. This name will appear on the calendar.", target: "#drug-name", values: [["#drug-name", "Prednisone"]] },
    { title: "Choose the start date", copy: "We'll use today's date for this demonstration.", target: "#taper-start-date", values: [["#taper-start-date", () => DateUtils.toDateInputValue(new Date())]] },
    { title: "Select tablets", copy: "The medication form determines which strength and dose options are available.", page: 2, target: "#dosage-form", values: [["#dosage-form", "tablet"]] },
    { title: "Enter the available strengths", copy: "Enter strengths from largest to smallest: 50 mg in Strength A and 5 mg in Strength B.", page: 2, target: ".group-strengths", values: [["#tablet-strength-a", "50"], ["#tablet-strength-b", "5"]] },
    { title: "Choose Advanced Multi-Taper", copy: "Advanced mode lets you define a starting period and separate dose-change segments.", page: 3, target: "#taper-mode-advanced", advanced: true },
    { title: "Set the starting dose", copy: "For this example, enter a starting daily dose of 50 mg.", page: 3, target: "#starting-dose", values: [["#starting-dose", "50"]] },
    { title: "Set the starting period", copy: "The first row keeps the starting dose for 7 days.", page: 3, target: "#custom-segment-body tr:first-child", values: [["#custom-segment-body tr:first-child .segment-days-per-step", "7"]] },
    { title: "Add the reductions", copy: "In the next row, reduce by 10 mg every 7 days for 5 repeats. The dose preview continues through 40, 30, 20, 10, and 0 mg.", page: 3, target: "#custom-segment-body tr:nth-child(2)", values: [["#custom-segment-body tr:nth-child(2) .segment-dose-change", "10"], ["#custom-segment-body tr:nth-child(2) .segment-days-per-step", "7"], ["#custom-segment-body tr:nth-child(2) .segment-repeats", "5"]] },
    { title: "Review the calendar", copy: "The calendar shows each day's dose and tablet breakdown. You can return to your original inputs or keep this example to explore Edit Inputs and Print.", target: "#results", generate: true }
  ];

  function highlight(selector, scroll = true) {
    highlighted?.classList.remove("tutorial-highlight");
    highlighted = document.querySelector(selector);
    highlighted?.classList.add("tutorial-highlight");
    if (scroll) highlighted?.scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "start" });
  }

  function setValue(selector, value) {
    const input = document.querySelector(selector);
    if (!input) throw new Error("Tutorial field is unavailable.");
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function wait(ms, run) {
    let elapsed = 0;
    while (elapsed < ms || paused) {
      await new Promise(resolve => setTimeout(resolve, 40));
      if (run !== token) throw new Error("cancelled");
      if (!paused) elapsed += 40;
    }
    if (run !== token) throw new Error("cancelled");
  }

  async function apply(step, animate, run) {
    if (run !== token) throw new Error("cancelled");
    if (step.page) MobileFlow.setStep(step.page);
    if (step.advanced) document.getElementById("taper-mode-advanced").click();
    if (step.generate) {
      AppController.handleMobileStepNext();
      if (MobileFlow.currentStep !== 4) throw new Error("Example could not be generated.");
    }
    if (animate) {
      highlight(step.target);
      await wait(reducedMotion.matches ? 40 : 600, run);
    }
    for (const [selector, raw] of step.values || []) {
      const value = typeof raw === "function" ? raw() : raw;
      const input = document.querySelector(selector);
      if (animate) highlight(selector);
      if (animate && !reducedMotion.matches && ["text", "number"].includes(input.type)) {
        setValue(selector, "");
        for (let length = 1; length <= value.length; length++) {
          await wait(100, run);
          setValue(selector, value.slice(0, length));
        }
      } else setValue(selector, value);
    }
  }

  function resetDemo() {
    UIState.validationRequested = false;
    UIState.mobileValidationRequested = false;
    DOMRefs.useCustomOverrideInput.value = "false";
    UISetup.applyFormDefaults({ ...APP_CONFIG.defaults.taper, useCustomOverride: "false", allowPartialTablets: false }, [["0", "", "1"], ["", "", ""]]);
    UISetup.setPreviewMode("guided");
    MobileFlow.setStep(1);
    DOMRenderer.clearResults();
    DOMRenderer.renderValidationErrors([]);
  }

  async function show(nextIndex) {
    const run = ++token;
    index = nextIndex;
    paused = false;
    busy = true;
    control("pause").textContent = "Pause";
    control("pause").disabled = false;
    control("next").disabled = true;
    control("back").disabled = index === 0;
    control("keep").hidden = true;
    control("next").hidden = false;
    panel.querySelector("#tutorial-progress").textContent = `Tutorial · ${index + 1} of ${steps.length}`;
    panel.querySelector("#tutorial-title").textContent = steps[index].title;
    panel.querySelector("#tutorial-copy").textContent = steps[index].copy;
    control("next").textContent = index === 0 ? "Start demo" : "Next";
    try {
      resetDemo();
      for (let previous = 1; previous < index; previous++) await apply(steps[previous], false, run);
      if (run !== token) return;
      await apply(steps[index], true, run);
      if (run !== token) return;
      highlight(steps[index].target, false);
      control("next").hidden = index === steps.length - 1;
      control("keep").hidden = index !== steps.length - 1;
    } catch (error) {
      if (run !== token) return;
      panel.querySelector("#tutorial-copy").textContent = "The tutorial couldn't complete this step. Choose Back to retry or Exit to restore your inputs.";
    } finally {
      if (run === token) {
        busy = false;
        control("next").disabled = false;
        control("pause").disabled = true;
        (control("keep").hidden ? control("next") : control("keep")).focus({ preventScroll: true });
      }
    }
  }

  function finish(keep = false) {
    ++token;
    highlighted?.classList.remove("tutorial-highlight");
    panel.hidden = true;
    document.body.classList.remove("tutorial-active");
    background.forEach(([element, inert]) => element.inert = inert);
    if (!keep) {
      UISetup.applyImportedConfiguration(saved.configuration);
      // Restore raw values too, including incomplete entries and row-specific choices.
      const rows = [...DOMRefs.customSegmentBody.querySelectorAll("tr")];
      saved.fields.forEach(state => {
        const input = state.rowIndex < 0 ? state.element : rows[state.rowIndex]?.querySelectorAll("input, select, textarea")[state.fieldIndex];
        if (!input) return;
        input.value = state.value;
        input.checked = state.checked;
        if (state.userSet === undefined) delete input.dataset.userSet;
        else input.dataset.userSet = state.userSet;
      });
      DOMRefs.form.totalSteps.dataset.manualValue = saved.manualValue;
      UISetup.syncMedicationLabels();
      UISetup.syncDoseChangeDirectionButtons();
      UISetup.syncCustomOverrideVisibility();
      rows.forEach(row => {
        const fields = UISetup.getCustomRowFields(row);
        UISetup.setCustomSegmentDirection(fields, UISetup.getCustomSegmentDirection(fields));
      });
      UISetup.syncCustomSegmentDoseHelpers();
      UISetup.syncInputUnitAffixes();
      UIState.validationRequested = saved.validation;
      UIState.mobileValidationRequested = saved.mobileValidation;
      AppController.render();
      UISetup.setPreviewMode(saved.preview);
      MobileFlow.setStep(saved.step);
      launch.focus({ preventScroll: true });
      window.scrollTo({ top: saved.scroll, behavior: "instant" });
    } else {
      document.getElementById("mobile-edit-inputs-button").focus({ preventScroll: true });
      DOMRefs.results.scrollIntoView({ block: "start" });
    }
    saved = null;
  }

  launch.addEventListener("click", () => {
    if (saved) return;
    saved = {
      configuration: ConfigCode.captureCurrentState(), preview: DOMRefs.previewModeInput.value,
      step: MobileFlow.currentStep, scroll: window.scrollY,
      validation: UIState.validationRequested, mobileValidation: UIState.mobileValidationRequested,
      manualValue: DOMRefs.form.totalSteps.dataset.manualValue || "",
      fields: [...DOMRefs.form.querySelectorAll("input, select, textarea")].map(input => {
        const row = input.closest("#custom-segment-body tr");
        return { element: input, rowIndex: row ? [...DOMRefs.customSegmentBody.children].indexOf(row) : -1,
          fieldIndex: row ? [...row.querySelectorAll("input, select, textarea")].indexOf(input) : -1,
          value: input.value, checked: input.checked, userSet: input.dataset.userSet };
      })
    };
    background = [shell, document.getElementById("sticky-action-bar")].map(element => [element, element.inert]);
    background.forEach(([element]) => element.inert = true);
    document.body.classList.add("tutorial-active");
    panel.hidden = false;
    control("exit").focus({ preventScroll: true });
    show(0);
  });
  control("exit").addEventListener("click", () => finish());
  control("keep").addEventListener("click", () => finish(true));
  control("next").addEventListener("click", () => { if (!busy && index < steps.length - 1) show(index + 1); });
  control("back").addEventListener("click", () => { if (index > 0) show(index - 1); });
  control("pause").addEventListener("click", () => {
    paused = !paused;
    control("pause").textContent = paused ? "Resume" : "Pause";
  });
  panel.addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); finish(); }
    if (event.key !== "Tab") return;
    const buttons = [...panel.querySelectorAll("button")].filter(button => !button.hidden && !button.disabled);
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
})();
