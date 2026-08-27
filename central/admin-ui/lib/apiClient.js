// Thin fetch wrapper pointed at the central backend's /api/* routes.
// Base URL should come from an env var (NEXT_PUBLIC_API_BASE_URL).
export async function apiGet(path) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}
