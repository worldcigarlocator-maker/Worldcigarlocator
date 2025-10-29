// api/photo-proxy.js
export default async function handler(req, res) {
  const { ref, w = "800" } = req.query;
  const key = process.env.GOOGLE_SERVER_KEY;

  if (!ref || !key) {
    return res.status(400).send("Missing ref or key");
  }

  const googleUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${w}&photo_reference=${encodeURIComponent(ref)}&key=${key}`;

  try {
    const response = await fetch(googleUrl);
    if (!response.ok) {
      console.error("Google API error:", response.status);
      return res.status(response.status).send(`Google API error: ${response.status}`);
    }

    // Skicka vidare bilden (utan att ändra headers för mycket)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400"); // cache 24h

    const buffer = await response.arrayBuffer();
    res.status(200).end(Buffer.from(buffer));
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy error");
  }
}
