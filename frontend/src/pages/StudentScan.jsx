import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

export default function StudentScan() {
  const { user } = useAuth();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [scanning, setScanning] = useState(false);
  const [coords, setCoords] = useState(null);         // ← GPS stored early
  const [gpsStatus, setGpsStatus] = useState('fetching'); // fetching | ok | denied
  const scannerRef = useRef(null);

  // ✅ FIX 2 — Get GPS immediately when page loads
  useEffect(() => {
    setGpsStatus('fetching');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('ok');
      },
      () => setGpsStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  // ✅ Also keep refreshing GPS every 30s so it stays fresh
  useEffect(() => {
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsStatus('ok');
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const startScanner = () => {
    if (gpsStatus !== 'ok') return;
    setScanning(true);
    setStatus('scanning');
    setMessage('');
  };

  useEffect(() => {
    if (!scanning) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: 250, facingMode: 'environment' },
      false
    );

    scanner.render(
      async (decodedText) => {
         console.log('SCANNED TEXT:', decodedText);  // ← add this
    console.log('STARTS WITH eyJ?', decodedText.startsWith('eyJ')); // JWT always starts with eyJ
   
        scanner.clear();
        setScanning(false);
        setStatus('loading');

        // ✅ FIX 2 — coords already available, fire API immediately
        if (!coords) {
          setStatus('error');
          setMessage('Location not available. Please refresh and try again.');
          return;
        }

        try {
          const { data } = await api.post('/attendance/mark', {
            qrToken: decodedText,
            latitude: coords.lat,
            longitude: coords.lng,
          });
          setStatus('success');
          setMessage(data.message);
        } catch (err) {
          setStatus('error');
          setMessage(err.response?.data?.message || 'Attendance failed');
        }
      },
      () => {}
    );

    return () => { scanner.clear().catch(() => {}); };
  }, [scanning, coords]);

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <div className="pt-20 px-4 pb-12 max-w-lg mx-auto">

        <div className="mb-8 fade-in">
          <p className="text-xs font-mono text-brand-500/60 uppercase tracking-widest mb-1">Student Portal</p>
          <h1 className="font-display text-4xl font-bold text-white">
            Hi, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
          </h1>
        </div>

        {/* GPS Status Bar — always visible */}
        <div className={`mb-4 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-mono fade-in ${
          gpsStatus === 'ok'
            ? 'bg-brand-500/10 border border-brand-500/30 text-brand-400'
            : gpsStatus === 'denied'
            ? 'bg-red-500/10 border border-red-500/30 text-red-400'
            : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
        }`}>
          {gpsStatus === 'fetching' && (
            <><div className="w-4 h-4 border border-yellow-400 border-t-transparent rounded-full animate-spin" />
            Fetching your location...</>
          )}
          {gpsStatus === 'ok' && (
            <><div className="w-2 h-2 bg-brand-400 rounded-full pulse-dot" />
            GPS Ready — {coords?.lat.toFixed(4)}, {coords?.lng.toFixed(4)}</>
          )}
          {gpsStatus === 'denied' && (
            <>⚠ Location denied — enable GPS in browser settings</>
          )}
        </div>

        {/* Scanner Card */}
        <div className="glow-card rounded-2xl p-6 fade-in">
          <h2 className="font-display text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center text-brand-400">◻</span>
            Mark Attendance
          </h2>

          {status === 'success' && (
            <div className="mb-6 p-5 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-center fade-in">
              <div className="text-5xl mb-3">✅</div>
              <p className="font-display font-semibold text-brand-400 text-lg">Attendance Marked!</p>
              <p className="text-sm text-gray-500 mt-1 font-body">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="mb-6 p-5 rounded-2xl bg-red-500/10 border border-red-500/30 text-center fade-in">
              <div className="text-5xl mb-3">❌</div>
              <p className="font-display font-semibold text-red-400 text-lg">Failed</p>
              <p className="text-sm text-gray-500 mt-1 font-body">{message}</p>
            </div>
          )}

          {status === 'loading' && (
            <div className="mb-6 p-5 rounded-2xl bg-surface-700 border border-brand-500/10 text-center fade-in">
              <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="font-mono text-sm text-gray-400">Verifying attendance...</p>
            </div>
          )}

          {scanning && (
            <div className="mb-4 rounded-xl overflow-hidden border border-brand-500/20 fade-in"
              id="qr-reader" ref={scannerRef} />
          )}

          {!scanning && status !== 'loading' && (
            <div className="flex flex-col items-center py-8 gap-6">
              {status === 'idle' && (
                <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-brand-500/30 flex items-center justify-center">
                  <span className="text-5xl opacity-30">◻</span>
                </div>
              )}
              <button
                onClick={startScanner}
                disabled={gpsStatus !== 'ok'}
                className={`px-10 py-3 rounded-xl text-sm tracking-wide font-display font-bold transition-all ${
                  gpsStatus === 'ok'
                    ? 'btn-primary'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}>
                {gpsStatus === 'fetching' ? '⏳ Waiting for GPS...' :
                 gpsStatus === 'denied'   ? '⚠ GPS Required' :
                 status === 'idle'        ? '📷 Open Camera & Scan' : '🔄 Scan Again'}
              </button>

              {gpsStatus !== 'ok' && (
                <p className="text-xs text-gray-600 font-mono text-center">
                  Camera will unlock once GPS is confirmed
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link to="/student/history" className="text-sm text-brand-400 hover:text-brand-300 transition-colors font-body">
            View attendance history →
          </Link>
        </div>
      </div>
    </div>
  );
}