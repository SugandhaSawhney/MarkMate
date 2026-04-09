const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Session = require('../models/Session');
const { generateQRToken, generateQRImage } = require('../utils/qrHelper');

router.get('/active', auth, async (req, res) => {
  if (req.user.role !== 'teacher')
    return res.status(403).json({ message: 'Teachers only' });

  try {
    const session = await Session.findOne({ teacherId: req.user.id, isActive: true });
    if (!session)
      return res.status(404).json({ message: 'No active session' });

    const token = generateQRToken(session._id.toString());

    // ✅ Debug logs — INSIDE the route handler
    console.log('=== GENERATED TOKEN ===');
    console.log(token);
    console.log('=== TOKEN LENGTH ===', token.length);

    const qrImage = await generateQRImage(token);
    res.json({ qrImage, sessionId: session._id, expiresIn: 90 });

  } catch (err) {
    console.log('QR ROUTE ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;