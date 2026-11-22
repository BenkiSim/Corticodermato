/* Interface : lit le formulaire, calcule le plan et rédige le texte d'ordonnance. */

const $ = (id) => document.getElementById(id);
const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const mg = (x) => nf.format(x) + " mg";
const radio = (nom) => document.querySelector(`input[name="${nom}"]:checked`).value;

/* ---------- Dates ---------- */
function dateDe(jour) {
  const d = new Date($("debut").value + "T00:00:00");
  d.setDate(d.getDate() + jour);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/* ---------- Comprimés ---------- */
function quantite(n) {
  const entier = Math.floor(n);
  const demi = n - entier >= 0.5;
  if (!entier) return "½ cp";
  return entier + " cp" + (demi ? " ½" : "");
}
function texteComposition(compo) {
  return compo.map((c) => `${quantite(c.nombre)} à ${mg(c.dosage)}`).join(" + ");
}

/* ---------- Réglages (préférences mémorisées, aucune donnée patient) ---------- */
function options(select, valeurs, suffixe) {
  select.innerHTML = valeurs.map((v) => `<option value="${v}">${nf.format(v)} ${suffixe}</option>`).join("");
}
options($("pasRapide"), REGLES.pasRapideOptions, "mg");
options($("joursRapide"), REGLES.joursRapideOptions, "jours");
options($("joursLent"), REGLES.joursLentOptions, "jours");
options($("delaiCortisol"), REGLES.delaiCortisolOptions, "jours");
$("hcAdulte").innerHTML = REGLES.hcAdulteOptions
  .map((h, i) => `<option value="${i}">${h.total} mg/j (${h.matin} + ${h.midi})</option>`).join("");

const PREFS = ["opt-secretariat", "opt-consignes", "opt-cortisol"];
function appliquerDefauts() {
  const d = REGLES.defauts[radio("patient")];
  for (const k of ["pasRapide", "joursRapide", "joursLent", "delaiCortisol"]) $(k).value = d[k];
}
function chargerPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem("prefs") || "{}");
    if (typeof p.secretariat === "boolean") $("opt-secretariat").checked = p.secretariat;
  } catch (e) {}
}
function sauverPrefs() {
  try { localStorage.setItem("prefs", JSON.stringify({ secretariat: $("opt-secretariat").checked })); } catch (e) {}
}

/* Les options cortisolémie et consignes suivent la durée choisie, modifiables ensuite. */
function optionsSelonDuree() {
  const long = radio("duree") === "long";
  $("opt-cortisol").checked = long;
  $("opt-consignes").checked = long;
}

/* ---------- Rédaction ---------- */
const CONDUITE = {
  court: "Moins de 3 semaines : arrêt sans décroissance possible, sauf risque de rebond de la maladie.",
  moyen: "3 semaines à 3 mois : décroissance jusqu'à l'arrêt. Relais hydrocortisone non systématique (à discuter si signes de sevrage ou doses très élevées).",
  long: "Plus de 3 mois : décroissance jusqu'à 5 mg/j puis relais hydrocortisone, patient en insuffisance surrénale potentielle."
};

function rediger() {
  const duree = radio("duree");
  const enfant = radio("patient") === "enfant";
  const mol = MOLECULES[radio("molecule")];
  const params = {
    dose: parseFloat($("dose").value),
    duree,
    enfant,
    poids: parseFloat($("poids").value),
    taille: parseFloat($("taille").value),
    pasRapide: parseFloat($("pasRapide").value),
    joursRapide: parseInt($("joursRapide").value, 10),
    joursLent: parseInt($("joursLent").value, 10),
    delaiCortisol: parseInt($("delaiCortisol").value, 10),
    hcAdulteIndex: parseInt($("hcAdulte").value, 10),
    cortisol: $("opt-cortisol").checked
  };

  $("conduite").textContent = CONDUITE[duree];
  $("ligne-enfant").hidden = !enfant;
  $("lbl-hc").hidden = enfant;
  $("sc").textContent = enfant && params.poids > 0 && params.taille > 0
    ? `SC ${nf.format(Math.round(surfaceCorporelle(params.poids, params.taille) * 100) / 100)} m²`
    : "";

  const plan = calculerPlan(params, REGLES);
  const blocs = [];
  const rappels = [];

  if (plan.court) {
    $("texte").value = "";
    $("texte").placeholder = "Pas de schéma de décroissance nécessaire.";
    $("rappels").innerHTML = "";
    return;
  }
  if (plan.erreurs.length) {
    $("texte").value = "";
    $("texte").placeholder = plan.erreurs.join("\n");
    $("rappels").innerHTML = "";
    return;
  }

  // Bloc corticoïde
  if (plan.paliers.length) {
    const lignes = [`${mol.nom.toUpperCase()} (${mol.specialite}), en une prise le matin :`];
    for (const p of plan.paliers) {
      const compo = composer(p.dose, mol.comprimes);
      const detail = compo && compo.length ? ` : ${texteComposition(compo)}` : "";
      lignes.push(`- ${mg(p.dose)}/j du ${dateDe(p.debut)} au ${dateDe(p.debut + p.jours - 1)}${detail}`);
    }
    lignes.push(plan.hc
      ? `- Arrêt le ${dateDe(plan.arret)}, relais par hydrocortisone le même jour.`
      : `- Arrêt le ${dateDe(plan.arret)}.`);
    const total = totalComprimes(plan.paliers, mol.comprimes);
    if (total) lignes.push(`Soit au total : ${total.map((t) => `${t.nombre} cp à ${mg(t.dosage)}`).join(", ")}.`);
    blocs.push(lignes.join("\n"));
  }

  // Bloc hydrocortisone
  if (plan.hc) {
    const h = plan.hc;
    const prise = (dose, moment) => {
      const c = composer(dose, HYDROCORTISONE.comprimes);
      return `${mg(dose)} ${moment}` + (c ? ` (${c.map((x) => quantite(x.nombre)).join(" + ")})` : "");
    };
    const moments = [prise(h.matin, "le matin")];
    if (h.midi > 0) moments.push(prise(h.midi, "à midi"));
    blocs.push([
      `HYDROCORTISONE (${HYDROCORTISONE.specialite}, cp sécable), à partir du ${dateDe(h.debut)} :`,
      `- ${moments.join(" et ")}, soit ${mg(h.total)}/j. Aucune prise après 16 h.`,
      `- À poursuivre jusqu'à nouvel avis médical. Ne pas arrêter brutalement.`
    ].join("\n"));
    if (!composer(h.matin, HYDROCORTISONE.comprimes) || !composer(h.midi, HYDROCORTISONE.comprimes)) {
      rappels.push("Dose d'hydrocortisone non réalisable en comprimés de 10 mg : prescrire une forme adaptée à l'enfant.");
    }
    if (enfant) rappels.push(`Relais calculé à ${REGLES.hcEnfantMgParM2} mg/m²/j, arrondi à 2,5 mg, 2/3 le matin et 1/3 à midi.`);
  }

  if (plan.cortisol !== null) blocs.push(TEXTES.cortisol(dateDe(plan.cortisol)));
  if ($("opt-consignes").checked) blocs.push(TEXTES.consignesHC);
  if ($("opt-secretariat").checked) blocs.push(TEXTES.secretariat);

  if (duree === "long" && params.dose >= 7.5) {
    rappels.push("Corticothérapie prolongée : vitamine D et calcium, évaluation du risque fracturaire (DMO), surveillance glycémique, tensionnelle et ophtalmologique.");
  }
  if (duree === "moyen" && $("opt-consignes").checked && !plan.hc) {
    rappels.push("Consignes hydrocortisone ajoutées sans relais hydrocortisone prescrit.");
  }

  $("texte").value = blocs.join("\n\n");
  ajusterHauteur();
  $("rappels").innerHTML = rappels.map((r) => `<p>${r}</p>`).join("");
}

function ajusterHauteur() {
  const t = $("texte");
  t.style.height = "auto";
  t.style.height = Math.max(120, t.scrollHeight + 4) + "px";
}

/* ---------- Copie ---------- */
$("copier").addEventListener("click", async () => {
  const t = $("texte");
  if (!t.value) return;
  try {
    await navigator.clipboard.writeText(t.value);
  } catch (e) {
    t.select();
    document.execCommand("copy");
  }
  $("copier").textContent = "Copié";
  $("copier").classList.add("ok");
  setTimeout(() => { $("copier").textContent = "Copier"; $("copier").classList.remove("ok"); }, 1500);
});

/* ---------- Événements ---------- */
$("f").addEventListener("change", (e) => {
  if (e.target.name === "patient") appliquerDefauts();
  if (e.target.name === "duree") optionsSelonDuree();
  if (e.target.id === "opt-secretariat") sauverPrefs();
  rediger();
});
$("f").addEventListener("input", rediger);
$("f").addEventListener("submit", (e) => e.preventDefault());

$("debut").value = new Date().toISOString().slice(0, 10);
appliquerDefauts();
optionsSelonDuree();
chargerPrefs();
rediger();
$("version").textContent = `Version ${APP_VERSION} du ${new Date(APP_DATE + "T00:00:00").toLocaleDateString("fr-FR")}`;
