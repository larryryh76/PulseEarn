import os
import json
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, storage, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize Firebase Admin
# In Vercel, we use environment variables for service account
if not firebase_admin._apps:
    try:
        service_account_info = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
        if service_account_info:
            cred_dict = json.loads(service_account_info)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred, {
                'storageBucket': os.environ.get('VITE_FIREBASE_STORAGE_BUCKET')
            })
        else:
            # Fallback for local development if service account is not in env
            firebase_admin.initialize_app(options={
                'storageBucket': os.environ.get('VITE_FIREBASE_STORAGE_BUCKET')
            })
    except Exception as e:
        print(f"Firebase initialization error: {e}")

db = firestore.client()

@app.route('/api/upload', methods=['POST', 'OPTIONS'])
def handle_upload():
    if request.method == 'OPTIONS':
        return '', 204

    try:
        # 1. Auth Check (Basic token validation if needed, otherwise rely on Firebase security rules for storage)
        # Note: Direct upload to storage bypasses this unless we use signed URLs

        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        user_id = request.form.get('userId')
        path = request.form.get('path', 'general')
        metadata_json = request.form.get('metadata', '{}')

        if not user_id:
            return jsonify({'error': 'userId required'}), 401

        # 2. Process File
        filename = f"{datetime.now().timestamp()}_{file.filename}"
        storage_path = f"{path}/{user_id}/{filename}"

        bucket = storage.bucket()
        blob = bucket.blob(storage_path)

        # Upload to Storage
        blob.upload_from_file(file, content_type=file.content_type)

        # Make it public or get signed URL
        blob.make_public()
        download_url = blob.public_url

        # 3. Persist Metadata to Firestore
        upload_id = f"upl_{int(datetime.now().timestamp())}"

        metadata = {
            'uploadId': upload_id,
            'userId': user_id,
            'storagePath': storage_path,
            'downloadUrl': download_url,
            'fileName': file.filename,
            'fileType': file.content_type,
            'status': 'COMPLETED',
            'metadata': json.loads(metadata_json),
            'createdAt': firestore.SERVER_TIMESTAMP
        }

        db.collection('system_uploads').document(upload_id).set(metadata)

        return jsonify({
            'success': True,
            'uploadId': upload_id,
            'downloadUrl': download_url
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Vercel entry point
def handler(request):
    return app(request)

if __name__ == '__main__':
    app.run(port=5000)
