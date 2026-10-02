(() => {
  function normalize(value) {
    return String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/(\d)\s+(mg|mcg|ml|%)/g, "$1$2").replace(/[^a-z0-9.%]+/g, " ").trim();
  }
  function search(products, query, program = "all") {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    return products.filter(product => {
      const text = normalize(`${product.brand} ${product.ingredient} ${product.aliases || ""}`);
      return (program === "all" || product.program === program) && words.every(word => text.includes(word));
    }).sort((a,b) => a.brand.localeCompare(b.brand));
  }
  if (typeof module !== "undefined") module.exports = {normalize, search};
  if (typeof document === "undefined") return;
  function initialize() {
    if (!document.getElementById("assistance-tool")) return;
    const catalog = globalThis.CALENDRX_ASSISTANCE;
    const input = document.getElementById("assistance-search");
    const program = document.getElementById("assistance-program");
    const results = document.getElementById("assistance-results");
    const count = document.getElementById("assistance-count");
    if (!catalog) { count.textContent = "The product list could not load. Please reload this page or use the source PDF."; return; }
    function render() {
      const found = search(catalog.products,input.value,program.value);
      count.textContent = `${found.length} of ${catalog.products.length} program listings`;
      results.replaceChildren();
      if (!found.length) {
        const empty = document.createElement("div"); empty.className = "assistance-empty";
        const heading = document.createElement("h3");
        heading.textContent = "No matching products in this list";
        const text = document.createElement("p");
        text.textContent = "Try a brand name, an ingredient, or clear the filters. A missing result does not mean the drug has no assistance program.";
        empty.append(heading,text); results.append(empty); return;
      }
      found.forEach(product => {
        const card = document.createElement("article"); card.className = "assistance-product";
        const heading = document.createElement("h3"); heading.textContent = product.brand;
        const ingredient = document.createElement("p"); ingredient.textContent = product.ingredient;
        const provider = catalog.programs[product.program];
        const link = document.createElement("a"); link.className = `program-tag program-tag-${product.program}`;
        link.href = provider.url; link.target = "_blank"; link.rel = "noopener noreferrer";
        link.textContent = `${provider.name} ↗`;
        link.setAttribute("aria-label", `${product.brand}: visit ${provider.name} (opens in a new tab)`);
        const source = document.createElement("small"); source.textContent = `${catalog.province} · ${provider.name} · ${provider.reference} · p. ${product.sourcePage}`;
        card.append(heading,ingredient,link,source); results.append(card);
      });
    }
    input.addEventListener("input",render); program.addEventListener("change",render);
    document.getElementById("assistance-clear").addEventListener("click", () => {input.value="";program.value="all";render();input.focus();});
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",initialize);
  else initialize();
})();
