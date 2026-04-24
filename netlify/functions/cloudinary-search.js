exports.handler = async (event) => {
  const folder = event.queryStringParameters?.folder;

  if (!folder) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Falta el parámetro folder' }) };
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Faltan credenciales de Cloudinary en las variables de entorno de Netlify' }) };
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      expression: `folder:"${folder}"`,
      max_results: 500,
    }),
  });

  const data = await response.json();

  return {
    statusCode: response.ok ? 200 : response.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
};
