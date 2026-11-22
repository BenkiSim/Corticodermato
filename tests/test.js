// Tests de la logique de calcul : node tests/test.js
const assert = require("assert");
const path = require("path");
const { MOLECULES } = require(path.join(__dirname, "..", "data.js"));
const L = require(path.join(__dirname, "..", "logic.js"));

const mol = (id) => MOLECULES.find((m) => m.id === id);

// Équivalences
assert.strictEqual(L.convertir(5, mol("prednisone"), mol("hydrocortisone")), 20);
assert.strictEqual(L.convertir(40, mol("prednisone"), mol("methylprednisolone")), 32);
assert.strictEqual(L.convertir(5, mol("prednisone"), mol("dexamethasone")), 0.75);
assert.strictEqual(L.equivPrednisone(16, mol("methylprednisolone")), 20);

// Composition
assert.deepStrictEqual(L.composer(40, [1, 5, 20], false), [{ dosage: 20, nombre: 2 }]);
assert.deepStrictEqual(L.composer(27, [1, 5, 20], false), [
  { dosage: 20, nombre: 1 }, { dosage: 5, nombre: 1 }, { dosage: 1, nombre: 2 }
]);
assert.strictEqual(L.composer(2.5, [5, 20], false), null);
assert.deepStrictEqual(L.composer(2.5, [5, 20], true), [{ dosage: 5, nombre: 0.5 }]);
assert.deepStrictEqual(L.composer(1.5, [0.5, 4], false), [{ dosage: 0.5, nombre: 3 }]);

// Schéma
const s = L.genererSchema({
  doseInitiale: 40, joursInitiaux: 7, mode: "mg", pasHaut: 10, joursHaut: 7,
  seuil: 10, pasBas: 2.5, joursBas: 14, doseFinale: 0, dosages: [1, 5, 20], demi: false
});
assert.deepStrictEqual(s.erreurs, []);
const doses = s.paliers.map((p) => p.dose);
// 2,5 mg non réalisable avec 1/5/20 sans demi : arrondi au mg le plus proche
for (let i = 1; i < doses.length; i++) assert.ok(doses[i] < doses[i - 1], "décroissance stricte");
assert.strictEqual(doses[0], 40);
assert.ok(doses.includes(10), "le seuil est un palier");
for (const d of doses) assert.ok(L.composer(d, [1, 5, 20], false), "dose réalisable " + d);

const pct = L.genererSchema({
  doseInitiale: 60, joursInitiaux: 14, mode: "pct", pasHaut: 25, joursHaut: 7,
  seuil: 10, pasBas: 1, joursBas: 7, doseFinale: 5, dosages: [1, 5, 20], demi: false
});
assert.deepStrictEqual(pct.erreurs, []);
assert.strictEqual(pct.paliers[pct.paliers.length - 1].dose, 5);

const err = L.genererSchema({
  doseInitiale: 0, joursInitiaux: 7, mode: "mg", pasHaut: 5, joursHaut: 7,
  seuil: 10, pasBas: 1, joursBas: 7, doseFinale: 0, dosages: [5], demi: false
});
assert.ok(err.erreurs.length > 0);

// Données
for (const m of MOLECULES) {
  assert.ok(m.equiv > 0, m.id);
  if (m.oral) assert.ok(m.dosages.length > 0, "dosages manquants pour " + m.id);
}

console.log("Tous les tests passent.");
