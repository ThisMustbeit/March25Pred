(() => {
  // Public medication directory at https://myrx.care/, reviewed October 2, 2026.
  // Names and formulation distinctions follow the directory; no coverage inferred
  // for other manufacturers of the same ingredient.
  const groups = [
    ["Amgen Entrust", "amgen-entrust", "Amgevita|Avsola|Enbrel|Evenity|Repatha|Prolia|Wezlana"],
    ["Sandoz", "sandoz", "Abiraterone|Afatinib|Apremilast|Capecitabine|Deferasirox|Everolimus|Fingolimod|Fulvestrant|Lenalidomide|Miglustat|Pirfenidone|Pomalidomide|Posaconazole|Sunitinib|Tacrolimus|Tacrolimus XR|Tofacitinib|Teriflunomide"],
    ["Sandoz Plus", "sandozbio", "Enzeevu|Nypozi|Wyost|Ziextenzo|Inclunox|Inclunox HP"],
    ["Bausch + Lomb", "bausch-lomb", "Xiidra"],
    ["Ally / PMS", "ally", "Fingolimod|Abiraterone|DMF|Fampridine|Teriflunomide|Pazopanib|Apremilast|Tofacitinib|Deferasirox|Palbociclib|Dolutegravir"],
    ["PendoPharm", "pendopharm", "Glatect|Buccolam"],
    ["JAMP / BIOJAMP", "jamp", "Filra|Jamteki|Pexegra|Simlandi|Fulvestrant|Abiraterone|Apremilast|Deferasirox|Capecitabine|DMF|Enzalutamide|Fingolimod|Imatinib|Lenalidomide|Nintedanib|Pirfenidone|Plerixafor|Pomalidomide|Temozolomide|Teriflunomide|Tofacitinib|Tretinoin|Voriconazole"],
    ["Auro", "auro", "Apremilast|Cladrabine|DMF|Enzalutamide|Nintedanib|Pirfenidone|Tofacitinib"],
    ["Valeo", "valeo", "Redesca"],
    ["Knight", "knight", "Wakix|Xcopri"]
  ];
  const products = groups.flatMap(([subprogram, slug, names]) => names.split("|").map(brand => ({
    brand, ingredient:"", aliases:brand === "Cladrabine" ? "cladribine" : "",
    program:"myrxcare", subprogram, url:`https://myrx.care/en/${slug}`
  })));
  if (typeof module !== "undefined") module.exports = products;
  else globalThis.CALENDRX_MYRXCARE = products;
})();
