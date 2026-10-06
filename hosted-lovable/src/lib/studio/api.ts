export async function api(path: string, data?: unknown): Promise<any> {
 const form = data instanceof FormData;
 const r = await fetch(`/api${path}`, data === undefined ? {} : { method: "POST", ...(form ? {} : { headers: {"Content-Type":"application/json"}}), body: form ? data : JSON.stringify(data) });
 const body = await r.json().catch(() => ({}));
 if (!r.ok) throw new Error(body.error?.message || body.error || "Request failed. Your work is preserved; please try again.");
 return body;
}
