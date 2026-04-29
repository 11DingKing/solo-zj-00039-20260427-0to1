import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from flask_jwt_extended import get_jwt_identity
from PIL import Image

upload_bp = Blueprint('upload', __name__)

ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'mov', 'avi', 'webm'}
ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}

def allowed_file(filename, allowed_extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def require_auth():
    from flask_jwt_extended import verify_jwt_in_request
    from flask import jsonify
    try:
        verify_jwt_in_request()
    except Exception as e:
        return jsonify({'message': 'Authentication required', 'error': str(e)}), 401
    return None

@upload_bp.route('/video', methods=['POST'])
def upload_video():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    if 'video' not in request.files:
        return jsonify({'message': 'No video file provided'}), 400

    file = request.files['video']

    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400

    if not allowed_file(file.filename, ALLOWED_VIDEO_EXTENSIONS):
        return jsonify({'message': 'File type not allowed'}), 400

    upload_folder = current_app.config.get('UPLOAD_FOLDER', './uploads')
    videos_folder = os.path.join(upload_folder, 'videos')

    os.makedirs(videos_folder, exist_ok=True)

    original_filename = secure_filename(file.filename)
    file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'mp4'
    unique_filename = f"{current_user['id']}_{original_filename}"

    file_path = os.path.join(videos_folder, unique_filename)
    file.save(file_path)

    url = f"/uploads/videos/{unique_filename}"

    return jsonify({
        'message': 'Video uploaded successfully',
        'url': url,
        'filename': unique_filename
    }), 201

@upload_bp.route('/cover', methods=['POST'])
def upload_cover():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    if 'image' not in request.files:
        return jsonify({'message': 'No image file provided'}), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400

    if not allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
        return jsonify({'message': 'File type not allowed'}), 400

    upload_folder = current_app.config.get('UPLOAD_FOLDER', './uploads')
    covers_folder = os.path.join(upload_folder, 'covers')

    os.makedirs(covers_folder, exist_ok=True)

    original_filename = secure_filename(file.filename)
    file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'jpg'
    unique_filename = f"{current_user['id']}_{original_filename}"

    file_path = os.path.join(covers_folder, unique_filename)

    img = Image.open(file)
    img = img.convert('RGB')
    max_size = (800, 600)
    img.thumbnail(max_size, Image.Resampling.LANCZOS)
    img.save(file_path, 'JPEG', quality=85)

    url = f"/uploads/covers/{unique_filename}"

    return jsonify({
        'message': 'Cover image uploaded successfully',
        'url': url,
        'filename': original_filename
    }), 201

@upload_bp.route('/avatar', methods=['POST'])
def upload_avatar():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    if 'image' not in request.files:
        return jsonify({'message': 'No image file provided'}), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400

    if not allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
        return jsonify({'message': 'File type not allowed'}), 400

    upload_folder = current_app.config.get('UPLOAD_FOLDER', './uploads')
    avatars_folder = os.path.join(upload_folder, 'avatars')

    os.makedirs(avatars_folder, exist_ok=True)

    original_filename = secure_filename(file.filename)
    file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'jpg'
    unique_filename = f"{current_user['id']}.{file_extension}"

    file_path = os.path.join(avatars_folder, unique_filename)

    from PIL import Image
    img = Image.open(file)
    img = img.convert('RGB')
    max_size = (200, 200)
    img.thumbnail(max_size, Image.Resampling.LANCZOS)
    img.save(file_path, 'JPEG', quality=85)

    url = f"/uploads/avatars/{unique_filename}"

    return jsonify({
        'message': 'Avatar uploaded successfully',
        'url': url,
        'filename': unique_filename
    }), 201
