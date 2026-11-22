// Tests de la logique de calcul : node tests/test.js
const assert = require("assert");
const path = require("path");
const { REGLES, MOLECULES, HYDROCORTISONE } = require(path.join(__dirname, "..", "data.js"));
const L = require(path.join(__dirname, "..", "logic.js"));

const pred = MOLECULES.prednisone.comprimes;

// Composition des comprimés de prednisone
assert.deepStrictEqual(L.composer(30, pred), [{ dosage: 20, nombre: 1 }, { dosage: 5, nombre: 2 }]);
assert.deepStrictEqual(L.composer(7.5, pred), [{ dosage: 5, nombre: 1.5 }]);
assert.deepStrictEqual(L.composer(2.5, pred), [{ dosage: 5, nombre: 0.5 }]);
assert.deepStrictEqual(L.composer(12, pred), [{ dosage: 5, nombre: 2 }, { dosage: 1, nombre: 2 }]);
assert.strictEqual(L.composer(10, []), null);
assert.deepStrictEqual(L.composer(15, HYDROCORTISONE.comprimes), [{ dosage: 10, nombre: 1.5 }]);

const base = { pasRapide: 5, joursRapide: 7, joursLent: 14, delaiCortisol: 28, cortisol: true };

// Moins de 3 semaines : pas de schéma
assert.ok(L.calculerPlan({ ...base, dose: 40, duree: "court" }, REGLES).court);

// 3 semaines à 3 mois : jusqu'à 2,5 mg puis arrêt
const moyen = L.calculerPlan({ ...base, dose: 30, duree: "moyen" }, REGLES);
assert.deepStrictEqual(moyen.erreurs, []);
assert.deepStrictEqual(moyen.paliers.map((p) => p.dose), [30, 25, 20, 15, 10, 7.5, 5, 2.5]);
assert.deepStrictEqual(moyen.paliers.map((p) => p.jours), [7, 7, 7, 7, 14, 14, 14, 14]);
assert.strictEqual(moyen.arret, 4 * 7 + 4 * 14);
assert.strictEqual(moyen.hc, null);
assert.strictEqual(moyen.cortisol, moyen.arret - 1);

// Plus de 3 mois : jusqu'à 7,5 mg puis relais hydrocortisone à la place de 5 mg
const long = L.calculerPlan({ ...base, dose: 40, duree: "long", pasRapide: 10 }, REGLES);
assert.deepStrictEqual(long.paliers.map((p) => p.dose), [40, 30, 20, 10, 7.5]);
assert.strictEqual(long.hc.debut, 3 * 7 + 2 * 14);
assert.deepStrictEqual([long.hc.total, long.hc.matin, long.hc.midi], [20, 15, 5]);
assert.strictEqual(long.cortisol, long.hc.debut + 28);

// Dose de départ non multiple : 35 mg avec pas de 10
const d35 = L.calculerPlan({ ...base, dose: 35, duree: "moyen", pasRapide: 10 }, REGLES);
assert.deepStrictEqual(d35.paliers.map((p) => p.dose), [35, 25, 15, 10, 7.5, 5, 2.5]);

// Dose de départ basse
const d8 = L.calculerPlan({ ...base, dose: 8, duree: "moyen" }, REGLES);
assert.deepStrictEqual(d8.paliers.map((p) => p.dose), [8, 5, 2.5]);
const d3 = L.calculerPlan({ ...base, dose: 3, duree: "moyen" }, REGLES);
assert.deepStrictEqual(d3.paliers.map((p) => p.dose), [3]);
const d4 = L.calculerPlan({ ...base, dose: 4, duree: "long" }, REGLES);
assert.deepStrictEqual(d4.paliers, []);
assert.strictEqual(d4.hc.debut, 0);

// Enfant : 10 mg/m²/j, 20 kg et 115 cm => SC 0,80 m² => 7,5 mg (5 + 2,5)
const enf = L.calculerPlan({ ...base, dose: 20, duree: "long", enfant: true, poids: 20, taille: 115 }, REGLES);
assert.deepStrictEqual([enf.hc.total, enf.hc.matin, enf.hc.midi], [7.5, 5, 2.5]);
assert.ok(L.calculerPlan({ ...base, dose: 20, duree: "long", enfant: true }, REGLES).erreurs.length);

// Toutes les doses générées sont réalisables en comprimés de prednisone
for (let dose = 1; dose <= 120; dose++) {
  for (const duree of ["moyen", "long"]) {
    const p = L.calculerPlan({ ...base, dose, duree }, REGLES);
    for (let i = 1; i < p.paliers.length; i++) assert.ok(p.paliers[i].dose < p.paliers[i - 1].dose);
    assert.ok(L.totalComprimes(p.paliers, pred), "composition impossible pour " + dose);
  }
}

// Total pour la pharmacie
assert.deepStrictEqual(L.totalComprimes([{ dose: 7.5, jours: 14 }], pred), [{ dosage: 5, nombre: 21 }]);

// Phase à pleine dose puis décroissance
const att = L.calculerPlan({ ...base, dose: 40, pleineDose: 28, duree: "moyen" }, REGLES);
assert.deepStrictEqual(att.paliers.map((p) => p.dose), [40, 35, 30, 25, 20, 15, 10, 7.5, 5, 2.5]);
assert.strictEqual(att.paliers[0].jours, 28);
assert.ok(att.paliers[0].pleine && !att.paliers[1].pleine);
assert.strictEqual(att.joursPleine, 28);
assert.strictEqual(att.joursDecroissance, 5 * 7 + 4 * 14);
assert.strictEqual(att.arret, 28 + 5 * 7 + 4 * 14);

// Pleine dose de moins de 3 semaines : arrêt direct
const courte = L.calculerPlan({ ...base, dose: 40, pleineDose: 10, duree: "court" }, REGLES);
assert.ok(!courte.court);
assert.deepStrictEqual(courte.paliers.map((p) => [p.dose, p.jours]), [[40, 10]]);
assert.strictEqual(courte.arret, 10);

// Pleine dose basse puis relais hydrocortisone
const attLong = L.calculerPlan({ ...base, dose: 5, pleineDose: 90, duree: "long" }, REGLES);
assert.deepStrictEqual(attLong.paliers.map((p) => p.dose), [5]);
assert.strictEqual(attLong.hc.debut, 90);

// Pleine dose à 2,5 mg/j : pas de palier négatif
const att25 = L.calculerPlan({ ...base, dose: 2.5, pleineDose: 30, duree: "moyen" }, REGLES);
assert.deepStrictEqual(att25.paliers.map((p) => p.dose), [2.5]);

// Hydrocortisone injectable d'urgence
assert.strictEqual(L.doseHCUrgence(false, null, REGLES), 100);
assert.strictEqual(L.doseHCUrgence(true, 1, REGLES), 25);
assert.strictEqual(L.doseHCUrgence(true, 3, REGLES), 50);
assert.strictEqual(L.doseHCUrgence(true, 12, REGLES), 50);
assert.strictEqual(L.doseHCUrgence(true, 13, REGLES), 100);
assert.strictEqual(L.doseHCUrgence(true, NaN, REGLES), null);

console.log("Tous les tests passent.");
