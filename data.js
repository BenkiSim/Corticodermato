/*
 * Paramètres et textes de l'application.
 * Seul fichier à modifier pour changer les règles, les doses, les spécialités ou les textes.
 * Toutes les doses de corticoïde sont exprimées en mg/j d'équivalent prednisone.
 */

const APP_VERSION = "1.1.0";
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
  hcEnfantMgParM2: 10,    // mg/m²/j, arrondi à 2,5 mg, 2/3 le matin et 1/3 à midi
  hcUrgenceAdulte: 100,   // mg IM ou IV
  hcUrgenceEnfant: [      // mg IM ou IV selon l'âge (ans)
    { ageMax: 3, dose: 25 },
    { ageMax: 12.0001, dose: 50 },
    { ageMax: Infinity, dose: 100 }
  ],
  hcQuantite: "QSP 1 mois, à renouveler 2 fois."
};

/*
 * Dénomination sur l'ordonnance : "Nom commercial dci galénique dosages :"
 * secable : le comprimé peut être coupé en deux
 */
const MOLECULES = {
  prednisone: {
    dci: "prednisone",
    specialite: "Cortancyl",
    galenique: "comprimé",
    comprimes: [
      { dosage: 20, secable: true },
      { dosage: 5, secable: true },
      { dosage: 1, secable: false }
    ]
  },
  prednisolone: {
    dci: "prednisolone",
    specialite: "Solupred",
    galenique: "comprimé orodispersible",
    comprimes: [
      { dosage: 20, secable: false },
      { dosage: 5, secable: false }
    ]
  }
};

const HYDROCORTISONE = {
  dci: "hydrocortisone",
  specialite: "Hydrocortisone Roussel",
  galenique: "comprimé sécable",
  comprimes: [{ dosage: 10, secable: true }]
};

const HYDROCORTISONE_INJECTABLE = {
  dci: "hydrocortisone",
  specialite: "Hydrocortisone Upjohn",
  galenique: "lyophilisat et solution pour usage parentéral",
  dosage: 100,   // mg par flacon
  volume: 2      // mL après reconstitution
};

const TEXTES = {
  consignesCorticoides:
`Consignes : ne jamais arrêter ni modifier le traitement sans avis médical. Consulter en cas de fièvre ou de symptôme inhabituel.`,

  consignesHC:
`Consignes hydrocortisone (traitement à ne jamais arrêter brutalement, même en cas d'oubli ou de fatigue) :
- stress mineur ou modéré (fièvre > 38,5 °C, infection, soins dentaires, traumatisme) : doubler la dose (matin et midi) pendant 2 à 3 jours, puis reprendre la dose habituelle
- vomissements, diarrhée ou stress majeur : injection d'hydrocortisone en intramusculaire puis urgences immédiatement, avec cette ordonnance
- signes d'alerte : fatigue extrême brutale, nausées, vomissements, douleurs abdominales, malaise ou vertiges au lever`,

  cortisol: (date) =>
`Faire pratiquer le ${date} (ou dans les jours suivants) :
- cortisolémie à 8 h, à jeun, avant la prise matinale du traitement (dernière prise d'hydrocortisone la veille à midi)`,

  secretariat:
`Merci d'adresser les résultats à l'intention du médecin signataire au Secrétariat / Consultation
Tél. : 04 91 38 75 95
Fax : 04 91 38 79 89
secretariat.dermato.timone@ap-hm.fr`
};

if (typeof module !== "undefined") {
  module.exports = { APP_VERSION, APP_DATE, REGLES, MOLECULES, HYDROCORTISONE, HYDROCORTISONE_INJECTABLE, TEXTES };
}
