import os
import json
import logging
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, storage, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize Firebase Admin
def initialize_firebase():
    if not firebase_admin._apps:
        try:
            service_account_info = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
            bucket_name = os.environ.get('VITE_FIREBASE_STORAGE_BUCKET') or os.environ.get('FIREBASE_STORAGE_BUCKET')

            if service_account_info:
                logger.info("Initializing Firebase with service account JSON")
                cred_dict = json.loads(service_account_info)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred, {
                    'storageBucket': bucket_name
                })
            else:
                logger.warning("No FIREBASE_SERVICE_ACCOUNT_JSON found. Service will likely fail.")
                # We do NOT initialize with default credentials to avoid ADC errors in environments where it's not set.
                # Instead, we let the handler report the missing config.
        except Exception as e:
            logger.error(f"Firebase initialization error: {str(e)}")
            # Do not raise here to prevent boot crash, let handle_upload report it

initialize_firebase()

@app.route('/api/upload', methods=['POST', 'OPTIONS'])
def handle_upload():
    if request.method == 'OPTIONS':
        return '', 204

    try:
        # Check if initialized
        if not firebase_admin._apps:
            return jsonify({
                'error': 'Cloud environment not configured: Missing FIREBASE_SERVICE_ACCOUNT_JSON.'
            }), 503

        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        user_id = request.form.get('userId')
        path = request.form.get('path', 'general')
        metadata_json = request.form.get('metadata', '{}')

        if not user_id:
            return jsonify({'error': 'userId required'}), 401

        bucket_name = os.environ.get('VITE_FIREBASE_STORAGE_BUCKET')
        bucket = storage.bucket(bucket_name)

        if not bucket.exists():
            return jsonify({'error': f'Storage bucket {bucket_name} not found.'}), 500

        # Process File
        timestamp = int(datetime.now().timestamp())
        filename = f"{timestamp}_{file.filename}"
        storage_path = f"{path}/{user_id}/{filename}"

        blob = bucket.blob(storage_path)
        blob.upload_from_file(file, content_type=file.content_type)

        # Generate signed URL
        try:
            download_url = blob.generate_signed_url(expiration=timedelta(days=365*10), method='GET')
        except Exception:
            download_url = f"https://firebasestorage.googleapis.com/v0/b/{bucket.name}/o/{storage_path.replace('/', '%2F')}?alt=media"

        # Metadata persistence
        db = firestore.client()
        upload_id = f"upl_{timestamp}"

        db.collection('system_uploads').document(upload_id).set({
            'uploadId': upload_id,
            'userId': user_id,
            'storagePath': storage_path,
            'downloadUrl': download_url,
            'fileName': file.filename,
            'fileType': file.content_type,
            'status': 'COMPLETED',
            'metadata': json.loads(metadata_json),
            'createdAt': firestore.SERVER_TIMESTAMP
        })

        return jsonify({
            'success': True,
            'uploadId': upload_id,
            'downloadUrl': download_url
        }), 200

    except Exception as e:
        logger.error(f"Critical Upload Failure: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Vercel handler
def handler(request):
    return app(request)

if __name__ == '__main__':
    app.run(port=5000)
