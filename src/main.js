import { onAuthStateChanged } from "firebase/auth";
import "./styles.css";
import { auth } from "./firebase/config.js";
import { ensureLandlordProfile } from "./services.js";
import { closeModal, renderLoading } from "./ui.js";
import { routes } from "./views.js";

const app = document.getElementById("app");

const state = {
  authReady: false,
  user: null,
  profile: null,
  cleanup: [],
  renderToken: 0,
};

function clearCleanup() {
  state.cleanup.forEach((cleanup) => {
    try {
      cleanup();
    } catch (error) {
      console.error(error);
    }
  });
  state.cleanup = [];
}

function setCleanup(cleanup) {
  if (typeof cleanup === "function") {
    state.cleanup.push(cleanup);
  }
}

function normalizePath(pathname) {
  return pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function matchRoute(pathname) {
  const normalizedPath = normalizePath(pathname);

  for (const route of routes) {
    const routePath = normalizePath(route.path);
    const pathParts = normalizedPath.split("/").filter(Boolean);
    const routeParts = routePath.split("/").filter(Boolean);

    if (pathParts.length !== routeParts.length) {
      continue;
    }

    const params = {};
    let matched = true;

    for (let index = 0; index < routeParts.length; index += 1) {
      const routePart = routeParts[index];
      const pathPart = pathParts[index];

      if (routePart.startsWith(":")) {
        params[routePart.slice(1)] = decodeURIComponent(pathPart);
        continue;
      }

      if (routePart !== pathPart) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { route, params };
    }
  }

  return { route: routes.find((route) => route.path === "*"), params: {} };
}

export function navigate(pathname) {
  const url = new URL(pathname, window.location.origin);
  const nextPath = normalizePath(url.pathname);
  const nextLocation = `${nextPath}${url.search}`;
  const currentLocation = `${normalizePath(window.location.pathname)}${window.location.search}`;

  if (nextLocation === currentLocation && nextLocation !== "/") {
    renderCurrentRoute();
    return;
  }

  window.history.pushState({}, "", nextLocation);
  renderCurrentRoute();
}

async function renderCurrentRoute() {
  clearCleanup();
  closeModal();

  const token = state.renderToken + 1;
  state.renderToken = token;

  if (!state.authReady) {
    app.innerHTML = renderLoading("Loading your workspace...");
    return;
  }

  const { route, params } = matchRoute(window.location.pathname);
  if (!route) {
    return;
  }

  if (route.requiresAuth && !state.user) {
    navigate("/login");
    return;
  }

  if (!route.requiresAuth && route.redirectIfAuthed && state.user) {
    navigate("/app");
    return;
  }

  const context = {
    app,
    state,
    params,
    query: new URLSearchParams(window.location.search),
    pathname: normalizePath(window.location.pathname),
    navigate,
    setCleanup,
    rerender: renderCurrentRoute,
  };

  app.innerHTML = renderLoading("Building your RentEase view...");

  const view = await route.render(context);
  if (token !== state.renderToken) {
    return;
  }

  document.title = view.title ? `${view.title} · RentEase` : "RentEase";
  app.innerHTML = view.html;
  view.afterRender?.();
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-link]");
  if (!link) {
    return;
  }

  const href = link.getAttribute("href");
  if (!href || href.startsWith("http")) {
    return;
  }

  event.preventDefault();
  navigate(href);
});

window.addEventListener("popstate", renderCurrentRoute);

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  state.profile = user ? await ensureLandlordProfile(user) : null;
  state.authReady = true;
  renderCurrentRoute();
});
