const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

function generateQRToken(sessionId) {
  return jwt.sign(
    { sessionId, type: 'qr' },
    process.env.QR_SECRET,
    { expiresIn: '90s' }
  );
}

function verifyQRToken(token) {
  return jwt.verify(token, process.env.QR_SECRET);
}

async function generateQRImage(token) {
  // ✅ Sirf raw token encode karo — koi URL nahi
  return await QRCode.toDataURL(token, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 400,
  });
}

module.exports = { generateQRToken, verifyQRToken, generateQRImage };