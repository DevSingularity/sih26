// Thin fetch wrapper pointed at THIS station's own backend (not central).
export async function apiGet(path) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_STATION_API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}
