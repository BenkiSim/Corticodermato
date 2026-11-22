/*
 * Paramètres et textes de l'application.
 * Seul fichier à modifier pour changer les règles, les doses ou les textes.
 * Toutes les doses de corticoïde sont exprimées en mg/j d'équivalent prednisone.
 */

const APP_VERSION = "1.0.0";
const APP_DATE = "2026-11-22";

const REGLES = {
  seuilRapide: 10,        // au-dessus : paliers rapides
  pasLent: 2.5,           // entre 10 et 5 mg/j
  seuilPhysiologique: 5,  // dose charnière (relais hydrocortisone si > 3 mois)
  doseFinale: 2.5,        // dernier palier avant arrêt si durée < 3 mois
  pasRapideOptions: [5, 10],
  joursRapideOptions: [7, 10, 14],
  joursLentOptions: [14, 21, 28],
  delaiCortisolOptions: [14, 21, 28],
  defauts: {
    adulte: { pasRapide: 5, joursRapide: 7, joursLent: 14, delaiCortisol: 28 },
    enfant: { pasRapide: 5, joursRapide: 14, joursLent: 21, delaiCortisol: 28 }
  },
  hcAdulteOptions: [
    { total: 20, matin: 15, midi: 5 },
    { total: 15, matin: 10, midi: 5 }
  ],
  hcEnfantMgParM2: 10     // mg/m²/j, arrondi à 2,5 mg, 2/3 le matin et 1/3 à midi
};

/* secable : le comprimé peut être coupé en deux */
const MOLECULES = {
  prednisone: {
    nom: "Prednisone",
    specialite: "Cortancyl",
    comprimes: [
      { dosage: 20, secable: true },
      { dosage: 5, secable: true },
      { dosage: 1, secable: false }
    ]
  },
  prednisolone: {
    nom: "Prednisolone",
    specialite: "Solupred",
    comprimes: [] // dose rédigée en mg uniquement
  }
};

const HYDROCORTISONE = {
  nom: "Hydrocortisone",
  specialite: "Hydrocortisone Roussel 10 mg",
  comprimes: [{ dosage: 10, secable: true }]
};

const TEXTES = {
  consignesHC:
`CONSIGNES DE SÉCURITÉ : TRAITEMENT PAR HYDROCORTISONE
Ce médicament remplace temporairement les hormones naturelles des glandes surrénales, mises au repos par le traitement précédent par cortisone.
- Ne jamais arrêter ce traitement brutalement, même en cas d'oubli ou de fatigue.
- En cas de fièvre (> 38,5 °C), infection, intervention dentaire ou chirurgicale ou choc important : DOUBLER la dose d'hydrocortisone (matin et midi) pendant 2 à 3 jours, puis reprendre la dose habituelle.
- Signes d'alerte (insuffisance surrénale aiguë) : fatigue extrême brutale, nausées, vomissements, douleurs abdominales, malaise ou vertiges au lever.
- En cas de vomissements empêchant de garder les comprimés : se rendre immédiatement aux urgences en présentant cette ordonnance (injection nécessaire).`,

  cortisol: (date) =>
`Bilan biologique à réaliser le ${date} (ou dans les jours suivants) :
- Cortisolémie à 8 h, à jeun, AVANT la prise matinale du traitement (dernière prise d'hydrocortisone la veille à midi).`,

  secretariat:
`Merci d'adresser les résultats à l'intention du médecin signataire au Secrétariat / Consultation
Tél. : 04 91 38 75 95
Fax : 04 91 38 79 89
secretariat.dermato.timone@ap-hm.fr`
};

if (typeof module !== "undefined") {
  module.exports = { APP_VERSION, APP_DATE, REGLES, MOLECULES, HYDROCORTISONE, TEXTES };
}
