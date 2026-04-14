import dayjs from "dayjs";
import {
  buildDashboardModel,
  buildPaymentTimeline,
  clearStoredGeminiKey,
  createAgreementRecord,
  createComplaint,
  createProperty,
  createTenant,
  deactivateTenant,
  deleteProperty,
  explainClause,
  generateAgreementPdf,
  getGeminiModel,
  getStoredGeminiKey,
  registerLandlord,
  setStoredGeminiKey,
  signInLandlord,
  signOutLandlord,
  updateComplaint,
  updateLandlordSettings,
  updateProperty,
  updateTenant,
  upsertPayment,
  watchComplaints,
  watchComplaintsByProperty,
  watchPayments,
  watchPaymentsByTenant,
  watchProperties,
  watchProperty,
  watchTenant,
  watchTenants,
  watchTenantsByProperty,
} from "./services.js";
import {
  closeModal,
  confirmDialog,
  escapeHtml,
  formatCurrency,
  formatDate,
  formatMonth,
  initials,
  maskKey,
  openModal,
  paragraphize,
  renderEmpty,
  renderLoading,
  serializeForm,
  setButtonBusy,
  showToast,
  statusTone,
} from "./ui.js";

function titleCase(value = "") {
  return String(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function activeForPath(pathname, href) {
  if (href === "/app") {
    return pathname === "/app";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function statusPill(label, tone) {
  return `<span class="status-pill status-${tone}">${escapeHtml(label)}</span>`;
}

function renderShell(ctx, { title, description, actions = "", content }) {
  const navItems = [
    { href: "/app", label: "Dashboard" },
    { href: "/app/properties", label: "Properties" },
    { href: "/app/payments", label: "Payments" },
    { href: "/app/complaints", label: "Complaints" },
    { href: "/app/agreements/new", label: "Agreements" },
    { href: "/app/ai", label: "AI" },
    { href: "/app/settings", label: "Settings" },
  ];

  const shellHtml = `
    <div class="workspace-shell">
      <aside class="workspace-sidebar">
        <div class="sidebar-brand">
          <span class="brand-chip">RE</span>
          <div>
            <p>RentEase</p>
            <small>Landlord workspace</small>
          </div>
        </div>
        <nav class="sidebar-nav" aria-label="Workspace">
          ${navItems
            .map(
              (item) => `
                <a
                  data-link
                  href="${item.href}"
                  class="${activeForPath(ctx.pathname, item.href) ? "is-active" : ""}"
                >
                  ${escapeHtml(item.label)}
                </a>
              `
            )
            .join("")}
        </nav>
        <div class="sidebar-profile">
          <div class="profile-avatar">${initials(ctx.state.profile?.displayName || "RentEase")}</div>
          <div>
            <strong>${escapeHtml(ctx.state.profile?.displayName || "RentEase Landlord")}</strong>
            <p>${escapeHtml(ctx.state.user?.email || "Signed in")}</p>
          </div>
        </div>
        <button type="button" class="button button-ghost sidebar-logout" data-action="logout">
          Sign out
        </button>
      </aside>
      <div class="workspace-main">
        <header class="workspace-topbar">
          <div>
            <p class="eyebrow">RentEase</p>
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(description)}</p>
          </div>
          <div class="page-actions">${actions}</div>
        </header>
        <nav class="mobile-nav" aria-label="Workspace mobile navigation">
          ${navItems
            .map(
              (item) => `
                <a
                  data-link
                  href="${item.href}"
                  class="${activeForPath(ctx.pathname, item.href) ? "is-active" : ""}"
                >
                  ${escapeHtml(item.label)}
                </a>
              `
            )
            .join("")}
        </nav>
        <main class="workspace-page">${content}</main>
      </div>
    </div>
  `;

  return {
    title,
    html: shellHtml,
    afterRender() {
      document.querySelector("[data-action='logout']")?.addEventListener("click", async () => {
        await signOutLandlord();
        ctx.navigate("/login");
      });
    },
  };
}

function openPropertyModal({ property, onSaved }) {
  const title = property ? "Edit property" : "Add a property";
  openModal({
    title,
    description: "Capture the basics so RentEase can track occupancy, agreements, and rent status.",
    size: "wide",
    content: `
      <form class="modal-form stacked-form">
        <label>
          <span>Property name</span>
          <input name="propertyName" type="text" required value="${escapeHtml(property?.propertyName || "")}" />
        </label>
        <label>
          <span>Complete address</span>
          <textarea name="address" rows="3" required>${escapeHtml(property?.address || "")}</textarea>
        </label>
        <div class="form-grid">
          <label>
            <span>Property type</span>
            <select name="type" required>
              ${["apartment", "house", "flat", "studio"]
                .map(
                  (type) => `
                    <option value="${type}" ${
                      property?.type === type ? "selected" : ""
                    }>${titleCase(type)}</option>
                  `
                )
                .join("")}
            </select>
          </label>
          <label>
            <span>Rooms</span>
            <input name="numberOfRooms" type="number" min="1" required value="${escapeHtml(
              String(property?.numberOfRooms || 1)
            )}" />
          </label>
          <label>
            <span>Monthly rent</span>
            <input name="monthlyRent" type="number" min="0" required value="${escapeHtml(
              String(property?.monthlyRent || 0)
            )}" />
          </label>
        </div>
        <div class="dialog-actions">
          <button type="button" class="button button-ghost" data-cancel-form>Cancel</button>
          <button type="submit" class="button button-dark">${property ? "Save changes" : "Create property"}</button>
        </div>
      </form>
    `,
    onMount(card) {
      const form = card.querySelector("form");
      const submitButton = form.querySelector("[type='submit']");
      form.querySelector("[data-cancel-form]")?.addEventListener("click", closeModal);

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = serializeForm(form);
        setButtonBusy(submitButton, true, property ? "Saving..." : "Creating...");
        try {
          if (property) {
            await updateProperty(property.id, values);
            showToast("Property updated.", "success");
          } else {
            await createProperty(values);
            showToast("Property added to your portfolio.", "success");
          }
          closeModal();
          onSaved?.();
        } catch (error) {
          showToast(error.message, "danger");
        } finally {
          setButtonBusy(submitButton, false);
        }
      });
    },
  });
}

function openTenantModal({ property, tenant, onSaved }) {
  openModal({
    title: tenant ? "Edit tenant profile" : `Add tenant for ${property.propertyName}`,
    description: "Upload the identity proof now or add it later from the tenant profile.",
    size: "wide",
    content: `
      <form class="modal-form stacked-form">
        <div class="form-grid">
          <label>
            <span>Full name</span>
            <input name="fullName" type="text" required value="${escapeHtml(tenant?.fullName || "")}" />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" required value="${escapeHtml(tenant?.email || "")}" />
          </label>
          <label>
            <span>Phone</span>
            <input name="phoneNumber" type="tel" required value="${escapeHtml(tenant?.phoneNumber || "")}" />
          </label>
          <label>
            <span>Move-in date</span>
            <input name="moveInDate" type="date" required value="${escapeHtml(
              tenant?.moveInDate || dayjs().format("YYYY-MM-DD")
            )}" />
          </label>
          <label>
            <span>Rent due day</span>
            <input
              name="rentDueDay"
              type="number"
              min="1"
              max="31"
              required
              value="${escapeHtml(String(tenant?.rentDueDay || 5))}"
            />
          </label>
          <label>
            <span>ID proof upload</span>
            <input name="identityDoc" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" />
          </label>
        </div>
        ${
          tenant?.identityDocUrl
            ? `<a class="text-link" href="${tenant.identityDocUrl}" target="_blank" rel="noreferrer">Open current document</a>`
            : ""
        }
        <div class="dialog-actions">
          <button type="button" class="button button-ghost" data-cancel-form>Cancel</button>
          <button type="submit" class="button button-dark">${tenant ? "Save tenant" : "Create tenant"}</button>
        </div>
      </form>
    `,
    onMount(card) {
      const form = card.querySelector("form");
      const submitButton = form.querySelector("[type='submit']");
      form.querySelector("[data-cancel-form]")?.addEventListener("click", closeModal);

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = serializeForm(form);
        const file = form.querySelector("[name='identityDoc']").files[0];
        setButtonBusy(submitButton, true, tenant ? "Saving..." : "Creating...");

        try {
          if (tenant) {
            await updateTenant(tenant.id, values, file);
            showToast("Tenant profile updated.", "success");
          } else {
            await createTenant(
              {
                ...values,
                propertyId: property.id,
              },
              file
            );
            showToast("Tenant added and property marked occupied.", "success");
          }
          closeModal();
          onSaved?.();
        } catch (error) {
          showToast(error.message, "danger");
        } finally {
          setButtonBusy(submitButton, false);
        }
      });
    },
  });
}

function openPaymentModal({ tenant, property, entry, onSaved }) {
  openModal({
    title: `Update ${entry.label}`,
    description: `Track rent received for ${tenant.fullName} at ${property.propertyName}.`,
    content: `
      <form class="modal-form stacked-form">
        <div class="form-grid">
          <label>
            <span>Status</span>
            <select name="status">
              ${["paid", "partial", "pending"]
                .map(
                  (status) => `
                    <option value="${status}" ${entry.status === status ? "selected" : ""}>
                      ${titleCase(status)}
                    </option>
                  `
                )
                .join("")}
            </select>
          </label>
          <label>
            <span>Amount</span>
            <input name="amount" type="number" min="0" value="${escapeHtml(String(entry.amount || property.monthlyRent))}" />
          </label>
          <label>
            <span>Paid on</span>
            <input name="paidOn" type="date" value="${escapeHtml(entry.paidOn || "")}" />
          </label>
        </div>
        <label>
          <span>Notes</span>
          <textarea name="notes" rows="3">${escapeHtml(entry.notes || "")}</textarea>
        </label>
        <div class="dialog-actions">
          <button type="button" class="button button-ghost" data-cancel-form>Cancel</button>
          <button type="submit" class="button button-dark">Save payment</button>
        </div>
      </form>
    `,
    onMount(card) {
      const form = card.querySelector("form");
      const submitButton = form.querySelector("[type='submit']");
      form.querySelector("[data-cancel-form]")?.addEventListener("click", closeModal);

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = serializeForm(form);
        setButtonBusy(submitButton, true, "Saving...");
        try {
          await upsertPayment({
            tenantId: tenant.id,
            month: entry.month,
            defaultAmount: property.monthlyRent,
            ...values,
          });
          closeModal();
          showToast("Payment tracker updated.", "success");
          onSaved?.();
        } catch (error) {
          showToast(error.message, "danger");
        } finally {
          setButtonBusy(submitButton, false);
        }
      });
    },
  });
}

function openComplaintModal({ property, onSaved }) {
  openModal({
    title: `Log complaint for ${property.propertyName}`,
    description: "Keep issue details and resolution notes in one place for both clarity and follow-up.",
    content: `
      <form class="modal-form stacked-form">
        <label>
          <span>Issue description</span>
          <textarea name="description" rows="4" required></textarea>
        </label>
        <div class="form-grid">
          <label>
            <span>Category</span>
            <select name="category" required>
              ${["plumbing", "electrical", "structural", "other"]
                .map((item) => `<option value="${item}">${titleCase(item)}</option>`)
                .join("")}
            </select>
          </label>
          <label>
            <span>Priority</span>
            <select name="priority" required>
              ${["low", "medium", "high"]
                .map((item) => `<option value="${item}">${titleCase(item)}</option>`)
                .join("")}
            </select>
          </label>
          <label>
            <span>Date raised</span>
            <input name="dateRaised" type="date" required value="${dayjs().format("YYYY-MM-DD")}" />
          </label>
        </div>
        <div class="dialog-actions">
          <button type="button" class="button button-ghost" data-cancel-form>Cancel</button>
          <button type="submit" class="button button-dark">Add complaint</button>
        </div>
      </form>
    `,
    onMount(card) {
      const form = card.querySelector("form");
      const submitButton = form.querySelector("[type='submit']");
      form.querySelector("[data-cancel-form]")?.addEventListener("click", closeModal);

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = serializeForm(form);
        setButtonBusy(submitButton, true, "Saving...");
        try {
          await createComplaint({
            propertyId: property.id,
            ...values,
          });
          showToast("Complaint logged.", "success");
          closeModal();
          onSaved?.();
        } catch (error) {
          showToast(error.message, "danger");
        } finally {
          setButtonBusy(submitButton, false);
        }
      });
    },
  });
}

function renderPropertySummaryCard(card) {
  const rentTone =
    card.rentStatus === "paid"
      ? "success"
      : card.rentStatus === "partial"
      ? "warning"
      : card.rentStatus === "vacant"
      ? "neutral"
      : "danger";

  return `
    <article class="workspace-card property-card">
      <div class="property-card-top">
        <div>
          <p class="eyebrow">${escapeHtml(titleCase(card.type))}</p>
          <h3>${escapeHtml(card.propertyName)}</h3>
          <p>${escapeHtml(card.address)}</p>
        </div>
        ${statusPill(card.isOccupied ? "Occupied" : "Vacant", card.isOccupied ? "success" : "warning")}
      </div>
      <div class="property-card-meta">
        <span>${formatCurrency(card.monthlyRent)}</span>
        <span>${card.numberOfRooms} rooms</span>
      </div>
      <div class="property-card-meta">
        <span>${card.currentTenant ? escapeHtml(card.currentTenant.fullName) : "No active tenant"}</span>
        ${statusPill(card.rentStatus === "vacant" ? "Vacant" : titleCase(card.rentStatus), rentTone)}
      </div>
      <div class="property-card-meta">
        <span>${card.openComplaints} open complaints</span>
        <a data-link href="/app/properties/${card.id}">Open property</a>
      </div>
    </article>
  `;
}

function renderPaymentsOverviewRows({ tenants, properties, payments }) {
  const propertyMap = new Map(properties.map((property) => [property.id, property]));
  const currentMonth = dayjs().format("YYYY-MM");
  const paymentMap = new Map(
    payments.filter((payment) => payment.month === currentMonth).map((payment) => [payment.tenantId, payment])
  );

  const activeTenants = tenants.filter((tenant) => tenant.isActive);
  if (!activeTenants.length) {
    return renderEmpty({
      title: "No active tenants yet",
      description: "Add a tenant from a property page and this overview will light up automatically.",
      actionHref: "/app/properties",
      actionLabel: "Open properties",
    });
  }

  return `
    <div class="tenant-list">
      ${activeTenants
        .map((tenant) => {
          const property = propertyMap.get(tenant.propertyId);
          const payment = paymentMap.get(tenant.id);
          return `
            <article class="workspace-card tenant-overview-card">
              <div>
                <p class="eyebrow">${escapeHtml(property?.propertyName || "Property")}</p>
                <h3>${escapeHtml(tenant.fullName)}</h3>
                <p>Due on day ${tenant.rentDueDay} of each month</p>
              </div>
              <div class="tenant-overview-meta">
                ${statusPill(titleCase(payment?.status || "pending"), statusTone(payment?.status || "pending"))}
                <span>${formatCurrency(property?.monthlyRent || 0)}</span>
              </div>
              <a class="text-link" data-link href="/app/payments/${tenant.id}">Open tracker</a>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderComplaintsOverviewRows({ properties, complaints }) {
  if (!properties.length) {
    return renderEmpty({
      title: "No properties in the system",
      description: "Add a property first so you have a place to log maintenance issues.",
      actionHref: "/app/properties",
      actionLabel: "Add a property",
    });
  }

  return `
    <div class="tenant-list">
      ${properties
        .map((property) => {
          const propertyComplaints = complaints.filter((complaint) => complaint.propertyId === property.id);
          const openCount = propertyComplaints.filter(
            (complaint) => complaint.status === "open" || complaint.status === "in-progress"
          ).length;
          return `
            <article class="workspace-card tenant-overview-card">
              <div>
                <p class="eyebrow">${propertyComplaints.length} total complaints</p>
                <h3>${escapeHtml(property.propertyName)}</h3>
                <p>${escapeHtml(property.address)}</p>
              </div>
              <div class="tenant-overview-meta">
                ${statusPill(`${openCount} open`, openCount ? "danger" : "success")}
                <span>${escapeHtml(titleCase(property.type))}</span>
              </div>
              <a class="text-link" data-link href="/app/complaints/${property.id}">Manage issues</a>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

async function renderLandingPage() {
  return {
    title: "Home",
    html: `
      <div class="landing-shell">
        <div class="announcement-bar">Built for calm rent collection, tidy records, and fewer WhatsApp follow-ups.</div>
        <header class="landing-header">
          <nav class="landing-nav">
            <div class="landing-links">
              <a href="#features">Why RentEase</a>
              <a href="#modules">Modules</a>
              <a href="#testimonials">Stories</a>
            </div>
            <a class="landing-logo" data-link href="/">rentease</a>
            <div class="landing-actions">
              <a class="text-link" data-link href="/login">Login</a>
              <a class="button button-dark" data-link href="/register">Get started</a>
            </div>
          </nav>
        </header>
        <main class="landing-main">
          <section class="landing-hero">
            <div class="hero-copy">
              <p class="eyebrow">Rental management, reimagined</p>
              <h1>Rental management has never felt so effortless.</h1>
              <p>
                RentEase brings agreements, tenant records, payments, complaints, reminders, and
                clause explanations into one soft, polished workspace built for independent landlords.
              </p>
              <div class="hero-actions">
                <a class="button button-dark" data-link href="/register">Launch your workspace</a>
                <a class="button button-ghost" data-link href="/login">I already have an account</a>
              </div>
            </div>
            <div class="hero-stage" aria-hidden="true">
              <article class="mock-stack mock-card-pink">
                <p>Agreement draft</p>
                <strong>Flat 3B - April 2026</strong>
                <span>Lock-in · Notice · Deposit</span>
              </article>
              <article class="mock-stack mock-card-blue">
                <p>Payment pulse</p>
                <strong>4 dues tracked</strong>
                <span>Pending · Partial · Paid</span>
              </article>
              <article class="mock-stack mock-card-cream">
                <p>Complaint flow</p>
                <strong>Kitchen sink repair</strong>
                <span>Raised · In progress · Resolved</span>
              </article>
              <article class="mock-tall">
                <div>
                  <p class="eyebrow">Live snapshot</p>
                  <h3>One landlord view, all your rental work.</h3>
                </div>
                <ul>
                  <li>Tenant cards linked to properties</li>
                  <li>Month-by-month rent tiles</li>
                  <li>Gemini clause explainer</li>
                </ul>
              </article>
            </div>
          </section>

          <section class="value-ribbon">
            <div><span>01</span><p>Secure records</p></div>
            <div><span>02</span><p>Payment tracking</p></div>
            <div><span>03</span><p>Complaint workflow</p></div>
            <div><span>04</span><p>AI clause help</p></div>
            <div><span>05</span><p>Firebase-backed access</p></div>
          </section>

          <section class="feature-section" id="features">
            <div class="section-heading">
              <p class="eyebrow">Core routines</p>
              <h2>Be choosy with your landlord routine.</h2>
            </div>
            <div class="feature-grid">
              <article class="feature-card feature-card-green">
                <p class="eyebrow">Agreements</p>
                <h3>Generate clean rental drafts.</h3>
                <p>
                  Fill the terms once, download a polished PDF, and keep a Firestore summary linked
                  to the right tenant and property.
                </p>
                <a data-link href="/register">Explore</a>
              </article>
              <article class="feature-card feature-card-blue">
                <p class="eyebrow">Payments</p>
                <h3>Track each month without spreadsheets.</h3>
                <p>
                  Rent tiles start from the move-in month and make overdue, partial, and paid
                  months obvious at a glance.
                </p>
                <a data-link href="/register">Explore</a>
              </article>
              <article class="feature-card feature-card-pink">
                <p class="eyebrow">Complaints</p>
                <h3>Keep maintenance requests moving.</h3>
                <p>
                  Log issues, mark priority, add resolution notes, and keep the whole property story
                  in one timeline.
                </p>
                <a data-link href="/register">Explore</a>
              </article>
            </div>
          </section>

          <section class="testimonials-section" id="testimonials">
            <div class="section-heading slim">
              <p class="eyebrow">Testimonials</p>
            </div>
            <div class="testimonial-grid">
              <article class="testimonial-card">
                <strong>★★★★★</strong>
                <p>
                  “The dashboard gives me the one-look overview I always wanted for my two rental
                  flats.”
                </p>
                <span>Priya, Delhi</span>
              </article>
              <article class="testimonial-card">
                <strong>★★★★★</strong>
                <p>
                  “I can finally see which month is pending without opening five different payment
                  screenshots.”
                </p>
                <span>Arvind, Noida</span>
              </article>
              <article class="testimonial-card">
                <strong>★★★★★</strong>
                <p>
                  “The clause explainer helps me answer tenant questions in plain language instead of
                  rereading legal text.”
                </p>
                <span>Meera, Gurgaon</span>
              </article>
              <article class="testimonial-card">
                <strong>★★★★★</strong>
                <p>
                  “It feels soft and approachable, not like enterprise software built for property
                  agencies.”
                </p>
                <span>Rohit, Jaipur</span>
              </article>
            </div>
          </section>

          <section class="module-showcase" id="modules">
            <div class="section-heading">
              <p class="eyebrow">Workspace modules</p>
              <h2>Deliciously useful for landlords who want fewer loose ends.</h2>
            </div>
            <div class="showcase-row">
              ${[
                {
                  name: "Dashboard",
                  desc: "Portfolio metrics, due-soon reminders, complaint pulse.",
                },
                {
                  name: "Tenant Profiles",
                  desc: "Move-in date, ID proof, links to payments and agreements.",
                },
                {
                  name: "Agreement Generator",
                  desc: "Structured form, PDF output, Firestore record saved instantly.",
                },
                {
                  name: "Payment Tracker",
                  desc: "Monthly status tiles from move-in to current month.",
                },
                {
                  name: "AI Explainer",
                  desc: "Gemini 2.5 Flash with BYOA for grounded clause answers.",
                },
              ]
                .map(
                  (module) => `
                    <article class="showcase-card">
                      <p class="eyebrow">${escapeHtml(module.name)}</p>
                      <h3>${escapeHtml(module.name)}</h3>
                      <p>${escapeHtml(module.desc)}</p>
                    </article>
                  `
                )
                .join("")}
            </div>
          </section>
        </main>
      </div>
    `,
  };
}

async function renderAuthPage(ctx, mode) {
  const isRegister = mode === "register";

  return {
    title: isRegister ? "Create Account" : "Login",
    html: `
      <div class="auth-shell">
        <section class="auth-story">
          <p class="eyebrow">RentEase</p>
          <h1>One calm place for agreements, rent, complaints, and tenant history.</h1>
          <p>
            Firebase-backed authentication, live dashboard cards, and a Gemini-powered clause helper
            come together in one landlord-first workspace.
          </p>
          <div class="auth-story-grid">
            <article>
              <strong>Agreements</strong>
              <span>Draft once, export beautifully.</span>
            </article>
            <article>
              <strong>Payments</strong>
              <span>See every month without chasing notes.</span>
            </article>
            <article>
              <strong>Complaints</strong>
              <span>Log, update, and resolve with context.</span>
            </article>
          </div>
        </section>
        <section class="auth-card">
          <p class="eyebrow">${isRegister ? "Create landlord access" : "Welcome back"}</p>
          <h2>${isRegister ? "Start with your first property." : "Step back into your workspace."}</h2>
          <form class="stacked-form" id="auth-form">
            ${
              isRegister
                ? `
                  <label>
                    <span>Display name</span>
                    <input name="displayName" type="text" required />
                  </label>
                `
                : ""
            }
            <label>
              <span>Email</span>
              <input name="email" type="email" required />
            </label>
            <label>
              <span>Password</span>
              <input name="password" type="password" minlength="6" required />
            </label>
            <button class="button button-dark auth-submit" type="submit">
              ${isRegister ? "Create account" : "Login"}
            </button>
          </form>
          <p class="auth-switch">
            ${
              isRegister
                ? `Already have an account? <a data-link href="/login">Login</a>`
                : `New to RentEase? <a data-link href="/register">Create account</a>`
            }
          </p>
          <a class="text-link" data-link href="/">Back to homepage</a>
        </section>
      </div>
    `,
    afterRender() {
      const form = document.getElementById("auth-form");
      const submitButton = form.querySelector("[type='submit']");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = serializeForm(form);
        setButtonBusy(submitButton, true, isRegister ? "Creating..." : "Logging in...");
        try {
          if (isRegister) {
            await registerLandlord(values);
            showToast("Account created. Your workspace is ready.", "success");
          } else {
            await signInLandlord(values);
            showToast("Welcome back to RentEase.", "success");
          }
          ctx.navigate("/app");
        } catch (error) {
          showToast(error.message, "danger");
        } finally {
          setButtonBusy(submitButton, false);
        }
      });
    },
  };
}

async function renderDashboardPage(ctx) {
  const shell = renderShell(ctx, {
    title: "Dashboard",
    description:
      "Track the full rental pulse at a glance, from due-soon rent reminders to complaints and occupancy.",
    actions: `
      <a class="button button-ghost" data-link href="/app/properties">Manage properties</a>
      <a class="button button-dark" data-link href="/app/agreements/new">New agreement</a>
    `,
    content: `
      <section class="dashboard-layout">
        <div class="stats-grid" id="dashboard-metrics">${renderLoading("Loading metrics...")}</div>
        <div class="two-column-layout">
          <section class="workspace-card">
            <div class="section-header">
              <div>
                <p class="eyebrow">Due soon</p>
                <h2>Rent reminders</h2>
              </div>
            </div>
            <div id="dashboard-reminders">${renderLoading("Loading reminders...")}</div>
          </section>
          <section class="workspace-card">
            <div class="section-header">
              <div>
                <p class="eyebrow">Recent movement</p>
                <h2>Complaints</h2>
              </div>
            </div>
            <div id="dashboard-complaints">${renderLoading("Loading complaints...")}</div>
          </section>
        </div>
        <section class="workspace-card">
          <div class="section-header">
            <div>
              <p class="eyebrow">Portfolio overview</p>
              <h2>Your properties</h2>
            </div>
            <a class="text-link" data-link href="/app/properties">See all</a>
          </div>
          <div id="dashboard-properties">${renderLoading("Loading properties...")}</div>
        </section>
      </section>
    `,
  });

  return {
    title: shell.title,
    html: shell.html,
    afterRender() {
      shell.afterRender();
      const metricsRoot = document.getElementById("dashboard-metrics");
      const remindersRoot = document.getElementById("dashboard-reminders");
      const complaintsRoot = document.getElementById("dashboard-complaints");
      const propertiesRoot = document.getElementById("dashboard-properties");

      const cache = {
        properties: [],
        tenants: [],
        payments: [],
        complaints: [],
      };

      const paint = () => {
        const model = buildDashboardModel({
          ...cache,
          reminderLeadDays: ctx.state.profile?.reminderLeadDays ?? 4,
        });

        metricsRoot.innerHTML = `
          <article class="stat-card">
            <p>Total properties</p>
            <strong>${model.metrics.totalProperties}</strong>
          </article>
          <article class="stat-card">
            <p>Active tenants</p>
            <strong>${model.metrics.activeTenants}</strong>
          </article>
          <article class="stat-card">
            <p>Pending this month</p>
            <strong>${model.metrics.pendingPayments}</strong>
          </article>
          <article class="stat-card">
            <p>Open complaints</p>
            <strong>${model.metrics.openComplaints}</strong>
          </article>
        `;

        remindersRoot.innerHTML = model.reminders.length
          ? `<div class="reminder-list">
              ${model.reminders
                .map(
                  (reminder) => `
                    <article class="reminder-card reminder-${statusTone(reminder.status)}">
                      <div>
                        <h3>${escapeHtml(reminder.tenantName)}</h3>
                        <p>${escapeHtml(reminder.propertyName)}</p>
                      </div>
                      <div>
                        ${statusPill(
                          reminder.status === "today"
                            ? "Due today"
                            : reminder.status === "overdue"
                            ? `${Math.abs(reminder.dueInDays)} day overdue`
                            : `${reminder.dueInDays} day lead`,
                          statusTone(reminder.status)
                        )}
                      </div>
                    </article>
                  `
                )
                .join("")}
            </div>`
          : renderEmpty({
              title: "Nothing urgent right now",
              description: "Upcoming rent reminders will appear here automatically.",
            });

        complaintsRoot.innerHTML = model.recentComplaints.length
          ? `<div class="activity-list">
              ${model.recentComplaints
                .map(
                  (complaint) => `
                    <article class="activity-row">
                      <div>
                        <h3>${escapeHtml(titleCase(complaint.category))}</h3>
                        <p>${escapeHtml(complaint.description)}</p>
                      </div>
                      ${statusPill(titleCase(complaint.status), statusTone(complaint.status))}
                    </article>
                  `
                )
                .join("")}
            </div>`
          : renderEmpty({
              title: "No complaints logged",
              description: "Property issue history will populate here as soon as you create one.",
            });

        propertiesRoot.innerHTML = model.propertyCards.length
          ? `<div class="property-grid">${model.propertyCards.map(renderPropertySummaryCard).join("")}</div>`
          : renderEmpty({
              title: "No properties yet",
              description: "Start with your first unit to unlock the rest of the workflow.",
              actionHref: "/app/properties",
              actionLabel: "Add a property",
            });
      };

      ctx.setCleanup(watchProperties((rows) => {
        cache.properties = rows;
        paint();
      }));
      ctx.setCleanup(watchTenants((rows) => {
        cache.tenants = rows;
        paint();
      }));
      ctx.setCleanup(watchPayments((rows) => {
        cache.payments = rows;
        paint();
      }));
      ctx.setCleanup(watchComplaints((rows) => {
        cache.complaints = rows;
        paint();
      }));
    },
  };
}

async function renderPropertiesPage(ctx) {
  const shell = renderShell(ctx, {
    title: "Properties",
    description:
      "Create, edit, and open every property from one tidy portfolio list linked to tenants, complaints, and agreements.",
    actions: `
      <button class="button button-dark" type="button" data-action="add-property">Add property</button>
    `,
    content: `
      <section class="workspace-card">
        <div class="section-header">
          <div>
            <p class="eyebrow">Portfolio</p>
            <h2>Property collection</h2>
          </div>
        </div>
        <div id="properties-page-list">${renderLoading("Loading properties...")}</div>
      </section>
    `,
  });

  return {
    title: shell.title,
    html: shell.html,
    afterRender() {
      shell.afterRender();
      const listRoot = document.getElementById("properties-page-list");
      const addButton = document.querySelector("[data-action='add-property']");
      let properties = [];
      let tenants = [];

      const paint = () => {
        listRoot.innerHTML = properties.length
          ? `
              <div class="property-grid">
                ${properties
                  .map((property) => {
                    const activeTenant = tenants.find(
                      (tenant) => tenant.propertyId === property.id && tenant.isActive
                    );
                    const enriched = {
                      ...property,
                      currentTenant: activeTenant,
                      rentStatus: activeTenant ? "pending" : "vacant",
                      openComplaints: 0,
                    };

                    return `
                      <article class="workspace-card property-card property-card-inline">
                        <div class="property-card-top">
                          <div>
                            <p class="eyebrow">${escapeHtml(titleCase(property.type))}</p>
                            <h3>${escapeHtml(property.propertyName)}</h3>
                            <p>${escapeHtml(property.address)}</p>
                          </div>
                          ${statusPill(
                            activeTenant ? "Occupied" : "Vacant",
                            activeTenant ? "success" : "warning"
                          )}
                        </div>
                        <div class="property-card-meta">
                          <span>${formatCurrency(property.monthlyRent)}</span>
                          <span>${property.numberOfRooms} rooms</span>
                        </div>
                        <div class="property-card-meta">
                          <span>${activeTenant ? escapeHtml(activeTenant.fullName) : "Awaiting tenant"}</span>
                          <span>${escapeHtml(titleCase(property.type))}</span>
                        </div>
                        <div class="card-actions">
                          <a class="button button-ghost" data-link href="/app/properties/${property.id}">Open</a>
                          <button class="button button-ghost" data-action="edit-property" data-property-id="${property.id}">Edit</button>
                          <button class="button button-danger-soft" data-action="delete-property" data-property-id="${property.id}">Delete</button>
                        </div>
                      </article>
                    `;
                  })
                  .join("")}
              </div>
            `
          : renderEmpty({
              title: "Your portfolio is empty",
              description: "Add your first property to begin tracking tenants, rent, and issues.",
            });
      };

      addButton?.addEventListener("click", () => openPropertyModal({ onSaved: paint }));
      listRoot.addEventListener("click", async (event) => {
        const action = event.target.closest("[data-action]");
        if (!action) {
          return;
        }

        const propertyId = action.dataset.propertyId;
        const property = properties.find((item) => item.id === propertyId);
        if (!property) {
          return;
        }

        if (action.dataset.action === "edit-property") {
          openPropertyModal({ property, onSaved: paint });
          return;
        }

        if (action.dataset.action === "delete-property") {
          const activeTenant = tenants.find(
            (tenant) => tenant.propertyId === property.id && tenant.isActive
          );
          if (activeTenant) {
            showToast("Deactivate the active tenant before deleting this property.", "warning");
            return;
          }

          const confirmed = await confirmDialog({
            title: "Delete property",
            message: `Delete ${property.propertyName}? This removes the property record but does not delete historic tenant or complaint documents.`,
            confirmLabel: "Delete property",
          });

          if (!confirmed) {
            return;
          }

          await deleteProperty(property.id);
          showToast("Property removed.", "success");
        }
      });

      ctx.setCleanup(watchProperties((rows) => {
        properties = rows;
        paint();
      }));
      ctx.setCleanup(watchTenants((rows) => {
        tenants = rows;
        paint();
      }));
    },
  };
}

async function renderPropertyDetailPage(ctx) {
  const shell = renderShell(ctx, {
    title: "Property detail",
    description: "Manage the active tenant, complaint flow, and agreement shortcuts for one specific property.",
    actions: `
      <a class="button button-ghost" data-link href="/app/properties">Back to properties</a>
    `,
    content: `
      <div id="property-detail-root">${renderLoading("Loading property...")}</div>
    `,
  });

  return {
    title: "Property Detail",
    html: shell.html,
    afterRender() {
      shell.afterRender();
      const root = document.getElementById("property-detail-root");
      let property = null;
      let tenants = [];
      let complaints = [];

      const paint = () => {
        if (!property) {
          root.innerHTML = renderEmpty({
            title: "Property not found",
            description: "This property either does not exist or does not belong to your account.",
            actionHref: "/app/properties",
            actionLabel: "Back to properties",
          });
          return;
        }

        const activeTenant = tenants.find((tenant) => tenant.isActive);
        const historicTenants = tenants.filter((tenant) => !tenant.isActive);

        root.innerHTML = `
          <section class="workspace-card detail-hero">
            <div>
              <p class="eyebrow">${escapeHtml(titleCase(property.type))}</p>
              <h2>${escapeHtml(property.propertyName)}</h2>
              <p>${escapeHtml(property.address)}</p>
            </div>
            <div class="detail-hero-meta">
              ${statusPill(activeTenant ? "Occupied" : "Vacant", activeTenant ? "success" : "warning")}
              <span>${formatCurrency(property.monthlyRent)} / month</span>
            </div>
          </section>
          <div class="two-column-layout">
            <section class="workspace-card">
              <div class="section-header">
                <div>
                  <p class="eyebrow">Tenant</p>
                  <h2>${activeTenant ? "Current resident" : "Add your first tenant"}</h2>
                </div>
                ${
                  activeTenant
                    ? `<a class="text-link" data-link href="/app/tenants/${activeTenant.id}">Open profile</a>`
                    : ""
                }
              </div>
              ${
                activeTenant
                  ? `
                    <div class="tenant-summary-panel">
                      <h3>${escapeHtml(activeTenant.fullName)}</h3>
                      <p>${escapeHtml(activeTenant.email)}</p>
                      <p>${escapeHtml(activeTenant.phoneNumber)}</p>
                      <p>Moved in ${formatDate(activeTenant.moveInDate)}</p>
                      <div class="card-actions">
                        <button class="button button-ghost" data-action="edit-tenant" data-tenant-id="${activeTenant.id}">Edit tenant</button>
                        <a class="button button-dark" data-link href="/app/payments/${activeTenant.id}">Open payments</a>
                      </div>
                    </div>
                  `
                  : `
                    ${renderEmpty({
                      title: "This property is ready for a tenant",
                      description: "Create the tenant profile here and RentEase will mark the property as occupied automatically.",
                    })}
                  `
              }
              <div class="card-actions">
                <button class="button button-dark" data-action="add-tenant" ${activeTenant ? "disabled" : ""}>
                  ${activeTenant ? "Active tenant linked" : "Add tenant"}
                </button>
                ${
                  activeTenant
                    ? `<a class="button button-ghost" data-link href="/app/agreements/new?tenantId=${activeTenant.id}">Generate agreement</a>`
                    : ""
                }
              </div>
            </section>
            <section class="workspace-card">
              <div class="section-header">
                <div>
                  <p class="eyebrow">Maintenance</p>
                  <h2>Complaint activity</h2>
                </div>
                <a class="text-link" data-link href="/app/complaints/${ctx.params.propertyId}">Open log</a>
              </div>
              ${
                complaints.length
                  ? `<div class="activity-list">
                      ${complaints
                        .slice(0, 4)
                        .map(
                          (complaint) => `
                            <article class="activity-row">
                              <div>
                                <h3>${escapeHtml(titleCase(complaint.category))}</h3>
                                <p>${escapeHtml(complaint.description)}</p>
                              </div>
                              ${statusPill(titleCase(complaint.status), statusTone(complaint.status))}
                            </article>
                          `
                        )
                        .join("")}
                    </div>`
                  : renderEmpty({
                      title: "No issues logged",
                      description: "Maintenance requests logged for this property will appear here.",
                    })
              }
              <div class="card-actions">
                <button class="button button-ghost" data-action="add-complaint">Add complaint</button>
              </div>
            </section>
          </div>
          <section class="workspace-card">
            <div class="section-header">
              <div>
                <p class="eyebrow">History</p>
                <h2>Past tenants</h2>
              </div>
            </div>
            ${
              historicTenants.length
                ? `
                  <div class="history-list">
                    ${historicTenants
                      .map(
                        (tenant) => `
                          <a class="history-row" data-link href="/app/tenants/${tenant.id}">
                            <div>
                              <strong>${escapeHtml(tenant.fullName)}</strong>
                              <p>Moved in ${formatDate(tenant.moveInDate)}</p>
                            </div>
                            ${statusPill("Inactive", "neutral")}
                          </a>
                        `
                      )
                      .join("")}
                  </div>
                `
                : renderEmpty({
                    title: "No historic tenants yet",
                    description: "Once you mark a tenant inactive they will remain visible here.",
                  })
            }
          </section>
        `;
      };

      root.addEventListener("click", (event) => {
        const action = event.target.closest("[data-action]");
        if (!action || !property) {
          return;
        }

        if (action.dataset.action === "add-tenant") {
          openTenantModal({ property, onSaved: paint });
        }

        if (action.dataset.action === "edit-tenant") {
          const tenant = tenants.find((item) => item.id === action.dataset.tenantId);
          if (tenant) {
            openTenantModal({ property, tenant, onSaved: paint });
          }
        }

        if (action.dataset.action === "add-complaint") {
          openComplaintModal({ property, onSaved: paint });
        }
      });

      ctx.setCleanup(watchProperty(ctx.params.propertyId, (value) => {
        property = value;
        paint();
      }));
      ctx.setCleanup(watchTenantsByProperty(ctx.params.propertyId, (rows) => {
        tenants = rows;
        paint();
      }));
      ctx.setCleanup(watchComplaintsByProperty(ctx.params.propertyId, (rows) => {
        complaints = rows;
        paint();
      }));
    },
  };
}

async function renderTenantDetailPage(ctx) {
  const shell = renderShell(ctx, {
    title: "Tenant profile",
    description: "Keep contact info, ID proof, rent links, and tenancy state together in one place.",
    actions: `<a class="button button-ghost" data-link href="/app/properties">Back to properties</a>`,
    content: `<div id="tenant-detail-root">${renderLoading("Loading tenant profile...")}</div>`,
  });

  return {
    title: "Tenant Profile",
    html: shell.html,
    afterRender() {
      shell.afterRender();
      const root = document.getElementById("tenant-detail-root");
      let tenant = null;
      let property = null;
      let propertyUnsubscribe = null;

      const paint = () => {
        if (!tenant) {
          root.innerHTML = renderEmpty({
            title: "Tenant not found",
            description: "This tenant record either does not exist or is outside your workspace.",
            actionHref: "/app/properties",
            actionLabel: "Open properties",
          });
          return;
        }

        root.innerHTML = `
          <section class="workspace-card detail-hero">
            <div>
              <p class="eyebrow">${escapeHtml(property?.propertyName || "Tenant")}</p>
              <h2>${escapeHtml(tenant.fullName)}</h2>
              <p>${escapeHtml(tenant.email)} · ${escapeHtml(tenant.phoneNumber)}</p>
            </div>
            <div class="detail-hero-meta">
              ${statusPill(tenant.isActive ? "Active" : "Inactive", tenant.isActive ? "success" : "neutral")}
              <span>Rent due day ${tenant.rentDueDay}</span>
            </div>
          </section>
          <div class="two-column-layout">
            <section class="workspace-card">
              <div class="section-header">
                <div>
                  <p class="eyebrow">Identity and tenancy</p>
                  <h2>Profile summary</h2>
                </div>
              </div>
              <ul class="summary-list">
                <li><span>Property</span><strong>${escapeHtml(property?.propertyName || "Unknown")}</strong></li>
                <li><span>Move-in date</span><strong>${formatDate(tenant.moveInDate)}</strong></li>
                <li><span>Due day</span><strong>${tenant.rentDueDay}</strong></li>
                <li><span>ID proof</span><strong>${
                  tenant.identityDocUrl
                    ? `<a class="text-link" href="${tenant.identityDocUrl}" target="_blank" rel="noreferrer">Open document</a>`
                    : "Not uploaded"
                }</strong></li>
              </ul>
              <div class="card-actions">
                <button class="button button-ghost" data-action="edit-tenant">Edit tenant</button>
                ${
                  tenant.isActive
                    ? `<button class="button button-danger-soft" data-action="deactivate-tenant">Mark inactive</button>`
                    : ""
                }
              </div>
            </section>
            <section class="workspace-card">
              <div class="section-header">
                <div>
                  <p class="eyebrow">Quick links</p>
                  <h2>Next steps</h2>
                </div>
              </div>
              <div class="quick-link-stack">
                <a class="quick-link-card" data-link href="/app/payments/${tenant.id}">
                  <strong>Payment tracker</strong>
                  <p>Update month tiles and outstanding balance.</p>
                </a>
                <a class="quick-link-card" data-link href="/app/agreements/new?tenantId=${tenant.id}">
                  <strong>Generate agreement</strong>
                  <p>Prefill the generator with this tenant and property.</p>
                </a>
                <a class="quick-link-card" data-link href="/app/complaints/${tenant.propertyId}">
                  <strong>Open complaints</strong>
                  <p>Log and resolve maintenance requests for this property.</p>
                </a>
              </div>
            </section>
          </div>
        `;
      };

      root.addEventListener("click", async (event) => {
        const action = event.target.closest("[data-action]");
        if (!action || !tenant || !property) {
          return;
        }

        if (action.dataset.action === "edit-tenant") {
          openTenantModal({ property, tenant, onSaved: paint });
        }

        if (action.dataset.action === "deactivate-tenant") {
          const confirmed = await confirmDialog({
            title: "Mark tenant inactive",
            message: `Mark ${tenant.fullName} inactive and free up ${property.propertyName} for a future tenant?`,
            confirmLabel: "Mark inactive",
          });

          if (!confirmed) {
            return;
          }

          await deactivateTenant(tenant.id);
          showToast("Tenant marked inactive and property reopened.", "success");
        }
      });

      ctx.setCleanup(watchTenant(ctx.params.tenantId, (value) => {
        tenant = value;
        propertyUnsubscribe?.();
        propertyUnsubscribe = null;
        if (!tenant) {
          property = null;
          paint();
          return;
        }
        propertyUnsubscribe = watchProperty(tenant.propertyId, (propertyValue) => {
          property = propertyValue;
          paint();
        });
        paint();
      }));
      ctx.setCleanup(() => propertyUnsubscribe?.());
    },
  };
}

async function renderAgreementPage(ctx) {
  const shell = renderShell(ctx, {
    title: "Agreement generator",
    description:
      "Generate a polished PDF, save the key terms in Firestore, and keep every agreement linked to the correct tenancy.",
    actions: `<a class="button button-ghost" data-link href="/app/properties">Choose property</a>`,
    content: `<div id="agreement-page-root">${renderLoading("Loading tenants and properties...")}</div>`,
  });

  return {
    title: "Agreement Generator",
    html: shell.html,
    afterRender() {
      shell.afterRender();
      const root = document.getElementById("agreement-page-root");
      let properties = [];
      let tenants = [];
      let selectedTenantId = ctx.query.get("tenantId") || "";

      const paint = () => {
        const activeTenants = tenants.filter((tenant) => tenant.isActive);
        const selectedTenant =
          activeTenants.find((tenant) => tenant.id === selectedTenantId) || activeTenants[0] || null;
        if (selectedTenant && !selectedTenantId) {
          selectedTenantId = selectedTenant.id;
        }

        const selectedProperty = properties.find(
          (property) => property.id === selectedTenant?.propertyId
        );

        root.innerHTML = activeTenants.length
          ? `
              <div class="two-column-layout">
                <section class="workspace-card">
                  <div class="section-header">
                    <div>
                      <p class="eyebrow">Draft builder</p>
                      <h2>Agreement inputs</h2>
                    </div>
                  </div>
                  <form id="agreement-form" class="stacked-form">
                    <label>
                      <span>Tenant</span>
                      <select name="tenantId" id="agreement-tenant">
                        ${activeTenants
                          .map(
                            (tenant) => `
                              <option value="${tenant.id}" ${
                                tenant.id === selectedTenant?.id ? "selected" : ""
                              }>
                                ${escapeHtml(tenant.fullName)}
                              </option>
                            `
                          )
                          .join("")}
                      </select>
                    </label>
                    <div class="form-grid">
                      <label>
                        <span>Landlord name</span>
                        <input
                          name="landlordName"
                          type="text"
                          required
                          value="${escapeHtml(ctx.state.profile?.displayName || "RentEase Landlord")}"
                        />
                      </label>
                      <label>
                        <span>Landlord email</span>
                        <input
                          name="landlordEmail"
                          type="email"
                          required
                          value="${escapeHtml(ctx.state.user?.email || "")}"
                        />
                      </label>
                    </div>
                    <label>
                      <span>Landlord address</span>
                      <textarea name="landlordAddress" rows="3" required></textarea>
                    </label>
                    <div class="form-grid">
                      <label>
                        <span>Tenant address</span>
                        <input name="tenantAddress" type="text" required />
                      </label>
                      <label>
                        <span>Agreement start date</span>
                        <input name="startDate" type="date" required value="${dayjs().format("YYYY-MM-DD")}" />
                      </label>
                    </div>
                    <div class="form-grid">
                      <label>
                        <span>Monthly rent</span>
                        <input
                          name="monthlyRent"
                          type="number"
                          min="0"
                          required
                          value="${escapeHtml(String(selectedProperty?.monthlyRent || 0))}"
                        />
                      </label>
                      <label>
                        <span>Security deposit</span>
                        <input name="securityDeposit" type="number" min="0" required value="${escapeHtml(
                          String(selectedProperty?.monthlyRent || 0)
                        )}" />
                      </label>
                    </div>
                    <div class="form-grid">
                      <label>
                        <span>Lock-in period (months)</span>
                        <input name="lockInPeriod" type="number" min="0" required value="6" />
                      </label>
                      <label>
                        <span>Notice period (months)</span>
                        <input name="noticePeriod" type="number" min="1" required value="1" />
                      </label>
                      <label>
                        <span>Rent due day</span>
                        <input name="rentDueDay" type="number" min="1" max="31" required value="${escapeHtml(
                          String(selectedTenant?.rentDueDay || 5)
                        )}" />
                      </label>
                    </div>
                    <label>
                      <span>Maintenance notes</span>
                      <textarea name="maintenanceNotes" rows="3">Landlord will handle structural repairs; tenant will keep day-to-day upkeep in good order.</textarea>
                    </label>
                    <button type="submit" class="button button-dark">Generate PDF and save terms</button>
                  </form>
                </section>
                <section class="workspace-card">
                  <div class="section-header">
                    <div>
                      <p class="eyebrow">Preview summary</p>
                      <h2>Selected tenancy</h2>
                    </div>
                  </div>
                  <ul class="summary-list">
                    <li><span>Tenant</span><strong>${escapeHtml(selectedTenant?.fullName || "None")}</strong></li>
                    <li><span>Property</span><strong>${escapeHtml(selectedProperty?.propertyName || "None")}</strong></li>
                    <li><span>Property address</span><strong>${escapeHtml(selectedProperty?.address || "Not available")}</strong></li>
                    <li><span>Tenant email</span><strong>${escapeHtml(selectedTenant?.email || "Not available")}</strong></li>
                    <li><span>Move-in</span><strong>${formatDate(selectedTenant?.moveInDate || "")}</strong></li>
                    <li><span>Default rent</span><strong>${formatCurrency(selectedProperty?.monthlyRent || 0)}</strong></li>
                  </ul>
                  <p class="disclaimer">
                    RentEase stores only the agreement summary terms in Firestore. The downloaded PDF should still be reviewed, printed, and signed before any legal use.
                  </p>
                </section>
              </div>
            `
          : renderEmpty({
              title: "No active tenants to draft for",
              description: "Create an active tenant first, then return here to generate the agreement.",
              actionHref: "/app/properties",
              actionLabel: "Open properties",
            });

        const tenantSelect = document.getElementById("agreement-tenant");
        tenantSelect?.addEventListener("change", (event) => {
          selectedTenantId = event.target.value;
          paint();
        });

        document.getElementById("agreement-form")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const values = serializeForm(form);
          const submitButton = form.querySelector("[type='submit']");
          const tenant = activeTenants.find((item) => item.id === values.tenantId);
          const property = properties.find((item) => item.id === tenant?.propertyId);
          if (!tenant || !property) {
            showToast("Choose a valid active tenant to continue.", "warning");
            return;
          }

          setButtonBusy(submitButton, true, "Generating...");
          try {
            await createAgreementRecord({
              ...values,
              propertyId: property.id,
              tenantId: tenant.id,
            });
            await generateAgreementPdf({
              ...values,
              tenantName: tenant.fullName,
              tenantAddress: values.tenantAddress,
              propertyName: property.propertyName,
              propertyAddress: property.address,
            });
            showToast("Agreement PDF generated and terms saved.", "success");
          } catch (error) {
            showToast(error.message, "danger");
          } finally {
            setButtonBusy(submitButton, false);
          }
        });
      };

      ctx.setCleanup(watchProperties((rows) => {
        properties = rows;
        paint();
      }));
      ctx.setCleanup(watchTenants((rows) => {
        tenants = rows;
        paint();
      }));
    },
  };
}

async function renderPaymentsOverviewPage(ctx) {
  const shell = renderShell(ctx, {
    title: "Payments",
    description:
      "Use this overview to jump into any tenant tracker and see who is paid, partial, or still pending this month.",
    actions: `<a class="button button-ghost" data-link href="/app/properties">Manage tenants</a>`,
    content: `<section class="workspace-card"><div id="payments-overview-root">${renderLoading(
      "Loading payment overview..."
    )}</div></section>`,
  });

  return {
    title: "Payments",
    html: shell.html,
    afterRender() {
      shell.afterRender();
      const root = document.getElementById("payments-overview-root");
      const cache = { properties: [], tenants: [], payments: [] };
      const paint = () => {
        root.innerHTML = renderPaymentsOverviewRows(cache);
      };

      ctx.setCleanup(watchProperties((rows) => {
        cache.properties = rows;
        paint();
      }));
      ctx.setCleanup(watchTenants((rows) => {
        cache.tenants = rows;
        paint();
      }));
      ctx.setCleanup(watchPayments((rows) => {
        cache.payments = rows;
        paint();
      }));
    },
  };
}

async function renderPaymentTrackerPage(ctx) {
  const shell = renderShell(ctx, {
    title: "Payment tracker",
    description: "Mark each month as paid, partial, or pending with notes and a clear outstanding summary.",
    actions: `<a class="button button-ghost" data-link href="/app/payments">Back to overview</a>`,
    content: `<div id="payment-tracker-root">${renderLoading("Loading payment tracker...")}</div>`,
  });

  return {
    title: "Payment Tracker",
    html: shell.html,
    afterRender() {
      shell.afterRender();
      const root = document.getElementById("payment-tracker-root");
      let tenant = null;
      let property = null;
      let payments = [];
      let propertyUnsubscribe = null;

      const paint = () => {
        if (!tenant || !property) {
          root.innerHTML = renderLoading("Loading linked tenant and property...");
          return;
        }

        const timeline = buildPaymentTimeline(tenant, property, payments);
        const paidCount = timeline.filter((item) => item.status === "paid").length;
        const outstanding = timeline
          .filter((item) => item.status !== "paid")
          .reduce((sum, item) => sum + Number(item.amountDue || 0), 0);

        root.innerHTML = `
          <section class="workspace-card detail-hero">
            <div>
              <p class="eyebrow">${escapeHtml(property.propertyName)}</p>
              <h2>${escapeHtml(tenant.fullName)}</h2>
              <p>${escapeHtml(property.address)}</p>
            </div>
            <div class="detail-hero-meta">
              ${statusPill(`${timeline.length} months`, "info")}
              <span>${formatCurrency(property.monthlyRent)} monthly</span>
            </div>
          </section>
          <section class="stats-grid compact-grid">
            <article class="stat-card"><p>Total months</p><strong>${timeline.length}</strong></article>
            <article class="stat-card"><p>Paid months</p><strong>${paidCount}</strong></article>
            <article class="stat-card"><p>Pending or partial</p><strong>${timeline.length - paidCount}</strong></article>
            <article class="stat-card"><p>Outstanding</p><strong>${formatCurrency(outstanding)}</strong></article>
          </section>
          <section class="workspace-card">
            <div class="section-header">
              <div>
                <p class="eyebrow">Month tiles</p>
                <h2>Payment history</h2>
              </div>
            </div>
            <div class="payment-grid">
              ${timeline
                .map(
                  (entry) => `
                    <button class="payment-tile payment-${statusTone(entry.status)}" data-action="edit-payment" data-month="${entry.month}">
                      <span>${escapeHtml(entry.label)}</span>
                      <strong>${escapeHtml(titleCase(entry.status))}</strong>
                      <small>${formatCurrency(entry.amountDue)}</small>
                    </button>
                  `
                )
                .join("")}
            </div>
          </section>
        `;

        root.querySelector(".payment-grid")?.addEventListener("click", (event) => {
          const tile = event.target.closest("[data-action='edit-payment']");
          if (!tile) {
            return;
          }
          const entry = timeline.find((item) => item.month === tile.dataset.month);
          if (entry) {
            openPaymentModal({ tenant, property, entry, onSaved: paint });
          }
        });
      };

      ctx.setCleanup(
        watchTenant(ctx.params.tenantId, (value) => {
          tenant = value;
          propertyUnsubscribe?.();
          propertyUnsubscribe = null;
          if (tenant) {
            propertyUnsubscribe = watchProperty(tenant.propertyId, (propertyValue) => {
              property = propertyValue;
              paint();
            });
          }
          paint();
        })
      );
      ctx.setCleanup(
        watchPaymentsByTenant(ctx.params.tenantId, (rows) => {
          payments = rows;
          paint();
        })
      );
      ctx.setCleanup(() => propertyUnsubscribe?.());
    },
  };
}

async function renderComplaintsOverviewPage(ctx) {
  const shell = renderShell(ctx, {
    title: "Complaints",
    description:
      "Jump into each property log, see open issue counts, and keep repairs moving without searching chat threads.",
    actions: `<a class="button button-ghost" data-link href="/app/properties">Back to properties</a>`,
    content: `<section class="workspace-card"><div id="complaints-overview-root">${renderLoading(
      "Loading complaints overview..."
    )}</div></section>`,
  });

  return {
    title: "Complaints",
    html: shell.html,
    afterRender() {
      shell.afterRender();
      const root = document.getElementById("complaints-overview-root");
      const cache = { properties: [], complaints: [] };
      const paint = () => {
        root.innerHTML = renderComplaintsOverviewRows(cache);
      };

      ctx.setCleanup(watchProperties((rows) => {
        cache.properties = rows;
        paint();
      }));
      ctx.setCleanup(watchComplaints((rows) => {
        cache.complaints = rows;
        paint();
      }));
    },
  };
}

async function renderComplaintLogPage(ctx) {
  const shell = renderShell(ctx, {
    title: "Complaint log",
    description: "Update status, record resolution notes, and keep a clear timeline for one property.",
    actions: `<a class="button button-ghost" data-link href="/app/complaints">Back to complaints</a>`,
    content: `<div id="complaints-property-root">${renderLoading("Loading property complaints...")}</div>`,
  });

  return {
    title: "Complaint Log",
    html: shell.html,
    afterRender() {
      shell.afterRender();
      const root = document.getElementById("complaints-property-root");
      let property = null;
      let complaints = [];

      const paint = () => {
        if (!property) {
          root.innerHTML = renderEmpty({
            title: "Property not found",
            description: "We couldn't find this property inside your workspace.",
            actionHref: "/app/complaints",
            actionLabel: "Back to complaints",
          });
          return;
        }

        root.innerHTML = `
          <section class="workspace-card detail-hero">
            <div>
              <p class="eyebrow">${escapeHtml(titleCase(property.type))}</p>
              <h2>${escapeHtml(property.propertyName)}</h2>
              <p>${escapeHtml(property.address)}</p>
            </div>
            <div class="detail-hero-meta">
              ${statusPill(`${complaints.length} issues`, complaints.length ? "warning" : "success")}
              <button class="button button-dark" type="button" data-action="add-complaint">Add complaint</button>
            </div>
          </section>
          <section class="complaint-list">
            ${
              complaints.length
                ? complaints
                    .map(
                      (complaint) => `
                        <form class="workspace-card complaint-card" data-complaint-id="${complaint.id}">
                          <div class="section-header">
                            <div>
                              <p class="eyebrow">${escapeHtml(titleCase(complaint.category))}</p>
                              <h2>${escapeHtml(complaint.description)}</h2>
                            </div>
                            ${statusPill(titleCase(complaint.status), statusTone(complaint.status))}
                          </div>
                          <div class="form-grid">
                            <label>
                              <span>Status</span>
                              <select name="status">
                                ${["open", "in-progress", "resolved"]
                                  .map(
                                    (status) => `
                                      <option value="${status}" ${
                                        complaint.status === status ? "selected" : ""
                                      }>
                                        ${titleCase(status)}
                                      </option>
                                    `
                                  )
                                  .join("")}
                              </select>
                            </label>
                            <label>
                              <span>Priority</span>
                              <input type="text" disabled value="${escapeHtml(titleCase(complaint.priority))}" />
                            </label>
                            <label>
                              <span>Date raised</span>
                              <input type="text" disabled value="${formatDate(complaint.dateRaised)}" />
                            </label>
                          </div>
                          <label>
                            <span>Resolution note</span>
                            <textarea name="resolutionNote" rows="3">${escapeHtml(
                              complaint.resolutionNote || ""
                            )}</textarea>
                          </label>
                          <div class="dialog-actions">
                            <button type="submit" class="button button-dark">Save changes</button>
                          </div>
                        </form>
                      `
                    )
                    .join("")
                : renderEmpty({
                    title: "No complaints logged for this property",
                    description: "Use the button above to add the first maintenance issue.",
                  })
            }
          </section>
        `;

        root.querySelector("[data-action='add-complaint']")?.addEventListener("click", () => {
          openComplaintModal({ property, onSaved: paint });
        });

        root.querySelectorAll("form[data-complaint-id]").forEach((form) => {
          form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const values = serializeForm(form);
            const button = form.querySelector("[type='submit']");
            setButtonBusy(button, true, "Saving...");
            try {
              await updateComplaint(form.dataset.complaintId, values);
              showToast("Complaint status updated.", "success");
            } catch (error) {
              showToast(error.message, "danger");
            } finally {
              setButtonBusy(button, false);
            }
          });
        });
      };

      ctx.setCleanup(watchProperty(ctx.params.propertyId, (value) => {
        property = value;
        paint();
      }));
      ctx.setCleanup(watchComplaintsByProperty(ctx.params.propertyId, (rows) => {
        complaints = rows;
        paint();
      }));
    },
  };
}

async function renderAiPage(ctx) {
  const shell = renderShell(ctx, {
    title: "AI clause explainer",
    description:
      "Bring your own Gemini API key, paste a clause, and get a grounded explanation based only on the text you supplied.",
    actions: `<a class="button button-ghost" data-link href="/app/settings">Manage API key</a>`,
    content: `
      <div class="two-column-layout">
        <section class="workspace-card">
          <div class="section-header">
            <div>
              <p class="eyebrow">Gemini 2.5 Flash</p>
              <h2>Explain a rental clause</h2>
            </div>
          </div>
          <form id="ai-form" class="stacked-form">
            <label>
              <span>Paste clause text</span>
              <textarea name="clauseText" rows="8" required></textarea>
            </label>
            <label>
              <span>Question</span>
              <input name="question" type="text" required placeholder="What does this clause mean in simple language?" />
            </label>
            <button type="submit" class="button button-dark">Get explanation</button>
          </form>
        </section>
        <section class="workspace-card">
          <div class="section-header">
            <div>
              <p class="eyebrow">Response</p>
              <h2>Plain-language explanation</h2>
            </div>
          </div>
          <div id="ai-response">
            ${
              getStoredGeminiKey()
                ? `<div class="empty-state"><h3>Ready when you are</h3><p>Paste a clause on the left and RentEase will ask Gemini to explain only that text.</p></div>`
                : `<div class="empty-state"><h3>Add your Gemini key first</h3><p>The key lives only in this browser. You can add or clear it from Settings.</p><a class="button button-dark" data-link href="/app/settings">Open settings</a></div>`
            }
          </div>
          <p class="disclaimer">
            This explanation is for informational purposes only and does not constitute legal advice.
            Consult a qualified professional for any legal decision.
          </p>
        </section>
      </div>
    `,
  });

  return {
    title: "AI Clause Explainer",
    html: shell.html,
    afterRender() {
      shell.afterRender();
      const form = document.getElementById("ai-form");
      const responseRoot = document.getElementById("ai-response");
      const submitButton = form.querySelector("[type='submit']");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = serializeForm(form);
        setButtonBusy(submitButton, true, "Analyzing...");
        responseRoot.innerHTML = renderLoading("Gemini is reading the clause...");
        try {
          const answer = await explainClause({
            ...values,
            apiKey: getStoredGeminiKey(),
          });
          responseRoot.innerHTML = `<div class="ai-answer">${paragraphize(answer)}</div>`;
        } catch (error) {
          responseRoot.innerHTML = `<div class="empty-state"><h3>Couldn't generate explanation</h3><p>${escapeHtml(
            error.message
          )}</p></div>`;
        } finally {
          setButtonBusy(submitButton, false);
        }
      });
    },
  };
}

async function renderSettingsPage(ctx) {
  const shell = renderShell(ctx, {
    title: "Settings",
    description:
      "Tune reminder lead days, keep your landlord display info current, and manage the Gemini BYOA key stored only on this device.",
    content: `
      <div class="two-column-layout">
        <section class="workspace-card">
          <div class="section-header">
            <div>
              <p class="eyebrow">Landlord profile</p>
              <h2>Workspace defaults</h2>
            </div>
          </div>
          <form id="settings-form" class="stacked-form">
            <label>
              <span>Display name</span>
              <input name="displayName" type="text" required value="${escapeHtml(
                ctx.state.profile?.displayName || ""
              )}" />
            </label>
            <label>
              <span>Account email</span>
              <input name="email" type="email" readonly value="${escapeHtml(ctx.state.user?.email || "")}" />
            </label>
            <label>
              <span>Reminder lead days</span>
              <input
                name="reminderLeadDays"
                type="number"
                min="0"
                max="15"
                required
                value="${escapeHtml(String(ctx.state.profile?.reminderLeadDays ?? 4))}"
              />
            </label>
            <button type="submit" class="button button-dark">Save settings</button>
          </form>
        </section>
        <section class="workspace-card">
          <div class="section-header">
            <div>
              <p class="eyebrow">Bring your own API key</p>
              <h2>Gemini access</h2>
            </div>
          </div>
          <form id="gemini-form" class="stacked-form">
            <label>
              <span>Model</span>
              <input type="text" readonly value="${escapeHtml(getGeminiModel())}" />
            </label>
            <label>
              <span>Current key</span>
              <input type="text" readonly value="${escapeHtml(maskKey(getStoredGeminiKey()))}" />
            </label>
            <label>
              <span>Paste new Gemini key</span>
              <input name="apiKey" type="password" placeholder="AIza..." />
            </label>
            <div class="dialog-actions">
              <button type="submit" class="button button-dark">Save key on this device</button>
              <button type="button" class="button button-danger-soft" id="clear-gemini-key">Clear key</button>
            </div>
          </form>
          <p class="disclaimer">
            The Gemini key is saved only in this browser's local storage. It is never written to
            Firestore or sent anywhere except your own Gemini API request.
          </p>
        </section>
      </div>
    `,
  });

  return {
    title: "Settings",
    html: shell.html,
    afterRender() {
      shell.afterRender();

      const settingsForm = document.getElementById("settings-form");
      const settingsButton = settingsForm.querySelector("[type='submit']");
      settingsForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = serializeForm(settingsForm);
        setButtonBusy(settingsButton, true, "Saving...");
        try {
          ctx.state.profile = await updateLandlordSettings(values);
          showToast("Workspace settings saved.", "success");
          ctx.rerender();
        } catch (error) {
          showToast(error.message, "danger");
        } finally {
          setButtonBusy(settingsButton, false);
        }
      });

      const geminiForm = document.getElementById("gemini-form");
      const geminiButton = geminiForm.querySelector("[type='submit']");
      geminiForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const values = serializeForm(geminiForm);
        if (!values.apiKey?.trim()) {
          showToast("Paste a Gemini API key first.", "warning");
          return;
        }
        setButtonBusy(geminiButton, true, "Saving...");
        setStoredGeminiKey(values.apiKey);
        showToast("Gemini key saved locally on this device.", "success");
        setButtonBusy(geminiButton, false);
        ctx.rerender();
      });

      document.getElementById("clear-gemini-key")?.addEventListener("click", () => {
        clearStoredGeminiKey();
        showToast("Gemini key cleared from this device.", "success");
        ctx.rerender();
      });
    },
  };
}

export const routes = [
  {
    path: "/",
    redirectIfAuthed: false,
    render: renderLandingPage,
  },
  {
    path: "/login",
    redirectIfAuthed: true,
    render: (ctx) => renderAuthPage(ctx, "login"),
  },
  {
    path: "/register",
    redirectIfAuthed: true,
    render: (ctx) => renderAuthPage(ctx, "register"),
  },
  {
    path: "/app",
    requiresAuth: true,
    render: renderDashboardPage,
  },
  {
    path: "/app/properties",
    requiresAuth: true,
    render: renderPropertiesPage,
  },
  {
    path: "/app/properties/:propertyId",
    requiresAuth: true,
    render: renderPropertyDetailPage,
  },
  {
    path: "/app/tenants/:tenantId",
    requiresAuth: true,
    render: renderTenantDetailPage,
  },
  {
    path: "/app/agreements/new",
    requiresAuth: true,
    render: renderAgreementPage,
  },
  {
    path: "/app/payments",
    requiresAuth: true,
    render: renderPaymentsOverviewPage,
  },
  {
    path: "/app/payments/:tenantId",
    requiresAuth: true,
    render: renderPaymentTrackerPage,
  },
  {
    path: "/app/complaints",
    requiresAuth: true,
    render: renderComplaintsOverviewPage,
  },
  {
    path: "/app/complaints/:propertyId",
    requiresAuth: true,
    render: renderComplaintLogPage,
  },
  {
    path: "/app/ai",
    requiresAuth: true,
    render: renderAiPage,
  },
  {
    path: "/app/settings",
    requiresAuth: true,
    render: renderSettingsPage,
  },
  {
    path: "*",
    render: async () => ({
      title: "Not Found",
      html: `
        <section class="empty-state page-wrap">
          <p class="eyebrow">RentEase</p>
          <h1>We couldn't find that page.</h1>
          <p>Use the navigation to head back into the workspace.</p>
          <a class="button button-dark" data-link href="/">Back home</a>
        </section>
      `,
    }),
  },
];
