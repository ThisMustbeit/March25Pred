const APP_CONFIG = {
  epsilon: 1e-6,
  defaultCustomSegmentCount: 3,
  maxCustomSegmentCount: 8,
  drugs: {
    prednisone: {
      id: "prednisone",
      name: "Prednisone",
      units: "mg",
      strengths: ["A", "B", "C"],
    },
  },
  messages: {
    exactDoseWarning: "Dose not exact with selected tablet strengths",
    noSchedule: "No taper days to display yet.",
    customMode: "Custom taper override",
    standardMode: "Standard step taper",
  },
  defaults: {
    taper: {
      startingDose: "50",
      doseChangePerStep: "-4",
      daysPerStep: "2",
      totalSteps: "30",
      minDoseClamp: "0",
      maxDoseClamp: "1000",
      tabletStrengthA: "5",
      tabletStrengthB: "",
      tabletStrengthC: "1",
    },
    customSegments: [
      ["0", "7", "1"],
      ["-10", "7", "1"],
      ["-5", "14", "10"],
    ],
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

  validateOrder(strengths) {
    const errors = [];
    for (let index = 0; index < strengths.length - 1; index += 1) {
      if (strengths[index].value < strengths[index + 1].value) {
        errors.push(
          `Tablet strength ${strengths[index].key} should be greater than or equal to tablet strength ${strengths[index + 1].key}.`
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

  buildTabletLines(allocations) {
    return allocations
      .filter((item) => item.count > 0)
      .map(
        (item) =>
          `${Formatters.tabletCount(item.count)} ${Formatters.plural("tablet", item.count)} of ${Formatters.dose(
            item.strength
          )}`
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
    if (inputs.doseChangePerStep == null) {
      errors.push("Dose change per step is required.");
    }
    if (inputs.daysPerStep == null || inputs.daysPerStep < 1) {
      errors.push("Days per step must be at least 1.");
    }
    if (inputs.totalSteps == null || inputs.totalSteps < 0) {
      errors.push("Total taper steps must be 0 or greater.");
    }
    if (inputs.minDoseClamp == null || inputs.maxDoseClamp == null) {
      errors.push("Minimum and maximum dose clamps are required.");
    } else if (inputs.minDoseClamp > inputs.maxDoseClamp) {
      errors.push("Minimum dose clamp cannot be greater than maximum dose clamp.");
    }
    if (inputs.tabletStrengthA == null || inputs.tabletStrengthA <= 0) {
      errors.push("Tablet strength A is required and must be greater than 0.");
    }
    if (inputs.tabletStrengthB != null && inputs.tabletStrengthB <= 0) {
      errors.push("Tablet strength B must be greater than 0 if provided.");
    }
    if (inputs.tabletStrengthC != null && inputs.tabletStrengthC <= 0) {
      errors.push("Tablet strength C must be greater than 0 if provided.");
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
    if (segment.daysPerStep < 1 || segment.daysPerStep > 365) {
      errors.push(`Custom row ${index + 1} days per step must be between 1 and 365.`);
    }
    if (segment.repeats < 1 || segment.repeats > 100) {
      errors.push(`Custom row ${index + 1} repeats must be between 1 and 100.`);
    }
    if (segment.doseChange < -1000 || segment.doseChange > 1000) {
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
    if (dayIndex < segmentStartDay) return 0;
    return Math.min(repeats, Math.floor((dayIndex - segmentStartDay) / daysPerStep) + 1);
  },

  standardDose(dayIndex, inputs) {
    const stepIndex = Templates.standardStepIndex(dayIndex, inputs.daysPerStep);
    const rawDose = inputs.startingDose + stepIndex * inputs.doseChangePerStep;
    return NumberUtils.clamp(rawDose, inputs.minDoseClamp, inputs.maxDoseClamp);
  },

  customDose(dayIndex, inputs) {
    let dose = inputs.startingDose;
    let segmentStartDay = 0;

    for (const segment of inputs.customSegments) {
      if (!segment) continue;
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

  doseForDay(dayIndex, inputs) {
    return inputs.useCustomOverride
      ? Templates.customDose(dayIndex, inputs)
      : Templates.standardDose(dayIndex, inputs);
  },
};

const ScheduleLogic = {
  getExactnessWarning(doseMg, allocation) {
    if (NumberUtils.isNearZero(doseMg)) return "";
    return NumberUtils.isNearZero(allocation.finalRemainder) ? "" : Messages.exactDoseWarning();
  },

  buildInstructionParts(doseMg, allocation, warning) {
    if (NumberUtils.isNearZero(doseMg)) {
      return {
        totalLine: "",
        tabletLines: [],
        warningLine: "",
      };
    }

    return {
      totalLine: `Total = ${Formatters.dose(doseMg)}`,
      tabletLines: Strengths.buildTabletLines(allocation.allocations),
      warningLine: warning || "",
    };
  },

  buildPrintableText(doseMg, allocation, warning) {
    const instructionParts = ScheduleLogic.buildInstructionParts(doseMg, allocation, warning);
    return [instructionParts.totalLine, ...instructionParts.tabletLines, instructionParts.warningLine]
      .filter(Boolean)
      .join("\n");
  },

  buildScheduleRow(date, dayIndex, inputs) {
    const doseMg = Templates.doseForDay(dayIndex, inputs);
    const stepIndex = Templates.standardStepIndex(dayIndex, inputs.daysPerStep);
    const allocation = Strengths.allocateDose(doseMg, inputs.strengths, {
      allowPartialTablets: inputs.allowPartialTablets,
    });
    const warning = ScheduleLogic.getExactnessWarning(doseMg, allocation);
    const instructionParts = ScheduleLogic.buildInstructionParts(doseMg, allocation, warning);
    const printableText = ScheduleLogic.buildPrintableText(doseMg, allocation, warning);

    return {
      date,
      dayIndex,
      stepIndex,
      doseMg,
      strengths: inputs.strengths,
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
        label: `${Formatters.dose(inputs.tabletStrengthA)} tablets used`,
        value: Formatters.tabletCount(summary.tabletTotals.A),
        level: "secondary",
      });
    }

    if (inputs.tabletStrengthB != null) {
      tabletItems.push({
        label: `${Formatters.dose(inputs.tabletStrengthB)} tablets used`,
        value: Formatters.tabletCount(summary.tabletTotals.B),
        level: "secondary",
      });
    }

    if (inputs.tabletStrengthC != null) {
      tabletItems.push({
        label: `${Formatters.dose(inputs.tabletStrengthC)} tablets used`,
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
  calendarViewInputs: [...document.querySelectorAll('input[name="calendarView"]')],
};

const InputFactory = {
  readDateInputs() {
    return {
      taperStartDate: InputFactory.parseDate(DOMRefs.form.taperStartDate.value),
    };
  },

  readNumericInputs() {
    return {
      startingDose: NumberUtils.parseOptionalNumber(DOMRefs.form.startingDose.value),
      doseChangePerStep: NumberUtils.parseOptionalNumber(DOMRefs.form.doseChangePerStep.value),
      daysPerStep: NumberUtils.parseOptionalInteger(DOMRefs.form.daysPerStep.value),
      totalSteps: NumberUtils.parseOptionalInteger(DOMRefs.form.totalSteps.value),
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
      const values = [
        fields.doseChangeInput.value.trim(),
        fields.daysPerStepInput.value.trim(),
        fields.repeatsInput.value.trim(),
      ];
      const allBlank = values.every((value) => value === "");
      if (allBlank) return null;

      const segment = {
        doseChange: NumberUtils.parseOptionalNumber(values[0]),
        daysPerStep: NumberUtils.parseOptionalInteger(values[1]),
        repeats: NumberUtils.parseOptionalInteger(values[2]),
      };

      if (segment.doseChange == null || segment.daysPerStep == null || segment.repeats == null) {
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
      useCustomOverride: DOMRefs.form.useCustomOverride.checked,
      allowPartialTablets: DOMRefs.form.allowPartialTablets.checked,
    };

    const customSegments = InputFactory.readCustomSegments(errors);
    const strengths = Strengths.create(baseInputs);
    const inputs = {
      ...baseInputs,
      customSegments,
      strengths,
      drugId: APP_CONFIG.drugs.prednisone.id,
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
                <p><strong>Tablet combination:</strong><br>${Html.escape(row.compactTabletSummary).replace(
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

    return `
      <section class="print-month">
        <div class="print-page">
          <div class="print-header">
            <div class="print-title-block">
              <div>PREDNISONE</div>
              <div>DOSAGE</div>
              <div>CALENDAR</div>
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

    const lines = [
      `<div class="print-dose-line">${Html.escape(cell.scheduleRow.instructionParts.totalLine)}</div>`,
    ];

    if (cell.scheduleRow.instructionParts.tabletLines.length > 0) {
      lines.push(
        `<div class="print-tablet-line">${Html.escape(cell.scheduleRow.instructionParts.tabletLines.join("\n")).replace(
          /\n/g,
          "<br>"
        )}</div>`
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

    document.body.classList.toggle("printing", false);
    DOMRefs.calendarMonths.classList.toggle("hidden", selectedView === "list");
    DOMRefs.calendarList.classList.toggle("hidden", selectedView === "calendar");
    DOMRefs.tableCard.classList.toggle("hidden", selectedView === "calendar");
  },
};

const UISetup = {
  syncCustomOverrideVisibility() {
    const isVisible = DOMRefs.form.useCustomOverride.checked;
    DOMRefs.customOverridePanel.classList.toggle("is-hidden", !isVisible);
    DOMRefs.customOverridePanel.setAttribute("aria-hidden", String(!isVisible));
  },

  getCustomRowFields(row) {
    return {
      doseChangeInput: row.querySelector(".segment-dose-change"),
      daysPerStepInput: row.querySelector(".segment-days-per-step"),
      repeatsInput: row.querySelector(".segment-repeats"),
      startDoseEl: row.querySelector(".helper-dose-start"),
      endDoseEl: row.querySelector(".helper-dose-end"),
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
    return true;
  },

  reindexCustomSegmentRows() {
    [...DOMRefs.customSegmentBody.querySelectorAll("tr")].forEach((row, index) => {
      const fields = UISetup.getCustomRowFields(row);
      row.querySelector(".segment-label").textContent = `Segment ${index + 1}`;
      fields.doseChangeInput.name = `customDoseChange${index}`;
      fields.daysPerStepInput.name = `customDaysPerStep${index}`;
      fields.repeatsInput.name = `customRepeats${index}`;
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
      const doseChange = NumberUtils.parseOptionalNumber(fields.doseChangeInput.value.trim());
      const repeats = NumberUtils.parseOptionalInteger(fields.repeatsInput.value.trim());

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

  rebuildCustomSegmentRows(valuesList = APP_CONFIG.defaults.customSegments) {
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

  applyDefaults() {
    const now = new Date();
    DOMRefs.form.taperStartDate.value = DateUtils.toDateInputValue(now);

    Object.entries(APP_CONFIG.defaults.taper).forEach(([key, value]) => {
      if (DOMRefs.form[key]) {
        DOMRefs.form[key].value = value;
      }
    });

    UISetup.rebuildCustomSegmentRows(APP_CONFIG.defaults.customSegments);
    UISetup.syncCustomOverrideVisibility();
  },
};

const AppController = {
  initialize() {
    UISetup.applyDefaults();
    DOMRefs.form.addEventListener("submit", AppController.handleGenerate);
    DOMRefs.form.addEventListener("reset", AppController.handleReset);
    DOMRefs.form.useCustomOverride.addEventListener("change", UISetup.syncCustomOverrideVisibility);
    DOMRefs.form.startingDose.addEventListener("input", UISetup.syncCustomSegmentDoseHelpers);
    DOMRefs.customSegmentBody.addEventListener("input", UISetup.syncCustomSegmentDoseHelpers);
    DOMRefs.customSegmentBody.addEventListener("click", AppController.handleCustomRowDelete);
    DOMRefs.addSegmentRowButton.addEventListener("click", AppController.handleAddCustomRow);
    DOMRefs.printButton.addEventListener("click", AppController.handlePrint);
    DOMRefs.calendarViewInputs.forEach((input) =>
      input.addEventListener("change", DOMRenderer.syncLayoutControls)
    );
    window.addEventListener("beforeprint", () => document.body.classList.add("printing"));
    window.addEventListener("afterprint", () => document.body.classList.remove("printing"));
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

  handleAddCustomRow() {
    const added = UISetup.appendCustomSegmentRow();
    if (!added) return;
    UISetup.reindexCustomSegmentRows();
    UISetup.syncCustomSegmentDoseHelpers();
    UISetup.syncCustomSegmentControls();
  },

  handleCustomRowDelete(event) {
    const deleteButton = event.target.closest(".row-delete-button");
    if (!deleteButton) return;

    deleteButton.closest("tr")?.remove();
    UISetup.reindexCustomSegmentRows();
    UISetup.syncCustomSegmentDoseHelpers();
    UISetup.syncCustomSegmentControls();
  },

  handlePrint() {
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
  },
};

AppController.initialize();
