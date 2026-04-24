const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY as string;
const API_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET as string;

export async function fetchCloudinaryFolder(folderName: string): Promise<string[]> {
  const normalizedFolder = folderName.toLowerCase();
  let data: { resources?: { public_id: string; secure_url: string }[] };

  if (import.meta.env.DEV) {
    // Local: Vite proxy evita CORS
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      throw new Error('Faltan credenciales en .env.local');
    }
    const auth = btoa(`${API_KEY}:${API_SECRET}`);
    const res = await fetch(`/cloudinary-api/v1_1/${CLOUD_NAME}/resources/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({ expression: `folder:"${normalizedFolder}"`, max_results: 500 }),
    });
    if (!res.ok) throw new Error(`Error de Cloudinary (${res.status})`);
    data = await res.json();
  } else {
    // Producción: Netlify Function (server-side, sin CORS)
    const res = await fetch(
      `/.netlify/functions/cloudinary-search?folder=${encodeURIComponent(normalizedFolder)}`
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? `Error de Cloudinary (${res.status})`);
    }
    data = await res.json();
  }

  if (!data.resources || data.resources.length === 0) {
    throw new Error(`No se encontraron imágenes en la carpeta "${normalizedFolder}"`);
  }

  const sorted = [...data.resources].sort((a, b) =>
    a.public_id.localeCompare(b.public_id, undefined, { numeric: true, sensitivity: 'base' })
  );

  return sorted.map((r) => r.secure_url);
}
