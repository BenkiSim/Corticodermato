/*
 * Calcul du plan de décroissance, sans dépendance à la page.
 * Testé par tests/test.js (node tests/test.js).
 */

const CENT = 100; // calculs en centièmes de mg

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

/*
 * Composition d'une dose avec le moins de prises possible.
 * comprimes : [{ dosage, secable }]
 * Retourne [{ dosage, nombre }] (nombre peut valoir 0,5, 1,5...) ou null.
 */
function composer(dose, comprimes) {
  if (!comprimes || !comprimes.length) return null;
  if (dose === 0) return [];
  const pieces = [];
  for (const c of comprimes) {
    pieces.push({ unites: Math.round(c.dosage * CENT), dosage: c.dosage, fraction: 1, cout: 1 });
    if (c.secable) pieces.push({ unites: Math.round((c.dosage / 2) * CENT), dosage: c.dosage, fraction: 0.5, cout: 2.01 }); // couper un comprimé coûte plus que prendre un entier
  }
  const g = pieces.map((p) => p.unites).reduce(gcd);
  const cible = Math.round(dose * CENT);
  if (cible % g !== 0) return null;
  const n = cible / g;
  const tailles = pieces.map((p) => p.unites / g);
  const cout = new Array(n + 1).fill(Infinity);
  const choix = new Array(n + 1).fill(-1);
  cout[0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < pieces.length; j++) {
      const t = tailles[j];
      if (t <= i && cout[i - t] + pieces[j].cout < cout[i]) {
        cout[i] = cout[i - t] + pieces[j].cout;
        choix[i] = j;
      }
    }
  }
  if (cout[n] === Infinity) return null;
  const parDosage = new Map();
  for (let i = n; i > 0; i -= tailles[choix[i]]) {
    const p = pieces[choix[i]];
    parDosage.set(p.dosage, (parDosage.get(p.dosage) || 0) + p.fraction);
  }
  return [...parDosage.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([dosage, nombre]) => ({ dosage, nombre }));
}

/* Surface corporelle (Mosteller), poids en kg, taille en cm. */
function surfaceCorporelle(poids, taille) {
  return Math.sqrt((poids * taille) / 3600);
}

const arrondi25 = (x) => Math.round(x / 2.5) * 2.5;

/* Dose d'hydrocortisone de relais : { total, matin, midi } en mg/j. */
function doseHC(params, regles) {
  if (params.enfant) {
    const sc = surfaceCorporelle(params.poids, params.taille);
    const total = Math.max(2.5, arrondi25(sc * regles.hcEnfantMgParM2));
    let matin = arrondi25((total * 2) / 3);
    if (matin >= total) matin = total;
    return { total, matin, midi: total - matin, surface: sc };
  }
  return regles.hcAdulteOptions[params.hcAdulteIndex || 0];
}

/* Dose du palier suivant (mg/j). */
function doseSuivante(d, params, regles) {
  if (d > regles.seuilRapide) return Math.max(regles.seuilRapide, d - params.pasRapide);
  // multiple de 2,5 situé au moins 2,5 mg sous la dose actuelle
  return Math.max(0, Math.floor((d - regles.pasLent) / regles.pasLent + 1e-9) * regles.pasLent);
}

/*
 * params : {
 *   dose, pleineDose (jours à pleine dose, 0 si décroissance immédiate),
 *   duree: "court" | "moyen" | "long",
 *   pasRapide, joursRapide, joursLent, delaiCortisol,
 *   enfant, poids, taille, hcAdulteIndex, cortisol
 * }
 * Retour : {
 *   court: bool (aucun schéma à prescrire), erreurs: [],
 *   paliers: [{ dose, debut, jours, pleine }]   (debut = décalage en jours depuis J0)
 *   joursPleine, joursDecroissance,
 *   arret: jour d'arrêt du corticoïde
 *   hc: { debut, total, matin, midi } | null
 *   cortisol: jour suggéré | null
 * }
 */
function calculerPlan(params, regles) {
  const erreurs = [];
  const pleine = Math.max(0, Math.round(params.pleineDose || 0));
  const r = {
    court: false, erreurs, paliers: [], joursPleine: pleine, joursDecroissance: 0,
    arret: 0, hc: null, cortisol: null
  };
  if (params.duree === "court" && !pleine) {
    r.court = true;
    return r;
  }
  if (!(params.dose > 0)) erreurs.push("Indiquer la dose.");
  if (params.dose > 200) erreurs.push("Dose supérieure à 200 mg/j : vérifier la saisie.");
  if (pleine > 730) erreurs.push("Durée à pleine dose supérieure à 2 ans : vérifier la saisie.");
  if (params.enfant && !(params.poids > 0 && params.taille > 0)) {
    erreurs.push("Indiquer le poids et la taille de l'enfant.");
  }
  if (erreurs.length) return r;

  let d = params.dose;
  let t = 0;
  const ajouter = (dose, jours, estPleine) => {
    r.paliers.push({ dose, debut: t, jours, pleine: !!estPleine });
    t += jours;
  };

  // Phase d'attaque à pleine dose
  if (pleine) {
    ajouter(d, pleine, true);
    if (params.duree === "court") {
      r.arret = t;
      return r;
    }
    d = doseSuivante(d, params, regles);
  }

  // Décroissance : paliers rapides au-dessus de 10 mg/j, puis paliers de 2,5 mg
  const plancher = params.duree === "long" ? regles.seuilPhysiologique : regles.doseFinale;
  while (d > plancher) {
    ajouter(d, d > regles.seuilRapide ? params.joursRapide : params.joursLent);
    d = doseSuivante(d, params, regles);
  }

  if (params.duree === "moyen") {
    // dernier palier (2,5 mg/j ou moins) puis arrêt
    if (d > 0) ajouter(d, params.joursLent);
    r.arret = t;
    if (params.cortisol) r.cortisol = t - 1;
  } else {
    // relais hydrocortisone à la place de la dose physiologique
    r.arret = t;
    r.hc = { debut: t, ...doseHC(params, regles) };
    if (params.cortisol) r.cortisol = t + params.delaiCortisol;
  }
  r.joursDecroissance = t - pleine;
  return r;
}

/* Dose d'hydrocortisone injectable d'urgence selon l'âge (mg). */
function doseHCUrgence(enfant, age, regles) {
  if (!enfant) return regles.hcUrgenceAdulte;
  if (!(age >= 0)) return null;
  return regles.hcUrgenceEnfant.find((x) => age < x.ageMax).dose;
}

/* Nombre total de comprimés par dosage pour la pharmacie. */
function totalComprimes(paliers, comprimes) {
  const tot = new Map();
  for (const p of paliers) {
    const c = composer(p.dose, comprimes);
    if (!c) return null;
    for (const x of c) tot.set(x.dosage, (tot.get(x.dosage) || 0) + x.nombre * p.jours);
  }
  return [...tot.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([dosage, n]) => ({ dosage, nombre: Math.ceil(n) }));
}

if (typeof module !== "undefined") {
  module.exports = { composer, surfaceCorporelle, doseHC, calculerPlan, totalComprimes, doseHCUrgence };
}
