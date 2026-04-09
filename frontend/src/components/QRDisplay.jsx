import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export default function QRDisplay({ sessionId }) {
  const [qrImage, setQrImage] = useState(null);
  const [countdown, setCountdown] = useState(90);   // ✅ 90s
  const [loading, setLoading] = useState(false);

  const fetchQR = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/qr/active');
      setQrImage(data.qrImage);
      setCountdown(90);   // ✅ 90s
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQR();
  }, [sessionId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { fetchQR(); return 90; }   // ✅ 90s
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchQR]);

  const radius = 20;
  const circ = 2 * Math.PI * radius;
  const dash = (countdown / 90) * circ;   // ✅ 90s

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <svg className="absolute -inset-4 w-[calc(100%+32px)] h-[calc(100%+32px)]" style={{ zIndex: 1 }}>
          <circle cx="50%" cy="50%" r="46%" fill="none" stroke="#22c55e22" strokeWidth="2" />
          <circle cx="50%" cy="50%" r="46%" fill="none" stroke="#22c55e"
            strokeWidth="2" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dasharray 1s linear' }} />
        </svg>

        <div className="w-56 h-56 rounded-2xl overflow-hidden border-2 border-brand-500/40 bg-white flex items-center justify-center relative"
          style={{ boxShadow: '0 0 60px #22c55e33' }}>
          {loading ? (
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          ) : qrImage ? (
            <img src={qrImage} alt="QR Code" className="w-full h-full object-contain p-3" />
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 font-mono text-sm">
        <div className="w-2 h-2 rounded-full bg-brand-400 pulse-dot" />
        <span className="text-brand-400">Refreshes in</span>
        <span className="text-white font-bold tabular-nums">{countdown}s</span>
      </div>

      <p className="text-xs text-gray-600 text-center max-w-xs font-body">
        Screenshot won't work — this QR expires every 90 seconds
      </p>
    </div>
  );
}