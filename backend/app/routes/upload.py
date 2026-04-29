from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import uuid

upload_bp = Blueprint('upload', __name__)

ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'webm', 'ogg', 'mov', 'avi'}
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename, allowed_extensions):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

def create_date_folder(base_path):
    date_str = datetime.now().strftime('%Y/%m/%d')
    full_path = os.path.join(base_path, date_str)
    os.makedirs(full_path, exist_ok=True)
    return full_path, date_str

@upload_bp.route('/video', methods=['POST'])
def upload_video():
    from flask_jwt_extended import verify_jwt_in_request
    verify_jwt_in_request()
    current_user = get_jwt_identity()
    
    if current_user['role'] != 'instructor':
        return jsonify({'message': 'Only instructors can upload videos'}), 403
    
    if 'video' not in request.files:
        return jsonify({'message': 'No video file provided'}), 400
    
    file = request.files['video']
    
    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400
    
    if not allowed_file(file.filename, ALLOWED_VIDEO_EXTENSIONS):
        return jsonify({'message': 'File type not allowed'}), 400
    
    upload_folder = current_app.config.get('UPLOAD_FOLDER', './uploads')
    videos_folder = os.path.join(upload_folder, 'videos')
    
    date_folder, date_str = create_date_folder(videos_folder)
    
    original_filename = secure_filename(file.filename)
    file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'mp4'
    unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
    
    file_path = os.path.join(date_folder, unique_filename)
    file.save(file_path)
    
    relative_url = f"/uploads/videos/{date_str}/{unique_filename}"
    
    return jsonify({
        'message': 'Video uploaded successfully',
        'url': relative_url,
        'filename': original_filename,
        'size': os.path.getsize(file_path)
    }), 201

@upload_bp.route('/cover', methods=['POST'])
def upload_cover():
    from flask_jwt_extended import verify_jwt_in_request
    verify_jwt_in_request()
    current_user = get_jwt_identity()
    
    if current_user['role'] != 'instructor':
        return jsonify({'message': 'Only instructors can upload covers'}), 403
    
    if 'image' not in request.files:
        return jsonify({'message': 'No image file provided'}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400
    
    if not allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
        return jsonify({'message': 'File type not allowed'}), 400
    
    upload_folder = current_app.config.get('UPLOAD_FOLDER', './uploads')
    covers_folder = os.path.join(upload_folder, 'covers')
    
    date_folder, date_str = create_date_folder(covers_folder)
    
    original_filename = secure_filename(file.filename)
    file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'jpg'
    unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
    
    file_path = os.path.join(date_folder, unique_filename)
    
    from PIL import Image
    img = Image.open(file)
    img = img.convert('RGB')
    max_size = (800, 450)
    img.thumbnail(max_size, Image.Resampling.LANCZOS)
    img.save(file_path, 'JPEG', quality=85)
    
    relative_url = f"/uploads/covers/{date_str}/{unique_filename}"
    
    return jsonify({
        'message': 'Cover image uploaded successfully',
        'url': relative_url,
        'filename': original_filename
    }), 201

@upload_bp.route('/avatar', methods=['POST'])
def upload_avatar():
    from flask_jwt_extended import verify_jwt_in_request
    verify_jwt_in_request()
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
    
    relative_url = f"/uploads/avatars/{unique_filename}"
    
    return jsonify({
        'message': 'Avatar uploaded successfully',
        'url': relative_url
    }), 201

@upload_bp.route('/uploads/videos/<path:filename>', methods=['GET'])
def serve_video(filename):
    upload_folder = current_app.config.get('UPLOAD_FOLDER', './uploads')
    videos_folder = os.path.join(upload_folder, 'videos')
    return send_from_directory(videos_folder, filename)

@upload_bp.route('/uploads/covers/<path:filename>', methods=['GET'])
def serve_cover(filename):
    upload_folder = current_app.config.get('UPLOAD_FOLDER', './uploads')
    covers_folder = os.path.join(upload_folder, 'covers')
    return send_from_directory(covers_folder, filename)

@upload_bp.route('/uploads/avatars/<path:filename>', methods=['GET'])
def serve_avatar(filename):
    upload_folder = current_app.config.get('UPLOAD_FOLDER', './uploads')
    avatars_folder = os.path.join(upload_folder, 'avatars')
    return send_from_directory(avatars_folder, filename)
