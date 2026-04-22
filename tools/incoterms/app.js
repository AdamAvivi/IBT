const terms = {
  EXW: {
    name: "EXW - Ex Works",
    modes: ["sea", "multi", "air"],
    delivery: 5,
    risk: 5,
    costTo: 5,
    transferLabel: "Seller's premises",
    sellerPays: "Make goods available at seller's premises.",
    buyerPays: "Loading, export clearance, main carriage, insurance, import clearance, duties, and delivery.",
    insurance: "No seller obligation.",
    matrix: {
      load: "buyer",
      export: "buyer",
      carriage: "buyer",
      insurance: "buyer",
      import: "buyer",
      duty: "buyer"
    }
  },
  FCA: {
    name: "FCA - Free Carrier",
    modes: ["sea", "multi", "air"],
    delivery: 24,
    risk: 24,
    costTo: 24,
    transferLabel: "Named carrier/place",
    sellerPays: "Delivery to named carrier/place and export clearance.",
    buyerPays: "Main carriage, insurance, import clearance, duties, and final delivery.",
    insurance: "No seller obligation.",
    matrix: {
      load: "seller",
      export: "seller",
      carriage: "buyer",
      insurance: "buyer",
      import: "buyer",
      duty: "buyer"
    }
  },
  FAS: {
    name: "FAS - Free Alongside Ship",
    modes: ["sea"],
    delivery: 33,
    risk: 33,
    costTo: 33,
    transferLabel: "Alongside the vessel",
    sellerPays: "Delivery alongside vessel and export clearance.",
    buyerPays: "Loading on vessel, main carriage, insurance, import clearance, duties, and delivery.",
    insurance: "No seller obligation.",
    matrix: {
      load: "buyer",
      export: "seller",
      carriage: "buyer",
      insurance: "buyer",
      import: "buyer",
      duty: "buyer"
    }
  },
  FOB: {
    name: "FOB - Free On Board",
    modes: ["sea"],
    delivery: 40,
    risk: 40,
    costTo: 40,
    transferLabel: "Loaded on board the vessel",
    sellerPays: "Export clearance and loading goods on board the vessel.",
    buyerPays: "Main carriage, insurance, import clearance, duties, and final delivery.",
    insurance: "No seller obligation.",
    matrix: {
      load: "seller",
      export: "seller",
      carriage: "buyer",
      insurance: "buyer",
      import: "buyer",
      duty: "buyer"
    }
  },
  CFR: {
    name: "CFR - Cost and Freight",
    modes: ["sea"],
    delivery: 40,
    risk: 40,
    costTo: 78,
    transferLabel: "Loaded on board the vessel",
    sellerPays: "Export clearance and freight to destination port.",
    buyerPays: "Insurance, import clearance, duties, and final delivery.",
    insurance: "Buyer should arrange insurance.",
    matrix: {
      load: "seller",
      export: "seller",
      carriage: "seller",
      insurance: "buyer",
      import: "buyer",
      duty: "buyer"
    }
  },
  CIF: {
    name: "CIF - Cost, Insurance, and Freight",
    modes: ["sea"],
    delivery: 40,
    risk: 40,
    costTo: 78,
    transferLabel: "Loaded on board the vessel",
    sellerPays: "Export clearance, freight, and insurance to destination port.",
    buyerPays: "Import clearance, duties, and final delivery.",
    insurance: "Seller must procure insurance for buyer's benefit.",
    matrix: {
      load: "seller",
      export: "seller",
      carriage: "seller",
      insurance: "seller",
      import: "buyer",
      duty: "buyer"
    }
  },
  CIP: {
    name: "CIP - Carriage and Insurance Paid To",
    modes: ["sea", "multi", "air"],
    delivery: 24,
    risk: 24,
    costTo: 88,
    transferLabel: "First carrier",
    sellerPays: "Export clearance, carriage, and insurance to named destination.",
    buyerPays: "Import clearance, duties, and final delivery unless included in carriage.",
    insurance: "Seller must procure insurance.",
    matrix: {
      load: "seller",
      export: "seller",
      carriage: "seller",
      insurance: "seller",
      import: "buyer",
      duty: "buyer"
    }
  },
  DDP: {
    name: "DDP - Delivered Duty Paid",
    modes: ["sea", "multi", "air"],
    delivery: 95,
    risk: 95,
    costTo: 95,
    transferLabel: "Named destination",
    sellerPays: "Nearly everything through import clearance and duties at destination.",
    buyerPays: "Unloading unless the contract says otherwise.",
    insurance: "No required insurance, but seller bears risk until destination.",
    matrix: {
      load: "seller",
      export: "seller",
      carriage: "seller",
      insurance: "seller",
      import: "seller",
      duty: "seller"
    }
  }
};

const labels = {
  load: "Loading / delivery to carrier",
  export: "Export clearance",
  carriage: "Main carriage",
  insurance: "Insurance",
  import: "Import clearance",
  duty: "Import duties / tariffs"
};

const el = {
  term: document.getElementById("term"),
  place: document.getElementById("place"),
  mode: document.getElementById("mode"),
  termTitle: document.getElementById("termTitle"),
  modeWarning: document.getElementById("modeWarning"),
  transferPoint: document.getElementById("transferPoint"),
  sellerCostBar: document.getElementById("sellerCostBar"),
  transferCaption: document.getElementById("transferCaption"),
  costCaption: document.getElementById("costCaption"),
  transportCaption: document.getElementById("transportCaption"),
  riskTransfer: document.getElementById("riskTransfer"),
  sellerPays: document.getElementById("sellerPays"),
  buyerPays: document.getElementById("buyerPays"),
  insurance: document.getElementById("insurance"),
  eventResult: document.getElementById("eventResult"),
  matrixBody: document.getElementById("matrixBody")
};

let selectedEvent = "none";

Object.keys(terms).forEach((key) => {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = terms[key].modes.length === 1 && terms[key].modes[0] === "sea"
    ? `${terms[key].name} (sea only)`
    : `${terms[key].name} (any mode)`;
  if (key === "CIF") option.selected = true;
  el.term.append(option);
});

function fallbackTermForMode(mode) {
  if (mode === "air" || mode === "multi") return "CIP";
  return "CIF";
}

function syncTermOptions() {
  const mode = el.mode.value;
  Array.from(el.term.options).forEach((option) => {
    const allowed = terms[option.value].modes.includes(mode);
    option.disabled = !allowed;
  });

  if (!terms[el.term.value].modes.includes(mode)) {
    el.term.value = fallbackTermForMode(mode);
  }
}

function eventResult(termKey, eventKey) {
  const term = terms[termKey];
  if (eventKey === "none") {
    return "No problem selected. Use the route and matrix to compare legal handoff, risk transfer, and cost responsibility.";
  }
  if (eventKey === "lostBeforeCarrier") {
    return "Before the delivery point, seller generally bears the loss. After the delivery point, buyer generally bears it.";
  }
  if (eventKey === "lostAtSea") {
    return term.risk <= 45
      ? `Risk has usually passed to buyer under ${termKey}, even if seller paid for freight. The insurance answer depends on the term.`
      : `Risk likely remains with seller because ${termKey} keeps risk with seller until a later destination delivery point.`;
  }
  if (eventKey === "importDelay") {
    return term.matrix.import === "seller"
      ? "Seller is responsible for import clearance under this term."
      : "Buyer is responsible for import clearance and delay consequences under this term.";
  }
  return term.matrix.insurance === "seller"
    ? "Seller must arrange insurance, but the buyer may still bear risk after the delivery point."
    : "There is no seller insurance obligation; buyer should arrange coverage if risk has passed.";
}

function transportCaption(termKey, mode) {
  const seaOnly = ["FAS", "FOB", "CFR", "CIF"];
  if (seaOnly.includes(termKey) && mode !== "sea") {
    return `${termKey} is designed for sea/inland waterway transport. For air, containers, or mixed transport, use FCA, CPT, CIP, DAP, DPU, or DDP instead.`;
  }
  if (mode === "sea") {
    return "Sea mode allows vessel-based terms like FAS, FOB, CFR, and CIF.";
  }
  if (mode === "air") {
    return "Air transport should use multimodal terms. Vessel-loading terms like FOB/CIF do not fit air shipments.";
  }
  return "Multimodal transport means more than one mode, often truck plus rail plus ship. FCA/CPT/CIP-style terms usually fit better than FOB/CIF.";
}

function handoffText(termKey, term, place) {
  if (termKey === "DDP") {
    return `At the named destination: ${place}. For DDP, seller keeps risk until the goods are placed at buyer's disposal there.`;
  }
  if (termKey === "EXW") {
    return `At seller's premises. Buyer takes risk very early, before loading, export, carriage, or arrival at ${place}.`;
  }
  if (["CFR", "CIF"].includes(termKey)) {
    return `When the goods are loaded on board the vessel at the shipment port. This is before physical arrival at ${place}, even though seller pays freight to ${place}.`;
  }
  if (termKey === "CIP") {
    return `When seller hands the goods to the first carrier. This can be before physical arrival at ${place}, even though seller pays carriage and insurance toward ${place}.`;
  }
  return `At ${term.transferLabel}. This may be before physical arrival at ${place}, depending on the route.`;
}

function renderMatrix(term) {
  el.matrixBody.innerHTML = "";
  Object.entries(labels).forEach(([key, label]) => {
    const responsible = term.matrix[key];
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${label}</td>
      <td class="${responsible === "seller" ? "yes" : "no"}">${responsible === "seller" ? "Responsible" : "-"}</td>
      <td class="${responsible === "buyer" ? "yes" : "no"}">${responsible === "buyer" ? "Responsible" : "-"}</td>
    `;
    el.matrixBody.append(row);
  });
}

function render() {
  const key = el.term.value;
  const term = terms[key];
  const place = el.place.value.trim() || "named place";

  el.termTitle.textContent = `${term.name} ${place}`;
  el.transferPoint.style.setProperty("--pos", `${term.risk}%`);
  el.sellerCostBar.style.setProperty("--cost-to", `${term.costTo}%`);
  el.transferCaption.textContent = `Legal delivery and risk transfer at: ${term.transferLabel}.`;
  el.costCaption.textContent = term.costTo > term.risk
    ? `Seller still pays some costs after risk has passed to buyer.`
    : `Seller costs stop at the same point risk transfers.`;
  el.transportCaption.textContent = transportCaption(key, el.mode.value);
  el.riskTransfer.textContent = handoffText(key, term, place);
  el.sellerPays.textContent = term.sellerPays;
  el.buyerPays.textContent = term.buyerPays;
  el.insurance.textContent = term.insurance;
  el.eventResult.textContent = eventResult(key, selectedEvent);
  el.modeWarning.textContent = term.modes.includes(el.mode.value)
    ? ""
    : `${key} is a sea/inland waterway term. Use FCA, CPT, CIP, or another multimodal term for containers, air, or mixed transport.`;
  renderMatrix(term);
}

["term", "place"].forEach((id) => {
  el[id].addEventListener("input", render);
});

el.mode.addEventListener("input", () => {
  syncTermOptions();
  render();
});

document.querySelectorAll(".event-option").forEach((button) => {
  button.addEventListener("click", () => {
    selectedEvent = button.dataset.event;
    document.querySelectorAll(".event-option").forEach((option) => {
      const active = option === button;
      option.classList.toggle("active", active);
      option.setAttribute("aria-checked", String(active));
    });
    render();
  });
});

syncTermOptions();
render();
