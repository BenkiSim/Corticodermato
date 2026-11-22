/* Interface : lit le formulaire, calcule le plan et rédige les ordonnances. */

const $ = (id) => document.getElementById(id);
const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const mg = (x) => nf.format(x) + " mg";
const radio = (nom) => document.querySelector(`input[name="${nom}"]:checked`).value;

/* ---------- Dates et durées ---------- */
function dateDe(jour) {
  const d = new Date($("debut").value + "T00:00:00");
  d.setDate(d.getDate() + jour);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function duree(jours) {
  if (jours % 7 === 0) return `${jours / 7} semaine${jours / 7 > 1 ? "s" : ""}`;
  if (jours < 28) return `${jours} jour${jours > 1 ? "s" : ""}`;
  return `${jours} jours (${nf.format(Math.round((jours / 7) * 10) / 10)} semaines)`;
}

/* ---------- Comprimés et dénomination ---------- */
function quantite(n) {
  const entier = Math.floor(n);
  const demi = n - entier >= 0.5;
  if (!entier) return "½ cp";
  return entier + " cp" + (demi ? " ½" : "");
}
function texteComposition(compo) {
  return compo.map((c) => `${quantite(c.nombre)} à ${mg(c.dosage)}`).join(" + ");
}
/* "Cortancyl prednisone comprimé 20 mg et 5 mg :" */
function denomination(med, dosages) {
  const liste = dosages.map((d) => mg(d));
  const doses = liste.length > 1 ? liste.slice(0, -1).join(", ") + " et " + liste[liste.length - 1] : liste[0];
  return `${med.specialite} ${med.dci} ${med.galenique} ${doses} :`;
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

function appliquerDefauts() {
  const d = REGLES.defauts[radio("patient")];
  for (const k of ["pasRapide", "joursRapide", "joursLent", "delaiCortisol"]) $(k).value = d[k];
}
function chargerPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem("prefs") || "{}");
    if (typeof p.secretariat === "boolean") $("opt-secretariat").checked = p.secretariat;
    if (typeof p.consignes === "boolean") $("opt-consignes").checked = p.consignes;
  } catch (e) {}
}
function sauverPrefs() {
  try {
    localStorage.setItem("prefs", JSON.stringify({
      secretariat: $("opt-secretariat").checked,
      consignes: $("opt-consignes").checked
    }));
  } catch (e) {}
}

/* Options liées à la durée, modifiables ensuite. */
function optionsSelonDuree() {
  const long = radio("duree") === "long";
  for (const id of ["opt-cortisol", "opt-consignes-hc", "opt-injectable"]) $(id).checked = long;
}
/* La durée à pleine dose propose la catégorie de durée correspondante. */
function dureeSelonPleineDose() {
  const jours = joursPleine();
  if (!jours) return;
  const cat = jours >= 90 ? "long" : jours >= 21 ? "moyen" : "court";
  document.querySelector(`input[name="duree"][value="${cat}"]`).checked = true;
  optionsSelonDuree();
}
const joursPleine = () => Math.max(0, Math.round((parseFloat($("pleine").value) || 0) * parseInt($("pleine-unite").value, 10)));

/* ---------- Rédaction ---------- */
const CONDUITE = {
  court: "Moins de 3 semaines : arrêt sans décroissance possible, sauf risque de rebond de la maladie.",
  moyen: "3 semaines à 3 mois : décroissance jusqu'à l'arrêt. Relais hydrocortisone non systématique (à discuter si signes de sevrage ou doses très élevées).",
  long: "Plus de 3 mois : décroissance jusqu'à 5 mg/j puis relais hydrocortisone, patient en insuffisance surrénale potentielle."
};

function ordonnanceTraitement(plan, mol, enfant, rappels) {
  const blocs = [];
  if (plan.paliers.length) {
    const compos = plan.paliers.map((p) => composer(p.dose, mol.comprimes));
    const total = totalComprimes(plan.paliers, mol.comprimes);
    const dosages = total ? total.map((t) => t.dosage) : mol.comprimes.map((c) => c.dosage);
    const lignes = [denomination(mol, dosages)];
    plan.paliers.forEach((p, i) => {
      const detail = compos[i] && compos[i].length ? ` : ${texteComposition(compos[i])}` : "";
      lignes.push(`- ${mg(p.dose)}/j du ${dateDe(p.debut)} au ${dateDe(p.debut + p.jours - 1)}${detail}`);
    });
    lignes.push(plan.hc
      ? `- arrêt le ${dateDe(plan.arret)}, relais par hydrocortisone le même jour`
      : `- arrêt le ${dateDe(plan.arret)}`);
    lignes.push("En une prise le matin, au cours du repas.");
    if (total) lignes.push(`Quantité : ${total.map((t) => `${t.nombre} cp à ${mg(t.dosage)}`).join(", ")}.`);
    else rappels.push(`Certaines doses ne sont pas réalisables en comprimés entiers de ${mol.specialite} : adapter la rédaction ou choisir la prednisone.`);
    blocs.push(lignes.join("\n"));
  }

  if (plan.hc) {
    const h = plan.hc;
    const prise = (dose, moment) => {
      const c = composer(dose, HYDROCORTISONE.comprimes);
      return `${mg(dose)} ${moment}` + (c ? ` (${c.map((x) => quantite(x.nombre)).join(" + ")})` : "");
    };
    const moments = [prise(h.matin, "le matin")];
    if (h.midi > 0) moments.push(prise(h.midi, "à midi"));
    blocs.push([
      denomination(HYDROCORTISONE, HYDROCORTISONE.comprimes.map((c) => c.dosage)),
      `- à partir du ${dateDe(h.debut)} : ${moments.join(" et ")}, soit ${mg(h.total)}/j, aucune prise après 16 h`,
      `- à poursuivre jusqu'à nouvel avis médical, ne pas arrêter brutalement`,
      REGLES.hcQuantite
    ].join("\n"));
    if (!composer(h.matin, HYDROCORTISONE.comprimes) || !composer(h.midi, HYDROCORTISONE.comprimes)) {
      rappels.push("Dose d'hydrocortisone non réalisable en comprimés de 10 mg : prescrire une forme adaptée à l'enfant.");
    }
    if (enfant) rappels.push(`Relais calculé à ${REGLES.hcEnfantMgParM2} mg/m²/j, arrondi à 2,5 mg, 2/3 le matin et 1/3 à midi.`);
  }

  if ($("opt-consignes").checked) blocs.push(TEXTES.consignesCorticoides);
  if (plan.hc && $("opt-consignes-hc").checked) blocs.push(TEXTES.consignesHC);
  return blocs.join("\n\n");
}

function ordonnanceInjectable(enfant, rappels) {
  const inj = HYDROCORTISONE_INJECTABLE;
  const dose = doseHCUrgence(enfant, parseFloat($("age").value), REGLES);
  if (dose === null) {
    rappels.push("Indiquer l'âge de l'enfant pour la dose d'hydrocortisone injectable.");
    return null;
  }
  const volume = (dose / inj.dosage) * inj.volume;
  const fraction = dose === inj.dosage ? "1 flacon" : `${nf.format(volume)} mL du flacon reconstitué`;
  return [
    `${inj.specialite} ${inj.dci} ${inj.galenique} ${mg(inj.dosage)}/${inj.volume} mL :`,
    `- en cas de vomissements, diarrhée ou stress majeur : injecter ${mg(dose)} (${fraction}) en intramusculaire, ou en intraveineuse par un soignant, puis se rendre immédiatement aux urgences`,
    `- flacon à conserver avec soi`,
    `Quantité : 1 flacon.`,
    ``,
    `Seringue de ${inj.volume} mL et aiguille pour injection intramusculaire : 1.`
  ].join("\n");
}

function ordonnanceBilan(plan) {
  const blocs = [TEXTES.cortisol(dateDe(plan.cortisol))];
  if ($("opt-secretariat").checked) blocs.push(TEXTES.secretariat);
  return blocs.join("\n\n");
}

function afficherOrdonnances(liste) {
  const zone = $("ordonnances");
  zone.innerHTML = liste.map((o, i) => `
    <section class="sortie">
      <div class="sortie-tete">
        <h2>${o.titre}</h2>
        <button type="button" class="principal" data-i="${i}">Copier</button>
      </div>
      <textarea spellcheck="false" aria-label="${o.titre}, modifiable avant copie">${echapper(o.texte)}</textarea>
    </section>`).join("");
  zone.querySelectorAll("textarea").forEach(ajusterHauteur);
}
const echapper = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function rediger() {
  const choixDuree = radio("duree");
  const enfant = radio("patient") === "enfant";
  const mol = MOLECULES[radio("molecule")];
  const params = {
    dose: parseFloat($("dose").value),
    pleineDose: joursPleine(),
    duree: choixDuree,
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

  $("conduite").textContent = CONDUITE[choixDuree];
  $("ligne-enfant").hidden = !enfant;
  $("lbl-hc").hidden = enfant;
  $("sc").textContent = enfant && params.poids > 0 && params.taille > 0
    ? `SC ${nf.format(Math.round(surfaceCorporelle(params.poids, params.taille) * 100) / 100)} m²`
    : "";

  const plan = calculerPlan(params, REGLES);
  const avecHC = !!plan.hc;
  document.querySelectorAll(".si-hc").forEach((el) => (el.hidden = !avecHC));

  if (plan.court || plan.erreurs.length) {
    $("resume").innerHTML = plan.court
      ? "<p>Pas de schéma : indiquer une durée à pleine dose pour prescrire le traitement, ou choisir une durée plus longue.</p>"
      : plan.erreurs.map((e) => `<p class="erreur">${e}</p>`).join("");
    afficherOrdonnances([]);
    return;
  }

  // Résumé des durées
  const items = [];
  if (plan.joursPleine) items.push(["Pleine dose", duree(plan.joursPleine)]);
  if (plan.joursDecroissance) items.push(["Décroissance", duree(plan.joursDecroissance)]);
  items.push([plan.hc ? `Fin ${mol.dci}` : "Arrêt", dateDe(plan.arret)]);
  if (plan.hc) items.push(["Relais hydrocortisone", "dès le " + dateDe(plan.hc.debut)]);
  if (plan.cortisol !== null) items.push(["Cortisolémie", dateDe(plan.cortisol)]);
  $("resume").innerHTML = items.map(([k, v]) => `<div><span>${k}</span><strong>${v}</strong></div>`).join("");

  const rappels = [];
  const liste = [{ titre: "Ordonnance : traitement", texte: ordonnanceTraitement(plan, mol, enfant, rappels) }];
  if (avecHC && $("opt-injectable").checked) {
    const inj = ordonnanceInjectable(enfant, rappels);
    if (inj) liste.push({ titre: "Ordonnance : hydrocortisone injectable", texte: inj });
  }
  if (plan.cortisol !== null) liste.push({ titre: "Ordonnance : bilan biologique", texte: ordonnanceBilan(plan) });

  const totalJours = plan.joursPleine + plan.joursDecroissance;
  if (choixDuree === "long" && params.dose >= 7.5) {
    rappels.push("Corticothérapie prolongée : vitamine D et calcium, évaluation du risque fracturaire (DMO), surveillance glycémique, tensionnelle et ophtalmologique.");
  } else if (choixDuree !== "long" && totalJours >= 90 && params.dose > REGLES.seuilPhysiologique) {
    rappels.push("La durée totale prévue dépasse 3 mois : envisager l'option « > 3 mois » (relais hydrocortisone).");
  }

  afficherOrdonnances(liste);
  if (rappels.length) {
    $("ordonnances").insertAdjacentHTML("beforeend", `<div class="rappels">${rappels.map((r) => `<p>${r}</p>`).join("")}</div>`);
  }
}

function ajusterHauteur(t) {
  t.style.height = "auto";
  t.style.height = Math.max(80, t.scrollHeight + 4) + "px";
}

/* ---------- Copie ---------- */
$("ordonnances").addEventListener("click", async (e) => {
  const bouton = e.target.closest("button[data-i]");
  if (!bouton) return;
  const t = bouton.closest("section").querySelector("textarea");
  try {
    await navigator.clipboard.writeText(t.value);
  } catch (err) {
    t.select();
    document.execCommand("copy");
  }
  bouton.textContent = "Copié";
  bouton.classList.add("ok");
  setTimeout(() => { bouton.textContent = "Copier"; bouton.classList.remove("ok"); }, 1500);
});
$("ordonnances").addEventListener("input", (e) => {
  if (e.target.tagName === "TEXTAREA") ajusterHauteur(e.target);
});

/* ---------- Événements ---------- */
$("f").addEventListener("change", (e) => {
  if (e.target.name === "patient") appliquerDefauts();
  if (e.target.name === "duree") optionsSelonDuree();
  if (e.target.id === "pleine-unite") dureeSelonPleineDose();
  if (e.target.id === "opt-secretariat" || e.target.id === "opt-consignes") sauverPrefs();
  rediger();
});
$("f").addEventListener("input", (e) => {
  if (e.target.id === "pleine") dureeSelonPleineDose();
  rediger();
});
$("f").addEventListener("submit", (e) => e.preventDefault());

$("debut").value = new Date().toISOString().slice(0, 10);
appliquerDefauts();
optionsSelonDuree();
chargerPrefs();
rediger();
$("version").textContent = `Version ${APP_VERSION} du ${new Date(APP_DATE + "T00:00:00").toLocaleDateString("fr-FR")}`;
