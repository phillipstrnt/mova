const apiBase = (process.env.API_BASE_URL || "http://localhost:10000")
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");
const smokeEmail = process.env.SMOKE_EMAIL;
const smokePassword = process.env.SMOKE_PASSWORD;

if (Boolean(smokeEmail) !== Boolean(smokePassword)) {
  throw new Error("Set both SMOKE_EMAIL and SMOKE_PASSWORD to check a real test login.");
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
};

const request = async (path, body) => {
  const response = await fetch(`${apiBase}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    // The status assertion below gives a concise error for non-JSON responses.
  }
  return { response, data };
};

try {
  const health = await request("/api/health");
  assert(health.response.ok && health.data.success, "API health responds successfully");

  const google = await request("/api/auth/google", {});
  assert(
    google.response.status === 400 || google.response.status === 503,
    "Google auth rejects a missing ID token safely",
  );

  const recovery = await request("/api/auth/forgot-password", {
    email: `mova-smoke-${Date.now()}@invalid.example`,
  });
  assert(
    recovery.response.ok && recovery.data.success &&
      typeof recovery.data.message === "string" &&
      recovery.data.message.includes("If an account exists"),
    "Password recovery keeps its generic response",
  );

  const reset = await request("/api/auth/reset-password/invalid-smoke-token", {
    password: "invalid-smoke-password",
  });
  assert(reset.response.status === 400, "An invalid password reset token is rejected");

  if (smokeEmail) {
    const login = await request("/api/auth/login", {
      email: smokeEmail,
      password: smokePassword,
    });
    assert(
      login.response.ok && login.data.success && login.data.token && login.data.user,
      "Provided test account can sign in and receives a session",
    );
    console.log(`  role: ${login.data.user.role}`);
  } else {
    console.log("ℹ Set SMOKE_EMAIL and SMOKE_PASSWORD to also verify a real test login.");
  }
} catch (error) {
  console.error(`✗ Auth smoke check failed: ${error.message}`);
  process.exitCode = 1;
}
