const terms = [
  { key: "price", label: "Price", material: true, defaultIncluded: true },
  { key: "quantity", label: "Quantity", material: true, defaultIncluded: true },
  { key: "goods", label: "Goods description", material: true, defaultIncluded: true },
  { key: "quality", label: "Quality / specifications", material: true, defaultIncluded: false },
  { key: "payment", label: "Payment terms", material: true, defaultIncluded: true },
  { key: "deliveryPlace", label: "Place of delivery", material: true, defaultIncluded: false },
  { key: "deliveryTime", label: "Time of delivery", material: true, defaultIncluded: false },
  { key: "shipping", label: "Shipping / Incoterm", material: true, defaultIncluded: true },
  { key: "warranty", label: "Warranty / liability", material: true, defaultIncluded: true },
  { key: "damages", label: "Limitation of damages", material: true, defaultIncluded: false },
  { key: "forum", label: "Forum clause", material: true, defaultIncluded: true },
  { key: "arbitration", label: "Arbitration", material: true, defaultIncluded: true },
  { key: "law", label: "Choice of law", material: true, defaultIncluded: false },
  { key: "minor", label: "Other non-material term", material: false, defaultIncluded: false }
];

const options = {
  price: ["$100/kg", "$120/kg", "$145/kg", "$1 million total", "Market price"],
  quantity: ["1,000 units", "800 units", "All output", "Requirements quantity", "100 metric tons"],
  goods: ["Grade A widgets", "Grade B widgets", "Mexican avocados", "Grape jelly", "Peanut butter and jelly swirl"],
  quality: ["Casebook specs", "Seller's standard specs", "Inspection certificate required", "No inspection certificate required"],
  payment: ["Net 30", "Payment before shipment", "Payment against documents", "Letter of credit required", "Open account"],
  deliveryPlace: ["Athens", "New York", "Seller's plant", "Buyer's warehouse", "Port of New York"],
  deliveryTime: ["June 1", "July 1", "Next month", "Within 30 days", "Time is of the essence"],
  shipping: ["FOB New York", "CIF Athens", "FCA Seller's Plant", "CIP Buyer Warehouse", "EXW Seller's Plant"],
  warranty: ["Full warranty", "No warranty", "Seller warrants conformity", "As-is"],
  damages: ["Consequential damages allowed", "Damages capped at price", "No consequential damages", "Liquidated damages apply"],
  forum: ["Athens", "New York", "Buyer home courts", "Seller home courts"],
  arbitration: ["AAA arbitration", "ICC arbitration", "Court litigation only", "All disputes arbitrated"],
  law: ["New York, not CISG", "Greece, not CISG", "CISG applies", "UNIDROIT principles incorporated"],
  minor: ["All M&M's will be green", "Blue packaging required", "Invoices must use buyer PO number"]
};

const baseDeal = {
  price: "$100/kg",
  quantity: "1,000 units",
  goods: "Grade A widgets",
  quality: "Casebook specs",
  payment: "Net 30",
  deliveryPlace: "Athens",
  deliveryTime: "June 1",
  shipping: "FOB New York",
  warranty: "Full warranty",
  damages: "Consequential damages allowed",
  forum: "Athens",
  arbitration: "AAA arbitration",
  law: "New York, not CISG",
  minor: ""
};

const examples = {
  blank: {},
  forum: {
    forum: ["Athens", "New York"]
  },
  minor: {
    minor: ["", "All M&M's will be green"]
  },
  warranty: {
    warranty: ["Full warranty", "No warranty"],
    law: ["New York, not CISG", "Greece, not CISG"]
  },
  fullConflict: {
    price: ["$100/kg", "$120/kg"],
    quantity: ["1,000 units", "800 units"],
    goods: ["Grade A widgets", "Grade B widgets"],
    quality: ["Casebook specs", "Seller's standard specs"],
    payment: ["Net 30", "Payment before shipment"],
    deliveryPlace: ["Athens", "New York"],
    deliveryTime: ["June 1", "July 1"],
    shipping: ["FOB New York", "CIF Athens"],
    warranty: ["Full warranty", "No warranty"],
    damages: ["Consequential damages allowed", "Damages capped at price"]
  }
};

const el = {
  bothMerchants: document.getElementById("bothMerchants"),
  performed: document.getElementById("performed"),
  standardTerms: document.getElementById("standardTerms"),
  promptObjection: document.getElementById("promptObjection"),
  conditional: document.getElementById("conditional"),
  exampleSelect: document.getElementById("exampleSelect"),
  termToggles: document.getElementById("termToggles"),
  termRows: document.getElementById("termRows"),
  issueCount: document.getElementById("issueCount"),
  issueSummary: document.getElementById("issueSummary")
};

let activeLaw = "ucc";

const lawLabels = {
  ucc: "UCC Majority",
  uccMinority: "UCC Minority",
  cisg: "CISG",
  unidroit: "UNIDROIT"
};

function createSelect(id, termKey) {
  const select = document.createElement("select");
  select.id = id;

  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "No term";
  select.append(blank);

  options[termKey].forEach((text) => {
    const option = document.createElement("option");
    option.value = text;
    option.textContent = text;
    select.append(option);
  });

  select.addEventListener("input", render);
  return select;
}

function createTermRows() {
  el.termToggles.innerHTML = "";
  el.termRows.innerHTML = "";

  terms.forEach((term) => {
    const toggle = document.createElement("label");
    toggle.className = "check term-toggle";
    toggle.innerHTML = `<input id="${term.key}Enabled" type="checkbox" ${term.defaultIncluded ? "checked" : ""} /> ${term.label}`;
    toggle.querySelector("input").addEventListener("input", render);
    el.termToggles.append(toggle);

    const buyer = createSelect(`${term.key}Buyer`, term.key);
    const seller = createSelect(`${term.key}Seller`, term.key);
    buyer.classList.add(`term-${term.key}`);
    seller.classList.add(`term-${term.key}`);

    const row = document.createElement("div");
    row.id = `${term.key}Row`;
    row.className = `term-row term-${term.key}`;

    const name = document.createElement("div");
    name.className = "term-name";
    name.innerHTML = `<strong>${term.label}</strong>`;

    const buyerCell = document.createElement("div");
    buyerCell.append(buyer);

    const sellerCell = document.createElement("div");
    sellerCell.append(seller);

    const comparison = document.createElement("div");
    comparison.id = `${term.key}Comparison`;

    const material = document.createElement("div");
    material.innerHTML = `<span class="material-pill ${term.material ? "yes" : "no"}">${term.material ? "yes" : "no"}</span>`;

    row.append(name, buyerCell, sellerCell, comparison, material);
    el.termRows.append(row);
  });
}

function facts() {
  return {
    bothMerchants: el.bothMerchants.checked,
    performed: el.performed.checked,
    standardTerms: el.standardTerms.checked,
    promptObjection: el.promptObjection.checked,
    conditional: el.conditional.checked
  };
}

function statusFor(buyer, seller) {
  if (!buyer && !seller) return "silent";
  if (buyer && seller && buyer === seller) return "same";
  if (buyer && seller && buyer !== seller) return "different";
  if (!buyer && seller) return "additional";
  return "buyerOnly";
}

function statusLabel(status) {
  return {
    silent: "Not addressed",
    same: "Same",
    different: "Different",
    additional: "Seller added",
    buyerOnly: "Buyer only"
  }[status];
}

function comparisonData() {
  return terms.map((term) => {
    const buyer = document.getElementById(`${term.key}Buyer`).value;
    const seller = document.getElementById(`${term.key}Seller`).value;
    const enabled = document.getElementById(`${term.key}Enabled`).checked;
    return {
      ...term,
      enabled,
      buyer,
      seller,
      status: enabled ? statusFor(buyer, seller) : "disabled"
    };
  });
}

function changedTerms(data) {
  return data.filter((term) => term.enabled && (term.status === "different" || term.status === "additional"));
}

function issueTerms(data) {
  return data.filter((term) => term.enabled && (term.status === "different" || term.status === "additional" || term.status === "buyerOnly"));
}

function materialChanges(data) {
  return changedTerms(data).filter((term) => term.material);
}

function nonMaterialAdditions(data) {
  return changedTerms(data).filter((term) => term.status === "additional" && !term.material);
}

function materialAdditions(data) {
  return changedTerms(data).filter((term) => term.status === "additional" && term.material);
}

function differentTerms(data) {
  return changedTerms(data).filter((term) => term.status === "different");
}

function buyerOnlyTerms(data) {
  return data.filter((term) => term.enabled && term.status === "buyerOnly");
}

function listNames(items) {
  if (!items.length) return "none";
  return items.map((item) => item.label.toLowerCase()).join(", ");
}

function hasOnlyMinorAdditions(data) {
  const changed = changedTerms(data);
  return changed.length > 0 && changed.every((term) => term.status === "additional" && !term.material);
}

function agreedValue(term) {
  if (term.status === "same") return term.buyer;
  if (term.status === "buyerOnly") return term.buyer;
  return "";
}

function valueForApproach(term, approach) {
  if (term.status === "silent") return "No express term; use applicable gap filler if needed";
  if (term.status === "same") return term.buyer;
  if (term.status === "buyerOnly") return term.buyer;

  if (approach === "uccMajority") {
    if (term.status === "different") return "Excluded by knock-out rule; use UCC gap filler";
    if (term.status === "additional") {
      if (!term.material && facts().bothMerchants && !facts().promptObjection) return term.seller;
      return "Excluded unless expressly accepted";
    }
  }

  if (approach === "uccMinority") {
    if (term.status === "different") return term.seller;
    if (term.status === "additional") {
      if (!term.material && facts().bothMerchants && !facts().promptObjection) return term.seller;
      return "Excluded unless expressly accepted";
    }
  }

  if (approach === "cisg") {
    if (term.status === "different") return facts().performed ? "Unresolved after conduct; likely gap filler or excluded" : "No contract on documents";
    if (term.status === "additional") {
      if (!term.material && !facts().promptObjection) return term.seller;
      return facts().performed ? "Unresolved after conduct; likely gap filler or excluded" : "No contract on documents";
    }
  }

  if (approach === "unidroit") {
    if (facts().standardTerms && (term.status === "different" || term.status === "additional")) {
      return term.status === "different" ? "Excluded; use gap filler if needed" : "Excluded unless separately accepted";
    }
    if (term.status === "different") return facts().performed ? "Unresolved; requires acceptance or gap filler" : "Probably no contract on documents";
    if (term.status === "additional") return "Excluded unless separately accepted";
  }

  return agreedValue(term) || "No express term";
}

function contractTerms(data, approach) {
  return data
    .filter((term) => term.enabled && term.status !== "silent")
    .map((term) => ({
      label: term.label,
      value: valueForApproach(term, approach),
      issue: term.status !== "same"
    }));
}

function analyzeUcc(data) {
  const f = facts();
  const changed = changedTerms(data);
  const different = differentTerms(data);
  const minorAdds = nonMaterialAdditions(data);
  const majorAdds = materialAdditions(data);
  const buyerOnly = buyerOnlyTerms(data);

  if (f.conditional && !f.performed) {
    return {
      contract: "Probably no contract on the documents",
      termsShort: "No contract terms yet",
      contractTerms: contractTerms(data, "uccMajority"),
      steps: [
        "One side made acceptance expressly conditional on its own terms.",
        "That can prevent the response from acting as an acceptance under UCC 2-207.",
        "If the parties later perform, UCC 2-207(3) can still create a contract by conduct."
      ]
    };
  }

  if (f.conditional && f.performed) {
    return {
      contract: "Yes",
      termsShort: "Agreed terms plus UCC gap fillers",
      contractTerms: contractTerms(data, "uccMajority"),
      steps: [
        "The documents did not cleanly match, but the parties performed anyway.",
        "UCC 2-207(3) forms a contract by conduct.",
        `Conflicting terms drop out: ${listNames(different)}.`,
        "Terms on which the writings agree stay in; UCC gap fillers handle the rest."
      ]
    };
  }

  const steps = [
    "UCC 2-207 is formation-friendly. A definite acceptance can create a contract even though the forms contain extra or different terms."
  ];

  if (different.length) {
    steps.push(`Different terms usually drop out under the majority knock-out rule: ${listNames(different)}.`);
    steps.push("Caveat: some courts use a minority last-shot approach for different terms.");
  }

  if (minorAdds.length && f.bothMerchants && !f.promptObjection) {
    steps.push(`Additional non-material merchant terms become part of the contract: ${listNames(minorAdds)}.`);
  }

  if (minorAdds.length && (!f.bothMerchants || f.promptObjection)) {
    steps.push(`Additional non-material terms do not automatically enter because ${f.promptObjection ? "there was a prompt objection" : "both parties are not merchants"}.`);
  }

  if (majorAdds.length) {
    steps.push(`Additional material terms are proposals only unless expressly accepted: ${listNames(majorAdds)}.`);
  }

  if (buyerOnly.length) {
    steps.push(`Buyer-only terms remain part of the offer if the seller's response otherwise operates as an acceptance: ${listNames(buyerOnly)}.`);
  }

  if (!changed.length && !buyerOnly.length) {
    steps.push("No listed term differs or was added.");
  }

  return {
    contract: "Yes",
    termsShort: different.length ? "Conflicts knocked out" : minorAdds.length && f.bothMerchants && !f.promptObjection ? "Minor added terms enter" : "Agreed terms control",
    contractTerms: contractTerms(data, "uccMajority"),
    steps
  };
}

function analyzeUccMinority(data) {
  const f = facts();
  const changed = changedTerms(data);
  const different = differentTerms(data);
  const minorAdds = nonMaterialAdditions(data);
  const majorAdds = materialAdditions(data);
  const buyerOnly = buyerOnlyTerms(data);

  if (f.conditional && !f.performed) {
    return {
      contract: "Probably no contract on the documents",
      termsShort: "No contract terms yet",
      contractTerms: contractTerms(data, "uccMinority"),
      steps: [
        "The minority last-shot approach still needs a contract first.",
        "Expressly conditional language can prevent formation on the documents.",
        "If the parties perform, the analysis moves toward contract by conduct."
      ]
    };
  }

  const steps = [
    "This card shows the minority UCC approach for different terms.",
    "Instead of knocking conflicting terms out, some courts treat the seller's confirmation as the last shot."
  ];

  if (different.length) {
    steps.push(`Seller's different terms control under last shot: ${listNames(different)}.`);
  }

  if (minorAdds.length && f.bothMerchants && !f.promptObjection) {
    steps.push(`Additional non-material merchant terms also enter: ${listNames(minorAdds)}.`);
  }

  if (majorAdds.length) {
    steps.push(`Additional material terms remain proposals unless expressly accepted: ${listNames(majorAdds)}.`);
  }

  if (buyerOnly.length) {
    steps.push(`Buyer-only terms are treated as offer terms if the confirmation accepts the offer: ${listNames(buyerOnly)}.`);
  }

  if (!changed.length && !buyerOnly.length) {
    steps.push("No listed term differs or was added, so the minority issue does not matter.");
  }

  return {
    contract: f.performed ? "Yes, by conduct or documents" : "Yes",
    termsShort: different.length ? "Seller's conflicting terms control" : "Agreed terms control",
    contractTerms: contractTerms(data, "uccMinority"),
    steps
  };
}

function analyzeCisg(data) {
  const f = facts();
  const material = materialChanges(data);
  const minorOnly = hasOnlyMinorAdditions(data);

  if (material.length && !f.performed) {
    return {
      contract: "No contract on the documents",
      termsShort: "Reply is a counteroffer",
      noContract: true,
      contractTerms: [],
      steps: [
        "CISG Article 19 treats material changes as counteroffers.",
        `The material changed terms are: ${listNames(material)}.`,
        "Because the reply is a counteroffer, there is no contract on the documents and no contract terms to list."
      ]
    };
  }

  if (material.length && f.performed) {
    return {
      contract: "Yes, by conduct",
      termsShort: "Material conflicts unresolved or gap-filled",
      contractTerms: contractTerms(data, "cisg"),
      steps: [
        "The papers did not form a contract because the reply materially changed the offer.",
        "Performance shows the parties accepted a deal anyway.",
        `The disputed material terms remain the hard issue: ${listNames(material)}.`
      ]
    };
  }

  if (minorOnly && f.promptObjection) {
    return {
      contract: "Yes",
      termsShort: "Minor added term excluded",
      contractTerms: contractTerms(data, "cisg"),
      steps: [
        "A reply with only non-material additions can still be an acceptance.",
        "The added term is excluded because the other party objected without undue delay."
      ]
    };
  }

  if (minorOnly) {
    return {
      contract: "Yes",
      termsShort: "Minor added term enters",
      contractTerms: contractTerms(data, "cisg"),
      steps: [
        "A reply with only non-material additions can operate as an acceptance.",
        `Because there was no prompt objection, the added term enters: ${listNames(nonMaterialAdditions(data))}.`
      ]
    };
  }

  return {
    contract: "Yes",
    termsShort: "Agreed terms control",
    contractTerms: contractTerms(data, "cisg"),
    steps: [
      "No material change was selected.",
      "The reply can operate as an acceptance.",
      "The shared terms become the contract terms."
    ]
  };
}

function analyzeUnidroit(data) {
  const f = facts();
  const changed = changedTerms(data);
  const different = differentTerms(data);
  const additions = changed.filter((term) => term.status === "additional");

  if (f.standardTerms) {
    const steps = [
      "UNIDROIT Article 2.1.22 directly addresses battle of the forms.",
      "If the parties agree except for standard terms, a contract is formed.",
      "Terms common in substance stay in. Conflicting standard terms drop out."
    ];

    if (different.length) steps.push(`Conflicting standard terms excluded: ${listNames(different)}.`);
    if (additions.length) steps.push(`Additional standard terms are not common in substance unless separately accepted: ${listNames(additions)}.`);

    return {
      contract: "Yes",
      termsShort: changed.length ? "Common terms only" : "Agreed terms control",
      contractTerms: contractTerms(data, "unidroit"),
      steps
    };
  }

  if (materialChanges(data).length && !f.performed) {
    return {
      contract: "Probably no contract on the documents",
      termsShort: "Material change blocks acceptance",
      contractTerms: contractTerms(data, "unidroit"),
      steps: [
        "Because the disputed terms are marked as negotiated rather than boilerplate, the special standard-terms rule does not solve the problem.",
        `Material changes point toward counteroffer: ${listNames(materialChanges(data))}.`,
        "Performance would make contract formation easier to find."
      ]
    };
  }

  return {
    contract: "Yes",
    termsShort: changed.length ? "Conflicts likely excluded" : "Agreed terms control",
    contractTerms: contractTerms(data, "unidroit"),
    steps: [
      "Ordinary formation rules apply because the standard-terms box is off.",
      "Agreement on the core deal plus conduct supports formation.",
      changed.length ? `Changed terms need separate acceptance or gap filling: ${listNames(changed)}.` : "No changed terms were selected."
    ]
  };
}

function renderResult(prefix, result) {
  document.getElementById("activeLawTitle").textContent = lawLabels[prefix];
  document.getElementById("activeContract").textContent = result.contract;
  document.getElementById("activeTermsShort").textContent = result.termsShort;
  const list = document.getElementById("activeSteps");
  list.innerHTML = "";
  result.steps.forEach((step) => {
    const item = document.createElement("li");
    item.textContent = step;
    list.append(item);
  });

  const contractList = document.getElementById("activeContractTerms");
  contractList.innerHTML = "";
  if (result.noContract) {
    const item = document.createElement("li");
    item.className = "no-contract";
    item.innerHTML = `<strong>No contract formed under this approach.</strong>`;
    contractList.append(item);
    return;
  }
  result.contractTerms.forEach((term) => {
    const item = document.createElement("li");
    item.className = term.issue ? "contract-issue" : "";
    item.innerHTML = `<span>${term.label}</span><strong>${term.value}</strong>`;
    contractList.append(item);
  });
}

function activeRelevantFacts(data) {
  const different = differentTerms(data);
  const material = materialChanges(data);
  const minorAdds = nonMaterialAdditions(data);
  const majorAdds = materialAdditions(data);
  const changed = changedTerms(data);
  const relevant = new Set();

  if (activeLaw === "ucc" || activeLaw === "uccMinority") {
    if (minorAdds.length) {
      relevant.add("factBothMerchants");
      relevant.add("factPromptObjection");
    }
    if (different.length || minorAdds.length || majorAdds.length) {
      relevant.add("factConditional");
    }
    if (facts().conditional || (different.length && activeLaw === "ucc")) {
      relevant.add("factPerformed");
    }
  }

  if (activeLaw === "cisg") {
    if (material.length) relevant.add("factPerformed");
    if (changed.length && !material.length) relevant.add("factPromptObjection");
  }

  if (activeLaw === "unidroit") {
    if (changed.length) relevant.add("factStandardTerms");
    if (!facts().standardTerms && material.length) relevant.add("factPerformed");
  }

  return relevant;
}

function updateFactHighlights(data) {
  const relevant = activeRelevantFacts(data);
  document.querySelectorAll(".facts-panel .check").forEach((label) => {
    label.classList.remove("fact-relevant");
  });
  relevant.forEach((id) => {
    document.getElementById(id).classList.add("fact-relevant");
  });
}

function renderComparisons(data) {
  data.forEach((term) => {
    const cell = document.getElementById(`${term.key}Comparison`);
    cell.innerHTML = `<span class="pill ${term.status}">${term.enabled ? statusLabel(term.status) : "Excluded"}</span>`;
    document.getElementById(`${term.key}Row`).classList.toggle("is-hidden", !term.enabled);
    document.querySelectorAll(`.term-${term.key}`).forEach((rowCell) => {
      rowCell.classList.toggle("row-issue", term.enabled && (term.status === "different" || term.status === "additional" || term.status === "buyerOnly"));
      rowCell.classList.toggle("row-same", term.enabled && term.status === "same");
    });
  });
}

function renderSummary(data) {
  const changed = issueTerms(data);
  const material = materialChanges(data);
  const minorAdds = nonMaterialAdditions(data);
  el.issueCount.textContent = `${changed.length} issue${changed.length === 1 ? "" : "s"} selected`;

  if (!changed.length) {
    el.issueSummary.textContent = "No disputed or added terms selected. Choose buyer and seller terms above to create a battle-of-the-forms issue.";
    return;
  }

  const parts = [
    `Changed terms: ${listNames(changed)}.`,
    material.length ? `Material under CISG Article 19: ${listNames(material)}.` : "No material term changed.",
    minorAdds.length ? `Non-material added term: ${listNames(minorAdds)}.` : ""
  ].filter(Boolean);
  el.issueSummary.textContent = parts.join(" ");
}

function render() {
  const data = comparisonData();
  renderComparisons(data);
  renderSummary(data);
  const analyzers = {
    ucc: analyzeUcc,
    uccMinority: analyzeUccMinority,
    cisg: analyzeCisg,
    unidroit: analyzeUnidroit
  };
  renderResult(activeLaw, analyzers[activeLaw](data));
  updateFactHighlights(data);
}

function clearForms() {
  terms.forEach((term) => {
    const nextValue = baseDeal[term.key] || "";
    document.getElementById(`${term.key}Enabled`).checked = term.defaultIncluded;
    document.getElementById(`${term.key}Buyer`).value = nextValue;
    document.getElementById(`${term.key}Seller`).value = nextValue;
  });
  el.performed.checked = false;
  el.promptObjection.checked = false;
  el.standardTerms.checked = true;
  el.conditional.checked = false;
}

function applyExample(name) {
  clearForms();
  const example = examples[name] || {};
  Object.entries(example).forEach(([key, pair]) => {
    document.getElementById(`${key}Enabled`).checked = true;
    document.getElementById(`${key}Buyer`).value = pair[0];
    document.getElementById(`${key}Seller`).value = pair[1];
  });
  render();
}

createTermRows();
document.querySelectorAll("input").forEach((input) => input.addEventListener("input", render));
el.exampleSelect.addEventListener("input", () => applyExample(el.exampleSelect.value));
document.querySelectorAll(".law-tab").forEach((button) => {
  button.addEventListener("click", () => {
    activeLaw = button.dataset.law;
    document.querySelectorAll(".law-tab").forEach((tab) => {
      tab.classList.toggle("active", tab === button);
    });
    render();
  });
});
el.exampleSelect.value = "forum";
applyExample("forum");
