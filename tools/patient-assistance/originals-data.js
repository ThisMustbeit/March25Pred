// Official program lists reviewed October 15, 2026.
// Viatris: https://www.viatrisoriginals.ca/en-ca/assistancecard (27 table rows; Serc strengths combined).
// Pfizer: https://www.pfizeroriginals.ca/ and its linked provincial payment-assistance chart.
(() => {
  const viatris = ['Androgel','Biaxin','Biaxin BID','Caduet','Celebrex','Detrol','Detrol LA','Dicetel','Dymista','Effexor XR','Epival','Isoptin SR','Lipidil EZ','Lipidil Supra','Lipitor','Luvox','Lyrica','Mavik','Norvasc','Prevacid','Relpax','Rythmol','Serc','Xalacom','Xalatan','Zoloft'];
  const pfizer = ['Accupril','Accuretic','Alesse','Aricept','Arthrotec','Eliquis','Vfend','Xeljanz','Xeljanz XR'];
  const products = [
    ...viatris.map(brand=>({brand,ingredient:'',program:'viatrisoriginals',primary:true,
      aliases:brand==='Biaxin'?'Pediatric Biaxin Biaxin Ped':brand==='Serc'?'16 mg 24 mg':'',
      note:brand==='Serc'?'Official provincial list specifies 16 mg and 24 mg.':''})),
    ...pfizer.map(brand=>({brand,ingredient:({Accupril:'quinapril',Accuretic:'quinapril hydrochloride / hydrochlorothiazide','Xeljanz XR':'tofacitinib'})[brand]||'',program:'pfizeroriginals',primary:true,aliases:'',
      note:brand==='Xeljanz XR'?'Listed in the national program; the official provincial chart does not include payment assistance for Nova Scotia.':''}))
  ];
  if(typeof module!=='undefined')module.exports=products;
  else globalThis.CALENDRX_ORIGINALS=products;
})();
