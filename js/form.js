import { decryptObject, encryptObject, normalizeEncryptedData } from "./crypto.js";

const SUBMIT_ENDPOINT = "https://assesment-ai-hdi.dihsantos2502.workers.dev/submit";
const STORAGE_KEY = "hdi_feedback_draft_v1";
const PENDING_KEY = "hdi_feedback_pending_v1";
const form = document.getElementById("feedbackForm") || document.querySelector("form");
const steps = [...document.querySelectorAll(".form-step, .step")];
const introPanel = document.getElementById("introPanel") || document.querySelector(".hero");
const progressArea = document.getElementById("progressArea") || document.querySelector(".progress-wrap");
const startButton = document.getElementById("startButton");
const backButton = document.getElementById("backButton") || document.getElementById("backBtn");
const nextButton = document.getElementById("nextButton") || document.getElementById("nextBtn");
const submitButton = document.getElementById("submitButton") || document.getElementById("submitBtn");
const statusMessage = document.getElementById("statusMessage") || document.getElementById("status");
const progressBar = document.getElementById("progressBar");
const stepLabel = document.getElementById("stepLabel");
const characterCount = document.getElementById("characterCount");
let currentStep = Number(localStorage.getItem(`${STORAGE_KEY}_step`) || 1);
let runtimePassphrase = null;

function getPassphrase() {
  if (runtimePassphrase) return runtimePassphrase;

  const configured = window.__ASSESSMENT_PASSPHRASE__;
  if (configured && String(configured).trim()) {
    runtimePassphrase = String(configured).trim();
    return runtimePassphrase;
  }

  const entered = window.prompt("Informe a frase secreta para criptografar e salvar este formulário:", "");
  if (!entered || !String(entered).trim()) {
    throw new Error("Frase secreta obrigatória para salvar os dados com criptografia.");
  }

  runtimePassphrase = String(entered).trim();
  return runtimePassphrase;
}
let isSubmitting = false;
let hasStarted = false;

if (!form) {
  console.warn("Nenhum formulário encontrado na página.");
} else if (!steps.length) {
  console.warn("Nenhuma etapa do formulário foi encontrada.");
}

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

async function readDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    const encrypted = normalizeEncryptedData(parsed);
    if (!encrypted) return parsed;

    return await decryptObject(encrypted, getPassphrase());
  } catch {
    return {};
  }
}
async function saveDraft() {
  try {
    const values = Object.fromEntries(new FormData(form).entries());
    values.consent = form.elements.consent.checked;
    const encrypted = await encryptObject(values, getPassphrase());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
    localStorage.setItem(`${STORAGE_KEY}_step`, String(currentStep));
  } catch (error) {
    console.error(error);
    setStatus("Frase secreta não informada. Defina a chave antes de salvar os dados criptografados.", "error");
  }
}
async function fillDraft() {
  const draft = await readDraft();
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
  if (!steps.length || !form) return;
  currentStep = Math.min(Math.max(step, 1), steps.length);
  steps.forEach((element, index) => { const active = index + 1 === currentStep; element.hidden = !active; element.classList.toggle("is-active", active); });
  if (backButton) backButton.textContent = "Voltar";
  if (nextButton) nextButton.hidden = currentStep === steps.length;
  if (submitButton) submitButton.hidden = currentStep !== steps.length;
  if (progressBar) progressBar.style.width = `${(currentStep / steps.length) * 100}%`;
  if (stepLabel) stepLabel.textContent = `Etapa ${currentStep} de ${steps.length}`;
  saveDraft();
}
function validateStep() {
  if (!form || !steps.length) return true;
  const activeStep = steps[currentStep - 1]; if (!activeStep) return true;
  const fields = [...activeStep.querySelectorAll("input, select, textarea")]; let isValid = true;
  fields.forEach(field => { field.setCustomValidity(""); field.removeAttribute("aria-invalid"); const error = activeStep.querySelector(`[data-error-for="${field.name}"]`); if (error) error.textContent = ""; });
  fields.forEach(field => {
    if (field.type === "radio" && fields.indexOf(field) !== fields.findIndex(item => item.name === field.name)) return;
    if (!field.checkValidity()) { isValid = false; field.setAttribute("aria-invalid", "true"); const error = activeStep.querySelector(`[data-error-for="${field.name}"]`); if (error) error.textContent = field.type === "checkbox" ? "Confirme esta autorização para continuar." : "Confira este campo antes de continuar."; }
  });
  if (!isValid) activeStep.querySelector(":invalid")?.focus(); return isValid;
}
function makeId() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
async function savePending(response) {
  try {
    const encrypted = await encryptObject(response, getPassphrase());
    localStorage.setItem(PENDING_KEY, JSON.stringify(encrypted));
  } catch (error) {
    console.error(error);
    throw new Error("Não foi possível salvar os dados criptografados sem a chave secreta.");
  }
}
function clearLocalBackup() { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(`${STORAGE_KEY}_step`); localStorage.removeItem(PENDING_KEY); }

function advanceIfValid() {
  if (currentStep < steps.length && validateStep()) showStep(currentStep + 1);
}

if (nextButton) nextButton.addEventListener("click", () => { setStatus(); advanceIfValid(); });
if (startButton) startButton.addEventListener("click", startAssessment);
if (backButton) backButton.addEventListener("click", () => {
  setStatus();
  if (currentStep === 1) return;
  showStep(currentStep - 1);
});
if (form) {
  form.addEventListener("input", () => {
    saveDraft();
    if (form.elements.comment && characterCount) characterCount.textContent = `${form.elements.comment.value.length} / 2000`;
  });
  form.addEventListener("change", event => {
    saveDraft();
    if (event.target.type === "radio" || (currentStep === 1 && event.target.name === "email")) advanceIfValid();
    if (event.target.name === "consent" && event.target.checked && validateStep()) form.requestSubmit();
  });
  if (form.elements.email) form.elements.email.addEventListener("blur", () => {
    if (currentStep === 1) advanceIfValid();
  });
  form.addEventListener("submit", async event => {
    event.preventDefault(); if (isSubmitting || !validateStep()) return;
    const formData = Object.fromEntries(new FormData(form).entries()); delete formData.consent;
    const response = { id: makeId(), timestamp: new Date().toISOString(), answers: formData }; await savePending(response); isSubmitting = true;
    if (submitButton) submitButton.disabled = true;
    if (nextButton) nextButton.disabled = true;
    if (backButton) backButton.disabled = true;
    setStatus("Enviando seu feedback...");
    try {
      if (SUBMIT_ENDPOINT.includes("SEU-WORKER")) throw new Error("Endpoint ainda não configurado.");
      const result = await fetch(SUBMIT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response)
      });
      const payload = await result.json().catch(() => ({}));

      if (!result.ok) {
        throw new Error(payload.error || `HTTP ${result.status}`);
      }
      form.reset(); currentStep = 1; showStep(1); clearLocalBackup(); if (characterCount) characterCount.textContent = "0 / 2000"; setStatus("Sua avaliação foi enviada com sucesso. O time da Kyndryl vai entrar em contato.", "success");
    } catch (error) { console.error(error); setStatus("Não foi possível enviar agora. Sua resposta ficou salva neste aparelho; tente novamente quando a conexão estiver estável.", "error"); }
    finally { isSubmitting = false; if (submitButton) submitButton.disabled = false; if (nextButton) nextButton.disabled = false; if (backButton) backButton.disabled = false; }
  });
}
const savedDraft = await readDraft();
if (form) {
  await fillDraft();
  if (Object.keys(savedDraft).some(key => key !== "consent" && savedDraft[key])) startAssessment();
  if (form.elements.comment && characterCount) characterCount.textContent = `${form.elements.comment.value.length} / 2000`;
}