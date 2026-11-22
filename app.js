/* Interface : lie data.js et logic.js à la page. */

const $ = (id) => document.getElementById(id);
const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const fmt = (x) => nf.format(x);
const molParId = (id) => MOLECULES.find((m) => m.id === id);

/* ---------- Onglets ---------- */
const onglets = [...document.querySelectorAll('[role="tab"]')];
function activer(tab) {
  for (const t of onglets) {
    const actif = t === tab;
    t.setAttribute("aria-selected", String(actif));
    $(t.getAttribute("aria-controls")).hidden = !actif;
  }
  try { localStorage.setItem("onglet", tab.id); } catch (e) {}
}
onglets.forEach((t) => t.addEventListener("click", () => activer(t)));
try {
  const memo = localStorage.getItem("onglet");
  if (memo && $(memo)) activer($(memo));
} catch (e) {}

/* ---------- Classes et équivalences ---------- */
function remplirSelect(select, liste, defaut) {
  select.innerHTML = liste.map((m) => `<option value="${m.id}">${m.nom}</option>`).join("");
  select.value = defaut;
}

function rendreTableClasses() {
  const tbody = $("table-classes").querySelector("tbody");
  let html = "";
  for (const cle of Object.keys(CLASSES)) {
    const c = CLASSES[cle];
    html += `<tr class="groupe"><th colspan="5">${c.label} <span>(demi-vie biologique ${c.demivie})</span></th></tr>`;
    for (const m of MOLECULES.filter((x) => x.classe === cle)) {
      html += `<tr>
        <td><strong>${m.nom}</strong><div class="note">${m.note}</div></td>
        <td class="num">${fmt(m.equiv)} mg</td>
        <td class="num">${fmt(m.antiInfl)}</td>
        <td class="num">${fmt(m.mineralo)}</td>
        <td>${m.specialites.length ? m.specialites.join("<br>") : "<span class=\"note\">Aucune forme orale</span>"}</td>
      </tr>`;
    }
  }
  tbody.innerHTML = html;
}

function rendreConversion() {
  const dose = parseFloat($("conv-dose").value);
  const source = molParId($("conv-mol").value);
  const sortie = $("conv-resultat");
  if (!(dose >= 0)) { sortie.innerHTML = ""; return; }
  sortie.innerHTML = MOLECULES.map((m) => {
    const v = convertir(dose, source, m);
    return `<div class="equiv${m.id === source.id ? " source" : ""}">
      <span class="equiv-nom">${m.nom}</span>
      <span class="equiv-dose">${fmt(v)} mg</span>
    </div>`;
  }).join("");
}

remplirSelect($("conv-mol"), MOLECULES, "prednisone");
rendreTableClasses();
rendreConversion();
$("conv-dose").addEventListener("input", rendreConversion);
$("conv-mol").addEventListener("change", rendreConversion);

/* ---------- Schéma de décroissance ---------- */
const orales = MOLECULES.filter((m) => m.oral);
remplirSelect($("s-mol"), orales, "prednisone");
$("s-debut").value = new Date().toISOString().slice(0, 10);

function rendreDosages() {
  const m = molParId($("s-mol").value);
  $("s-dosages").innerHTML = m.dosages.map((d) =>
    `<label class="case"><input type="checkbox" value="${d}" checked> ${fmt(d)} mg</label>`
  ).join("");
}

/* Quand la molécule change, on convertit les doses saisies. */
let molPrecedente = molParId($("s-mol").value);
function changerMolecule() {
  const m = molParId($("s-mol").value);
  for (const id of ["s-dose", "s-seuil", "s-pas-bas", "s-finale"]) {
    const v = parseFloat($(id).value);
    if (v >= 0) $(id).value = +convertir(v, molPrecedente, m).toFixed(2);
  }
  if ($("s-mode").value === "mg") {
    const v = parseFloat($("s-pas-haut").value);
    if (v >= 0) $("s-pas-haut").value = +convertir(v, molPrecedente, m).toFixed(2);
  }
  molPrecedente = m;
  rendreDosages();
  // les pas en mg sont ramenés au plus petit écart réalisable avec les dosages
  const pas = granularite(m.dosages, $("s-demi").checked);
  const pasIds = $("s-mode").value === "mg" ? ["s-pas-haut", "s-pas-bas"] : ["s-pas-bas"];
  for (const id of pasIds) {
    const v = parseFloat($(id).value);
    if (pas && v >= 0) $(id).value = Math.max(pas, arrondir(v, pas));
  }
  rendreSchema();
}

function lireParams() {
  const num = (id) => parseFloat($(id).value);
  return {
    doseInitiale: num("s-dose"),
    joursInitiaux: Math.round(num("s-jours")),
    mode: $("s-mode").value,
    pasHaut: num("s-pas-haut"),
    joursHaut: Math.round(num("s-jours-haut")),
    seuil: num("s-seuil") || 0,
    pasBas: num("s-pas-bas"),
    joursBas: Math.round(num("s-jours-bas")),
    doseFinale: num("s-finale") || 0,
    dosages: [...$("s-dosages").querySelectorAll("input:checked")].map((c) => parseFloat(c.value)),
    demi: $("s-demi").checked
  };
}

function ajouterJours(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
const fmtDate = (d) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

function texteComprimes(compo) {
  if (!compo) return "non réalisable";
  if (!compo.length) return "";
  return compo.map((c) => {
    const n = c.nombre;
    const nb = n === 0.5 ? "½" : fmt(n);
    return `${nb} cp de ${fmt(c.dosage)} mg`;
  }).join(" + ");
}

let dernierTexte = "";

function rendreSchema() {
  const m = molParId($("s-mol").value);
  const p = lireParams();
  const debut = new Date($("s-debut").value + "T00:00:00");
  const tbody = $("table-schema").querySelector("tbody");
  const { paliers, erreurs } = genererSchema(p);

  const seuilPred = equivPrednisone(p.seuil, m);
  $("s-aide-seuil").textContent =
    `Seuil actuel : ${fmt(seuilPred)} mg/j en équivalent prednisone. ` +
    `Sous ce seuil, la décroissance se fait par paliers fixes en mg.`;

  $("s-erreurs").hidden = !erreurs.length;
  $("s-erreurs").innerHTML = erreurs.map((e) => `<p>${e}</p>`).join("");
  if (erreurs.length || isNaN(debut)) {
    tbody.innerHTML = "";
    $("s-resume").innerHTML = "";
    $("s-alertes").innerHTML = "";
    dernierTexte = "";
    return;
  }

  let jour = 0;
  let cumul = 0;
  let joursAuDessus75 = 0;
  const lignes = [];
  const texte = [];
  for (const pal of paliers) {
    const du = ajouterJours(debut, jour);
    const au = ajouterJours(debut, jour + pal.jours - 1);
    const compo = composer(pal.dose, p.dosages, p.demi);
    const eq = equivPrednisone(pal.dose, m);
    cumul += pal.dose * pal.jours;
    if (eq >= 7.5) joursAuDessus75 += pal.jours;
    lignes.push(`<tr${compo ? "" : ' class="invalide"'}>
      <td>${fmtDate(du)}</td><td>${fmtDate(au)}</td>
      <td class="num">${pal.jours}</td>
      <td class="num"><strong>${fmt(pal.dose)}</strong></td>
      <td>${texteComprimes(compo)}</td>
      <td class="num">${fmt(eq)}</td>
    </tr>`);
    texte.push(`du ${fmtDate(du)} au ${fmtDate(au)} : ${fmt(pal.dose)} mg/j (${texteComprimes(compo)})`);
    jour += pal.jours;
  }
  const fin = ajouterJours(debut, jour);
  const derniere = paliers[paliers.length - 1].dose;
  const finLigne = derniere > 0 && p.doseFinale > 0
    ? `Poursuite à ${fmt(derniere)} mg/j à partir du ${fmtDate(fin)}, puis réévaluation.`
    : `Arrêt le ${fmtDate(fin)}.`;
  lignes.push(`<tr class="fin"><td colspan="6">${finLigne}</td></tr>`);
  tbody.innerHTML = lignes.join("");

  $("s-resume").innerHTML = `
    <div><span>Durée totale</span><strong>${jour} jours</strong></div>
    <div><span>Paliers</span><strong>${paliers.length}</strong></div>
    <div><span>Dose cumulée</span><strong>${fmt(cumul)} mg</strong></div>
    <div><span>Cumul éq. prednisone</span><strong>${fmt(equivPrednisone(cumul, m))} mg</strong></div>`;

  const alertes = [];
  if (joursAuDessus75 > 21) {
    alertes.push("Plus de 3 semaines à 7,5 mg/j ou plus d'équivalent prednisone : risque d'insuffisance surrénalienne. Décroissance lente sous la dose physiologique et évaluation de l'axe corticotrope à discuter avant l'arrêt.");
  }
  if (m.classe === "longue") {
    alertes.push("Molécule à longue durée d'action : freination de l'axe corticotrope plus importante qu'avec la prednisone à dose équivalente.");
  }
  if (lignes.some((l) => l.includes("invalide"))) {
    alertes.push("Certaines doses ne sont pas réalisables avec les dosages cochés : ajouter un dosage, autoriser les demi-comprimés ou modifier les pas.");
  }
  $("s-alertes").innerHTML = alertes.map((a) => `<p class="avert">${a}</p>`).join("");

  const intitule = `${m.nom} (${m.specialites[0] || ""})`;
  $("impr-titre").textContent = `${intitule}, schéma débutant le ${fmtDate(debut)}`;
  dernierTexte = `${m.nom}, en une prise le matin :\n` +
    texte.map((t) => "- " + t).join("\n") + `\n${finLigne}`;
}

$("s-mol").addEventListener("change", changerMolecule);
$("s-mode").addEventListener("change", () => {
  // valeurs par défaut cohérentes lors du changement d'unité
  $("s-pas-haut").value = $("s-mode").value === "pct" ? 25 : +convertir(5, molParId("prednisone"), molParId($("s-mol").value)).toFixed(2);
  rendreSchema();
});
$("form-schema").addEventListener("input", rendreSchema);
$("form-schema").addEventListener("change", rendreSchema);
$("form-schema").addEventListener("submit", (e) => e.preventDefault());

$("b-imprimer").addEventListener("click", () => window.print());
$("b-copier").addEventListener("click", async () => {
  if (!dernierTexte) return;
  const bouton = $("b-copier");
  try {
    await navigator.clipboard.writeText(dernierTexte);
    bouton.textContent = "Copié";
  } catch (e) {
    window.prompt("Copier le texte :", dernierTexte);
  }
  setTimeout(() => (bouton.textContent = "Copier le texte"), 1500);
});

rendreDosages();
rendreSchema();

$("version").textContent = `Version ${APP_VERSION}, mise à jour du ${new Date(APP_DATE + "T00:00:00").toLocaleDateString("fr-FR")}`;
