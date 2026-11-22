/*
 * Logique de calcul, sans dépendance à la page.
 * Testée par tests/test.js (node tests/test.js).
 */

const CENT = 100; // calculs en centièmes de mg pour éviter les erreurs d'arrondi

function toUnits(mg) {
  return Math.round(mg * CENT);
}

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

/* Conversion d'une dose d'une molécule vers une autre. */
function convertir(dose, depuis, vers) {
  return (dose / depuis.equiv) * vers.equiv;
}

function equivPrednisone(dose, molecule) {
  return (dose / molecule.equiv) * 5;
}

/*
 * Pièces disponibles : comprimés entiers et, si autorisé, demi-comprimés.
 * Retourne [{ mg, dosage, fraction }]
 */
function pieces(dosages, demi) {
  const list = [];
  for (const d of dosages) {
    list.push({ mg: d, dosage: d, fraction: 1 });
    if (demi) list.push({ mg: d / 2, dosage: d, fraction: 0.5 });
  }
  return list;
}

/* Plus petit pas de dose réalisable avec les pièces disponibles. */
function granularite(dosages, demi) {
  const p = pieces(dosages, demi);
  if (!p.length) return null;
  return p.map((x) => toUnits(x.mg)).reduce(gcd) / CENT;
}

/*
 * Composition d'une dose avec le moins de prises possible.
 * Retourne null si la dose n'est pas réalisable.
 * Résultat : [{ dosage, nombre }] où nombre peut être 0,5, 1, 1,5...
 */
function composer(dose, dosages, demi) {
  if (dose === 0) return [];
  const p = pieces(dosages, demi);
  if (!p.length) return null;
  const g = p.map((x) => toUnits(x.mg)).reduce(gcd);
  const cible = toUnits(dose);
  if (cible % g !== 0) return null;
  const n = cible / g;
  if (n > 200000) return null;
  const tailles = p.map((x) => toUnits(x.mg) / g);
  const cout = new Array(n + 1).fill(Infinity);
  const choix = new Array(n + 1).fill(-1);
  cout[0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < tailles.length; j++) {
      const t = tailles[j];
      // un demi-comprimé compte un peu plus qu'un entier : on préfère les entiers
      const c = p[j].fraction === 1 ? 1 : 1.01;
      if (t <= i && cout[i - t] + c < cout[i]) {
        cout[i] = cout[i - t] + c;
        choix[i] = j;
      }
    }
  }
  if (cout[n] === Infinity) return null;
  const parDosage = new Map();
  let i = n;
  while (i > 0) {
    const piece = p[choix[i]];
    parDosage.set(piece.dosage, (parDosage.get(piece.dosage) || 0) + piece.fraction);
    i -= tailles[choix[i]];
  }
  return [...parDosage.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([dosage, nombre]) => ({ dosage, nombre }));
}

function arrondir(dose, pas) {
  return Math.round(toUnits(dose) / toUnits(pas)) * pas;
}

/*
 * Génère un schéma de décroissance.
 * params : {
 *   doseInitiale, joursInitiaux,
 *   mode: "mg" | "pct", pasHaut, joursHaut,
 *   seuil, pasBas, joursBas,
 *   doseFinale, dosages, demi
 * }
 * Retourne { paliers: [{ dose, jours }], erreurs: [] }
 */
function genererSchema(params) {
  const erreurs = [];
  const {
    doseInitiale, joursInitiaux, mode, pasHaut, joursHaut,
    seuil, pasBas, joursBas, doseFinale, dosages, demi
  } = params;

  const pas = granularite(dosages, demi);
  if (!pas) erreurs.push("Aucun dosage disponible pour cette molécule.");
  if (!(doseInitiale > 0)) erreurs.push("La dose initiale doit être supérieure à 0.");
  if (!(joursInitiaux >= 1)) erreurs.push("La durée du premier palier doit être d'au moins 1 jour.");
  if (!(pasHaut > 0)) erreurs.push("Le pas de décroissance au-dessus du seuil doit être supérieur à 0.");
  if (mode === "pct" && pasHaut >= 100) erreurs.push("Le pourcentage doit être inférieur à 100.");
  if (!(pasBas > 0)) erreurs.push("Le pas de décroissance sous le seuil doit être supérieur à 0.");
  if (!(joursHaut >= 1) || !(joursBas >= 1)) erreurs.push("La durée des paliers doit être d'au moins 1 jour.");
  if (!(doseFinale >= 0) || doseFinale >= doseInitiale) erreurs.push("La dose finale doit être comprise entre 0 et la dose initiale.");
  if (erreurs.length) return { paliers: [], erreurs };

  const paliers = [{ dose: doseInitiale, jours: joursInitiaux }];
  let dose = doseInitiale;
  let garde = 0;

  while (dose > doseFinale && garde++ < 300) {
    let suivante;
    if (dose > seuil) {
      suivante = mode === "pct" ? dose * (1 - pasHaut / 100) : dose - pasHaut;
      // on ne descend pas sous le seuil d'un coup s'il est franchi
      if (suivante < seuil) suivante = seuil;
    } else {
      suivante = dose - pasBas;
    }
    suivante = arrondir(suivante, pas);
    if (suivante >= dose) suivante = arrondir(dose - pas, pas);
    if (suivante < doseFinale) suivante = doseFinale;
    if (suivante <= 0) {
      dose = 0;
      break;
    }
    paliers.push({ dose: suivante, jours: suivante > seuil ? joursHaut : joursBas });
    dose = suivante;
  }
  if (garde >= 300) erreurs.push("Schéma trop long (plus de 300 paliers) : augmenter le pas de décroissance.");
  return { paliers, erreurs };
}

if (typeof module !== "undefined") {
  module.exports = { convertir, equivPrednisone, granularite, composer, genererSchema, arrondir };
}
