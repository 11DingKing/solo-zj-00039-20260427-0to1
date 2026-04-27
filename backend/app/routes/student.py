from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func, desc
from app import db
from app.models import Enrollment, Course, StudyRecord, Review, Certificate

student_bp = Blueprint('student', __name__)

@student_bp.route('/courses', methods=['GET'])
@jwt_required()
def get_my_courses():
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
            'instructor_name': course.instructor.username if course.instructor else None,
            'category_name': course.category.name if course.category else None,
            'difficulty': course.difficulty,
            'progress': enrollment.progress,
            'total_lessons': enrollment.total_lessons,
            'completed_lessons': enrollment.completed_lessons,
            'status': enrollment.status,
            'enrolled_at': enrollment.enrolled_at.isoformat(),
            'last_accessed_at': enrollment.last_accessed_at.isoformat(),
            'completed_at': enrollment.completed_at.isoformat() if enrollment.completed_at else None
        })
    
    return jsonify({'courses': courses_data}), 200

@student_bp.route('/timeline', methods=['GET'])
@jwt_required()
def get_study_timeline():
    current_user = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    days = request.args.get('days', 30, type=int)
    
    since_date = datetime.utcnow() - timedelta(days=days)
    
    query = StudyRecord.query.filter(
        StudyRecord.student_id == current_user['id'],
        StudyRecord.created_at >= since_date
    ).order_by(desc(StudyRecord.created_at))
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    timeline_data = []
    for record in pagination.items:
        course = Course.query.get(record.course_id) if record.course_id else None
        timeline_data.append({
            'id': record.id,
            'course_id': record.course_id,
            'course_title': course.title if course else None,
            'lesson_id': record.lesson_id,
            'action': record.action,
            'study_duration': record.study_duration,
            'created_at': record.created_at.isoformat()
        })
    
    daily_stats = db.session.query(
        func.date(StudyRecord.created_at).label('date'),
        func.count(StudyRecord.id).label('count'),
        func.sum(StudyRecord.study_duration).label('total_duration')
    ).filter(
        StudyRecord.student_id == current_user['id'],
        StudyRecord.created_at >= since_date
    ).group_by(
        func.date(StudyRecord.created_at)
    ).order_by(
        'date'
    ).all()
    
    daily_data = []
    for stat in daily_stats:
        daily_data.append({
            'date': str(stat.date),
            'count': stat.count,
            'total_duration': stat.total_duration or 0
        })
    
    return jsonify({
        'timeline': timeline_data,
        'daily_stats': daily_data,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200

@student_bp.route('/record', methods=['POST'])
@jwt_required()
def add_study_record():
    current_user = get_jwt_identity()
    data = request.get_json()
    
    record = StudyRecord(
        student_id=current_user['id'],
        course_id=data.get('course_id'),
        lesson_id=data.get('lesson_id'),
        action=data.get('action', 'study'),
        study_duration=data.get('study_duration', 0)
    )
    
    db.session.add(record)
    db.session.commit()
    
    return jsonify({
        'message': 'Study record added',
        'record': {
            'id': record.id,
            'action': record.action,
            'study_duration': record.study_duration,
            'created_at': record.created_at.isoformat()
        }
    }), 201

@student_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_student_stats():
    current_user = get_jwt_identity()
    
    total_enrolled = Enrollment.query.filter_by(
        student_id=current_user['id']
    ).count()
    
    completed_courses = Enrollment.query.filter_by(
        student_id=current_user['id'],
        status='completed'
    ).count()
    
    certificates = Certificate.query.filter_by(
        student_id=current_user['id']
    ).count()
    
    total_study_duration = db.session.query(
        func.sum(StudyRecord.study_duration)
    ).filter_by(student_id=current_user['id']).scalar() or 0
    
    last_7_days = datetime.utcnow() - timedelta(days=7)
    weekly_study = db.session.query(
        func.sum(StudyRecord.study_duration)
    ).filter(
        StudyRecord.student_id == current_user['id'],
        StudyRecord.created_at >= last_7_days
    ).scalar() or 0
    
    return jsonify({
        'total_enrolled': total_enrolled,
        'completed_courses': completed_courses,
        'certificates': certificates,
        'total_study_duration': total_study_duration,
        'weekly_study_duration': weekly_study
    }), 200

@student_bp.route('/reviews', methods=['GET'])
@jwt_required()
def get_my_reviews():
    current_user = get_jwt_identity()
    
    reviews = Review.query.filter_by(
        student_id=current_user['id']
    ).order_by(Review.created_at.desc()).all()
    
    reviews_data = []
    for review in reviews:
        course = review.course
        reviews_data.append({
            'id': review.id,
            'course_id': review.course_id,
            'course_title': course.title if course else None,
            'course_cover': course.cover_image if course else None,
            'rating': review.rating,
            'comment': review.comment,
            'instructor_reply': review.instructor_reply,
            'instructor_reply_at': review.instructor_reply_at.isoformat() if review.instructor_reply_at else None,
            'created_at': review.created_at.isoformat()
        })
    
    return jsonify({'reviews': reviews_data}), 200
