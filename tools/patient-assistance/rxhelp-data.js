(() => {
  const products = [
  {
    "brand": "Actemra SC",
    "ingredient": "tocilizumab",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 1
  },
  {
    "brand": "Actonel DR",
    "ingredient": "risedronate sodium",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 1
  },
  {
    "brand": "Alesse",
    "ingredient": "levonorgestrel 100 ug and ethinyl estradiol 20 ug",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 1
  },
  {
    "brand": "Androgel",
    "ingredient": "testosterone gel",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 1
  },
  {
    "brand": "Arava",
    "ingredient": "Leflunomide",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 1
  },
  {
    "brand": "Aricept",
    "ingredient": "donepezil hydrochloride",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 1
  },
  {
    "brand": "Arimidex",
    "ingredient": "anastrozole",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 1
  },
  {
    "brand": "Arixtra",
    "ingredient": "fondaparinux",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 1
  },
  {
    "brand": "Arthrotec",
    "ingredient": "diclofenac sodium and misoprostol enteric-coated tablets",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 1
  },
  {
    "brand": "Avalide",
    "ingredient": "Irbesartan-hydrochlorothiazide",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 1
  },
  {
    "brand": "Avapro",
    "ingredient": "Irbesartan",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 1
  },
  {
    "brand": "Biaxin BID",
    "ingredient": "Clarithromycin",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 1
  },
  {
    "brand": "Biaxin",
    "ingredient": "Clarithromycin",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 1
  },
  {
    "brand": "Brivlera",
    "ingredient": "brivaracetam",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 2
  },
  {
    "brand": "Bystolic",
    "ingredient": "Nebivolol",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 2
  },
  {
    "brand": "Caduet",
    "ingredient": "amlodipine besylate/atorvastatin calcium",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 2
  },
  {
    "brand": "Casodex",
    "ingredient": "bicalutamide",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 2
  },
  {
    "brand": "Celebrex",
    "ingredient": "celecoxib",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 2
  },
  {
    "brand": "Concerta",
    "ingredient": "methylphenidate hydrochloride",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 2
  },
  {
    "brand": "Cosopt",
    "ingredient": "Dorzolamide",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 2
  },
  {
    "brand": "Crestor",
    "ingredient": "rosuvastatin",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 2
  },
  {
    "brand": "Detrol",
    "ingredient": "tolterodine tartrate",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 2
  },
  {
    "brand": "Detrol LA",
    "ingredient": "tolterodine tartrate",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 2
  },
  {
    "brand": "Dicetel",
    "ingredient": "Pinaverium bromide",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 2
  },
  {
    "brand": "Diclectin",
    "ingredient": "doxylamine succinate and pyridoxine hydrochloride",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 2
  },
  {
    "brand": "Dymista",
    "ingredient": "Azelastine Hydrochloride",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 3
  },
  {
    "brand": "Effexor XR",
    "ingredient": "venlafaxine HCL",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 3
  },
  {
    "brand": "Eliquis",
    "ingredient": "apixaban tablets",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 3
  },
  {
    "brand": "Elocom",
    "ingredient": "mometasone furoate cream, ointment or lotion",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 3
  },
  {
    "brand": "Epival",
    "ingredient": "divalproex sodium",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 3
  },
  {
    "brand": "Ezetrol",
    "ingredient": "ezetimibe",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 3
  },
  {
    "brand": "Forxiga",
    "ingredient": "dapagliflozin",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 3
  },
  {
    "brand": "Fosavance",
    "ingredient": "alendronate sodium / cholecalciferol (Vitamin D3)",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 3
  },
  {
    "brand": "Glucophage",
    "ingredient": "Metformin Hydrochloride",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 3
  },
  {
    "brand": "Imovane",
    "ingredient": "Zopiclone",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 3
  },
  {
    "brand": "Invokana",
    "ingredient": "Canagliflozin",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 3
  },
  {
    "brand": "Isoptin SR",
    "ingredient": "verapamil hydrochloride",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 3
  },
  {
    "brand": "Lipidil EZ",
    "ingredient": "fenofibrate, NanoCrystal® Formulation",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 3
  },
  {
    "brand": "Lipidil Supra",
    "ingredient": "fenofibrate, microcoated formulation",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 4
  },
  {
    "brand": "Lipitor",
    "ingredient": "atorvastatin calcium",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 4
  },
  {
    "brand": "Losec",
    "ingredient": "omeprazole",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 4
  },
  {
    "brand": "Luvox",
    "ingredient": "fluvoxamine maleate",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 4
  },
  {
    "brand": "Lyrica",
    "ingredient": "pregabalin",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 4
  },
  {
    "brand": "Marvelon",
    "ingredient": "desogestrel and ethinyl estradiol tablets",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 4
  },
  {
    "brand": "Mavik",
    "ingredient": "Trandolapril Capsules",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 4
  },
  {
    "brand": "Maxalt RPD",
    "ingredient": "rizatriptan benzoate",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 4
  },
  {
    "brand": "Maxalt",
    "ingredient": "rizatriptan benzoate",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 4
  },
  {
    "brand": "Nasonex",
    "ingredient": "mometasone furoate monohydrate",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 4
  },
  {
    "brand": "Nexium",
    "ingredient": "esomeprazole",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 4
  },
  {
    "brand": "Norvasc",
    "ingredient": "amlodipine besylate",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 4
  },
  {
    "brand": "Onglyza",
    "ingredient": "saxagliptin tablets",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 4
  },
  {
    "brand": "Otezla",
    "ingredient": "apremilast tablets",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 5
  },
  {
    "brand": "Pantoloc",
    "ingredient": "pantoprazole sodium",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 5
  },
  {
    "brand": "Plaquenil",
    "ingredient": "Hydroxychloroquine Suflate",
    "aliases": "hydroxychloroquine sulfate",
    "program": "rxhelp",
    "sourcePage": 5
  },
  {
    "brand": "Plavix",
    "ingredient": "Clopidogrel Bisulfate",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 5
  },
  {
    "brand": "Plendil",
    "ingredient": "felodipine",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 5
  },
  {
    "brand": "Posanol",
    "ingredient": "Posaconazole",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 5
  },
  {
    "brand": "Prevacid",
    "ingredient": "lansoprazole delayed-release capsules",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 5
  },
  {
    "brand": "Prometrium",
    "ingredient": "progesterone capsules",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 5
  },
  {
    "brand": "Propecia",
    "ingredient": "finasteride",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 5
  },
  {
    "brand": "Proscar",
    "ingredient": "finasteride",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 5
  },
  {
    "brand": "Relpax",
    "ingredient": "eletriptan HBr",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 5
  },
  {
    "brand": "Rocaltrol",
    "ingredient": "calcitriol",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 5
  },
  {
    "brand": "Rythmol",
    "ingredient": "propafenone hydrochloride",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 5
  },
  {
    "brand": "Serc",
    "ingredient": "betahistine dihydrochloride",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 6
  },
  {
    "brand": "Seroquel",
    "ingredient": "quetiapine",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 6
  },
  {
    "brand": "Seroquel XR",
    "ingredient": "quetiapine",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 6
  },
  {
    "brand": "Singulair",
    "ingredient": "montelukast sodium",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 6
  },
  {
    "brand": "Tecta",
    "ingredient": "pantoprazole magnesium enteric coated",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 6
  },
  {
    "brand": "Temodal",
    "ingredient": "temozolomide",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 6
  },
  {
    "brand": "Tenormin",
    "ingredient": "atenolol",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 6
  },
  {
    "brand": "Timoptic-XE",
    "ingredient": "timolol maleate solution",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 6
  },
  {
    "brand": "Trusopt",
    "ingredient": "dorzolamide hydrochloride solution",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 6
  },
  {
    "brand": "Valcyte",
    "ingredient": "Valganciclovir",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 6
  },
  {
    "brand": "Valtrex",
    "ingredient": "valacyclovir hydrochloride",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 6
  },
  {
    "brand": "Vasotec",
    "ingredient": "enalapril",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 6
  },
  {
    "brand": "Vfend",
    "ingredient": "voriconazole",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 6
  },
  {
    "brand": "Viibryd",
    "ingredient": "vilazodone hydrochloride",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 7
  },
  {
    "brand": "Vimovo",
    "ingredient": "NAPROXEN/ESOMEPRAZOLE",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 7
  },
  {
    "brand": "Xalacom",
    "ingredient": "latanoprost and timolol",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 7
  },
  {
    "brand": "Xalatan",
    "ingredient": "latanoprost ophthalmic solution",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 7
  },
  {
    "brand": "Xarelto",
    "ingredient": "Rivaroxaban tablets",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 7
  },
  {
    "brand": "Xeljanz",
    "ingredient": "tofacitinib citrate",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 7
  },
  {
    "brand": "Xigduo",
    "ingredient": "dapagliflozin",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 7
  },
  {
    "brand": "Zestoretic",
    "ingredient": "lisinopril/hctz",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 7
  },
  {
    "brand": "Zestril",
    "ingredient": "lisinopril",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 7
  },
  {
    "brand": "Zocor",
    "ingredient": "simvastatin",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 7
  },
  {
    "brand": "Zoloft",
    "ingredient": "sertraline hydrochloride",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 7
  },
  {
    "brand": "Zomig",
    "ingredient": "zolmitriptan",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 7
  },
  {
    "brand": "Zomig Rapimelt",
    "ingredient": "zolmitriptan ODT",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 7
  },
  {
    "brand": "Zytiga",
    "ingredient": "Abiraterone Acetate",
    "aliases": "",
    "program": "rxhelp",
    "sourcePage": 8
  }
];
  if (typeof module !== "undefined") module.exports = products;
  else globalThis.CALENDRX_RXHELP = products;
})();
