(() => {
  const KEY = "calendrx_sig_library_v1";
  const normalize = value => String(value).normalize("NFKC").toLocaleLowerCase();
  function tags(value) {
    if (!Array.isArray(value) && typeof value !== "string") throw new Error("Tags must be text or a list of text values.");
    const items = Array.isArray(value) ? value : String(value).split(",");
    const unique = new Map();
    for (const item of items) {
      if (typeof item !== "string") throw new Error("Tags must be text.");
      const tag = item.trim();
      if (!tag) continue;
      if (tag.length > 40) throw new Error("Each tag must be 40 characters or fewer.");
      if (!unique.has(normalize(tag))) unique.set(normalize(tag), tag);
    }
    if (unique.size > 20) throw new Error("Use up to 20 tags per shortcut.");
    return [...unique.values()];
  }
  function entry(raw) {
    if (!raw || typeof raw !== "object") throw new Error("Invalid shortcut entry.");
    const result = {};
    for (const [key, limit] of [["code",80],["meaning",2000],["notes",2000]]) {
      const value = key === "notes" && raw[key] == null ? "" : raw[key];
      if (typeof value !== "string") throw new Error("Each entry needs a shortcut and meaning.");
      result[key] = value.trim();
      if (result[key].length > limit) throw new Error(`${key} exceeds ${limit} characters.`);
    }
    if (!result.code || !result.meaning) throw new Error("Enter both a shortcut and its meaning.");
    result.tags = tags(raw.tags || []);
    return result;
  }
  function decode(raw) {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || !Array.isArray(parsed.entries)) throw new Error("Choose a valid Sig List backup (version 1).");
    if (parsed.entries.length > 10000) throw new Error("A list can contain up to 10,000 shortcuts.");
    const entries = parsed.entries.map(entry);
    const keys = new Set(entries.map(item => normalize(item.code)));
    if (keys.size !== entries.length) throw new Error("The backup contains duplicate shortcuts.");
    return entries;
  }
  function matches(item, query, tag = "") {
    const haystack = normalize([item.code, item.meaning, item.notes, ...item.tags].join(" "));
    return normalize(query).trim().split(/\s+/).every(word => haystack.includes(word)) &&
      (!tag || item.tags.some(value => normalize(value) === normalize(tag)));
  }
  function merge(existing, incoming) {
    const keys = new Set(existing.map(item => normalize(item.code)));
    const added = incoming.filter(item => !keys.has(normalize(item.code)));
    if (existing.length + added.length > 10000) throw new Error("A list can contain up to 10,000 shortcuts.");
    return { entries: [...existing, ...added], added: added.length, skipped: incoming.length - added.length };
  }
  function applyCatalog(existing, applied, catalog) {
    if (!catalog || applied.includes(catalog.id)) return {entries:existing, catalogs:applied, added:0, skipped:0};
    const incoming = decode(JSON.stringify({version:1, entries:catalog.entries}));
    return {...merge(existing,incoming), catalogs:[...applied,catalog.id]};
  }
  if (typeof module !== "undefined") module.exports = { tags, entry, decode, matches, merge, applyCatalog };
  if (typeof document === "undefined") return;

  function initialize() {
    if (!document.getElementById("sig-tool")) return;
    const $ = id => document.getElementById(id);
    let entries = [], catalogs = [], baseline = null, selectedTag = "", editing = null, removed = null, readable = true;
    function message(text, error = false) {
      $("sig-status").textContent = text;
      $("sig-status").classList.toggle("is-error", error);
    }
    try {
      baseline = localStorage.getItem(KEY);
      entries = baseline === null ? [] : decode(baseline);
      const storedCatalogs = baseline === null ? [] : JSON.parse(baseline).catalogs;
      catalogs = Array.isArray(storedCatalogs) ? storedCatalogs.filter(id => typeof id === "string") : [];
      const seeded = applyCatalog(entries,catalogs,globalThis.CALENDRX_SIG_CATALOG);
      entries = seeded.entries;
      catalogs = seeded.catalogs;
      if (seeded.skipped) message(`Added ${seeded.added} LDS shortcuts. Kept ${seeded.skipped} existing entries with matching shortcut names.`);
    } catch (error) {
      readable = false;
      message("The saved list could not be read. It has not been overwritten. Check browser storage access or recover your backup before editing.", true);
      ["sig-add","sig-import","sig-export"].forEach(id => $(id).disabled = true);
    }
    function save(next) {
      if (!readable) return false;
      try {
        if (localStorage.getItem(KEY) !== baseline) throw new Error("This list changed in another tab. Reload this page before saving to avoid overwriting those changes.");
        const data = JSON.stringify({version:1, entries:next, catalogs});
        localStorage.setItem(KEY, data);
        baseline = data;
        entries = next;
        return true;
      } catch (error) {
        message(`Not saved. ${error.message}`, true);
        return false;
      }
    }
    function makeButton(text, action, className = "button button-secondary") {
      const button = document.createElement("button");
      button.type = "button"; button.className = className; button.textContent = text;
      button.addEventListener("click", action);
      return button;
    }
    function allTags() {
      return tagsFromList(entries).sort((a,b) => a.localeCompare(b));
    }
    function tagsFromList(list) {
      const map = new Map();
      list.forEach(item => item.tags.forEach(tag => map.set(normalize(tag), tag)));
      return [...map.values()];
    }
    function tagButton(tag, label = tag) {
      const button = makeButton(label, () => {selectedTag = tag; render();}, "sig-tag");
      button.setAttribute("aria-pressed", String(normalize(selectedTag) === normalize(tag)));
      return button;
    }
    function render() {
      const tagNames = allTags();
      if (selectedTag && !tagNames.some(tag => normalize(tag) === normalize(selectedTag))) selectedTag = "";
      $("sig-tags").replaceChildren();
      if (tagNames.length) $("sig-tags").append(tagButton("", "All tags"), ...tagNames.map(tag => tagButton(tag)));
      const visible = entries.filter(item => matches(item, $("sig-search").value, selectedTag))
        .sort((a,b) => a.code.localeCompare(b.code, undefined, {numeric:true, sensitivity:"base"}));
      $("sig-count").textContent = `${visible.length} of ${entries.length} shortcut${entries.length === 1 ? "" : "s"}`;
      $("sig-export").disabled = !readable || entries.length === 0;
      $("sig-list").replaceChildren();
      if (!visible.length) {
        const empty = document.createElement("div"); empty.className = "sig-empty";
        const title = document.createElement("h3"); title.textContent = !readable ? "List unavailable" : entries.length ? "No matching shortcuts" : "Your sig list is ready to build";
        const text = document.createElement("p"); text.textContent = !readable ? "See the storage message above." : entries.length ? "Try another search or clear the tag filter." : "No entries yet. Add a shortcut now, or populate the list when your scanned reference is ready.";
        empty.append(title,text); $("sig-list").append(empty);
      }
      visible.forEach(item => {
        const article = document.createElement("article"); article.className = "sig-entry";
        const heading = document.createElement("div"); heading.className = "sig-entry-heading";
        const title = document.createElement("h3"); title.textContent = item.code;
        const actions = document.createElement("div"); actions.className = "sig-actions";
        const editButton = makeButton("Edit / tags", () => open(item));
        editButton.setAttribute("aria-label", `Edit ${item.code} and its tags`);
        const removeButton = makeButton("Remove", () => {
          if (!save(entries.filter(value => value !== item))) return;
          removed = item; $("sig-undo").hidden = false;
          if (editing === normalize(item.code)) close();
          render(); message(`Removed ${item.code}. You can undo this removal.`);
          $("sig-undo").focus();
        });
        removeButton.setAttribute("aria-label", `Remove ${item.code}`);
        actions.append(editButton,removeButton); heading.append(title,actions);
        const meaning = document.createElement("p"); meaning.dir = "auto"; meaning.textContent = item.meaning;
        article.append(heading,meaning);
        if (item.tags.length) {
          const row = document.createElement("div"); row.className = "sig-tags";
          row.append(...item.tags.map(tag => tagButton(tag))); article.append(row);
        }
        if (item.notes) {
          const notes = document.createElement("p"); notes.className = "sig-entry-notes"; notes.textContent = `Notes: ${item.notes}`; article.append(notes);
        }
        $("sig-list").append(article);
      });
    }
    function open(item = null) {
      editing = item ? normalize(item.code) : null;
      $("sig-form").reset(); $("sig-form-error").textContent = "";
      $("sig-editor-title").textContent = item ? "Edit shortcut & tags" : "Add shortcut";
      $("sig-code").value = item?.code || ""; $("sig-meaning").value = item?.meaning || "";
      $("sig-entry-tags").value = item?.tags.join(", ") || ""; $("sig-notes").value = item?.notes || "";
      $("sig-tag-suggestions").replaceChildren(...allTags().map(tag => makeButton(`+ ${tag}`, () => {
        try { $("sig-entry-tags").value = tags([...tags($("sig-entry-tags").value),tag]).join(", "); }
        catch (error) { $("sig-form-error").textContent = error.message; }
      }, "sig-tag")));
      $("sig-editor").hidden = false;
      $("sig-editor").scrollIntoView({block:"start"}); $("sig-code").focus({preventScroll:true});
    }
    function close() { $("sig-editor").hidden = true; editing = null; $("sig-add").focus({preventScroll:true}); }
    $("sig-add").addEventListener("click", () => open());
    $("sig-cancel").addEventListener("click", close);
    $("sig-form").addEventListener("submit", event => {
      event.preventDefault();
      try {
        const item = entry({code:$("sig-code").value, meaning:$("sig-meaning").value, tags:$("sig-entry-tags").value, notes:$("sig-notes").value});
        if (entries.some(value => normalize(value.code) === normalize(item.code) && normalize(value.code) !== editing)) throw new Error("That shortcut already exists. Edit its existing entry instead.");
        if (!editing && entries.length >= 10000) throw new Error("A list can contain up to 10,000 shortcuts.");
        const next = editing ? entries.map(value => normalize(value.code) === editing ? item : value) : [...entries,item];
        if (!save(next)) { $("sig-form-error").textContent = $("sig-status").textContent; return; }
        $("sig-search").value = ""; selectedTag = "";
        close(); render(); message(`Saved ${item.code}.`);
        $("sig-list").scrollIntoView({block:"start"});
      } catch (error) { $("sig-form-error").textContent = error.message; }
    });
    $("sig-search").addEventListener("input", render);
    $("sig-clear").addEventListener("click", () => {$("sig-search").value = ""; selectedTag = ""; render(); $("sig-search").focus();});
    $("sig-undo").addEventListener("click", () => {
      if (!removed) return;
      if (entries.length >= 10000) {message("Remove another entry before restoring this shortcut; the list is full.", true); return;}
      if (entries.some(item => normalize(item.code) === normalize(removed.code))) {message("A shortcut with that name now exists. Rename it before undoing the removal.", true); return;}
      if (!save([...entries,removed])) return;
      message(`Restored ${removed.code}.`); removed = null; $("sig-undo").hidden = true; render(); $("sig-search").focus();
    });
    $("sig-export").addEventListener("click", () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify({version:1,entries,catalogs},null,2)], {type:"application/json"}));
      const link = document.createElement("a"); link.href = url; link.download = `calendrx-sig-list-${new Date().toISOString().slice(0,10)}.json`;
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
      message("Backup downloaded.");
    });
    $("sig-import").addEventListener("click", () => $("sig-import-file").click());
    $("sig-import-file").addEventListener("change", async event => {
      const file = event.target.files[0]; if (!file) return;
      try {
        if (file.size > 5 * 1024 * 1024) throw new Error("Choose a backup smaller than 5 MB.");
        const incoming = decode(await file.text());
        const result = merge(entries,incoming);
        if (!save(result.entries)) return;
        close(); render(); message(`Imported ${result.added} shortcuts. Skipped ${result.skipped} existing shortcuts; existing entries were kept.`);
      } catch (error) {message(`Import failed. ${error.message}`,true);}
      finally {event.target.value = "";}
    });
    window.addEventListener("storage", event => {
      if (event.key === KEY || event.key === null) message("The saved list changed in another tab. Reload this page to use the latest version.",true);
    });
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",initialize);
  else initialize();
})();
