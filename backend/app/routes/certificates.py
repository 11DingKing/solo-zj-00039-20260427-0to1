from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import Certificate, Enrollment, Course, User
import uuid

certificates_bp = Blueprint('certificates', __name__)

def generate_certificate_number():
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    unique = str(uuid.uuid4())[:8].upper()
    return f"CERT-{timestamp}-{unique}"

@certificates_bp.route('/generate/<course_id>', methods=['POST'])
@jwt_required()
def generate_certificate(course_id):
    current_user = get_jwt_identity()
    
    enrollment = Enrollment.query.filter_by(
        student_id=current_user['id'],
        course_id=course_id
    ).first()
    
    if not enrollment:
        return jsonify({'message': 'You are not enrolled in this course'}), 404
    
    if enrollment.status != 'completed':
        return jsonify({'message': 'You must complete the course first'}), 400
    
    existing_cert = Certificate.query.filter_by(
        student_id=current_user['id'],
        course_id=course_id
    ).first()
    
    if existing_cert:
        return jsonify({
            'message': 'Certificate already exists',
            'certificate': {
                'id': existing_cert.id,
                'certificate_number': existing_cert.certificate_number,
                'course_title': existing_cert.course_title,
                'student_name': existing_cert.student_name,
                'instructor_name': existing_cert.instructor_name,
                'issue_date': existing_cert.issue_date.isoformat()
            }
        }), 200
    
    course = Course.query.get(course_id)
    user = User.query.get(current_user['id'])
    instructor = User.query.get(course.instructor_id)
    
    certificate = Certificate(
        certificate_number=generate_certificate_number(),
        student_id=current_user['id'],
        course_id=course_id,
        course_title=course.title,
        student_name=user.username,
        instructor_name=instructor.username if instructor else 'Unknown'
    )
    
    db.session.add(certificate)
    db.session.commit()
    
    return jsonify({
        'message': 'Certificate generated successfully',
        'certificate': {
            'id': certificate.id,
            'certificate_number': certificate.certificate_number,
            'course_title': certificate.course_title,
            'student_name': certificate.student_name,
            'instructor_name': certificate.instructor_name,
            'issue_date': certificate.issue_date.isoformat()
        }
    }), 201

@certificates_bp.route('/mine', methods=['GET'])
@jwt_required()
def get_my_certificates():
    current_user = get_jwt_identity()
    
    certificates = Certificate.query.filter_by(
        student_id=current_user['id']
    ).order_by(Certificate.issue_date.desc()).all()
    
    certs_data = []
    for cert in certificates:
        certs_data.append({
            'id': cert.id,
            'certificate_number': cert.certificate_number,
            'course_id': cert.course_id,
            'course_title': cert.course_title,
            'instructor_name': cert.instructor_name,
            'student_name': cert.student_name,
            'issue_date': cert.issue_date.isoformat(),
            'cover_image': cert.course.cover_image if cert.course else None
        })
    
    return jsonify({'certificates': certs_data}), 200

@certificates_bp.route('/<certificate_id>', methods=['GET'])
@jwt_required()
def get_certificate(certificate_id):
    current_user = get_jwt_identity()
    
    certificate = Certificate.query.get(certificate_id)
    if not certificate:
        return jsonify({'message': 'Certificate not found'}), 404
    
    if certificate.student_id != current_user['id']:
        return jsonify({'message': 'Unauthorized'}), 403
    
    return jsonify({
        'id': certificate.id,
        'certificate_number': certificate.certificate_number,
        'course_id': certificate.course_id,
        'course_title': certificate.course_title,
        'instructor_name': certificate.instructor_name,
        'student_name': certificate.student_name,
        'issue_date': certificate.issue_date.isoformat()
    }), 200

@certificates_bp.route('/verify/<certificate_number>', methods=['GET'])
def verify_certificate(certificate_number):
    certificate = Certificate.query.filter_by(
        certificate_number=certificate_number
    ).first()
    
    if not certificate:
        return jsonify({
            'valid': False,
            'message': 'Certificate not found'
        }), 404
    
    return jsonify({
        'valid': True,
        'certificate': {
            'certificate_number': certificate.certificate_number,
            'course_title': certificate.course_title,
            'student_name': certificate.student_name,
            'instructor_name': certificate.instructor_name,
            'issue_date': certificate.issue_date.isoformat()
        }
    }), 200
