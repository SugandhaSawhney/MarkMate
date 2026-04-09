const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const { verifyQRToken } = require('../utils/qrHelper');
const { getDistanceMeters } = require('../utils/geoHelper');
const crypto = require('crypto');

router.post('/mark', auth, async (req, res) => {
  if (req.user.role !== 'student')
    return res.status(403).json({ message: 'Students only' });

  try {
    const { qrToken: rawScan, latitude, longitude } = req.body;

    console.log('RAW SCAN:', rawScan?.substring(0, 60));

    // ✅ Agar URL aaya toh sirf token part nikalo
    let qrToken = rawScan?.trim();
    if (qrToken?.includes('/')) {
      qrToken = qrToken.split('/').pop(); // last part after final /
    }

    console.log('CLEAN TOKEN:', qrToken?.substring(0, 60));
    console.log('STARTS WITH eyJ:', qrToken?.startsWith('eyJ'));

    // 1. Verify QR token
    let decoded;
    try {
      decoded = verifyQRToken(qrToken);
      console.log('✅ QR verified, sessionId:', decoded.sessionId);
    } catch (err) {
      console.log('❌ QR FAILED:', err.name, err.message);
      return res.status(400).json({
        message: err.name === 'TokenExpiredError'
          ? 'QR expired — scan the latest code'
          : 'Invalid QR token'
      });
    }

    // 2. Session active check
    const session = await Session.findById(decoded.sessionId);
    console.log('Session found:', !!session, '| isActive:', session?.isActive);
    if (!session || !session.isActive)
      return res.status(400).json({ message: 'Session is no longer active.' });

    // 3. Duplicate check
    const existing = await Attendance.findOne({
      sessionId: decoded.sessionId,
      studentId: req.user.id
    });
    console.log('Already marked?', !!existing);
    if (existing)
      return res.status(400).json({ message: 'Attendance already marked for this session.' });

    // 4. GPS check
    const dist = getDistanceMeters(latitude, longitude, session.latitude, session.longitude);
    console.log('Distance (meters):', Math.round(dist), '| Allowed:', session.radiusMeters);
    if (dist > session.radiusMeters)
      return res.status(400).json({
        message: `You are ${Math.round(dist)}m away. Must be within ${session.radiusMeters}m.`
      });

    // 5. Save
    const qrTokenHash = crypto.createHash('sha256').update(qrToken).digest('hex');
    const record = await Attendance.create({
      sessionId: decoded.sessionId,
      studentId: req.user.id,
      latitude,
      longitude,
      qrTokenHash,
      status: 'present',
    });
    console.log('✅ Attendance saved:', record._id);

    res.status(201).json({ message: 'Attendance marked successfully!', record });

  } catch (err) {
    console.log('❌ CRASHED:', err.message);
    res.status(500).json({ message: err.message });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const records = await Attendance.find({ studentId: req.user.id })
      .populate('sessionId', 'subject date')
      .sort({ markedAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const records = await Attendance.find({ studentId: req.user.id, status: 'present' })
      .populate('sessionId', 'subject');
    const map = {};
    for (const r of records) {
      const sub = r.sessionId?.subject;
      if (!sub) continue;
      map[sub] = (map[sub] || 0) + 1;
    }
    res.json(map);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;