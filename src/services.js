import dayjs from "dayjs";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "./firebase/config.js";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_KEY_STORAGE = "rentease.geminiApiKey";

const FIREBASE_MESSAGES = {
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/invalid-credential": "The email or password is incorrect.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-password": "Enter your password to continue.",
  "auth/too-many-requests": "Too many attempts. Please wait and try again.",
  "auth/weak-password": "Use a password with at least 6 characters.",
  "permission-denied":
    "Firebase rejected this request. Deploy the Firestore rules for this project, then try again.",
  unavailable: "Firebase is temporarily unavailable. Please try again in a moment.",
};

function requireUser() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("You need to sign in to continue.");
  }
  return user;
}

function mapFirebaseError(error) {
  if (!error) {
    return "Something went wrong while talking to Firebase.";
  }

  return (
    FIREBASE_MESSAGES[error.code] ||
    error.message ||
    "Something went wrong while talking to Firebase."
  );
}

function fallbackProfile(user) {
  return {
    id: user.uid,
    displayName: user.displayName || user.email?.split("@")[0] || "RentEase Landlord",
    email: user.email || "",
    reminderLeadDays: 4,
    profileFallback: true,
  };
}

function mapDocs(snapshot) {
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^\w.-]+/g, "_");
}

function parseNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function uploadTenantDocument(uid, tenantId, file) {
  const fileRef = ref(
    storage,
    `tenant-documents/${uid}/${tenantId}/${Date.now()}-${sanitizeFileName(file.name)}`
  );

  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

async function getOwnedDoc(collectionName, id) {
  const snapshot = await getDoc(doc(db, collectionName, id));
  if (!snapshot.exists()) {
    return null;
  }

  const data = {
    id: snapshot.id,
    ...snapshot.data(),
  };

  if ("landlordId" in data && data.landlordId !== requireUser().uid) {
    throw new Error("You do not have permission to access that record.");
  }

  return data;
}

function watchOwnedQuery(collectionName, constraints, callback) {
  const user = requireUser();
  const ownedQuery = query(
    collection(db, collectionName),
    where("landlordId", "==", user.uid),
    ...constraints
  );

  return onSnapshot(ownedQuery, (snapshot) => {
    callback(mapDocs(snapshot));
  });
}

export async function registerLandlord({ displayName, email, password }) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(
      doc(db, "landlords", credential.user.uid),
      {
        displayName: displayName.trim(),
        email: email.trim(),
        reminderLeadDays: 4,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    return credential.user;
  } catch (error) {
    throw new Error(mapFirebaseError(error));
  }
}

export async function signInLandlord({ email, password }) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (error) {
    throw new Error(mapFirebaseError(error));
  }
}

export async function signOutLandlord() {
  await signOut(auth);
}

export async function ensureLandlordProfile(user) {
  if (!user) {
    return null;
  }

  try {
    const profileRef = doc(db, "landlords", user.uid);
    const profileSnapshot = await getDoc(profileRef);

    if (!profileSnapshot.exists()) {
      await setDoc(
        profileRef,
        {
          displayName: user.displayName || user.email?.split("@")[0] || "RentEase Landlord",
          email: user.email || "",
          reminderLeadDays: 4,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      const createdSnapshot = await getDoc(profileRef);
      if (!createdSnapshot.exists()) {
        return fallbackProfile(user);
      }

      return {
        id: createdSnapshot.id,
        ...createdSnapshot.data(),
      };
    }

    const data = profileSnapshot.data();
    if (typeof data.reminderLeadDays !== "number") {
      await updateDoc(profileRef, { reminderLeadDays: 4 });
    }

    return {
      id: profileSnapshot.id,
      ...data,
      reminderLeadDays: typeof data.reminderLeadDays === "number" ? data.reminderLeadDays : 4,
    };
  } catch (error) {
    console.error("Failed to sync landlord profile", error);
    return fallbackProfile(user);
  }
}

export async function updateLandlordSettings(payload) {
  const user = requireUser();
  const profileRef = doc(db, "landlords", user.uid);

  await setDoc(
    profileRef,
    {
      displayName: payload.displayName?.trim() || "RentEase Landlord",
      email: payload.email?.trim() || user.email || "",
      reminderLeadDays: parseNumber(payload.reminderLeadDays, 4),
    },
    { merge: true }
  );

  return ensureLandlordProfile(user);
}

export async function createProperty(payload) {
  const user = requireUser();
  return addDoc(collection(db, "properties"), {
    landlordId: user.uid,
    propertyName: payload.propertyName.trim(),
    address: payload.address.trim(),
    type: payload.type,
    numberOfRooms: parseNumber(payload.numberOfRooms, 1),
    monthlyRent: parseNumber(payload.monthlyRent, 0),
    isOccupied: Boolean(payload.isOccupied),
    createdAt: serverTimestamp(),
  });
}

export async function updateProperty(propertyId, payload) {
  await updateDoc(doc(db, "properties", propertyId), {
    propertyName: payload.propertyName.trim(),
    address: payload.address.trim(),
    type: payload.type,
    numberOfRooms: parseNumber(payload.numberOfRooms, 1),
    monthlyRent: parseNumber(payload.monthlyRent, 0),
  });
}

export async function deleteProperty(propertyId) {
  await deleteDoc(doc(db, "properties", propertyId));
}

export function watchProperties(callback) {
  return watchOwnedQuery("properties", [orderBy("createdAt", "desc")], callback);
}

export function watchProperty(propertyId, callback) {
  const user = requireUser();
  const propertyRef = doc(db, "properties", propertyId);

  return onSnapshot(propertyRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    const data = {
      id: snapshot.id,
      ...snapshot.data(),
    };
    callback(data.landlordId === user.uid ? data : null);
  });
}

export function getProperty(propertyId) {
  return getOwnedDoc("properties", propertyId);
}

export async function createTenant(payload, file) {
  const user = requireUser();
  const tenantRef = doc(collection(db, "tenants"));

  let identityDocUrl = payload.identityDocUrl || "";
  if (file) {
    identityDocUrl = await uploadTenantDocument(user.uid, tenantRef.id, file);
  }

  const batch = writeBatch(db);
  batch.set(tenantRef, {
    landlordId: user.uid,
    propertyId: payload.propertyId,
    fullName: payload.fullName.trim(),
    phoneNumber: payload.phoneNumber.trim(),
    email: payload.email.trim(),
    identityDocUrl,
    moveInDate: payload.moveInDate,
    rentDueDay: parseNumber(payload.rentDueDay, 5),
    isActive: true,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, "properties", payload.propertyId), {
    isOccupied: true,
  });

  await batch.commit();
  return tenantRef.id;
}

export async function updateTenant(tenantId, payload, file) {
  const user = requireUser();
  const updatePayload = {
    fullName: payload.fullName.trim(),
    phoneNumber: payload.phoneNumber.trim(),
    email: payload.email.trim(),
    moveInDate: payload.moveInDate,
    rentDueDay: parseNumber(payload.rentDueDay, 5),
    isActive: Boolean(payload.isActive),
  };

  if (file) {
    updatePayload.identityDocUrl = await uploadTenantDocument(user.uid, tenantId, file);
  }

  await updateDoc(doc(db, "tenants", tenantId), updatePayload);
}

export async function deactivateTenant(tenantId) {
  const tenant = await getOwnedDoc("tenants", tenantId);
  if (!tenant) {
    throw new Error("That tenant record could not be found.");
  }

  const batch = writeBatch(db);
  batch.update(doc(db, "tenants", tenantId), { isActive: false });
  batch.update(doc(db, "properties", tenant.propertyId), { isOccupied: false });
  await batch.commit();
}

export function getTenant(tenantId) {
  return getOwnedDoc("tenants", tenantId);
}

export function watchTenants(callback) {
  return watchOwnedQuery("tenants", [orderBy("createdAt", "desc")], callback);
}

export function watchTenantsByProperty(propertyId, callback) {
  return watchOwnedQuery(
    "tenants",
    [where("propertyId", "==", propertyId), orderBy("createdAt", "desc")],
    callback
  );
}

export function watchTenant(tenantId, callback) {
  const user = requireUser();
  const tenantRef = doc(db, "tenants", tenantId);

  return onSnapshot(tenantRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    const data = {
      id: snapshot.id,
      ...snapshot.data(),
    };
    callback(data.landlordId === user.uid ? data : null);
  });
}

export async function createAgreementRecord(payload) {
  const user = requireUser();

  const reference = await addDoc(collection(db, "agreements"), {
    landlordId: user.uid,
    propertyId: payload.propertyId,
    tenantId: payload.tenantId,
    startDate: payload.startDate,
    lockInPeriod: parseNumber(payload.lockInPeriod, 0),
    noticePeriod: parseNumber(payload.noticePeriod, 1),
    monthlyRent: parseNumber(payload.monthlyRent, 0),
    securityDeposit: parseNumber(payload.securityDeposit, 0),
    generatedAt: serverTimestamp(),
  });

  return reference.id;
}

export async function upsertPayment(payload) {
  const user = requireUser();
  const documentId = `${payload.tenantId}_${payload.month}`;

  await setDoc(
    doc(db, "payments", documentId),
    {
      landlordId: user.uid,
      tenantId: payload.tenantId,
      month: payload.month,
      status: payload.status,
      amount:
        payload.status === "pending" ? null : parseNumber(payload.amount, parseNumber(payload.defaultAmount, 0)),
      paidOn: payload.paidOn || null,
      notes: payload.notes?.trim() || "",
    },
    { merge: true }
  );

  return documentId;
}

export function watchPayments(callback) {
  return watchOwnedQuery("payments", [], callback);
}

export function watchPaymentsByTenant(tenantId, callback) {
  return watchOwnedQuery(
    "payments",
    [where("tenantId", "==", tenantId), orderBy("month", "desc")],
    callback
  );
}

export async function createComplaint(payload) {
  const user = requireUser();
  return addDoc(collection(db, "complaints"), {
    landlordId: user.uid,
    propertyId: payload.propertyId,
    description: payload.description.trim(),
    category: payload.category,
    priority: payload.priority,
    dateRaised: payload.dateRaised || dayjs().format("YYYY-MM-DD"),
    status: payload.status || "open",
    resolutionNote: payload.resolutionNote?.trim() || "",
  });
}

export async function updateComplaint(complaintId, payload) {
  await updateDoc(doc(db, "complaints", complaintId), {
    status: payload.status,
    resolutionNote: payload.resolutionNote?.trim() || "",
  });
}

export function watchComplaints(callback) {
  return watchOwnedQuery("complaints", [orderBy("dateRaised", "desc")], callback);
}

export function watchComplaintsByProperty(propertyId, callback) {
  return watchOwnedQuery(
    "complaints",
    [where("propertyId", "==", propertyId), orderBy("dateRaised", "desc")],
    callback
  );
}

export function listBillingMonths(moveInDate) {
  const months = [];
  let cursor = dayjs(moveInDate).startOf("month");
  const end = dayjs().startOf("month");

  while (cursor.isBefore(end) || cursor.isSame(end, "month")) {
    months.push(cursor.format("YYYY-MM"));
    cursor = cursor.add(1, "month");
  }

  return months;
}

export function buildPaymentTimeline(tenant, property, payments) {
  if (!tenant || !property) {
    return [];
  }

  const paymentMap = new Map(payments.map((payment) => [payment.month, payment]));

  return listBillingMonths(tenant.moveInDate)
    .reverse()
    .map((month) => {
      const payment = paymentMap.get(month);
      return {
        month,
        label: dayjs(`${month}-01`).format("MMM YYYY"),
        status: payment?.status || "pending",
        amountDue: parseNumber(property.monthlyRent, 0),
        amount: payment?.amount ?? parseNumber(property.monthlyRent, 0),
        paidOn: payment?.paidOn || "",
        notes: payment?.notes || "",
      };
    });
}

export function buildDashboardModel({
  properties,
  tenants,
  payments,
  complaints,
  reminderLeadDays,
}) {
  const currentMonth = dayjs().format("YYYY-MM");
  const currentMonthPayments = new Map(
    payments.filter((payment) => payment.month === currentMonth).map((payment) => [payment.tenantId, payment])
  );
  const activeTenants = tenants.filter((tenant) => tenant.isActive);
  const propertyMap = new Map(properties.map((property) => [property.id, property]));

  const reminders = activeTenants
    .map((tenant) => {
      const dueDate = dayjs()
        .date(
          Math.min(
            parseNumber(tenant.rentDueDay, 5),
            dayjs().daysInMonth()
          )
        )
        .startOf("day");
      const delta = dueDate.diff(dayjs().startOf("day"), "day");
      const currentPayment = currentMonthPayments.get(tenant.id);
      if (currentPayment?.status === "paid") {
        return null;
      }
      if (delta > reminderLeadDays) {
        return null;
      }

      const property = propertyMap.get(tenant.propertyId);
      return {
        tenantId: tenant.id,
        tenantName: tenant.fullName,
        propertyName: property?.propertyName || "Untitled property",
        dueInDays: delta,
        month: currentMonth,
        status: delta < 0 ? "overdue" : delta === 0 ? "today" : "upcoming",
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.dueInDays - right.dueInDays);

  const propertyCards = properties.map((property) => {
    const currentTenant = activeTenants.find((tenant) => tenant.propertyId === property.id);
    const currentPayment = currentTenant ? currentMonthPayments.get(currentTenant.id) : null;
    const openComplaints = complaints.filter(
      (complaint) =>
        complaint.propertyId === property.id &&
        (complaint.status === "open" || complaint.status === "in-progress")
    ).length;

    return {
      ...property,
      currentTenant,
      rentStatus: currentPayment?.status || (currentTenant ? "pending" : "vacant"),
      openComplaints,
    };
  });

  return {
    metrics: {
      totalProperties: properties.length,
      activeTenants: activeTenants.length,
      pendingPayments: activeTenants.filter((tenant) => {
        const payment = currentMonthPayments.get(tenant.id);
        return !payment || payment.status !== "paid";
      }).length,
      openComplaints: complaints.filter(
        (complaint) => complaint.status === "open" || complaint.status === "in-progress"
      ).length,
    },
    reminders,
    propertyCards,
    recentComplaints: complaints.slice(0, 4),
  };
}

export function getGeminiModel() {
  return GEMINI_MODEL;
}

export function getStoredGeminiKey() {
  return localStorage.getItem(GEMINI_KEY_STORAGE)?.trim() || "";
}

export function setStoredGeminiKey(apiKey) {
  localStorage.setItem(GEMINI_KEY_STORAGE, apiKey.trim());
}

export function clearStoredGeminiKey() {
  localStorage.removeItem(GEMINI_KEY_STORAGE);
}

export async function explainClause({ clauseText, question, apiKey }) {
  if (!apiKey?.trim()) {
    throw new Error("Add your Gemini API key in Settings before using the clause explainer.");
  }

  const prompt = [
    "You are the RentEase clause explainer.",
    "Answer only using the supplied rental agreement clause.",
    "If the answer is not clearly supported by the clause, say that the clause does not specify it.",
    "Do not give legal advice or mention laws beyond what is in the clause.",
    "Respond in clear, short paragraphs for a non-technical landlord or tenant.",
    "",
    `Clause: ${clauseText.trim()}`,
    `Question: ${question.trim()}`,
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey.trim(),
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.85,
          maxOutputTokens: 500,
        },
      }),
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Gemini could not process the request.");
  }

  const answer = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("\n")
    .trim();

  if (!answer) {
    throw new Error("Gemini returned an empty response. Please try again.");
  }

  return answer;
}

export async function generateAgreementPdf(payload) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({
    unit: "pt",
    format: "a4",
  });
  const pageWidth = document.internal.pageSize.getWidth();
  const maxWidth = pageWidth - 96;
  let cursorY = 58;

  const addWrappedText = (text, options = {}) => {
    const {
      size = 11,
      leading = 16,
      weight = "normal",
      align = "left",
      color = [35, 41, 46],
    } = options;

    document.setFont("times", weight);
    document.setFontSize(size);
    document.setTextColor(...color);
    const lines = document.splitTextToSize(text, maxWidth);
    document.text(lines, align === "center" ? pageWidth / 2 : 48, cursorY, {
      align,
    });
    cursorY += lines.length * leading;
  };

  const ensurePage = (space = 90) => {
    if (cursorY + space > 760) {
      document.addPage();
      cursorY = 58;
    }
  };

  document.setFillColor(248, 233, 227);
  document.rect(0, 0, pageWidth, 112, "F");
  document.setDrawColor(220, 188, 175);
  document.line(48, 104, pageWidth - 48, 104);

  addWrappedText("RENTAL AGREEMENT", {
    size: 24,
    weight: "bold",
    align: "center",
    color: [41, 31, 28],
  });
  cursorY = 92;
  addWrappedText(
    `Generated by RentEase on ${dayjs().format("DD MMMM YYYY")} for ${payload.propertyName}.`,
    {
      size: 10,
      align: "center",
      color: [97, 84, 79],
    }
  );

  cursorY = 138;
  addWrappedText(
    `This agreement is made between ${payload.landlordName}, residing at ${payload.landlordAddress}, and ${payload.tenantName}, residing at ${payload.tenantAddress}.`,
    { size: 12, leading: 18 }
  );

  const clauses = [
    `1. Property: The landlord lets out ${payload.propertyName}, located at ${payload.propertyAddress}.`,
    `2. Term: The tenancy starts on ${dayjs(payload.startDate).format("DD MMMM YYYY")} and continues on the terms below unless terminated earlier under this agreement.`,
    `3. Rent: Monthly rent is ${new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(parseNumber(payload.monthlyRent, 0))}, payable on or before day ${payload.rentDueDay} of each month.`,
    `4. Deposit: Security deposit is ${new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(parseNumber(payload.securityDeposit, 0))}.`,
    `5. Lock-in and notice: Lock-in period is ${payload.lockInPeriod} month(s). Notice period for vacating is ${payload.noticePeriod} month(s).`,
    `6. Maintenance: ${payload.maintenanceNotes?.trim() || "Routine upkeep and repair responsibilities will be handled as mutually agreed by both parties."}`,
    "7. Records: This PDF is a digital draft generated for documentation convenience and should be reviewed, printed, and signed before legal use.",
  ];

  clauses.forEach((clause) => {
    ensurePage();
    addWrappedText(clause, { size: 11, leading: 17 });
    cursorY += 8;
  });

  ensurePage(120);
  cursorY += 14;
  document.setDrawColor(183, 171, 164);
  document.line(48, cursorY, 210, cursorY);
  document.line(pageWidth - 210, cursorY, pageWidth - 48, cursorY);
  cursorY += 16;
  addWrappedText("Landlord Signature", { size: 10 });
  cursorY -= 16;
  document.text("Tenant Signature", pageWidth - 48, cursorY, { align: "right" });

  const fileName = `rentease-agreement-${payload.tenantName
    .toLowerCase()
    .replace(/[^\w]+/g, "-")}.pdf`;
  document.save(fileName);
  return fileName;
}
