from flask import Flask, request, jsonify
from flask_cors import CORS
from deepface import DeepFace
import base64
import tempfile
import os

app = Flask(__name__)
CORS(app)


@app.route('/verify', methods=['POST'])
def verify():
    data = request.json
    img1_b64 = data.get('img1')  # stored face
    img2_b64 = data.get('img2')  # selfie at scan time

    def b64_to_tmp(b64str):
        decoded = base64.b64decode(b64str.split(',')[-1])
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
        tmp.write(decoded)
        tmp.close()
        return tmp.name

    f1, f2 = b64_to_tmp(img1_b64), b64_to_tmp(img2_b64)
    try:
        result = DeepFace.verify(f1, f2, enforce_detection=False)
        return jsonify({'verified': result['verified'],
                        'distance': result['distance']})
    except Exception as e:
        return jsonify({'verified': False, 'error': str(e)}), 400
    finally:
        os.unlink(f1)
        os.unlink(f2)


if __name__ == '__main__':
    app.run(port=5001, debug=True)
