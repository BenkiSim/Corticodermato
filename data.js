/*
 * Données de référence des corticoïdes systémiques.
 * Ce fichier est le seul à modifier pour mettre à jour les molécules,
 * les équivalences ou les spécialités disponibles.
 *
 * equiv      : dose (mg) équivalente à 5 mg de prednisone (activité anti-inflammatoire)
 * antiInfl   : activité anti-inflammatoire relative (hydrocortisone = 1)
 * mineralo   : activité minéralocorticoïde relative (hydrocortisone = 1)
 * duree      : classe de durée d'action biologique
 * dosages    : dosages des formes orales solides utilisables pour un schéma
 */

const APP_VERSION = "0.1.0";
const APP_DATE = "2026-11-22";

const CLASSES = {
  courte: { label: "Action courte", demivie: "8 à 12 h" },
  intermediaire: { label: "Action intermédiaire", demivie: "12 à 36 h" },
  longue: { label: "Action longue", demivie: "36 à 54 h" }
};

const MOLECULES = [
  {
    id: "hydrocortisone",
    nom: "Hydrocortisone",
    equiv: 20,
    antiInfl: 1,
    mineralo: 1,
    classe: "courte",
    oral: true,
    dosages: [10],
    specialites: ["Hydrocortisone Roussel 10 mg cp sécable"],
    note: "Référence de l'activité glucocorticoïde. Utilisée surtout en substitution."
  },
  {
    id: "cortisone",
    nom: "Cortisone",
    equiv: 25,
    antiInfl: 0.8,
    mineralo: 0.8,
    classe: "courte",
    oral: false,
    dosages: [],
    specialites: [],
    note: "Référence historique des tables d'équivalence."
  },
  {
    id: "prednisone",
    nom: "Prednisone",
    equiv: 5,
    antiInfl: 4,
    mineralo: 0.8,
    classe: "intermediaire",
    oral: true,
    dosages: [1, 5, 20],
    specialites: ["Cortancyl 1 mg, 5 mg, 20 mg cp", "Génériques"],
    note: "Molécule de référence pour exprimer les doses (équivalent prednisone)."
  },
  {
    id: "prednisolone",
    nom: "Prednisolone",
    equiv: 5,
    antiInfl: 4,
    mineralo: 0.8,
    classe: "intermediaire",
    oral: true,
    dosages: [5, 20],
    specialites: ["Solupred 5 mg, 20 mg cp orodispersible ou effervescent", "Solupred 1 mg/mL solution buvable", "Génériques"],
    note: "Forme active de la prednisone. Formes adaptées à l'enfant."
  },
  {
    id: "methylprednisolone",
    nom: "Méthylprednisolone",
    equiv: 4,
    antiInfl: 5,
    mineralo: 0.5,
    classe: "intermediaire",
    oral: true,
    dosages: [4, 16],
    specialites: ["Médrol 4 mg, 16 mg cp sécable", "Solumédrol (voie injectable)"],
    note: "Utilisée aussi en bolus intraveineux."
  },
  {
    id: "triamcinolone",
    nom: "Triamcinolone",
    equiv: 4,
    antiInfl: 5,
    mineralo: 0,
    classe: "intermediaire",
    oral: false,
    dosages: [],
    specialites: ["Kenacort retard (voie injectable)"],
    note: "Pas de forme orale en France."
  },
  {
    id: "betamethasone",
    nom: "Bétaméthasone",
    equiv: 0.75,
    antiInfl: 25,
    mineralo: 0,
    classe: "longue",
    oral: true,
    dosages: [0.5],
    specialites: ["Betnesol 0,5 mg cp effervescent", "Célestène 0,05 % solution buvable (0,5 mg/mL)"],
    note: "Longue durée d'action : freination de l'axe corticotrope plus marquée."
  },
  {
    id: "dexamethasone",
    nom: "Dexaméthasone",
    equiv: 0.75,
    antiInfl: 25,
    mineralo: 0,
    classe: "longue",
    oral: true,
    dosages: [0.5, 4],
    specialites: ["Dectancyl 0,5 mg cp", "Néodex 4 mg cp"],
    note: "Longue durée d'action : freination de l'axe corticotrope plus marquée."
  }
];

if (typeof module !== "undefined") {
  module.exports = { APP_VERSION, APP_DATE, CLASSES, MOLECULES };
}
