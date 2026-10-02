(() => {
  const pages = [
    [
      ["Abilify", "aripiprazole"],
      ["Adderall XR", "amphetamine aspartate monohydrate", "mixed salts amphetamine capsules"],
      ["Advair Diskus", "salmeterol xinafoate / fluticasone propionate"],
      ["Apprilon", "doxycycline monohydrate 40 mg"],
      ["Arimidex", "anastrozole"],
      ["Avodart", "dutasteride 0.5 mg"],
      ["Azilect", "rasagiline tablets"],
      ["Bezalip SR", "bezafibrate"],
      ["Biphentin", "methylphenidate hydrochloride"],
      ["Blexten", "bilastine"],
      ["Brilinta", "ticagrelor tablets"],
      ["Celexa", "citalopram"],
      ["CellCept", "mycophenolate mofetil"],
      ["Cesamet", "nabilone"],
      ["Cipralex", "escitalopram oxalate"],
      ["Combigan", "brimonidine tartrate and timolol (as timolol maleate)"],
      ["Concerta", "methylphenidate", "methylphenidate hydrochloride"],
      ["Coversyl", "perindopril erbumine"],
      ["Coversyl Plus", "perindopril erbumine + indapamide"],
      ["Coversyl Plus HD", "perindopril erbumine + indapamide", "Coversyl Plus/HD"],
      ["Crestor", "rosuvastatin calcium"]
    ],
    [
      ["Dexcom G7", "Continuous Glucose Monitoring (CGM) System"],
      ["Dexilant", "dexlansoprazole"],
      ["Diamicron MR", "gliclazide"],
      ["DuoTrav PQ", "travoprost and timolol maleate"],
      ["Faslodex", "fulvestrant"],
      ["Fetzima", "levomilnacipran (levomilnacipran hydrochloride)"],
      ["Flovent HFA", "fluticasone propionate"],
      ["Forxiga", "dapagliflozin"],
      ["Glumetza", "Once-daily metformin HCl"],
      ["Imitrex DF", "sumatriptan succinate"],
      ["Intuniv XR", "guanfacine hydrochloride"],
      ["Iressa", "gefitinib"],
      ["Lamictal", "lamotrigine tablets"],
      ["Lokelma", "sodium zirconium cyclosilicate powder for oral suspension"],
      ["Lolo", "ethinyl estradiol 10 mcg / norethindrone acetate 1 mg"],
      ["Losec", "omeprazole"],
      ["Lumigan RC", "bimatoprost solution"],
      ["Mepron", "atovaquone"],
      ["Myrbetriq", "mirabegron"],
      ["Nexium", "esomeprazole"],
      ["Onglyza", "saxagliptin"],
      ["Ozempic", "semaglutide injection"],
      ["Paxil", "paroxetine tablets"],
      ["Pentasa Suppository", "mesalamine (5-aminosalicylic acid)"],
      ["Prograf", "tacrolimus"],
      ["Pulmicort Nebuamp", "budesonide"],
      ["Restasis MultiDose", "cyclosporine emulsion"],
      ["Restasis", "cyclosporine emulsion"]
    ],
    [
      ["Rocaltrol", "calcitriol", "calcitirol"],
      ["Rosiver", "ivermectin cream, 1% w/w"],
      ["Seroquel", "quetiapine"],
      ["Seroquel XR", "quetiapine"],
      ["Soriatane", "acitretin"],
      ["Sublinox", "zolpidem tartrate"],
      ["TactuPump", "adapalene and benzoyl peroxide, 0.1%/2.5% w/w"],
      ["TactuPump Forte", "adapalene and benzoyl peroxide, 0.3%/2.5% w/w"],
      ["Tamiflu", "oseltamivir phosphate"],
      ["Tenormin", "atenolol"],
      ["Trintellix", "vortioxetine"],
      ["Valcyte", "valganciclovir hydrochloride"],
      ["Valtrex", "valacyclovir HCl"],
      ["Vimovo", "naproxen / esomeprazole"],
      ["Vyvanse", "lisdexamfetamine dimesylate"],
      ["Wegovy", "semaglutide injection"],
      ["Xarelto", "rivaroxaban tablets"],
      ["Xigduo", "dapagliflozin and metformin hydrochloride"],
      ["Zestoretic", "lisinopril and hydrochlorothiazide"],
      ["Zestril", "lisinopril"],
      ["Zomig Rapimelt", "zolmitriptan"],
      ["Zomig", "zolmitriptan"],
      ["Zovirax", "acyclovir ointment/cream 5%"]
    ]
  ];
  const rxhelp = typeof module !== "undefined" ? require("./rxhelp-data.js") : (globalThis.CALENDRX_RXHELP || []);
  const catalog = {
    province: "Nova Scotia", date: "2026-10-02", dateLabel: "October 2, 2026",
    source: "innovicares-coverage-NS-logos-2026-10-02.pdf",
    programs: {
      innovicares: {name:"Innovicares", source:"innovicares-coverage-NS-logos-2026-10-02.pdf", reference:"October 2, 2026 guide", url:"https://www.innovicares.ca/en/"},
      rxhelp: {name:"RxHelp", source:"rxhelp-medications-NS.pdf", reference:"Supplied list (undated)", url:"https://rxhelp.ca/EN/about"}
    },
    products: pages.flatMap((rows, index) => rows.map(([brand, ingredient, aliases = ""]) => ({
      brand, ingredient, aliases, program:"innovicares", sourcePage:index + 1
    }))).concat(rxhelp)
  };
  if (typeof module !== "undefined") module.exports = catalog;
  else globalThis.CALENDRX_ASSISTANCE = catalog;
})();
