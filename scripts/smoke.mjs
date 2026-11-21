/**
 * End-to-end smoke test for the auth API.
 * Usage: node scripts/smoke.mjs   (API must be running, default :5050)
 */
const base = process.env.API_URL ?? "http://localhost:5050";

let passed = 0;
let failed = 0;

function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`  ok  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name} ${extra}`);
  }
}

function skip(name, reason) {
  console.log(`skip  ${name} (${reason})`);
}

async function call(path, { method = "GET", token, cookie, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  return { status: res.status, data, location: res.headers.get("location"), setCookie: res.headers.get("set-cookie") };
}

const email = `smoke.${Date.now()}@rentora.dev`;
const password = "TestPass1";
const profile = { name: "Smoke Tester", email, photo: "https://i.imgur.com/abc.png", password };

function getSessionCookie(response) {
  const match = /access_token=([^;,\s]+)/.exec(response.setCookie ?? "");
  return match ? `access_token=${match[1]}` : null;
}

console.log(`API: ${base}\n`);

// Health
const health = await call("/");
check("health check responds ok", health.status === 200 && health.data?.status === "ok", `got ${health.status}`);

// Registration validation
const weak = await call("/api/auth/register", { method: "POST", body: { ...profile, password: "abc" } });
check("weak password rejected (400)", weak.status === 400, `got ${weak.status}`);
check("weak password message mentions rule", /uppercase|lowercase|6 characters/i.test(weak.data?.message ?? ""), JSON.stringify(weak.data));

const badPhoto = await call("/api/auth/register", { method: "POST", body: { ...profile, photo: "not-a-url" } });
check("invalid photo rejected (400)", badPhoto.status === 400, `got ${badPhoto.status}`);

// Register
const reg = await call("/api/auth/register", { method: "POST", body: profile });
check("register succeeds (201)", reg.status === 201, `got ${reg.status} ${JSON.stringify(reg.data)}`);
check("new user gets customer role", reg.data?.user?.role === "customer", JSON.stringify(reg.data?.user));
const registerCookie = getSessionCookie(reg);
check("registration sets an HttpOnly session cookie", Boolean(registerCookie) && /httponly/i.test(reg.setCookie ?? ""));


const dup = await call("/api/auth/register", { method: "POST", body: profile });
check("duplicate email rejected (409)", dup.status === 409, `got ${dup.status}`);

// Login
const wrong = await call("/api/auth/login", { method: "POST", body: { email, password: "Nope1234" } });
check("wrong password rejected (401)", wrong.status === 401, `got ${wrong.status}`);

const ghost = await call("/api/auth/login", { method: "POST", body: { email: "nobody@rentora.dev", password } });
check("unknown email rejected (401)", ghost.status === 401, `got ${ghost.status}`);

const login = await call("/api/auth/login", { method: "POST", body: { email, password, keepSignedIn: true } });
check("login succeeds (200)", login.status === 200, `got ${login.status} ${JSON.stringify(login.data)}`);
const loginCookie = getSessionCookie(login);
check("login sets an HttpOnly session cookie", Boolean(loginCookie) && /httponly/i.test(login.setCookie ?? ""));

// Token verification
const me = await call("/api/auth/me", { cookie: loginCookie });
check("/me returns the user", me.status === 200 && me.data?.user?.email === email, JSON.stringify(me.data));

const meNo = await call("/api/auth/me");
check("/me without token rejected (401)", meNo.status === 401, `got ${meNo.status}`);

const meBad = await call("/api/auth/me", { token: "not.a.real.jwt" });
check("/me with forged token rejected (401)", meBad.status === 401, `got ${meBad.status}`);

const badGoogleTicket = await call("/api/auth/exchange", {
  method: "POST",
  body: { ticket: "not-a-valid-google-ticket" },
});
check("invalid Google exchange ticket rejected (401)", badGoogleTicket.status === 401, `got ${badGoogleTicket.status}`);

const verify = await call("/api/auth/verify", { cookie: loginCookie });
check("/verify reports customer role", verify.status === 200 && verify.data?.role === "customer", JSON.stringify(verify.data));

// Public server-side equipment search and filters
const equipment = await call("/api/equipment?page=1&pageSize=24");
check(
  "equipment feed returns paginated results",
  equipment.status === 200 &&
    Array.isArray(equipment.data?.items) &&
    Number.isInteger(equipment.data?.totalPages),
  `got ${equipment.status} ${JSON.stringify(equipment.data)}`
);

const available = await call("/api/equipment?availability=available");
check(
  "availability filter returns only in-stock equipment",
  available.status === 200 &&
    available.data.items.every((item) => item.availableQuantity > 0),
  `got ${available.status}`
);

const unavailable = await call("/api/equipment?availability=unavailable");
check(
  "unavailable filter returns only out-of-stock equipment",
  unavailable.status === 200 &&
    unavailable.data.items.every((item) => item.availableQuantity <= 0),
  `got ${unavailable.status}`
);

const sampleEquipment = equipment.data?.items?.[0];
if (sampleEquipment) {
  const search = await call(
    `/api/equipment?search=${encodeURIComponent(sampleEquipment.name)}`
  );
  check(
    "equipment search matches listing names",
    search.status === 200 &&
      search.data.items.some((item) => item.name === sampleEquipment.name),
    `got ${search.status}`
  );

  const category = await call(
    `/api/equipment?category=${encodeURIComponent(sampleEquipment.category)}`
  );
  check(
    "category filter returns only that category",
    category.status === 200 &&
      category.data.items.every(
        (item) => item.category === sampleEquipment.category
      ),
    `got ${category.status}`
  );
  const categorySearch = await call(
    `/api/equipment?search=${encodeURIComponent(sampleEquipment.category)}`
  );
  check(
    "equipment search matches listing categories",
    categorySearch.status === 200 &&
      categorySearch.data.items.some(
        (item) => item.category === sampleEquipment.category
      ),
    `got ${categorySearch.status}`
  );
} else {
  skip("equipment search and category filters", "no approved listings");
}

// Role-based middleware boundaries
const renterFavorites = await call("/api/favorites", { cookie: loginCookie });
check("renters can read their favorites", renterFavorites.status === 200, `got ${renterFavorites.status}`);

const renterOwnerFeed = await call("/api/equipment/mine", { cookie: loginCookie });
check("renters cannot access the owner equipment feed", renterOwnerFeed.status === 403, `got ${renterOwnerFeed.status}`);

const renterAdminFeed = await call("/api/admin/users", { cookie: loginCookie });
check("renters cannot access admin endpoints", renterAdminFeed.status === 403, `got ${renterAdminFeed.status}`);

const renterOwnerOverview = await call("/api/owner/overview", { cookie: loginCookie });
check("renters cannot access owner analytics", renterOwnerOverview.status === 403, `got ${renterOwnerOverview.status}`);

const ownerUpgrade = await call("/api/auth/become-owner", {
  method: "POST",
  cookie: loginCookie,
});
check(
  "customer can switch to owner role",
  ownerUpgrade.status === 200 && ownerUpgrade.data?.user?.role === "owner",
  `got ${ownerUpgrade.status}`
);

const ownerCookie = getSessionCookie(ownerUpgrade);
const ownerFeed = await call("/api/equipment/mine", { cookie: ownerCookie });
check("owners can access their equipment feed", ownerFeed.status === 200, `got ${ownerFeed.status}`);

const ownerOverview = await call("/api/owner/overview", { cookie: ownerCookie });
check(
  "owners receive equipment, completed rental, and earnings analytics",
  ownerOverview.status === 200 &&
    Number.isFinite(ownerOverview.data?.stats?.totalListedEquipment) &&
    Number.isFinite(ownerOverview.data?.stats?.completedRentals) &&
    Number.isFinite(ownerOverview.data?.stats?.totalEarnings) &&
    Array.isArray(ownerOverview.data?.monthlyEarnings),
  `got ${ownerOverview.status} ${JSON.stringify(ownerOverview.data)}`
);

const ownerFavorites = await call("/api/favorites", { cookie: ownerCookie });
check("owners cannot access renter favorites", ownerFavorites.status === 403, `got ${ownerFavorites.status}`);

const ownerAdminFeed = await call("/api/admin/users", { cookie: ownerCookie });
check("owners cannot access admin endpoints", ownerAdminFeed.status === 403, `got ${ownerAdminFeed.status}`);

// Cookie auth (what the Next.js route guard relies on)
check("login sets access_token cookie with HttpOnly", Boolean(loginCookie) && /httponly/i.test(login.setCookie ?? ""));
if (loginCookie) {
  const meCookie = await call("/api/auth/me", { cookie: loginCookie });
  check("/me works with cookie auth", meCookie.status === 200 && meCookie.data?.user?.email === email, `got ${meCookie.status}`);
}

// Google (no credentials yet → friendly redirect)
const google = await call("/api/auth/google");
check("google redirects when unconfigured", google.status >= 300 && google.status < 400, `got ${google.status}`);
check("google redirect flags config error", (google.location ?? "").includes("error=google-config"), google.location ?? "no location");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
