from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import Certificate, Enrollment, Course, User

certificates_bp = Blueprint('certificates', __name__)

def require_auth():
    from flask_jwt_extended import verify_jwt_in_request
    from flask import jsonify
    try:
        verify_jwt_in_request()
    except Exception as e:
        return jsonify({'message': 'Authentication required', 'error': str(e)}), 401
    return None

@certificates_bp.route('/generate/<course_id>', methods=['POST'])
def generate_certificate(course_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    enrollment = Enrollment.query.filter_by(
        student_id=current_user['id'],
        course_id=course_id
    ).first()

    if not enrollment:
        return jsonify({'message': 'You are not enrolled in this course'}), 403

    if enrollment.status != 'completed':
        return jsonify({'message': 'You must complete the course first'}), 403

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
                'issue_date': existing_cert.issue_date.isoformat()
            }
        }), 200

    course = Course.query.get(course_id)
    student = User.query.get(current_user['id'])

    cert_number = f"CERT-{course_id[:8]}-{current_user['id'][:8]}-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    certificate = Certificate(
        certificate_number=cert_number,
        student_id=current_user['id'],
        course_id=course_id,
        issue_date=datetime.utcnow(),
        course_title=course.title,
        instructor_name=course.instructor.username if course.instructor else 'Unknown',
        student_name=student.username
    )

    db.session.add(certificate)
    db.session.commit()

    return jsonify({
        'message': 'Certificate generated successfully',
        'certificate': {
            'id': certificate.id,
            'certificate_number': certificate.certificate_number,
            'course_title': certificate.course_title,
            'instructor_name': certificate.instructor_name,
            'student_name': certificate.student_name,
            'issue_date': certificate.issue_date.isoformat()
        }
    }), 201

@certificates_bp.route('/mine', methods=['GET'])
def get_my_certificates():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    certificates = Certificate.query.filter_by(
        student_id=current_user['id']
    ).order_by(Certificate.issue_date.desc()).all()

    certificates_data = []
    for cert in certificates:
        course = cert.course
        certificates_data.append({
            'id': cert.id,
            'certificate_number': cert.certificate_number,
            'course_id': cert.course_id,
            'course_title': cert.course_title,
            'instructor_name': cert.instructor_name,
            'student_name': cert.student_name,
            'issue_date': cert.issue_date.isoformat()
        })

    return jsonify({'certificates': certificates_data}), 200

@certificates_bp.route('/<certificate_id>', methods=['GET'])
def get_certificate(certificate_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    certificate = Certificate.query.get(certificate_id)

    if not certificate:
        return jsonify({'message': 'Certificate not found'}), 404

    if certificate.student_id != current_user['id']:
        if current_user['role'] != 'instructor':
            return jsonify({'message': 'You do not have permission to view this certificate'}), 403

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
        return jsonify({'message': 'Certificate not found', 'valid': False}), 404

    return jsonify({
        'valid': True,
        'certificate': {
            'certificate_number': certificate.certificate_number,
            'course_title': certificate.course_title,
            'instructor_name': certificate.instructor_name,
            'student_name': certificate.student_name,
            'issue_date': certificate.issue_date.isoformat()
        }
    }), 200
