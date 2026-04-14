import dayjs from "dayjs";

let modalCleanup = null;

const htmlEscapes = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => htmlEscapes[character]);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatDate(value, format = "DD MMM YYYY") {
  return value ? dayjs(value).format(format) : "Not set";
}

export function formatMonth(month) {
  return month ? dayjs(`${month}-01`).format("MMM YYYY") : "Unknown month";
}

export function initials(label = "RentEase") {
  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function renderLoading(message = "Loading RentEase...") {
  return `<div class="empty-state loading-state"><div class="spinner"></div><p>${escapeHtml(
    message
  )}</p></div>`;
}

export function renderEmpty({ title, description, actionHref, actionLabel }) {
  return `
    <div class="empty-state">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
      ${
        actionHref && actionLabel
          ? `<a class="button button-dark" data-link href="${actionHref}">${escapeHtml(actionLabel)}</a>`
          : ""
      }
    </div>
  `;
}

export function showToast(message, tone = "info") {
  const root = document.getElementById("toast-root");
  if (!root) {
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${tone}`;
  toast.textContent = message;
  root.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add("toast-leaving");
    window.setTimeout(() => toast.remove(), 220);
  }, 2800);
}

export function closeModal() {
  const root = document.getElementById("modal-root");
  if (!root) {
    return;
  }

  if (typeof modalCleanup === "function") {
    modalCleanup();
  }
  modalCleanup = null;
  root.innerHTML = "";
  document.body.classList.remove("has-modal");
}

export function openModal({ title, description = "", content, size = "normal", onMount }) {
  const root = document.getElementById("modal-root");
  if (!root) {
    return;
  }

  closeModal();

  root.innerHTML = `
    <div class="modal-backdrop" data-modal-close>
      <div class="modal-card modal-${size}" role="dialog" aria-modal="true" aria-label="${escapeHtml(
        title
      )}">
        <button type="button" class="modal-close" data-modal-close aria-label="Close dialog">×</button>
        <div class="modal-header">
          <p class="eyebrow">RentEase</p>
          <h2>${escapeHtml(title)}</h2>
          ${description ? `<p>${escapeHtml(description)}</p>` : ""}
        </div>
        <div class="modal-body">${content}</div>
      </div>
    </div>
  `;

  document.body.classList.add("has-modal");
  root.querySelectorAll("[data-modal-close]").forEach((element) => {
    element.addEventListener("click", (event) => {
      if (event.target === event.currentTarget || element.matches(".modal-close")) {
        closeModal();
      }
    });
  });

  const card = root.querySelector(".modal-card");
  const cleanup = onMount?.(card);
  if (typeof cleanup === "function") {
    modalCleanup = cleanup;
  }
}

export function confirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  confirmTone = "danger",
}) {
  return new Promise((resolve) => {
    openModal({
      title,
	      content: `
	        <div class="dialog-stack">
	          <p>${escapeHtml(message)}</p>
	          <div class="dialog-actions">
	            <button type="button" class="button button-ghost" data-dialog-cancel>Cancel</button>
	            <button type="button" class="button button-${
                confirmTone === "danger" ? "danger-soft" : confirmTone
              }" data-dialog-confirm>${escapeHtml(
	              confirmLabel
	            )}</button>
	          </div>
	        </div>
	      `,
      onMount(card) {
        const cancelButton = card.querySelector("[data-dialog-cancel]");
        const confirmButton = card.querySelector("[data-dialog-confirm]");

        cancelButton.addEventListener("click", () => {
          closeModal();
          resolve(false);
        });

        confirmButton.addEventListener("click", () => {
          closeModal();
          resolve(true);
        });
      },
    });
  });
}

export function setButtonBusy(button, busy, label) {
  if (!button) {
    return;
  }

  if (!button.dataset.originalLabel) {
    button.dataset.originalLabel = button.textContent;
  }

  button.disabled = busy;
  button.textContent = busy ? label : button.dataset.originalLabel;
}

export function serializeForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function maskKey(apiKey) {
  if (!apiKey) {
    return "Not added yet";
  }
  if (apiKey.length < 10) {
    return "••••••••";
  }
  return `${apiKey.slice(0, 4)}••••••${apiKey.slice(-4)}`;
}

export function paragraphize(text) {
  return text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p>${escapeHtml(chunk)}</p>`)
    .join("");
}

export function statusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (["paid", "resolved", "success"].includes(normalized)) {
    return "success";
  }
  if (["partial", "in-progress", "today", "upcoming", "warning"].includes(normalized)) {
    return "warning";
  }
  if (["pending", "open", "overdue", "danger"].includes(normalized)) {
    return "danger";
  }
  if (["vacant", "neutral"].includes(normalized)) {
    return "neutral";
  }
  return "info";
}
