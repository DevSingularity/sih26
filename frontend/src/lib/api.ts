const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`${path} failed with ${res.status}`);
  return res.json() as Promise<T>;
}

export async function postJson<T = void>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`${path} failed with ${res.status}`);
  return res.json() as Promise<T>;
}
