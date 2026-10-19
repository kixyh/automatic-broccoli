import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    const logVisitor = async () => {
      try {
        // Get IP
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const { ip } = await ipRes.json();

        // Get geolocation (free tier, no key needed)
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
        const geo = await geoRes.json();

        // Send to your serverless function
        await fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip,
            geo,
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            timestamp: Date.now()
          })
        });
      } catch (e) {
        console.error('Logging failed:', e);
      }
    };

    logVisitor();
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'sans-serif',
      background: '#000',
      color: '#fff'
    }}>
      <h1>Loading...</h1>
      {/* Or make it look like a real site */}
    </div>
  );
}
