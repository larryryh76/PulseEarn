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
            bucket_name = os.environ.get('VITE_FIREBASE_STORAGE_BUCKET')

            if service_account_info:
                logger.info("Initializing Firebase with service account JSON")
                try:
                    cred_dict = json.loads(service_account_info)
                    cred = credentials.Certificate(cred_dict)
                    firebase_admin.initialize_app(cred, {
                        'storageBucket': bucket_name
                    })
                except json.JSONDecodeError:
                    logger.error("FIREBASE_SERVICE_ACCOUNT_JSON is not a valid JSON string")
                    raise Exception("Invalid Firebase credentials configuration")
            else:
                logger.warning("No FIREBASE_SERVICE_ACCOUNT_JSON found. Attempting default credentials.")
                try:
                    firebase_admin.initialize_app(options={
                        'storageBucket': bucket_name
                    })
                except Exception as e:
                    logger.error(f"Default credentials failed: {str(e)}")
                    # Do not raise here to let the request handler report it properly

            if firebase_admin._apps:
                logger.info(f"Firebase initialized successfully with bucket: {bucket_name}")
        except Exception as e:
            logger.error(f"Firebase initialization error: {str(e)}")
            raise e

try:
    initialize_firebase()
except Exception:
    pass

@app.route('/api/upload', methods=['POST', 'OPTIONS'])
def handle_upload():
    if request.method == 'OPTIONS':
        return '', 204

    try:
        # Check if initialized
        if not firebase_admin._apps:
            logger.error("Firebase Admin SDK not initialized")
            return jsonify({
                'error': 'Server environment error: Firebase Credentials not configured. Please ensure FIREBASE_SERVICE_ACCOUNT_JSON is set in environment variables.'
            }), 500

        logger.info("Received upload request")

        if 'file' not in request.files:
            logger.error("No file part in request")
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        user_id = request.form.get('userId')
        path = request.form.get('path', 'general')
        metadata_json = request.form.get('metadata', '{}')

        if not user_id:
            logger.error("No userId provided")
            return jsonify({'error': 'userId required'}), 401

        if file.filename == '':
            logger.error("No selected file")
            return jsonify({'error': 'No selected file'}), 400

        # 2. Process File
        timestamp = int(datetime.now().timestamp())
        filename = f"{timestamp}_{file.filename}"
        storage_path = f"{path}/{user_id}/{filename}"

        logger.info(f"Uploading file {file.filename} to {storage_path}")

        try:
            bucket = storage.bucket()
            if not bucket:
                raise Exception("Bucket not found")
        except Exception as e:
            logger.error(f"Could not get storage bucket: {e}")
            return jsonify({'error': 'Storage configuration error: Bucket not found or inaccessible.'}), 500

        blob = bucket.blob(storage_path)

        # Upload to Storage
        blob.upload_from_file(file, content_type=file.content_type)

        # Generate a signed URL that lasts for 10 years
        try:
            download_url = blob.generate_signed_url(expiration=timedelta(days=365*10), method='GET')
        except Exception as e:
            logger.warning(f"Signed URL generation failed: {e}, falling back to public URL construct")
            bucket_name = bucket.name or os.environ.get('VITE_FIREBASE_STORAGE_BUCKET')
            download_url = f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}/o/{storage_path.replace('/', '%2F')}?alt=media"

        # 3. Persist Metadata to Firestore
        try:
            db = firestore.client()
            upload_id = f"upl_{timestamp}"

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
        except Exception as e:
            logger.error(f"Firestore metadata sync failed: {e}")
            # We still return success since the file is in storage, but warn in logs

        logger.info(f"Upload completed successfully: {upload_id}")
        return jsonify({
            'success': True,
            'uploadId': upload_id,
            'downloadUrl': download_url
        }), 200

    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Vercel entry point
def handler(request):
    return app(request)

if __name__ == '__main__':
    app.run(port=5000)
