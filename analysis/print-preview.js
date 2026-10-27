(() => {
  const pages = document.getElementById("print-preview-pages");
  const status = document.getElementById("print-preview-status");
  const layoutControl = document.getElementById("preview-print-layout");
  const zoom = document.getElementById("print-preview-zoom");
  const source = document.getElementById("print-calendar-root");
  const stylesheet = Html.escape(new URL("print-calendar.css", document.baseURI).href);
  let lastMarkup, lastLayout;

  function resize() {
    if (!pages.clientWidth) return;
    const landscape = lastLayout === "landscape";
    const width = (landscape ? 11 : 8.5) * 96;
    const height = (landscape ? 8.5 : 11) * 96;
    const scale = zoom.value === "fit"
      ? Math.min(1, Math.max(0.1, (pages.clientWidth - 40) / width))
      : Number(zoom.value);
    pages.querySelectorAll(".print-preview-paper").forEach(paper => {
      paper.style.width = `${width * scale}px`;
      paper.style.height = `${height * scale}px`;
      const frame = paper.querySelector("iframe");
      frame.style.width = `${width}px`;
      frame.style.height = `${height}px`;
      frame.style.transform = `scale(${scale})`;
    });
  }

  function render() {
    const layout = DOMRefs.printLayoutSelect.value === "landscape" ? "landscape" : "portrait";
    layoutControl.value = layout;
    if (lastMarkup === source.innerHTML && lastLayout === layout) return;
    lastMarkup = source.innerHTML;
    lastLayout = layout;
    pages.replaceChildren();
    const months = [...source.querySelectorAll(".print-month")];
    status.textContent = months.length
      ? `${months.length} page${months.length === 1 ? "" : "s"} · Letter · ${layout === "landscape" ? "Landscape" : "Portrait"}`
      : "Generate a schedule to preview the printable calendar.";
    months.forEach((month, index) => {
      const label = month.querySelector(".print-month-banner")?.textContent || "Calendar";
      const figure = document.createElement("figure");
      figure.className = "print-preview-figure";
      const caption = document.createElement("figcaption");
      caption.textContent = `Page ${index + 1} of ${months.length} · ${label}`;
      const paper = document.createElement("div");
      paper.className = "print-preview-paper";
      const frame = document.createElement("iframe");
      frame.title = `Print preview: ${label}, page ${index + 1}`;
      frame.setAttribute("sandbox", "");
      frame.srcdoc = `<!doctype html><html lang="en"><head><meta charset="utf-8">
        <link rel="stylesheet" href="${stylesheet}">
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: white; color: black; }
          body { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 12px; }
          .print-month { padding: 0.35in; width: ${layout === "landscape" ? "11" : "8.5"}in; min-height: ${layout === "landscape" ? "8.5" : "11"}in; }
        </style></head><body class="print-layout-${layout}">${month.outerHTML}</body></html>`;
      paper.append(frame);
      figure.append(caption, paper);
      pages.append(figure);
    });
    resize();
  }

  layoutControl.addEventListener("change", () => DOMRenderer.syncPrintLayoutControls("preview"));
  zoom.addEventListener("change", resize);
  document.getElementById("preview-print-button").addEventListener("click", AppController.handlePrint);
  new MutationObserver(render).observe(source, { childList: true });
  new MutationObserver(render).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  new ResizeObserver(resize).observe(pages);
  render();
})();
