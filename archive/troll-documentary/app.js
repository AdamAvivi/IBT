const steps = [
  {
    title: "Contract signed",
    description: "The parties agree to a documentary sale. The seller will perform by shipping goods and tendering documents, not by handing goods directly to the buyer.",
    goods: "Seller",
    docs: "None issued",
    money: "Buyer or buyer's bank",
    goodsPos: 0,
    docsPos: 0,
    moneyPos: 100
  },
  {
    title: "Buyer arranges payment channel",
    description: "The buyer opens the payment channel required by the deal. In a letter of credit sale, the buyer's bank promises to pay if the documents strictly comply.",
    goods: "Seller",
    docs: "None issued",
    money: "Buyer bank",
    goodsPos: 0,
    docsPos: 0,
    moneyPos: 86
  },
  {
    title: "Seller ships the goods",
    description: "The seller delivers the goods to the carrier. Depending on the shipping term, this may transfer risk even though the buyer has not seen the goods.",
    goods: "Carrier",
    docs: "Carrier preparing bill of lading",
    money: "Buyer bank",
    goodsPos: 50,
    docsPos: 42,
    moneyPos: 86
  },
  {
    title: "Carrier issues bill of lading",
    description: "The bill of lading is both a receipt and a document of title. A negotiable bill lets the document control access to the goods.",
    goods: "Carrier",
    docs: "Seller",
    money: "Buyer bank",
    goodsPos: 55,
    docsPos: 10,
    moneyPos: 86
  },
  {
    title: "Seller presents document packet",
    description: "The seller tenders the invoice, bill of lading, insurance document when required, and any certificates demanded by the payment instructions.",
    goods: "At sea",
    docs: "Seller bank",
    money: "Buyer bank",
    goodsPos: 62,
    docsPos: 22,
    moneyPos: 86
  },
  {
    title: "Bank checks documents",
    description: "The bank examines documents on their face. It does not inspect the goods. Under strict compliance, discrepancies can block payment.",
    goods: "At sea",
    docs: "Buyer bank",
    money: "Buyer bank",
    goodsPos: 70,
    docsPos: 78,
    moneyPos: 86
  },
  {
    title: "Payment moves to seller",
    description: "If the documents comply, payment moves through the banking channel. In a documentary collection, the bank forwards documents but does not make an independent promise.",
    goods: "Destination port",
    docs: "Buyer",
    money: "Seller",
    goodsPos: 86,
    docsPos: 100,
    moneyPos: 0
  },
  {
    title: "Buyer claims goods",
    description: "The buyer uses the bill of lading to obtain the goods from the carrier. Any dispute may turn on whether the buyer had to pay against documents before seeing the cargo.",
    goods: "Buyer",
    docs: "Buyer",
    money: "Seller",
    goodsPos: 100,
    docsPos: 100,
    moneyPos: 0
  }
];

const termRules = {
  CIF: {
    riskStep: 2,
    riskText: "Buyer after loading on vessel; seller pays cost, insurance, and freight to destination.",
    paymentText: "Buyer commonly pays against conforming documents, not against physical delivery of goods.",
    insurance: "Seller must procure insurance for buyer's benefit."
  },
  FOB: {
    riskStep: 2,
    riskText: "Buyer after goods are loaded on the vessel at the named port.",
    paymentText: "Payment terms must be supplied separately; FOB itself mainly allocates delivery, cost, and risk.",
    insurance: "Buyer normally decides whether to insure after risk passes."
  },
  CFR: {
    riskStep: 2,
    riskText: "Buyer after loading on vessel; seller pays freight but not insurance.",
    paymentText: "Documents matter because seller must provide transport documents for the paid freight route.",
    insurance: "Buyer should arrange insurance."
  },
  FCA: {
    riskStep: 2,
    riskText: "Buyer once seller delivers to the named carrier or place.",
    paymentText: "Useful for containers and multimodal transport; payment against documents depends on the contract.",
    insurance: "No seller insurance obligation unless separately agreed."
  },
  CIP: {
    riskStep: 2,
    riskText: "Buyer once seller delivers to first carrier; seller still pays carriage and insurance to destination.",
    paymentText: "Often used for containerized or multimodal shipments with document-based payment.",
    insurance: "Seller must procure insurance even though risk has already passed."
  }
};

const paymentRules = {
  lc: "Letter of credit: the issuer's duty is independent from the sale contract and turns on facially compliant documents.",
  collection: "Documentary collection: banks move documents and collect payment, but the bank usually does not independently promise to pay.",
  open: "Open account: seller carries more credit risk because documents or goods may move before payment.",
  advance: "Cash in advance: buyer carries more performance risk because payment occurs before shipment."
};

let currentStep = 0;

const ids = [
  "shippingTerm",
  "paymentMethod",
  "problemEvent",
  "stepNumber",
  "stepTotal",
  "stepTitle",
  "stepDescription",
  "goodsStatus",
  "docsStatus",
  "moneyStatus",
  "riskStatus",
  "legalConsequence",
  "problemAnalysis",
  "docsTrack",
  "docsNotice",
  "goodsMarker",
  "docsMarker",
  "moneyMarker",
  "prevStep",
  "nextStep",
  "reset",
  "stepList",
  "sellerBadge",
  "buyerBadge",
  "sellerBankBadge",
  "buyerBankBadge",
  "carrierBadge",
  "openingAd",
  "closeOpeningAd"
];

const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

function buildStepList() {
  steps.forEach((step, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const stepIndex = document.createElement("span");
    const stepName = document.createElement("span");

    button.type = "button";
    button.addEventListener("click", () => {
      currentStep = index;
      render();
    });

    stepIndex.className = "step-index";
    stepIndex.textContent = String(index + 1);
    stepName.textContent = step.title;

    button.append(stepIndex, stepName);
    item.append(button);
    el.stepList.append(item);
  });
}

function riskBearer(term, stepIndex) {
  const rule = termRules[term];
  return stepIndex >= rule.riskStep ? "Buyer" : "Seller";
}

function problemAnalysis(event, term, payment, stepIndex) {
  if (event === "none") {
    return "No special problem selected. The key point is to separate possession of goods, possession of documents, payment, and risk.";
  }

  if (event === "damage") {
    const bearer = riskBearer(term, stepIndex);
    return `Goods damage matters differently from document compliance. At this step, risk is allocated to ${bearer}. Under ${term}, the buyer may still have to pay if the documents conform, then pursue the carrier or insurer.`;
  }

  if (event === "dirty") {
    return "A dirty bill of lading states an apparent defect in the goods or packaging. That can prevent strict compliance and may let a bank refuse payment under a letter of credit.";
  }

  if (event === "discrepancy") {
    return payment === "lc"
      ? "In a letter of credit sale, a document discrepancy is serious because the bank examines documents only and can refuse payment for nonconforming papers."
      : "A discrepancy still creates leverage, but without a letter of credit the result depends more heavily on the sale contract and collection instructions.";
  }

  return "If goods arrive before documents, the buyer may be unable to claim them without the bill of lading. This creates delay costs even when the cargo is physically available.";
}

function setBadge(element, text, active) {
  element.textContent = text;
  element.classList.toggle("muted", !active);
}

function updateBadges(step) {
  setBadge(el.sellerBadge, step.goods === "Seller" ? "Goods" : "-", step.goods === "Seller");
  setBadge(el.buyerBadge, step.goods === "Buyer" ? "Goods" : "Waiting", step.goods === "Buyer");
  setBadge(el.sellerBankBadge, step.docs === "Seller bank" ? "Docs" : "-", step.docs === "Seller bank");
  setBadge(el.buyerBankBadge, step.docs === "Buyer bank" ? "Docs" : "-", step.docs === "Buyer bank");
  setBadge(el.carrierBadge, step.goods === "Carrier" || step.goods === "At sea" || step.goods === "Destination port" ? "Goods" : "-", step.goods !== "Seller" && step.goods !== "Buyer");
}

function render() {
  const step = steps[currentStep];
  const term = el.shippingTerm.value;
  const payment = el.paymentMethod.value;
  const rule = termRules[term];

  el.stepNumber.textContent = String(currentStep + 1);
  el.stepTotal.textContent = String(steps.length);
  el.stepTitle.textContent = step.title;
  el.stepDescription.textContent = step.description;
  el.goodsStatus.textContent = step.goods;
  el.docsStatus.textContent = step.docs;
  el.moneyStatus.textContent = step.money;
  el.riskStatus.textContent = riskBearer(term, currentStep);
  el.legalConsequence.textContent = `${rule.riskText} ${rule.paymentText} ${rule.insurance} ${paymentRules[payment]}`;
  el.problemAnalysis.textContent = problemAnalysis(el.problemEvent.value, term, payment, currentStep);

  el.goodsMarker.style.setProperty("--pos", `${step.goodsPos}%`);
  el.docsMarker.style.setProperty("--pos", `${step.docsPos}%`);
  el.moneyMarker.style.setProperty("--pos", `${step.moneyPos}%`);
  el.goodsMarker.style.setProperty("--progress", step.goodsPos / 100);
  el.docsMarker.style.setProperty("--progress", step.docsPos / 100);
  el.moneyMarker.style.setProperty("--progress", step.moneyPos / 100);
  const docsMissing = currentStep < 3;
  el.docsTrack.classList.toggle("docs-missing", docsMissing);
  el.docsNotice.textContent = currentStep < 2 ? "Documents not issued yet" : "Carrier is preparing the bill of lading";
  el.prevStep.disabled = currentStep === 0;
  el.nextStep.disabled = currentStep === steps.length - 1;
  [...el.stepList.querySelectorAll("button")].forEach((button, index) => {
    if (index === currentStep) {
      button.setAttribute("aria-current", "step");
    } else {
      button.removeAttribute("aria-current");
    }
  });
  updateBadges(step);
}

el.prevStep.addEventListener("click", () => {
  currentStep = Math.max(0, currentStep - 1);
  render();
});

el.nextStep.addEventListener("click", () => {
  currentStep = Math.min(steps.length - 1, currentStep + 1);
  render();
});

el.reset.addEventListener("click", () => {
  currentStep = 0;
  el.problemEvent.value = "none";
  render();
});

["shippingTerm", "paymentMethod", "problemEvent"].forEach((id) => {
  el[id].addEventListener("change", render);
});

el.closeOpeningAd.addEventListener("click", () => {
  el.openingAd.hidden = true;
});

buildStepList();
render();
