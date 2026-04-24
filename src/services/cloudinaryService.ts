const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY as string;
const API_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET as string;

export async function fetchCloudinaryFolder(folderName: string): Promise<string[]> {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new Error('Faltan credenciales de Cloudinary en .env.local');
  }

  const auth = btoa(`${API_KEY}:${API_SECRET}`);
  const normalizedFolder = folderName.toLowerCase();
  const response = await fetch(
    `/cloudinary-api/v1_1/${CLOUD_NAME}/resources/search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        expression: `folder:"${normalizedFolder}"`,
        max_results: 500,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error de Cloudinary (${response.status}): ${text}`);
  }

  const data = await response.json();

  if (!data.resources || data.resources.length === 0) {
    throw new Error(`No se encontraron imágenes en la carpeta "${normalizedFolder}"`);
  }

  const sorted = [...data.resources].sort((a, b) =>
    a.public_id.localeCompare(b.public_id, undefined, { numeric: true, sensitivity: 'base' })
  );

  return sorted.map((r: { secure_url: string }) => r.secure_url);
}
