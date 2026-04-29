from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func, desc
from app import db
from app.models import Enrollment, Course, StudyRecord, Review, Certificate

student_bp = Blueprint('student', __name__)

def require_auth():
    from flask_jwt_extended import verify_jwt_in_request
    from flask import jsonify
    try:
        verify_jwt_in_request()
    except Exception as e:
        return jsonify({'message': 'Authentication required', 'error': str(e)}), 401
    return None

@student_bp.route('/courses', methods=['GET'])
def get_my_courses():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()
    status = request.args.get('status')

    query = Enrollment.query.filter_by(student_id=current_user['id'])

    if status in ['in_progress', 'completed']:
        query = query.filter_by(status=status)

    enrollments = query.order_by(Enrollment.last_accessed_at.desc()).all()

    courses_data = []
    for enrollment in enrollments:
        course = enrollment.course
        courses_data.append({
            'id': course.id,
            'title': course.title,
            'cover_image': course.cover_image,
            'category_name': course.category.name if course.category else None,
            'difficulty': course.difficulty,
            'instructor_name': course.instructor.username if course.instructor else None,
            'progress': enrollment.progress,
            'total_lessons': enrollment.total_lessons,
            'completed_lessons': enrollment.completed_lessons,
            'status': enrollment.status,
            'enrolled_at': enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
            'last_accessed_at': enrollment.last_accessed_at.isoformat() if enrollment.last_accessed_at else None,
            'completed_at': enrollment.completed_at.isoformat() if enrollment.completed_at else None
        })

    return jsonify({
        'courses': courses_data,
        'total': len(courses_data)
    }), 200

@student_bp.route('/timeline', methods=['GET'])
def get_study_timeline():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    records = StudyRecord.query.filter_by(
        student_id=current_user['id']
    ).order_by(StudyRecord.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    timeline_data = []
    for record in records.items:
        lesson = record.lesson
        chapter = lesson.chapter if lesson else None
        course = chapter.course if chapter else None

        timeline_data.append({
            'id': record.id,
            'action': record.action,
            'study_duration': record.study_duration,
            'created_at': record.created_at.isoformat(),
            'lesson_id': record.lesson_id,
            'lesson_title': lesson.title if lesson else None,
            'chapter_title': chapter.title if chapter else None,
            'course_id': course.id if course else None,
            'course_title': course.title if course else None
        })

    return jsonify({
        'timeline': timeline_data,
        'total': records.total,
        'pages': records.pages,
        'current_page': page
    }), 200

@student_bp.route('/record', methods=['POST'])
def add_study_record():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    data = request.get_json()

    record = StudyRecord(
        student_id=current_user['id'],
        course_id=data.get('course_id'),
        lesson_id=data.get('lesson_id'),
        action=data.get('action', 'view'),
        study_duration=data.get('study_duration', 0)
    )

    db.session.add(record)
    db.session.commit()

    return jsonify({
        'message': 'Study record added successfully',
        'record': {
            'id': record.id,
            'action': record.action,
            'created_at': record.created_at.isoformat()
        }
    }), 201

@student_bp.route('/stats', methods=['GET'])
def get_student_stats():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    enrollments = Enrollment.query.filter_by(student_id=current_user['id']).all()

    total_courses = len(enrollments)
    completed_courses = len([e for e in enrollments if e.status == 'completed'])
    in_progress_courses = len([e for e in enrollments if e.status == 'in_progress'])

    total_study_time = db.session.query(
        func.sum(StudyRecord.study_duration)
    ).filter_by(student_id=current_user['id']).scalar() or 0

    certificates = Certificate.query.filter_by(student_id=current_user['id']).count()

    return jsonify({
        'total_courses': total_courses,
        'completed_courses': completed_courses,
        'in_progress_courses': in_progress_courses,
        'total_study_time': total_study_time,
        'certificates': certificates
    }), 200

@student_bp.route('/reviews', methods=['GET'])
def get_my_reviews():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    reviews = Review.query.filter_by(
        student_id=current_user['id']
    ).order_by(Review.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    reviews_data = []
    for review in reviews.items:
        course = review.course
        reviews_data.append({
            'id': review.id,
            'course_id': review.course_id,
            'course_title': course.title if course else None,
            'rating': review.rating,
            'comment': review.comment,
            'instructor_reply': review.instructor_reply,
            'instructor_reply_at': review.instructor_reply_at.isoformat() if review.instructor_reply_at else None,
            'created_at': review.created_at.isoformat()
        })

    return jsonify({
        'reviews': reviews_data,
        'total': reviews.total,
        'pages': reviews.pages,
        'current_page': page
    }), 200
