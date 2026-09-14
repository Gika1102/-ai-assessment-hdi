const SUBMIT_ENDPOINT = "https://hdi-feedback-worker.dihsantos2502.workers.dev/submit";
const STORAGE_KEY = "hdi_feedback_draft_v1";
const PENDING_KEY = "hdi_feedback_pending_v1";
const form = document.getElementById("feedbackForm");
const steps = [...document.querySelectorAll(".form-step")];
const introPanel = document.getElementById("introPanel");
const progressArea = document.getElementById("progressArea");
const startButton = document.getElementById("startButton");
const backButton = document.getElementById("backButton");
const nextButton = document.getElementById("nextButton");
const submitButton = document.getElementById("submitButton");
const statusMessage = document.getElementById("statusMessage");
const progressBar = document.getElementById("progressBar");
const stepLabel = document.getElementById("stepLabel");
const characterCount = document.getElementById("characterCount");
const scorePreview = document.getElementById("scorePreview");
const scoreNames = ["leadershipVision", "workKnowledge", "portfolioRoadmap", "technologySecurity", "accountability", "changeLearning"];
let currentStep = Number(localStorage.getItem(`${STORAGE_KEY}_step`) || 1);
let isSubmitting = false;
let hasStarted = false;

function startAssessment() {
  if (hasStarted) return;
  hasStarted = true;
  document.body.classList.add("is-started");
  introPanel.setAttribute("aria-hidden", "true");
  progressArea.hidden = false;
  form.hidden = false;
  showStep(currentStep);
  form.querySelector(":invalid")?.focus();
}

function readDraft() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } }
function saveDraft() {
  const values = Object.fromEntries(new FormData(form).entries());
  values.consent = form.elements.consent.checked;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  localStorage.setItem(`${STORAGE_KEY}_step`, String(currentStep));
}
function fillDraft() {
  const draft = readDraft();
  Object.entries(draft).forEach(([name, value]) => {
    const field = form.elements[name];
    if (!field) return;
    if (field.length && field[0].type === "radio") [...field].find(input => input.value === value)?.click();
    else if (field.type === "checkbox") field.checked = value === true || value === "true";
    else field.value = value;
  });
}
function setStatus(message, type = "") { statusMessage.textContent = message; statusMessage.className = `status-message${type ? ` is-${type}` : ""}`; }
function showStep(step) {
  currentStep = Math.min(Math.max(step, 1), steps.length);
  steps.forEach((element, index) => { const active = index + 1 === currentStep; element.hidden = !active; element.classList.toggle("is-active", active); });
  backButton.textContent = currentStep === 1 ? "Voltar ao portal" : "Voltar";
  nextButton.hidden = currentStep === steps.length; submitButton.hidden = currentStep !== steps.length;
  progressBar.style.width = `${(currentStep / steps.length) * 100}%`; stepLabel.textContent = `Etapa ${currentStep} de ${steps.length}`; updateScorePreview(); saveDraft();
}
function updateScorePreview() {
  const scores = scoreNames.map(name => Number(form.elements[name]?.value)).filter(Number.isFinite);
  if (scorePreview) scorePreview.textContent = (scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0).toFixed(1).replace(".", ",");
}
function validateStep() {
  const activeStep = steps[currentStep - 1]; const fields = [...activeStep.querySelectorAll("input, select, textarea")]; let isValid = true;
  fields.forEach(field => { field.setCustomValidity(""); field.removeAttribute("aria-invalid"); const error = activeStep.querySelector(`[data-error-for="${field.name}"]`); if (error) error.textContent = ""; });
  fields.forEach(field => {
    if (field.type === "radio" && fields.indexOf(field) !== fields.findIndex(item => item.name === field.name)) return;
    if (!field.checkValidity()) { isValid = false; field.setAttribute("aria-invalid", "true"); const error = activeStep.querySelector(`[data-error-for="${field.name}"]`); if (error) error.textContent = field.type === "checkbox" ? "Confirme esta autorização para continuar." : "Confira este campo antes de continuar."; }
  });
  if (!isValid) activeStep.querySelector(":invalid")?.focus(); return isValid;
}
function makeId() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function savePending(response) { localStorage.setItem(PENDING_KEY, JSON.stringify(response)); }
function clearLocalBackup() { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(`${STORAGE_KEY}_step`); localStorage.removeItem(PENDING_KEY); }

function advanceIfValid() {
  if (currentStep < steps.length && validateStep()) showStep(currentStep + 1);
}

nextButton.addEventListener("click", () => { setStatus(); advanceIfValid(); });
startButton.addEventListener("click", startAssessment);
backButton.addEventListener("click", () => {
  setStatus();
  if (currentStep === 1) window.location.href = "../index.html";
  else showStep(currentStep - 1);
});
form.addEventListener("input", () => { saveDraft(); characterCount.textContent = `${form.elements.comment.value.length} / 2000`; });
form.addEventListener("change", event => {
  saveDraft();
  if (event.target.type === "radio" || (currentStep === 1 && event.target.name === "email")) advanceIfValid();
  if (event.target.name === "consent" && event.target.checked && validateStep()) form.requestSubmit();
});
form.elements.email.addEventListener("blur", () => {
  if (currentStep === 1) advanceIfValid();
});
form.addEventListener("submit", async event => {
  event.preventDefault(); if (isSubmitting || !validateStep()) return;
  const formData = Object.fromEntries(new FormData(form).entries()); delete formData.consent;
  const response = { id: makeId(), timestamp: new Date().toISOString(), answers: formData }; savePending(response); isSubmitting = true;
  submitButton.disabled = true; nextButton.disabled = true; backButton.disabled = true; setStatus("Enviando seu feedback...");
  try {
    if (SUBMIT_ENDPOINT.includes("SEU-WORKER")) throw new Error("Endpoint ainda não configurado.");
    const result = await fetch(SUBMIT_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(response) });
    if (!result.ok) throw new Error(`HTTP ${result.status}`);
    form.reset(); currentStep = 1; showStep(1); clearLocalBackup(); characterCount.textContent = "0 / 2000"; setStatus("Feedback enviado. Obrigado por participar da feira!", "success");
  } catch (error) { console.error(error); setStatus("Não foi possível enviar agora. Sua resposta ficou salva neste aparelho; tente novamente quando a conexão estiver estável.", "error"); }
  finally { isSubmitting = false; submitButton.disabled = false; nextButton.disabled = false; backButton.disabled = false; }
});
const savedDraft = readDraft();
fillDraft();
if (Object.keys(savedDraft).some(key => key !== "consent" && savedDraft[key])) startAssessment();
characterCount.textContent = `${form.elements.comment.value.length} / 2000`;
updateScorePreview();