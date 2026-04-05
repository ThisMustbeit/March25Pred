const APP_CONFIG = {
  epsilon: 1e-6,
  defaultCustomSegmentCount: 3,
  maxCustomSegmentCount: 8,
  messages: {
    exactDoseWarning: "Dose not exact with selected medication strengths",
    noSchedule: "No taper days to display yet.",
    customMode: "Custom taper override",
    standardMode: "Standard step taper",
  },
  defaults: {
    taper: {
      drugName: "Prednisone",
      dosageForm: "tablet",
      startingDose: "",
      doseChangePerStep: "",
      doseChangeDirection: "reduce",
      daysPerStep: "",
      totalSteps: "",
      finalDose: "",
      totalStepsMode: "manual",
      standardTaperDriver: "steps",
      minDoseClamp: "0",
      maxDoseClamp: "1000",
      tabletStrengthA: "",
      tabletStrengthB: "",
      tabletStrengthC: "",
    },
    exampleTaper: {
      drugName: "Prednisone",
      dosageForm: "tablet",
      startingDose: "50",
      doseChangePerStep: "4",
      doseChangeDirection: "reduce",
      daysPerStep: "2",
      totalSteps: "30",
      finalDose: "",
      totalStepsMode: "manual",
      standardTaperDriver: "steps",
      minDoseClamp: "0",
      maxDoseClamp: "1000",
      tabletStrengthA: "5",
      tabletStrengthB: "",
      tabletStrengthC: "1",
    },
    exampleCustomSegments: [
      ["0", "7", "1"],
      ["-10", "7", "1"],
      ["-5", "14", "10"],
    ],
  },
};

const MedicationTerms = {
  normalizeDosageForm(value) {
    return value === "capsule" ? "capsule" : "tablet";
  },

  singular(dosageForm) {
    return MedicationTerms.normalizeDosageForm(dosageForm);
  },

  plural(dosageForm) {
    return `${MedicationTerms.singular(dosageForm)}s`;
  },

  titleSingular(dosageForm) {
    const singular = MedicationTerms.singular(dosageForm);
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  },

  strengthLabel(key, dosageForm) {
    return `${MedicationTerms.titleSingular(dosageForm)} Strength ${key} (mg)`;
  },

  scheduleColumnLabel(key, dosageForm) {
    return `${MedicationTerms.titleSingular(dosageForm)} ${key}`;
  },

  partialLabel(dosageForm) {
    return `Allow partial ${MedicationTerms.plural(dosageForm)}`;
  },

  usageLabel(strengthValue, dosageForm) {
    return `${Formatters.dose(strengthValue)} ${MedicationTerms.plural(dosageForm)} used`;
  },

  printableTitle(drugName) {
    const normalized = String(drugName || "").trim();
    return normalized || APP_CONFIG.defaults.taper.drugName;
  },
};

const DateUtils = {
  normalize(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  },

  addDays(date, days) {
    const copy = DateUtils.normalize(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  },

  isSameDate(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  },

  firstDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  },

  monthEndExclusive(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  },

  sundayOffset(date) {
    return DateUtils.normalize(date).getDay();
  },

  gridStartDate(date) {
    return DateUtils.addDays(date, -DateUtils.sundayOffset(date));
  },

  toDateInputValue(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
  },
};

const NumberUtils = {
  isNearZero(value) {
    return Math.abs(value) <= APP_CONFIG.epsilon;
  },

  clamp(value, minValue, maxValue) {
    return Math.min(maxValue, Math.max(minValue, value));
  },

  sanitizeRemainder(value) {
    return NumberUtils.isNearZero(value) ? 0 : Number(value.toFixed(6));
  },

  parseOptionalNumber(value) {
    if (value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  },

  parseOptionalInteger(value) {
    if (value === "") return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  },
};

const Formatters = {
  date(date) {
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  },

  monthYear(date) {
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
    });
  },

  monthName(date) {
    return date.toLocaleDateString(undefined, {
      month: "long",
    });
  },

  dose(value) {
    const normalized = Number(value);
    const text = Number.isInteger(normalized)
      ? String(normalized)
      : normalized.toFixed(1).replace(/\.0$/, "");
    return `${text} mg`;
  },

  tabletCount(value) {
    const normalized = Number(value);
    if (Number.isInteger(normalized)) {
      return String(normalized);
    }
    return normalized.toFixed(1).replace(/\.0$/, "");
  },

  plural(word, count) {
    return count === 1 ? word : `${word}s`;
  },
};

const Messages = {
  exactDoseWarning() {
    return APP_CONFIG.messages.exactDoseWarning;
  },

  modeLabel(useCustomOverride) {
    return useCustomOverride ? APP_CONFIG.messages.customMode : APP_CONFIG.messages.standardMode;
  },
};

const Html = {
  escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },
};

const ConfigCode = {
  prefix: "MTP1-",

  encode(state) {
    const json = JSON.stringify(state);
    const bytes = new TextEncoder().encode(json);
    let binary = "";

    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return `${ConfigCode.prefix}${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")}`;
  },

  decode(code) {
    if (typeof code !== "string" || !code.startsWith(ConfigCode.prefix)) {
      throw new Error("Invalid configuration code format.");
    }

    const payload = code.slice(ConfigCode.prefix.length);
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  },

  captureCurrentState() {
    const customSegments = [...DOMRefs.customSegmentBody.querySelectorAll("tr")].map((row, index) => {
      const fields = UISetup.getCustomRowFields(row);
      return {
        doseChange: index === 0 ? "0" : fields.doseChangeInput.value,
        daysPerStep: fields.daysPerStepInput.value,
        repeats: index === 0 ? "1" : fields.repeatsInput.value,
        allowedStrengthKeys: fields.strengthOptions
          .map((option) => option.querySelector(".segment-strength-toggle"))
          .filter((toggle) => toggle && !toggle.disabled && toggle.checked)
          .map((toggle) => toggle.dataset.strengthKey),
      };
    });

    return {
      version: 1,
      printLayout: DOMRefs.printLayoutSelect.value,
      form: {
        drugName: DOMRefs.form.drugName.value,
        taperStartDate: DOMRefs.form.taperStartDate.value,
        startingDose: DOMRefs.form.startingDose.value,
        dosageForm: DOMRefs.form.dosageForm.value,
        doseChangePerStep: DOMRefs.form.doseChangePerStep.value,
        doseChangeDirection: DOMRefs.doseChangeDirectionInput.value,
        daysPerStep: DOMRefs.form.daysPerStep.value,
        totalSteps: DOMRefs.form.totalSteps.value,
        finalDose: DOMRefs.finalDoseInput.value,
        totalStepsMode: DOMRefs.totalStepsModeInput.value,
        standardTaperDriver: UISetup.getStandardTaperDriver(),
        useCustomOverride: DOMRefs.useCustomOverrideInput.value,
        allowPartialTablets: DOMRefs.form.allowPartialTablets.checked,
        tabletStrengthA: DOMRefs.form.tabletStrengthA.value,
        tabletStrengthB: DOMRefs.form.tabletStrengthB.value,
        tabletStrengthC: DOMRefs.form.tabletStrengthC.value,
      },
      customSegments,
    };
  },

  normalizeImportedState(state) {
    if (!state || typeof state !== "object") {
      throw new Error("Configuration code is missing data.");
    }

    return {
      printLayout: state.printLayout === "portrait" ? "portrait" : "landscape",
      form: {
        ...APP_CONFIG.defaults.taper,
        ...(state.form || {}),
      },
      customSegments: Array.isArray(state.customSegments) ? state.customSegments : [],
    };
  },
};

const Strengths = {
  create(inputValues) {
    return [
      {
        key: "A",
        value: inputValues.tabletStrengthA ?? null,
        allowPartial: Boolean(inputValues.allowPartialTablets),
      },
      {
        key: "B",
        value: inputValues.tabletStrengthB ?? null,
        allowPartial: Boolean(inputValues.allowPartialTablets),
      },
      {
        key: "C",
        value: inputValues.tabletStrengthC ?? null,
        allowPartial: Boolean(inputValues.allowPartialTablets),
      },
      ].filter((strength) => strength.value != null && strength.value > 0);
  },

  filterByKeys(strengths, allowedKeys = null) {
    if (!Array.isArray(allowedKeys)) {
      return strengths;
    }

    const allowed = new Set(allowedKeys);
    return strengths.filter((strength) => allowed.has(strength.key));
  },

  validateOrder(strengths) {
    const errors = [];
    for (let index = 0; index < strengths.length - 1; index += 1) {
      if (strengths[index].value < strengths[index + 1].value) {
        errors.push(
          `Strength ${strengths[index].key} should be greater than or equal to strength ${strengths[index + 1].key}.`
        );
      }
    }
    return errors;
  },

  getTabletStep(strength) {
    return strength.allowPartial ? 0.5 : 1;
  },

  buildEmptyAllocationResult(strengths) {
    return {
      allocations: strengths.map((strength) => ({
        key: strength.key,
        strength: strength.value,
        count: 0,
        usedPartial: false,
      })),
      finalRemainder: 0,
      usedPartialTablet: false,
    };
  },

  buildAllocationResult(strengths, counts, finalRemainder) {
    const allocations = strengths.map((strength, index) => ({
      key: strength.key,
      strength: strength.value,
      count: counts[index] ?? 0,
      usedPartial: !Number.isInteger(counts[index] ?? 0),
    }));

    return {
      allocations,
      finalRemainder: NumberUtils.sanitizeRemainder(finalRemainder),
      usedPartialTablet: allocations.some((item) => item.usedPartial),
    };
  },

  allocateDoseWholeOnly(doseMg, strengths) {
    let remaining = NumberUtils.isNearZero(doseMg) ? 0 : doseMg;
    const counts = strengths.map((strength) => {
      const count = Math.floor(remaining / strength.value);
      remaining -= count * strength.value;
      return count;
    });

    return Strengths.buildAllocationResult(strengths, counts, remaining);
  },

  compareCandidates(candidateA, candidateB) {
    if (!candidateA) return candidateB;
    if (!candidateB) return candidateA;

    if (candidateA.partialUnits !== candidateB.partialUnits) {
      return candidateA.partialUnits < candidateB.partialUnits ? candidateA : candidateB;
    }

    if (candidateA.totalTablets !== candidateB.totalTablets) {
      return candidateA.totalTablets < candidateB.totalTablets ? candidateA : candidateB;
    }

    for (let index = 0; index < candidateA.counts.length; index += 1) {
      if (candidateA.counts[index] !== candidateB.counts[index]) {
        return candidateA.counts[index] > candidateB.counts[index] ? candidateA : candidateB;
      }
    }

    return candidateA;
  },

  createCandidate(counts) {
    return {
      counts,
      partialUnits: counts.filter((count) => !Number.isInteger(count)).length,
      totalTablets: counts.reduce((sum, count) => sum + count, 0),
    };
  },

  findExactAllocationWithPartials(doseMg, strengths) {
    const targetDose = NumberUtils.isNearZero(doseMg) ? 0 : doseMg;
    let bestCandidate = null;

    const search = (index, remaining, counts) => {
      if (index === strengths.length) {
        if (NumberUtils.isNearZero(remaining)) {
          bestCandidate = Strengths.compareCandidates(bestCandidate, Strengths.createCandidate(counts));
        }
        return;
      }

      const strength = strengths[index];
      const step = Strengths.getTabletStep(strength);
      const maxCount = Math.floor(targetDose / strength.value / step) * step;

      for (let count = maxCount; count >= 0; count -= step) {
        const doseUsed = count * strength.value;
        const nextRemaining = NumberUtils.sanitizeRemainder(remaining - doseUsed);
        if (nextRemaining < -APP_CONFIG.epsilon) {
          continue;
        }

        search(index + 1, nextRemaining, [...counts, Number(NumberUtils.sanitizeRemainder(count))]);
      }
    };

    search(0, targetDose, []);
    return bestCandidate ? Strengths.buildAllocationResult(strengths, bestCandidate.counts, 0) : null;
  },

  allocateDose(doseMg, strengths, options = {}) {
    if (NumberUtils.isNearZero(doseMg)) {
      return Strengths.buildEmptyAllocationResult(strengths);
    }

    const wholeOnlyResult = Strengths.allocateDoseWholeOnly(doseMg, strengths);
    if (!options.allowPartialTablets || NumberUtils.isNearZero(wholeOnlyResult.finalRemainder)) {
      return wholeOnlyResult;
    }

    const exactPartialResult = Strengths.findExactAllocationWithPartials(doseMg, strengths);
    return exactPartialResult || wholeOnlyResult;
  },

  buildTabletLines(allocations, dosageForm = "tablet") {
    return allocations
      .filter((item) => item.count > 0)
      .map(
        (item) =>
          `${Formatters.tabletCount(item.count)} ${Formatters.plural(
            MedicationTerms.singular(dosageForm),
            item.count
          )} of ${Formatters.dose(item.strength)}`
      );
  },

  buildCompactSummary(allocations, doseMg) {
    const parts = allocations
      .filter((item) => item.count > 0)
      .map((item) => `${Formatters.tabletCount(item.count)} x ${Formatters.dose(item.strength)}`);

    if (parts.length === 0 && NumberUtils.isNearZero(doseMg)) {
      return "";
    }

    return parts.join("\n");
  },
};

const Validation = {
  validateInputs(inputs) {
    const errors = [];

    if (!inputs.taperStartDate) errors.push("Taper start date is required.");
    if (inputs.startingDose == null || inputs.startingDose < 0) {
      errors.push("Starting daily dose must be 0 or greater.");
    }
    if (!inputs.useCustomOverride) {
      if (inputs.doseChangePerStep == null) {
        errors.push("Dose change per step is required.");
      }
      if (inputs.daysPerStep == null || inputs.daysPerStep < 1) {
        errors.push("Days per step must be at least 1.");
      }
      if (inputs.totalStepsMode === "discontinuation") {
        if (inputs.doseChangePerStep == null || inputs.doseChangePerStep >= 0) {
          errors.push("Til discontinuation requires a reducing dose change greater than 0.");
        } else if (inputs.totalSteps == null || inputs.totalSteps < 0) {
          errors.push("Unable to calculate total taper steps til discontinuation.");
        }
      } else if (inputs.standardTaperDriver === "finalDose") {
        if (inputs.finalDose == null || inputs.finalDose < 0) {
          errors.push("Final dose must be 0 or greater.");
        } else if (inputs.doseChangePerStep === 0 && inputs.finalDose !== inputs.startingDose) {
          errors.push("A zero dose change can only support a final dose equal to the starting dose.");
        } else if (inputs.doseChangePerStep < 0 && inputs.finalDose > inputs.startingDose) {
          errors.push("For a reducing taper, final dose cannot be greater than the starting dose.");
        } else if (inputs.doseChangePerStep > 0 && inputs.finalDose < inputs.startingDose) {
          errors.push("For an increasing taper, final dose cannot be less than the starting dose.");
        } else if (inputs.totalSteps == null || inputs.totalSteps < 1) {
          errors.push("Unable to calculate total taper steps for the requested final dose.");
        }
      } else if (inputs.totalSteps == null || inputs.totalSteps < 0) {
        errors.push("Total taper steps must be 0 or greater.");
      }
    }
    if (inputs.minDoseClamp == null || inputs.maxDoseClamp == null) {
      errors.push("Minimum and maximum dose clamps are required.");
    } else if (inputs.minDoseClamp > inputs.maxDoseClamp) {
      errors.push("Minimum dose clamp cannot be greater than maximum dose clamp.");
    }
    if (inputs.tabletStrengthA == null || inputs.tabletStrengthA <= 0) {
      errors.push("Strength A is required and must be greater than 0.");
    }
    if (inputs.tabletStrengthB != null && inputs.tabletStrengthB <= 0) {
      errors.push("Strength B must be greater than 0 if provided.");
    }
    if (inputs.tabletStrengthC != null && inputs.tabletStrengthC <= 0) {
      errors.push("Strength C must be greater than 0 if provided.");
    }

    errors.push(...Strengths.validateOrder(inputs.strengths));

    if (inputs.useCustomOverride) {
      const usedSegments = inputs.customSegments.filter(Boolean);
      if (usedSegments.length === 0) {
        errors.push("At least one complete custom taper row is required when custom override is enabled.");
      }
    }

    return errors;
  },

  validateCustomSegment(segment, index) {
    const errors = [];
    if (segment.repeats < 0 || segment.repeats > 100) {
      errors.push(`Custom row ${index + 1} repeats must be between 0 and 100.`);
    }

    if (segment.repeats === 0) {
      return errors;
    }

    if (segment.daysPerStep < 1 || segment.daysPerStep > 365) {
      errors.push(`Custom row ${index + 1} days per step must be between 1 and 365.`);
    }
    if (index !== 0 && (segment.doseChange < -1000 || segment.doseChange > 1000)) {
      errors.push(`Custom row ${index + 1} dose change must be between -1000 and 1000 mg.`);
    }
    return errors;
  },
};

const Templates = {
  standardStepIndex(dayIndex, daysPerStep) {
    return Math.floor(dayIndex / daysPerStep);
  },

  totalTaperDays(inputs) {
    if (inputs.useCustomOverride) {
      return inputs.customSegments.reduce(
        (sum, segment) => (segment ? sum + segment.daysPerStep * segment.repeats : sum),
        0
      );
    }
    return inputs.daysPerStep * inputs.totalSteps;
  },

  startedRepeatCount(dayIndex, segmentStartDay, daysPerStep, repeats) {
    if (daysPerStep <= 0 || repeats <= 0) return 0;
    if (dayIndex < segmentStartDay) return 0;
    return Math.min(repeats, Math.floor((dayIndex - segmentStartDay) / daysPerStep) + 1);
  },

  standardDose(dayIndex, inputs) {
    const stepIndex = Templates.standardStepIndex(dayIndex, inputs.daysPerStep);
    const isZeroFinalDoseStop =
      inputs.totalStepsMode !== "discontinuation" &&
      inputs.standardTaperDriver === "finalDose" &&
      inputs.finalDose != null &&
      inputs.finalDose <= 0 &&
      inputs.doseChangePerStep < 0;

    if (isZeroFinalDoseStop) {
      const rawDose = inputs.startingDose + stepIndex * inputs.doseChangePerStep;
      return NumberUtils.clamp(rawDose, inputs.minDoseClamp, inputs.maxDoseClamp);
    }

    if (
      inputs.totalStepsMode !== "discontinuation" &&
      inputs.standardTaperDriver === "finalDose" &&
      inputs.finalDose != null &&
      inputs.totalSteps != null &&
      inputs.totalSteps > 0 &&
      stepIndex >= Math.max(inputs.totalSteps - 1, 0)
    ) {
      return NumberUtils.clamp(inputs.finalDose, inputs.minDoseClamp, inputs.maxDoseClamp);
    }

    const rawDose = inputs.startingDose + stepIndex * inputs.doseChangePerStep;
    return NumberUtils.clamp(rawDose, inputs.minDoseClamp, inputs.maxDoseClamp);
  },

  customDose(dayIndex, inputs) {
    let dose = inputs.startingDose;
    let segmentStartDay = 0;

    for (const segment of inputs.customSegments) {
      if (!segment || segment.repeats <= 0 || segment.daysPerStep <= 0) continue;
      const startedCount = Templates.startedRepeatCount(
        dayIndex,
        segmentStartDay,
        segment.daysPerStep,
        segment.repeats
      );
      dose += startedCount * segment.doseChange;
      segmentStartDay += segment.daysPerStep * segment.repeats;
    }

    return NumberUtils.clamp(dose, inputs.minDoseClamp, inputs.maxDoseClamp);
  },

  activeCustomSegment(dayIndex, customSegments) {
    let segmentStartDay = 0;

    for (const segment of customSegments) {
      if (!segment || segment.repeats <= 0 || segment.daysPerStep <= 0) continue;

      const segmentDuration = segment.daysPerStep * segment.repeats;
      if (dayIndex >= segmentStartDay && dayIndex < segmentStartDay + segmentDuration) {
        return segment;
      }

      segmentStartDay += segmentDuration;
    }

    return null;
  },

  doseForDay(dayIndex, inputs) {
    return inputs.useCustomOverride
      ? Templates.customDose(dayIndex, inputs)
      : Templates.standardDose(dayIndex, inputs);
  },
};

const ScheduleLogic = {
  strengthsForDay(dayIndex, inputs) {
    if (!inputs.useCustomOverride) {
      return inputs.strengths;
    }

    const activeSegment = Templates.activeCustomSegment(dayIndex, inputs.customSegments);
    if (!activeSegment) {
      return inputs.strengths;
    }

    return Strengths.filterByKeys(inputs.strengths, activeSegment.allowedStrengthKeys);
  },

  getExactnessWarning(doseMg, allocation) {
    if (NumberUtils.isNearZero(doseMg)) return "";
    return NumberUtils.isNearZero(allocation.finalRemainder) ? "" : Messages.exactDoseWarning();
  },

  buildInstructionParts(doseMg, allocation, warning, dosageForm = "tablet") {
    if (NumberUtils.isNearZero(doseMg)) {
      return {
        totalLine: "",
        tabletLines: [],
        warningLine: "",
      };
    }

    return {
      totalLine: `Total = ${Formatters.dose(doseMg)}`,
      tabletLines: Strengths.buildTabletLines(allocation.allocations, dosageForm),
      warningLine: warning || "",
    };
  },

  buildPrintableText(doseMg, allocation, warning, dosageForm = "tablet") {
    const instructionParts = ScheduleLogic.buildInstructionParts(
      doseMg,
      allocation,
      warning,
      dosageForm
    );
    return [instructionParts.totalLine, ...instructionParts.tabletLines, instructionParts.warningLine]
      .filter(Boolean)
      .join("\n");
  },

  buildScheduleRow(date, dayIndex, inputs) {
    const doseMg = Templates.doseForDay(dayIndex, inputs);
    const stepIndex = Templates.standardStepIndex(dayIndex, inputs.daysPerStep);
    const strengthsForDay = ScheduleLogic.strengthsForDay(dayIndex, inputs);
    const allocation = Strengths.allocateDose(doseMg, strengthsForDay, {
      allowPartialTablets: inputs.allowPartialTablets,
    });
    const warning = ScheduleLogic.getExactnessWarning(doseMg, allocation);
    const instructionParts = ScheduleLogic.buildInstructionParts(
      doseMg,
      allocation,
      warning,
      inputs.dosageForm
    );
    const printableText = ScheduleLogic.buildPrintableText(
      doseMg,
      allocation,
      warning,
      inputs.dosageForm
    );

    return {
      date,
      dayIndex,
      stepIndex,
      doseMg,
      strengths: strengthsForDay,
      allocations: allocation.allocations,
      warning,
      instructionParts,
      printableText,
      compactTabletSummary: Strengths.buildCompactSummary(allocation.allocations, doseMg),
    };
  },

  generateScheduleRows(inputs) {
    const rows = [];
    const totalDays = Templates.totalTaperDays(inputs);

    for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
      const date = DateUtils.addDays(inputs.taperStartDate, dayIndex);
      const row = ScheduleLogic.buildScheduleRow(date, dayIndex, inputs);
      if (NumberUtils.isNearZero(row.doseMg)) {
        break;
      }
      rows.push(row);
    }

    return rows;
  },

  generateSummary(inputs, scheduleRows) {
    const totalTaperDays = scheduleRows.length;
    const taperEndDate = scheduleRows.length ? scheduleRows[scheduleRows.length - 1].date : null;

    const totals = scheduleRows.reduce(
      (summary, row) => {
        row.allocations.forEach((allocation) => {
          summary.tabletTotals[allocation.key] += allocation.count;
        });
        summary.totalMgDispensed += row.doseMg;
        summary.warningDays += row.warning ? 1 : 0;
        return summary;
      },
      {
        tabletTotals: { A: 0, B: 0, C: 0 },
        totalMgDispensed: 0,
        warningDays: 0,
      }
    );

    return {
      totalTaperDays,
      taperEndDate,
      lastDailyDose: scheduleRows.length ? scheduleRows[scheduleRows.length - 1].doseMg : null,
      tabletTotals: totals.tabletTotals,
      totalMgDispensed: totals.totalMgDispensed,
      warningDays: totals.warningDays,
    };
  },
};

const CalendarLogic = {
  hasVisibleCalendarDose(row) {
    return Boolean(row) && !NumberUtils.isNearZero(row.doseMg);
  },

  cellHasVisibleMonthDose(cell) {
    return cell.inCurrentMonth && CalendarLogic.hasVisibleCalendarDose(cell.scheduleRow);
  },

  generateCalendarDateCells(monthStart) {
    const gridStart = DateUtils.gridStartDate(monthStart);
    return Array.from({ length: 42 }, (_, index) => DateUtils.addDays(gridStart, index));
  },

  generateMonthlyCalendar(monthStart, scheduleRows) {
    const monthEndExclusive = DateUtils.monthEndExclusive(monthStart);
    const cells = CalendarLogic.generateCalendarDateCells(monthStart);
    const weeks = [];

    for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
      const weekCells = cells.slice(weekIndex * 7, weekIndex * 7 + 7).map((date) => {
        const scheduleRow = scheduleRows.find((row) => DateUtils.isSameDate(row.date, date)) || null;
        return {
          date,
          inCurrentMonth: date >= monthStart && date < monthEndExclusive,
          scheduleRow,
        };
      });
      weeks.push(weekCells);
    }

    return { monthStart, monthEndExclusive, weeks };
  },

  monthHasVisibleContent(calendar) {
    return calendar.weeks.flat().some((cell) => CalendarLogic.cellHasVisibleMonthDose(cell));
  },

  generateCalendarRange(inputs, scheduleRows) {
    const taperStartMonth = DateUtils.firstDayOfMonth(inputs.taperStartDate);
    const lastVisibleScheduleRow = [...scheduleRows]
      .reverse()
      .find((row) => CalendarLogic.hasVisibleCalendarDose(row));
    const rangeEndDate = lastVisibleScheduleRow
      ? lastVisibleScheduleRow.date
      : inputs.taperStartDate;
    const taperEndMonth = DateUtils.firstDayOfMonth(rangeEndDate);

    let currentMonth = taperStartMonth;
    const finalMonth = taperEndMonth;
    const months = [];

    while (currentMonth <= finalMonth) {
      months.push(CalendarLogic.generateMonthlyCalendar(currentMonth, scheduleRows));
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }

    return months.filter(CalendarLogic.monthHasVisibleContent);
  },
};

const ViewModelFactory = {
  buildTabletSummaryItems(inputs, summary) {
    const tabletItems = [];

    if (inputs.tabletStrengthA != null) {
      tabletItems.push({
        label: MedicationTerms.usageLabel(inputs.tabletStrengthA, inputs.dosageForm),
        value: Formatters.tabletCount(summary.tabletTotals.A),
        level: "secondary",
      });
    }

    if (inputs.tabletStrengthB != null) {
      tabletItems.push({
        label: MedicationTerms.usageLabel(inputs.tabletStrengthB, inputs.dosageForm),
        value: Formatters.tabletCount(summary.tabletTotals.B),
        level: "secondary",
      });
    }

    if (inputs.tabletStrengthC != null) {
      tabletItems.push({
        label: MedicationTerms.usageLabel(inputs.tabletStrengthC, inputs.dosageForm),
        value: Formatters.tabletCount(summary.tabletTotals.C),
        level: "secondary",
      });
    }

    return tabletItems;
  },

  buildSummaryItems(inputs, summary, mode) {
    return {
      primary: [
        { label: "Start Date", value: Formatters.date(inputs.taperStartDate), level: "primary" },
        {
          label: "End Date",
          value: summary.taperEndDate ? Formatters.date(summary.taperEndDate) : "-",
          level: "primary",
        },
        { label: "Total Days", value: String(summary.totalTaperDays), level: "primary" },
        {
          label: "Final Daily Dose",
          value: summary.lastDailyDose == null ? "-" : Formatters.dose(summary.lastDailyDose),
          level: "primary",
        },
      ],
      secondary: [
        ...ViewModelFactory.buildTabletSummaryItems(inputs, summary),
        { label: "Total Dispensed", value: Formatters.dose(summary.totalMgDispensed), level: "secondary" },
        {
          label: "Warning Count",
          value: String(summary.warningDays),
          level: "secondary",
          tone: summary.warningDays > 0 ? "warning" : "success",
        },
        { label: "Schedule Type", value: mode, level: "secondary", badge: true, tone: "neutral" },
      ],
    };
  },

  create(inputs, scheduleRows, summary, calendars) {
    const mode = Messages.modeLabel(inputs.useCustomOverride);
    const calendarStatus =
      scheduleRows.length === 0 || calendars.length === 0
        ? APP_CONFIG.messages.noSchedule
        : `Showing ${calendars.length} month${calendars.length === 1 ? "" : "s"} from ${Formatters.monthYear(
            calendars[0].monthStart
          )} through ${Formatters.monthYear(calendars[calendars.length - 1].monthStart)}.`;

    return {
      summaryItems: ViewModelFactory.buildSummaryItems(inputs, summary, mode),
      calendarTitle:
        calendars.length === 0
          ? "Month Calendar"
          : calendars.length > 1
          ? `Month Calendar - ${calendars.length} months`
          : `Month Calendar - ${Formatters.monthYear(calendars[0].monthStart)}`,
      calendarStatus,
      calendars,
      scheduleRows,
    };
  },
};

const DOMRefs = {
  form: document.getElementById("taper-form"),
  formGrid: document.querySelector(".form-grid"),
  generateButton: document.getElementById("generate-button"),
  stickyActionBar: document.getElementById("sticky-action-bar"),
  stickyGenerateButton: document.getElementById("sticky-generate-button"),
  addSegmentRowButton: document.getElementById("add-segment-row"),
  customOverridePanel: document.getElementById("custom-override-panel"),
  customSegmentBody: document.getElementById("custom-segment-body"),
  segmentRowTemplate: document.getElementById("segment-row-template"),
  validationSummary: document.getElementById("validation-summary"),
  summaryGrid: document.getElementById("summary-grid"),
  printCalendarRoot: document.getElementById("print-calendar-root"),
  calendarTitle: document.getElementById("calendar-title"),
  calendarStatus: document.getElementById("calendar-status"),
  calendarMonths: document.getElementById("calendar-months"),
  calendarList: document.getElementById("calendar-list"),
  tableCard: document.getElementById("table-card"),
  scheduleBody: document.getElementById("schedule-body"),
  printButton: document.getElementById("print-button"),
  printLayoutSelect: document.getElementById("print-layout"),
  stickyPrintButton: document.getElementById("sticky-print-button"),
  stickyPrintLayoutSelect: document.getElementById("sticky-print-layout"),
  loadExampleButton: document.getElementById("load-example-button"),
  configCodeInput: document.getElementById("config-code-input"),
  applyConfigCodeButton: document.getElementById("apply-config-code-button"),
  configCodeStatus: document.getElementById("config-code-status"),
  generatedConfigCode: document.getElementById("generated-config-code"),
  generateConfigCodeButton: document.getElementById("generate-config-code-button"),
  copyConfigCodeButton: document.getElementById("copy-config-code-button"),
  calendarViewInputs: [...document.querySelectorAll('input[name="calendarView"]')],
  strengthLabelA: document.getElementById("strength-label-a"),
  strengthLabelB: document.getElementById("strength-label-b"),
  strengthLabelC: document.getElementById("strength-label-c"),
  partialUnitsLabel: document.getElementById("partial-units-label"),
  partialUnitsRow: document.getElementById("partial-units-label")?.closest(".checkbox-row"),
  scheduleStrengthColA: document.getElementById("schedule-strength-col-a"),
  scheduleStrengthColB: document.getElementById("schedule-strength-col-b"),
  scheduleStrengthColC: document.getElementById("schedule-strength-col-c"),
  doseChangeDirectionInput: document.getElementById("dose-change-direction"),
  doseDirectionButtons: [...document.querySelectorAll("[data-dose-direction]")],
  taperModeButtons: [...document.querySelectorAll("[data-taper-mode]")],
  useCustomOverrideInput: document.getElementById("use-custom-override"),
  primaryTaperGroup: document.querySelector(".group-primary-taper"),
  finalDoseInput: document.getElementById("final-dose"),
  totalStepsModeInput: document.getElementById("total-steps-mode"),
  totalStepsDiscontinuationButton: document.getElementById("total-steps-discontinuation"),
};

const InputFactory = {
  signedDoseChange(value, direction) {
    if (value == null) return null;
    const magnitude = Math.abs(value);
    return direction === "increase" ? magnitude : -magnitude;
  },

  finalDoseForSteps(startingDose, signedDoseChange, totalSteps) {
    if (startingDose == null || signedDoseChange == null || totalSteps == null || totalSteps < 1) {
      return null;
    }

    let effectiveSteps = totalSteps;

    if (signedDoseChange < 0) {
      const discontinuationSteps = InputFactory.stepsTilDiscontinuation(startingDose, signedDoseChange);
      if (discontinuationSteps != null) {
        effectiveSteps = Math.min(totalSteps, discontinuationSteps);
      }
    }

    const lastStepIndex = Math.max(effectiveSteps - 1, 0);
    return NumberUtils.clamp(
      startingDose + lastStepIndex * signedDoseChange,
      Number(APP_CONFIG.defaults.taper.minDoseClamp),
      Number(APP_CONFIG.defaults.taper.maxDoseClamp)
    );
  },

  stepsTilDiscontinuation(startingDose, signedDoseChange) {
    if (startingDose == null || signedDoseChange == null) return null;
    if (startingDose <= 0) return 0;
    if (signedDoseChange >= 0) return null;
    return Math.ceil(Math.abs(startingDose / signedDoseChange));
  },

  stepsForRequestedFinalDose(startingDose, signedDoseChange, finalDose) {
    if (startingDose == null || signedDoseChange == null || finalDose == null) return null;
    if (signedDoseChange === 0) {
      return finalDose === startingDose ? 1 : null;
    }

    const isReducing = signedDoseChange < 0;
    if (isReducing && finalDose > startingDose) return null;
    if (!isReducing && finalDose < startingDose) return null;

    if (isReducing && finalDose <= 0) {
      return InputFactory.stepsTilDiscontinuation(startingDose, signedDoseChange);
    }

    const doseDistance = Math.abs(finalDose - startingDose);
    return Math.max(1, Math.ceil(doseDistance / Math.abs(signedDoseChange)) + 1);
  },

  stepsForFinalDose(startingDose, signedDoseChange, finalDose) {
    if (startingDose == null || signedDoseChange == null || finalDose == null) return null;
    if (signedDoseChange === 0) return finalDose === startingDose ? 1 : null;
    if (signedDoseChange < 0 && finalDose <= 0) {
      return InputFactory.stepsTilDiscontinuation(startingDose, signedDoseChange);
    }

    const rawSteps = (finalDose - startingDose) / signedDoseChange + 1;
    if (!Number.isFinite(rawSteps)) return null;
    return Math.max(1, Math.round(rawSteps));
  },

  readDateInputs() {
    return {
      taperStartDate: InputFactory.parseDate(DOMRefs.form.taperStartDate.value),
    };
  },

  readNumericInputs() {
    return {
      startingDose: NumberUtils.parseOptionalNumber(DOMRefs.form.startingDose.value),
      doseChangeMagnitude: NumberUtils.parseOptionalNumber(DOMRefs.form.doseChangePerStep.value),
      daysPerStep: NumberUtils.parseOptionalInteger(DOMRefs.form.daysPerStep.value),
      manualTotalSteps: NumberUtils.parseOptionalInteger(DOMRefs.form.totalSteps.value),
      requestedFinalDose: NumberUtils.parseOptionalNumber(DOMRefs.form.finalDose.value),
      tabletStrengthA: NumberUtils.parseOptionalNumber(DOMRefs.form.tabletStrengthA.value),
      tabletStrengthB: NumberUtils.parseOptionalNumber(DOMRefs.form.tabletStrengthB.value),
      tabletStrengthC: NumberUtils.parseOptionalNumber(DOMRefs.form.tabletStrengthC.value),
      minDoseClamp: Number(APP_CONFIG.defaults.taper.minDoseClamp),
      maxDoseClamp: Number(APP_CONFIG.defaults.taper.maxDoseClamp),
    };
  },

  readCustomSegments(errors) {
    return [...DOMRefs.customSegmentBody.querySelectorAll("tr")].map((row, index) => {
      const fields = UISetup.getCustomRowFields(row);
      const doseChangeValue = index === 0 ? "0" : fields.doseChangeInput.value.trim();
      const daysValue = fields.daysPerStepInput.value.trim();
      const repeatsValue = index === 0 ? "1" : fields.repeatsInput.value.trim();
      const allBlank = index === 0
        ? daysValue === ""
        : doseChangeValue === "" && daysValue === "" && repeatsValue === "";

      if (allBlank) return null;

      const segment = {
        doseChange: index === 0 ? 0 : NumberUtils.parseOptionalNumber(doseChangeValue),
        daysPerStep: daysValue === "" ? 0 : NumberUtils.parseOptionalInteger(daysValue),
        repeats: index === 0 ? 1 : repeatsValue === "" ? 1 : NumberUtils.parseOptionalInteger(repeatsValue),
        allowedStrengthKeys: fields.strengthOptions
          .map((option) => option.querySelector(".segment-strength-toggle"))
          .filter((toggle) => toggle && !toggle.disabled && toggle.checked)
          .map((toggle) => toggle.dataset.strengthKey),
      };

      if (
        segment.doseChange == null ||
        segment.daysPerStep == null ||
        segment.repeats == null
      ) {
        errors.push(`Custom row ${index + 1} must have dose change, days per step, and repeats.`);
        return null;
      }

      errors.push(...Validation.validateCustomSegment(segment, index));
      return segment;
    });
  },

  create() {
    const errors = [];
    const baseInputs = {
      ...InputFactory.readDateInputs(),
      ...InputFactory.readNumericInputs(),
      useCustomOverride: DOMRefs.useCustomOverrideInput.value === "true",
      allowPartialTablets: DOMRefs.form.allowPartialTablets.checked,
      drugName: (DOMRefs.form.drugName.value || APP_CONFIG.defaults.taper.drugName).trim(),
      dosageForm: MedicationTerms.normalizeDosageForm(DOMRefs.form.dosageForm.value),
      doseChangeDirection: DOMRefs.form.doseChangeDirection.value || APP_CONFIG.defaults.taper.doseChangeDirection,
      totalStepsMode: DOMRefs.form.totalStepsMode.value || APP_CONFIG.defaults.taper.totalStepsMode,
      standardTaperDriver: UISetup.getStandardTaperDriver(),
    };

    baseInputs.doseChangePerStep = InputFactory.signedDoseChange(
      baseInputs.doseChangeMagnitude,
      baseInputs.doseChangeDirection
    );
    baseInputs.totalSteps =
      baseInputs.totalStepsMode === "discontinuation"
        ? InputFactory.stepsTilDiscontinuation(baseInputs.startingDose, baseInputs.doseChangePerStep)
        : baseInputs.standardTaperDriver === "finalDose"
        ? InputFactory.stepsForRequestedFinalDose(
            baseInputs.startingDose,
            baseInputs.doseChangePerStep,
            baseInputs.requestedFinalDose
          )
        : baseInputs.manualTotalSteps;
    baseInputs.finalDose =
      baseInputs.totalStepsMode === "discontinuation"
        ? InputFactory.finalDoseForSteps(
            baseInputs.startingDose,
            baseInputs.doseChangePerStep,
            baseInputs.totalSteps
          )
        : baseInputs.standardTaperDriver === "finalDose"
        ? baseInputs.requestedFinalDose
        : InputFactory.finalDoseForSteps(
            baseInputs.startingDose,
            baseInputs.doseChangePerStep,
            baseInputs.totalSteps
          );

    const customSegments = InputFactory.readCustomSegments(errors);
    const strengths = Strengths.create(baseInputs);
    const inputs = {
      ...baseInputs,
      customSegments,
      strengths,
    };

    errors.push(...Validation.validateInputs(inputs));
    return { inputs, errors };
  },

  parseDate(value) {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    return year && month && day ? new Date(year, month - 1, day) : null;
  },
};

const DOMBuilders = {
  summaryValueMarkup(item) {
    if (item.badge) {
      return `<span class="summary-value-badge summary-value-badge--${Html.escape(item.tone || "neutral")}">${Html.escape(
        item.value
      )}</span>`;
    }

    return Html.escape(item.value);
  },

  summaryItemMarkup(item) {
    const classes = ["summary-item", `summary-item--${item.level || "secondary"}`];
    if (item.tone) {
      classes.push(`summary-item--${item.tone}`);
    }

    return `
      <dl class="${classes.join(" ")}">
        <dt>${Html.escape(item.label)}</dt>
        <dd>${DOMBuilders.summaryValueMarkup(item)}</dd>
      </dl>
    `;
  },

  summaryMarkup(groups) {
    return `
      <div class="summary-group summary-group--primary">
        ${groups.primary.map(DOMBuilders.summaryItemMarkup).join("")}
      </div>
      <div class="summary-group summary-group--secondary">
        ${groups.secondary.map(DOMBuilders.summaryItemMarkup).join("")}
      </div>
    `;
  },

  calendarCellMarkup(cell) {
    const classes = ["calendar-cell"];
    if (!cell.inCurrentMonth) classes.push("outside-month");
    if (cell.scheduleRow?.warning) classes.push("warning");

    const hasVisibleDose = cell.scheduleRow && !NumberUtils.isNearZero(cell.scheduleRow.doseMg);
    const totalLine = hasVisibleDose ? cell.scheduleRow.instructionParts.totalLine : "";
    const tabletLines = hasVisibleDose ? cell.scheduleRow.instructionParts.tabletLines.join("\n") : "";
    const warning = hasVisibleDose ? cell.scheduleRow.instructionParts.warningLine : "";

    return `
      <article class="${classes.join(" ")}">
        <div class="calendar-date">${cell.date.getDate()}</div>
        <div class="calendar-dose">${Html.escape(totalLine)}</div>
        <div class="calendar-combo">${Html.escape(tabletLines)}</div>
        ${warning ? `<div class="calendar-warning">${Html.escape(warning)}</div>` : ""}
      </article>
    `;
  },

  monthMarkup(calendar) {
    const activeDayCount = calendar.weeks.flat().filter(CalendarLogic.cellHasVisibleMonthDose).length;

    return `
      <section class="calendar-month">
        <div class="month-header">
          <h3>${Html.escape(Formatters.monthYear(calendar.monthStart))}</h3>
          <p class="month-meta">${activeDayCount} taper day${activeDayCount === 1 ? "" : "s"} in this month</p>
        </div>
        <div class="month-grid-wrap">
          <div class="month-grid">
            <div class="month-weekdays" aria-hidden="true">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>
            <div class="calendar-grid">
              ${calendar.weeks.flat().map(DOMBuilders.calendarCellMarkup).join("")}
            </div>
          </div>
        </div>
      </section>
    `;
  },

  listMarkup(scheduleRows) {
    return `
      <div class="calendar-list-grid">
        ${scheduleRows
          .map(
            (row) => {
              const hasVisibleDose = !NumberUtils.isNearZero(row.doseMg);

              return `
              <article class="list-card ${row.warning ? "warning" : ""}">
                <h4>${Html.escape(Formatters.date(row.date))}</h4>
                ${
                  hasVisibleDose
                    ? `<p><strong>Total dose:</strong> ${Html.escape(Formatters.dose(row.doseMg))}</p>
                <p><strong>Strength breakdown:</strong><br>${Html.escape(row.compactTabletSummary).replace(
                  /\n/g,
                  "<br>"
                )}</p>
                ${row.warning ? `<p><strong>Warning:</strong> ${Html.escape(row.warning)}</p>` : ""}`
                    : ""
                }
              </article>
            `;
            }
          )
          .join("")}
      </div>
    `;
  },

  scheduleTableMarkup(scheduleRows) {
    return scheduleRows
      .map((row) => {
        const warningBadge = row.warning
          ? `<span class="badge badge-warning">${Html.escape(row.warning)}</span>`
          : "";

        const counts = Object.fromEntries(row.allocations.map((item) => [item.key, item.count]));

        return `
          <tr class="${row.warning ? "row-warning" : ""}">
            <td>${Html.escape(Formatters.date(row.date))}</td>
            <td>${row.dayIndex}</td>
            <td>${row.stepIndex}</td>
            <td>${Html.escape(Formatters.dose(row.doseMg))}</td>
            <td>${Html.escape(Formatters.tabletCount(counts.A ?? 0))}</td>
            <td>${Html.escape(Formatters.tabletCount(counts.B ?? 0))}</td>
            <td>${Html.escape(Formatters.tabletCount(counts.C ?? 0))}</td>
            <td>${warningBadge}</td>
            <td class="pre">${Html.escape(row.printableText)}</td>
          </tr>
        `;
      })
      .join("");
  },

  printCalendarMarkup(calendars) {
    return calendars.map(DOMBuilders.printMonthMarkup).join("");
  },

  printMonthMarkup(calendar) {
    const monthLabel = Formatters.monthYear(calendar.monthStart);
    const weekdayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const printableWeeks = DOMBuilders.getPrintableWeeks(calendar);
    const printDisclaimer =
      "Disclaimer: This tool generates medication taper calendars based on user-entered information. Output should be reviewed and verified by the prescribing clinician before use. Confirm dosing, duration, and patient instructions according to clinical judgment, product labeling, and institutional protocols.";
    const printableDrugName = MedicationTerms.printableTitle(
      DOMRefs.form?.drugName?.value || APP_CONFIG.defaults.taper.drugName
    );

    return `
      <section class="print-month">
        <div class="print-page">
          <div class="print-header">
            <div class="print-header-left">
              <div class="print-title-block">
                <div>${Html.escape(printableDrugName.toUpperCase())}</div>
                <div>DOSAGE</div>
                <div>CALENDAR</div>
              </div>
              <div class="print-signature-box">
                <div class="print-signature-box-line"></div>
                <div class="print-signature-box-label">Licensed Healthcare Professional Signature</div>
              </div>
            </div>
            <div class="print-label-box">Place Prescription Label Here</div>
          </div>

          <div class="print-calendar-shell" aria-label="${Html.escape(monthLabel)} printable calendar">
            <div class="print-month-banner">${Html.escape(monthLabel)}</div>
            <div class="print-weekday-row">
              ${weekdayLabels
                .map((label) => `<div class="print-weekday-cell">${Html.escape(label)}</div>`)
                .join("")}
            </div>
            <div class="print-calendar-grid">
              ${printableWeeks.flat().map(DOMBuilders.printCalendarCellMarkup).join("")}
            </div>
          </div>

          <div class="print-signoff">
            <div class="print-signature-line"></div>
            <div class="print-signature-label">Licensed Healthcare Professional Signature</div>
          </div>

          <div class="print-disclaimer">
            ${Html.escape(printDisclaimer)}
          </div>
        </div>
      </section>
    `;
  },

  getPrintableWeeks(calendar) {
    const weeks = [...calendar.weeks];

    while (weeks.length > 4) {
      const lastWeek = weeks[weeks.length - 1];
      const hasCurrentMonthDay = lastWeek.some((cell) => cell.inCurrentMonth);
      if (hasCurrentMonthDay) break;
      weeks.pop();
    }

    return weeks;
  },

  printCalendarCellMarkup(cell) {
    const classes = ["print-day-cell"];
    if (!cell.inCurrentMonth) classes.push("is-outside-month");

    return `
      <div class="${classes.join(" ")}">
        <div class="print-date-tab">${Html.escape(DOMBuilders.printDateLabel(cell))}</div>
        <div class="print-day-body">${DOMBuilders.printDayBody(cell)}</div>
      </div>
    `;
  },

  printDateLabel(cell) {
    if (!cell.inCurrentMonth) return "";
    return `${Formatters.monthName(cell.date)} ${cell.date.getDate()}`;
  },

  printDayBody(cell) {
    if (!cell.inCurrentMonth || !cell.scheduleRow || NumberUtils.isNearZero(cell.scheduleRow.doseMg)) {
      return "";
    }

    const hasThreeStrengths = cell.scheduleRow.instructionParts.tabletLines.length >= 3;
    const lines = [
      `<div class="print-dose-line${hasThreeStrengths ? " print-dose-line--dense" : ""}">${Html.escape(
        cell.scheduleRow.instructionParts.totalLine
      )}</div>`,
    ];

    if (cell.scheduleRow.instructionParts.tabletLines.length > 0) {
      lines.push(
        `<div class="print-tablet-line${hasThreeStrengths ? " print-tablet-line--dense" : ""}">${Html.escape(
          cell.scheduleRow.instructionParts.tabletLines.join("\n")
        ).replace(/\n/g, "<br>")}</div>`
      );
    }

    if (cell.scheduleRow.instructionParts.warningLine) {
      lines.push(
        `<div class="print-day-warning">${Html.escape(cell.scheduleRow.instructionParts.warningLine)}</div>`
      );
    }

    return lines.join("");
  },
};

const DOMRenderer = {
  stickyActionObserver: null,

  renderValidationErrors(errors) {
    if (errors.length === 0) {
      DOMRefs.validationSummary.classList.remove("active");
      DOMRefs.validationSummary.innerHTML = "";
      return;
    }

    DOMRefs.validationSummary.classList.add("active");
    DOMRefs.validationSummary.innerHTML = `<strong>Please review the following:</strong><ul>${errors
      .map((error) => `<li>${Html.escape(error)}</li>`)
      .join("")}</ul>`;
  },

  clearResults() {
    DOMRefs.summaryGrid.innerHTML = "";
    DOMRefs.printCalendarRoot.innerHTML = "";
    DOMRefs.calendarTitle.textContent = "Month Calendar";
    DOMRefs.calendarStatus.innerHTML = "";
    DOMRefs.calendarMonths.innerHTML = "";
    DOMRefs.calendarList.innerHTML = "";
    DOMRefs.scheduleBody.innerHTML = "";
  },

  setConfigCodeStatus(message = "", tone = "") {
    if (!DOMRefs.configCodeStatus) return;
    DOMRefs.configCodeStatus.textContent = message;
    DOMRefs.configCodeStatus.classList.toggle("is-error", tone === "error");
  },

  render(viewModel) {
    const summaryMarkup = DOMBuilders.summaryMarkup(viewModel.summaryItems);
    DOMRefs.summaryGrid.innerHTML = summaryMarkup;
    DOMRefs.calendarTitle.textContent = viewModel.calendarTitle;
    DOMRefs.calendarStatus.textContent = viewModel.calendarStatus;
    DOMRefs.calendarMonths.innerHTML = viewModel.calendars.map(DOMBuilders.monthMarkup).join("");
    DOMRefs.printCalendarRoot.innerHTML = DOMBuilders.printCalendarMarkup(viewModel.calendars);
    DOMRefs.calendarList.innerHTML = DOMBuilders.listMarkup(viewModel.scheduleRows);
    DOMRefs.scheduleBody.innerHTML = DOMBuilders.scheduleTableMarkup(viewModel.scheduleRows);
  },

  syncLayoutControls() {
    const selectedView =
      DOMRefs.calendarViewInputs.find((input) => input.checked)?.value || "calendar";

    DOMRenderer.syncPrintLayout();
    document.body.classList.toggle("printing", false);
    DOMRefs.calendarMonths.classList.toggle("hidden", selectedView === "list");
    DOMRefs.calendarList.classList.toggle("hidden", selectedView === "calendar");
    DOMRefs.tableCard.classList.toggle("hidden", selectedView === "calendar");
  },

  syncPrintLayout() {
    const layout = DOMRefs.printLayoutSelect?.value === "landscape" ? "landscape" : "portrait";
    const pageStyleId = "dynamic-print-page-style";
    let pageStyle = document.getElementById(pageStyleId);

    if (!pageStyle) {
      pageStyle = document.createElement("style");
      pageStyle.id = pageStyleId;
      document.head.appendChild(pageStyle);
    }

    pageStyle.textContent = `@media print { @page { size: letter ${layout}; margin: 0.35in; } }`;
    document.body.classList.toggle("print-layout-landscape", layout === "landscape");
    document.body.classList.toggle("print-layout-portrait", layout !== "landscape");
  },

  syncPrintLayoutControls(source = "main") {
    const sourceSelect =
      source === "sticky" ? DOMRefs.stickyPrintLayoutSelect : DOMRefs.printLayoutSelect;
    const targetSelect =
      source === "sticky" ? DOMRefs.printLayoutSelect : DOMRefs.stickyPrintLayoutSelect;

    if (sourceSelect && targetSelect) {
      targetSelect.value = sourceSelect.value;
    }

    DOMRenderer.syncPrintLayout();
  },

  syncStickyActionBarVisibility() {
    if (!DOMRefs.generateButton || !DOMRefs.stickyActionBar) return;

    const buttonRect = DOMRefs.generateButton.getBoundingClientRect();
    const isPastGenerateButton = buttonRect.bottom < 12;

    document.body.classList.toggle("sticky-actions-visible", isPastGenerateButton);
    DOMRefs.stickyActionBar.setAttribute("aria-hidden", String(!isPastGenerateButton));
  },

  initializeStickyActionBar() {
    if (!DOMRefs.generateButton || !DOMRefs.stickyActionBar) return;

    if (DOMRenderer.stickyActionObserver) {
      DOMRenderer.stickyActionObserver.disconnect();
      DOMRenderer.stickyActionObserver = null;
    }

    if (!("IntersectionObserver" in window)) {
      window.addEventListener("scroll", DOMRenderer.syncStickyActionBarVisibility, { passive: true });
      window.addEventListener("resize", DOMRenderer.syncStickyActionBarVisibility);
      DOMRenderer.syncStickyActionBarVisibility();
      return;
    }

    DOMRenderer.stickyActionObserver = new IntersectionObserver(
      ([entry]) => {
        const isPastGenerateButton = !entry.isIntersecting;
        document.body.classList.toggle("sticky-actions-visible", isPastGenerateButton);
        DOMRefs.stickyActionBar.setAttribute("aria-hidden", String(!isPastGenerateButton));
      },
      {
        threshold: 0,
        rootMargin: "-12px 0px 0px 0px",
      }
    );

    DOMRenderer.stickyActionObserver.observe(DOMRefs.generateButton);
  },
};

const UISetup = {
  getStandardTaperDriver() {
    return DOMRefs.form.dataset.standardTaperDriver || APP_CONFIG.defaults.taper.standardTaperDriver;
  },

  setStandardTaperDriver(driver) {
    DOMRefs.form.dataset.standardTaperDriver = driver === "finalDose" ? "finalDose" : "steps";
  },

  writeNumericInputValue(input, value) {
    input.value =
      value == null || Number.isNaN(value)
        ? ""
        : Number.isInteger(value)
        ? String(value)
        : value.toFixed(1).replace(/\.0$/, "");
  },

  syncDoseChangeDirectionButtons() {
    const activeDirection =
      DOMRefs.doseChangeDirectionInput.value || APP_CONFIG.defaults.taper.doseChangeDirection;

    DOMRefs.doseDirectionButtons.forEach((button) => {
      const isActive = button.dataset.doseDirection === activeDirection;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  },

  syncTaperModeButtons() {
    const activeMode = DOMRefs.useCustomOverrideInput.value === "true" ? "advanced" : "standard";

    DOMRefs.taperModeButtons.forEach((button) => {
      const isActive = button.dataset.taperMode === activeMode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  },

  syncStandardTaperDerivedFields(source = "steps") {
    const startingDose = NumberUtils.parseOptionalNumber(DOMRefs.form.startingDose.value);
    const signedDoseChange = InputFactory.signedDoseChange(
      NumberUtils.parseOptionalNumber(DOMRefs.form.doseChangePerStep.value),
      DOMRefs.doseChangeDirectionInput.value || APP_CONFIG.defaults.taper.doseChangeDirection
    );
    const isDiscontinuationMode =
      (DOMRefs.totalStepsModeInput.value || APP_CONFIG.defaults.taper.totalStepsMode) ===
      "discontinuation";

    const effectiveSource = source === "auto" ? UISetup.getStandardTaperDriver() : source;

    if (isDiscontinuationMode) {
      const discontinuationSteps = InputFactory.stepsTilDiscontinuation(startingDose, signedDoseChange);
      const discontinuationFinalDose = InputFactory.finalDoseForSteps(
        startingDose,
        signedDoseChange,
        discontinuationSteps
      );
      UISetup.writeNumericInputValue(DOMRefs.finalDoseInput, discontinuationFinalDose);
      return;
    }

    if (effectiveSource === "finalDose") {
      const finalDose = NumberUtils.parseOptionalNumber(DOMRefs.finalDoseInput.value);
      const totalSteps = InputFactory.stepsForRequestedFinalDose(
        startingDose,
        signedDoseChange,
        finalDose
      );
      UISetup.writeNumericInputValue(DOMRefs.form.totalSteps, totalSteps);
      return;
    }

    const totalSteps = NumberUtils.parseOptionalInteger(DOMRefs.form.totalSteps.value);
    const finalDose = InputFactory.finalDoseForSteps(startingDose, signedDoseChange, totalSteps);
    UISetup.writeNumericInputValue(DOMRefs.finalDoseInput, finalDose);
  },

  syncTotalStepsMode() {
    const isDiscontinuationMode =
      (DOMRefs.totalStepsModeInput.value || APP_CONFIG.defaults.taper.totalStepsMode) ===
      "discontinuation";

    DOMRefs.totalStepsDiscontinuationButton.classList.toggle("is-active", isDiscontinuationMode);
    DOMRefs.totalStepsDiscontinuationButton.setAttribute(
      "aria-pressed",
      String(isDiscontinuationMode)
    );

    if (isDiscontinuationMode) {
      if (!DOMRefs.form.totalSteps.disabled) {
        DOMRefs.form.totalSteps.dataset.manualValue = DOMRefs.form.totalSteps.value;
      }
      DOMRefs.form.totalSteps.value = "";
      DOMRefs.form.totalSteps.disabled = true;
      UISetup.syncStandardTaperDerivedFields("auto");
      return;
    }

    DOMRefs.form.totalSteps.disabled = false;
    if (DOMRefs.form.totalSteps.value === "" && DOMRefs.form.totalSteps.dataset.manualValue) {
      DOMRefs.form.totalSteps.value = DOMRefs.form.totalSteps.dataset.manualValue;
    }
    UISetup.syncStandardTaperDerivedFields("auto");
  },

  syncMedicationLabels() {
    const dosageForm = MedicationTerms.normalizeDosageForm(DOMRefs.form.dosageForm.value);
    const allowPartialVisible = dosageForm === "tablet";

    DOMRefs.strengthLabelA.textContent = MedicationTerms.strengthLabel("A", dosageForm);
    DOMRefs.strengthLabelB.textContent = MedicationTerms.strengthLabel("B", dosageForm);
    DOMRefs.strengthLabelC.textContent = MedicationTerms.strengthLabel("C", dosageForm);
    DOMRefs.partialUnitsLabel.textContent = MedicationTerms.partialLabel(dosageForm);
    DOMRefs.scheduleStrengthColA.textContent = MedicationTerms.scheduleColumnLabel("A", dosageForm);
    DOMRefs.scheduleStrengthColB.textContent = MedicationTerms.scheduleColumnLabel("B", dosageForm);
    DOMRefs.scheduleStrengthColC.textContent = MedicationTerms.scheduleColumnLabel("C", dosageForm);

    if (DOMRefs.partialUnitsRow) {
      DOMRefs.partialUnitsRow.hidden = !allowPartialVisible;
    }

    if (!allowPartialVisible) {
      DOMRefs.form.allowPartialTablets.checked = false;
    }

    UISetup.syncCustomSegmentStrengthSelectors();
  },

  syncCustomOverrideVisibility() {
    const isVisible = DOMRefs.useCustomOverrideInput.value === "true";
    DOMRefs.customOverridePanel.classList.toggle("is-hidden", !isVisible);
    DOMRefs.customOverridePanel.setAttribute("aria-hidden", String(!isVisible));
    DOMRefs.primaryTaperGroup.classList.toggle("is-hidden", isVisible);
    DOMRefs.formGrid.classList.toggle("is-advanced-mode", isVisible);
    UISetup.syncTaperModeButtons();
    if (!isVisible) {
      UISetup.closeCustomSegmentSettings();
    }
  },

  getCustomRowFields(row) {
    return {
      doseChangeInput: row.querySelector(".segment-dose-change"),
      daysPerStepInput: row.querySelector(".segment-days-per-step"),
      repeatsInput: row.querySelector(".segment-repeats"),
      startDoseEl: row.querySelector(".helper-dose-start"),
      endDoseEl: row.querySelector(".helper-dose-end"),
      settingsButton: row.querySelector(".segment-settings-button"),
      settingsPopover: row.querySelector(".segment-settings-popover"),
      settingsTitle: row.querySelector(".segment-settings-title"),
      settingsEmpty: row.querySelector(".segment-settings-empty"),
      strengthOptions: [...row.querySelectorAll(".segment-strength-option")],
      deleteButton: row.querySelector(".row-delete-button"),
    };
  },

  createCustomSegmentRow() {
    return DOMRefs.segmentRowTemplate.content.firstElementChild.cloneNode(true);
  },

  appendCustomSegmentRow(values = ["", "", ""]) {
    if (DOMRefs.customSegmentBody.querySelectorAll("tr").length >= APP_CONFIG.maxCustomSegmentCount) {
      return false;
    }

    const row = UISetup.createCustomSegmentRow();
    const fields = UISetup.getCustomRowFields(row);

    fields.doseChangeInput.value = values[0] ?? "";
    fields.daysPerStepInput.value = values[1] ?? "";
    fields.repeatsInput.value = values[2] ?? "";

    DOMRefs.customSegmentBody.appendChild(row);
    UISetup.syncCustomSegmentStrengthSelectors();
    return true;
  },

  reindexCustomSegmentRows() {
    [...DOMRefs.customSegmentBody.querySelectorAll("tr")].forEach((row, index) => {
      const fields = UISetup.getCustomRowFields(row);
      const isFirstSegment = index === 0;

      row.querySelector(".segment-label").textContent = `Segment ${index + 1}`;
      row.classList.toggle("is-first-segment", isFirstSegment);
      fields.settingsButton.setAttribute("aria-label", `Settings for Segment ${index + 1}`);
      fields.deleteButton.setAttribute("aria-label", `Delete Segment ${index + 1}`);
      fields.doseChangeInput.name = `customDoseChange${index}`;
      fields.daysPerStepInput.name = `customDaysPerStep${index}`;
      fields.repeatsInput.name = `customRepeats${index}`;
      fields.doseChangeInput.disabled = isFirstSegment;
      fields.repeatsInput.disabled = isFirstSegment;

      if (isFirstSegment) {
        fields.doseChangeInput.value = "0";
        fields.repeatsInput.value = "1";
      }
    });
  },

  syncCustomSegmentStrengthSelectors() {
    const dosageForm = MedicationTerms.normalizeDosageForm(DOMRefs.form.dosageForm.value);
    const settingsTitle = `${MedicationTerms.titleSingular(dosageForm)} strengths used`;
    const strengthValues = {
      A: NumberUtils.parseOptionalNumber(DOMRefs.form.tabletStrengthA.value),
      B: NumberUtils.parseOptionalNumber(DOMRefs.form.tabletStrengthB.value),
      C: NumberUtils.parseOptionalNumber(DOMRefs.form.tabletStrengthC.value),
    };

    [...DOMRefs.customSegmentBody.querySelectorAll("tr")].forEach((row) => {
      const fields = UISetup.getCustomRowFields(row);
      fields.settingsTitle.textContent = settingsTitle;
      let visibleOptionCount = 0;

      fields.strengthOptions.forEach((option) => {
        const checkbox = option.querySelector(".segment-strength-toggle");
        const label = option.querySelector(".segment-strength-option-label");
        const strengthKey = option.dataset.strengthKey;
        const strengthValue = strengthValues[strengthKey];
        const hasStrength = strengthValue != null;

        option.classList.toggle("is-hidden", !hasStrength);
        checkbox.disabled = !hasStrength;

        if (!hasStrength) {
          checkbox.checked = false;
          label.textContent = "";
          return;
        }

        label.textContent = Formatters.dose(strengthValue);
        visibleOptionCount += 1;

        if (!checkbox.dataset.userSet) {
          checkbox.checked = true;
        }
      });

      fields.settingsEmpty.hidden = visibleOptionCount > 0;
    });
  },

  closeCustomSegmentSettings(exceptRow = null) {
    [...DOMRefs.customSegmentBody.querySelectorAll("tr")].forEach((row) => {
      if (exceptRow && row === exceptRow) return;
      const fields = UISetup.getCustomRowFields(row);
      fields.settingsPopover.hidden = true;
      fields.settingsButton.classList.remove("is-active");
      fields.settingsButton.setAttribute("aria-expanded", "false");
    });
  },

  syncCustomSegmentDoseHelpers() {
    const startingDose = NumberUtils.parseOptionalNumber(DOMRefs.form.startingDose.value);
    const rows = [...DOMRefs.customSegmentBody.querySelectorAll("tr")];

    if (startingDose == null) {
      rows.forEach((row) => {
        row.querySelector(".helper-dose-start").textContent = "";
        row.querySelector(".helper-dose-end").textContent = "";
      });
      return;
    }

    let runningDose = NumberUtils.clamp(
      startingDose,
      Number(APP_CONFIG.defaults.taper.minDoseClamp),
      Number(APP_CONFIG.defaults.taper.maxDoseClamp)
    );

    rows.forEach((row) => {
      const fields = UISetup.getCustomRowFields(row);
      const isFirstSegment = row.classList.contains("is-first-segment");
      const doseChange = isFirstSegment
        ? 0
        : NumberUtils.parseOptionalNumber(fields.doseChangeInput.value.trim());
      const repeatsValue = isFirstSegment ? "1" : fields.repeatsInput.value.trim();
      const repeats = isFirstSegment ? 1 : repeatsValue === "" ? 1 : NumberUtils.parseOptionalInteger(repeatsValue);

      if (doseChange == null || repeats == null) {
        fields.startDoseEl.textContent = "";
        fields.endDoseEl.textContent = "";
        return;
      }

      const startDose = runningDose;
      const endDose = NumberUtils.clamp(
        startDose + doseChange * repeats,
        Number(APP_CONFIG.defaults.taper.minDoseClamp),
        Number(APP_CONFIG.defaults.taper.maxDoseClamp)
      );

      fields.startDoseEl.textContent = Formatters.dose(startDose);
      fields.endDoseEl.textContent = Formatters.dose(endDose);
      runningDose = endDose;
    });
  },

  rebuildCustomSegmentRows(valuesList = []) {
    DOMRefs.customSegmentBody.innerHTML = "";

    valuesList.slice(0, APP_CONFIG.maxCustomSegmentCount).forEach((values) => UISetup.appendCustomSegmentRow(values));

    if (valuesList.length === 0) {
      for (
        let index = 0;
        index < Math.min(APP_CONFIG.defaultCustomSegmentCount, APP_CONFIG.maxCustomSegmentCount);
        index += 1
      ) {
        UISetup.appendCustomSegmentRow();
      }
    }

    UISetup.reindexCustomSegmentRows();
    UISetup.syncCustomSegmentDoseHelpers();
    UISetup.syncCustomSegmentControls();
  },

  syncCustomSegmentControls() {
    const rowCount = DOMRefs.customSegmentBody.querySelectorAll("tr").length;
    DOMRefs.addSegmentRowButton.disabled = rowCount >= APP_CONFIG.maxCustomSegmentCount;
  },

  applyFormDefaults(taperDefaults, customSegments = []) {
    const now = new Date();
    DOMRefs.form.taperStartDate.value = DateUtils.toDateInputValue(now);
    DOMRefs.form.totalSteps.dataset.manualValue = "";
    UISetup.setStandardTaperDriver(taperDefaults.standardTaperDriver);

    Object.entries(taperDefaults).forEach(([key, value]) => {
      if (DOMRefs.form[key]) {
        DOMRefs.form[key].value = value;
      }
    });

      UISetup.rebuildCustomSegmentRows(customSegments);
      UISetup.syncDoseChangeDirectionButtons();
      UISetup.syncTotalStepsMode();
      UISetup.syncStandardTaperDerivedFields("steps");
      UISetup.syncTaperModeButtons();
      UISetup.syncMedicationLabels();
      UISetup.syncCustomOverrideVisibility();
    },

  applyImportedConfiguration(state) {
    const normalized = ConfigCode.normalizeImportedState(state);

    DOMRefs.printLayoutSelect.value = normalized.printLayout;
    DOMRefs.stickyPrintLayoutSelect.value = normalized.printLayout;
    DOMRenderer.syncPrintLayoutControls("main");

    UISetup.applyFormDefaults(normalized.form, []);

    DOMRefs.useCustomOverrideInput.value = normalized.form.useCustomOverride === "true" ? "true" : "false";
    UISetup.setStandardTaperDriver(normalized.form.standardTaperDriver);

    const importedSegments = normalized.customSegments.map((segment, index) => [
      index === 0 ? "0" : segment?.doseChange ?? "",
      segment?.daysPerStep ?? "",
      index === 0 ? "1" : segment?.repeats ?? "",
    ]);

    UISetup.rebuildCustomSegmentRows(importedSegments);

    [...DOMRefs.customSegmentBody.querySelectorAll("tr")].forEach((row, index) => {
      const importedSegment = normalized.customSegments[index];
      if (!importedSegment) return;

      const fields = UISetup.getCustomRowFields(row);
      fields.strengthOptions.forEach((option) => {
        const toggle = option.querySelector(".segment-strength-toggle");
        if (!toggle || toggle.disabled) return;

        if (Array.isArray(importedSegment.allowedStrengthKeys)) {
          toggle.checked = importedSegment.allowedStrengthKeys.includes(toggle.dataset.strengthKey);
          toggle.dataset.userSet = "true";
        }
      });
    });

    UISetup.syncDoseChangeDirectionButtons();
    UISetup.syncMedicationLabels();
    UISetup.syncTotalStepsMode();
    UISetup.syncCustomOverrideVisibility();
    UISetup.syncCustomSegmentDoseHelpers();
    UISetup.syncCustomSegmentControls();
    UISetup.syncStandardTaperDerivedFields("auto");
  },

  applyDefaults() {
    UISetup.applyFormDefaults(APP_CONFIG.defaults.taper, []);
  },

  loadExample() {
    UISetup.applyFormDefaults(APP_CONFIG.defaults.exampleTaper, APP_CONFIG.defaults.exampleCustomSegments);
  },
};

const AppController = {
  initialize() {
      UISetup.applyDefaults();
      DOMRefs.form.addEventListener("submit", AppController.handleGenerate);
      DOMRefs.form.addEventListener("reset", AppController.handleReset);
      DOMRefs.taperModeButtons.forEach((button) =>
        button.addEventListener("click", AppController.handleTaperModeClick)
      );
      DOMRefs.form.dosageForm.addEventListener("change", UISetup.syncMedicationLabels);
    DOMRefs.doseDirectionButtons.forEach((button) =>
      button.addEventListener("click", AppController.handleDoseDirectionClick)
    );
    DOMRefs.totalStepsDiscontinuationButton.addEventListener(
      "click",
      AppController.handleTotalStepsModeToggle
    );
      DOMRefs.loadExampleButton.addEventListener("click", AppController.handleLoadExample);
      DOMRefs.generateConfigCodeButton.addEventListener("click", AppController.handleGenerateConfigCode);
      DOMRefs.copyConfigCodeButton.addEventListener("click", AppController.handleCopyConfigCode);
      DOMRefs.applyConfigCodeButton.addEventListener("click", AppController.handleApplyConfigCode);
      DOMRefs.configCodeInput.addEventListener("keydown", AppController.handleConfigCodeKeydown);
        DOMRefs.printLayoutSelect.addEventListener("change", () => DOMRenderer.syncPrintLayoutControls("main"));
        DOMRefs.stickyPrintLayoutSelect.addEventListener("change", () =>
          DOMRenderer.syncPrintLayoutControls("sticky")
        );
      DOMRefs.form.startingDose.addEventListener("input", UISetup.syncCustomSegmentDoseHelpers);
      DOMRefs.form.startingDose.addEventListener("input", () => UISetup.syncStandardTaperDerivedFields("auto"));
      DOMRefs.form.tabletStrengthA.addEventListener("input", UISetup.syncCustomSegmentStrengthSelectors);
      DOMRefs.form.tabletStrengthB.addEventListener("input", UISetup.syncCustomSegmentStrengthSelectors);
      DOMRefs.form.tabletStrengthC.addEventListener("input", UISetup.syncCustomSegmentStrengthSelectors);
      DOMRefs.form.doseChangePerStep.addEventListener("input", () => UISetup.syncStandardTaperDerivedFields("auto"));
      DOMRefs.form.totalSteps.addEventListener("input", AppController.handleTotalStepsInput);
      DOMRefs.finalDoseInput.addEventListener("input", AppController.handleFinalDoseInput);
      DOMRefs.customSegmentBody.addEventListener("input", UISetup.syncCustomSegmentDoseHelpers);
      DOMRefs.customSegmentBody.addEventListener("click", AppController.handleCustomSegmentRowClick);
      DOMRefs.customSegmentBody.addEventListener("change", AppController.handleCustomSegmentSettingsChange);
      DOMRefs.addSegmentRowButton.addEventListener("click", AppController.handleAddCustomRow);
        DOMRefs.printButton.addEventListener("click", AppController.handlePrint);
        DOMRefs.stickyPrintButton.addEventListener("click", AppController.handlePrint);
        DOMRefs.calendarViewInputs.forEach((input) =>
          input.addEventListener("change", DOMRenderer.syncLayoutControls)
        );
        document.addEventListener("click", AppController.handleDocumentClick);
        window.addEventListener("beforeprint", () => document.body.classList.add("printing"));
        window.addEventListener("afterprint", () => document.body.classList.remove("printing"));
        DOMRenderer.syncPrintLayoutControls("main");
        DOMRenderer.initializeStickyActionBar();
        AppController.render();
    },

  handleGenerate(event) {
    event.preventDefault();
    AppController.render();
  },

  handleReset() {
    window.setTimeout(() => {
      UISetup.applyDefaults();
      AppController.render();
    }, 0);
  },

  handleLoadExample() {
    UISetup.loadExample();
    AppController.render();
  },

  handleGenerateConfigCode() {
    try {
      const code = ConfigCode.encode(ConfigCode.captureCurrentState());
      DOMRefs.generatedConfigCode.value = code;
      DOMRenderer.setConfigCodeStatus("Configuration code generated.");
    } catch (error) {
      DOMRenderer.setConfigCodeStatus("Unable to generate configuration code.", "error");
    }
  },

  async handleCopyConfigCode() {
    const code = DOMRefs.generatedConfigCode.value.trim();
    if (!code) {
      DOMRenderer.setConfigCodeStatus("Generate a configuration code first.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      DOMRenderer.setConfigCodeStatus("Configuration code copied.");
    } catch (error) {
      DOMRenderer.setConfigCodeStatus("Unable to copy configuration code.", "error");
    }
  },

  handleApplyConfigCode() {
    const code = DOMRefs.configCodeInput.value.trim();
    if (!code) {
      DOMRenderer.setConfigCodeStatus("Paste a configuration code first.", "error");
      return;
    }

    try {
      const state = ConfigCode.decode(code);
      UISetup.applyImportedConfiguration(state);
      DOMRenderer.setConfigCodeStatus("Configuration code applied.");
      AppController.render();
    } catch (error) {
      DOMRenderer.setConfigCodeStatus("That configuration code could not be loaded.", "error");
    }
  },

  handleConfigCodeKeydown(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    AppController.handleApplyConfigCode();
  },

  handleAddCustomRow() {
    const added = UISetup.appendCustomSegmentRow();
    if (!added) return;
    UISetup.reindexCustomSegmentRows();
    UISetup.syncCustomSegmentDoseHelpers();
    UISetup.syncCustomSegmentControls();
  },

    handleDoseDirectionClick(event) {
      const direction = event.currentTarget.dataset.doseDirection;
      if (!direction) return;

      DOMRefs.doseChangeDirectionInput.value = direction;
      UISetup.syncDoseChangeDirectionButtons();
      UISetup.syncStandardTaperDerivedFields("auto");
    },

    handleTaperModeClick(event) {
      const mode = event.currentTarget.dataset.taperMode === "advanced" ? "true" : "false";
      DOMRefs.useCustomOverrideInput.value = mode;
      UISetup.syncCustomOverrideVisibility();
    },

    handleTotalStepsInput() {
      UISetup.setStandardTaperDriver("steps");
      UISetup.syncStandardTaperDerivedFields("steps");
    },

    handleTotalStepsModeToggle() {
      DOMRefs.totalStepsModeInput.value =
        DOMRefs.totalStepsModeInput.value === "discontinuation" ? "manual" : "discontinuation";
      UISetup.syncTotalStepsMode();
    },

    handleFinalDoseInput() {
      UISetup.setStandardTaperDriver("finalDose");
      if (DOMRefs.totalStepsModeInput.value === "discontinuation") {
        DOMRefs.totalStepsModeInput.value = "manual";
        UISetup.syncTotalStepsMode();
      }

    UISetup.syncStandardTaperDerivedFields("finalDose");
  },

  handleCustomSegmentRowClick(event) {
    const settingsButton = event.target.closest(".segment-settings-button");
    if (settingsButton) {
      const row = settingsButton.closest("tr");
      const fields = UISetup.getCustomRowFields(row);
      const shouldOpen = fields.settingsPopover.hidden;

      UISetup.closeCustomSegmentSettings(shouldOpen ? row : null);
      fields.settingsPopover.hidden = !shouldOpen;
      fields.settingsButton.classList.toggle("is-active", shouldOpen);
      fields.settingsButton.setAttribute("aria-expanded", String(shouldOpen));
      return;
    }

    const deleteButton = event.target.closest(".row-delete-button");
    if (!deleteButton) return;

    deleteButton.closest("tr")?.remove();
    UISetup.reindexCustomSegmentRows();
    UISetup.syncCustomSegmentDoseHelpers();
    UISetup.syncCustomSegmentControls();
    UISetup.closeCustomSegmentSettings();
  },

  handleCustomSegmentSettingsChange(event) {
    const toggle = event.target.closest(".segment-strength-toggle");
    if (!toggle) return;
    toggle.dataset.userSet = "true";
  },

  handleDocumentClick(event) {
    if (event.target.closest(".row-action-cell")) return;
    UISetup.closeCustomSegmentSettings();
  },

  handlePrint() {
    DOMRenderer.syncPrintLayout();
    document.body.classList.add("printing");
    window.print();
  },

  render() {
    const { inputs, errors } = InputFactory.create();

    if (errors.length > 0) {
      DOMRenderer.renderValidationErrors(errors);
      DOMRenderer.clearResults();
      return;
    }

    DOMRenderer.renderValidationErrors([]);
    const scheduleRows = ScheduleLogic.generateScheduleRows(inputs);
    const summary = ScheduleLogic.generateSummary(inputs, scheduleRows);
    const calendars = CalendarLogic.generateCalendarRange(inputs, scheduleRows);
    const viewModel = ViewModelFactory.create(inputs, scheduleRows, summary, calendars);

      DOMRenderer.render(viewModel);
      DOMRenderer.syncLayoutControls();
      DOMRenderer.syncStickyActionBarVisibility();
    },
  };

AppController.initialize();
