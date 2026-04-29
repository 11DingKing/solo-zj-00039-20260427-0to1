from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from app import db
from app.models import Course, Enrollment, LessonProgress, Review, Chapter, Lesson, User

instructor_bp = Blueprint('instructor', __name__)

def require_auth():
    from flask_jwt_extended import verify_jwt_in_request
    from flask import jsonify
    try:
        verify_jwt_in_request()
    except Exception as e:
        return jsonify({'message': 'Authentication required', 'error': str(e)}), 401
    return None

@instructor_bp.route('/courses', methods=['GET'])
def get_instructor_courses():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    if current_user['role'] != 'instructor':
        return jsonify({'message': 'Only instructors can access this'}), 403

    courses = Course.query.filter_by(
        instructor_id=current_user['id']
    ).order_by(Course.created_at.desc()).all()

    courses_data = []
    for course in courses:
        courses_data.append({
            'id': course.id,
            'title': course.title,
            'description': course.description,
            'cover_image': course.cover_image,
            'category_name': course.category.name if course.category else None,
            'difficulty': course.difficulty,
            'is_free': course.is_free,
            'status': course.status,
            'student_count': course.student_count,
            'average_rating': course.average_rating,
            'rating_count': course.rating_count,
            'chapter_count': len(course.chapters),
            'lesson_count': sum(len(chapter.lessons) for chapter in course.chapters),
            'created_at': course.created_at.isoformat()
        })

    return jsonify({'courses': courses_data}), 200

@instructor_bp.route('/course/<course_id>/students', methods=['GET'])
def get_course_students(course_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    course = Course.query.get(course_id)
    if not course:
        return jsonify({'message': 'Course not found'}), 404

    if course.instructor_id != current_user['id']:
        return jsonify({'message': 'You can only view your own courses'}), 403

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    enrollments = Enrollment.query.filter_by(course_id=course_id).order_by(
        Enrollment.enrolled_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)

    students_data = []
    for enrollment in enrollments.items:
        student = enrollment.student
        students_data.append({
            'id': enrollment.id,
            'student_id': student.id,
            'student_name': student.username,
            'student_email': student.email,
            'progress': enrollment.progress,
            'completed_lessons': enrollment.completed_lessons,
            'total_lessons': enrollment.total_lessons,
            'status': enrollment.status,
            'enrolled_at': enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
            'last_accessed_at': enrollment.last_accessed_at.isoformat() if enrollment.last_accessed_at else None,
            'completed_at': enrollment.completed_at.isoformat() if enrollment.completed_at else None
        })

    return jsonify({
        'students': students_data,
        'total': enrollments.total,
        'pages': enrollments.pages,
        'current_page': page
    }), 200

@instructor_bp.route('/course/<course_id>/progress/<student_id>', methods=['GET'])
def get_student_detail_progress(course_id, student_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    course = Course.query.get(course_id)
    if not course:
        return jsonify({'message': 'Course not found'}), 404

    if course.instructor_id != current_user['id']:
        return jsonify({'message': 'You can only view your own courses'}), 403

    enrollment = Enrollment.query.filter_by(
        course_id=course_id,
        student_id=student_id
    ).first()

    if not enrollment:
        return jsonify({'message': 'Student not enrolled in this course'}), 404

    progress_records = LessonProgress.query.filter_by(
        course_id=course_id,
        student_id=student_id
    ).all()

    progress_data = {}
    for record in progress_records:
        progress_data[record.lesson_id] = {
            'is_completed': record.is_completed,
            'video_progress': record.video_progress,
            'quiz_score': record.quiz_score,
            'quiz_total': record.quiz_total,
            'completed_at': record.completed_at.isoformat() if record.completed_at else None
        }

    return jsonify({
        'enrollment': {
            'progress': enrollment.progress,
            'completed_lessons': enrollment.completed_lessons,
            'total_lessons': enrollment.total_lessons,
            'status': enrollment.status
        },
        'lesson_progress': progress_data
    }), 200

@instructor_bp.route('/course/<course_id>/stats', methods=['GET'])
def get_course_stats(course_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    course = Course.query.get(course_id)
    if not course:
        return jsonify({'message': 'Course not found'}), 404

    if course.instructor_id != current_user['id']:
        return jsonify({'message': 'You can only view your own courses'}), 403

    enrollments = Enrollment.query.filter_by(course_id=course_id).all()
    total_students = len(enrollments)
    completed_students = len([e for e in enrollments if e.status == 'completed'])
    completion_rate = (completed_students / total_students * 100) if total_students > 0 else 0

    reviews = Review.query.filter_by(course_id=course_id).all()
    avg_rating = course.average_rating or 0

    chapters = Chapter.query.filter_by(course_id=course_id).all()
    lesson_stats = []
    for chapter in chapters:
        for lesson in chapter.lessons:
            completed_count = LessonProgress.query.filter_by(
                lesson_id=lesson.id,
                is_completed=True
            ).count()
            lesson_stats.append({
                'lesson_id': lesson.id,
                'lesson_title': lesson.title,
                'completed_count': completed_count,
                'completion_rate': (completed_count / total_students * 100) if total_students > 0 else 0
            })

    study_time_dist = db.session.query(
        func.floor(StudyRecord.study_duration / 60).label('minute_bucket'),
        func.count(StudyRecord.id)
    ).filter(
        StudyRecord.course_id == course_id
    ).group_by('minute_bucket').all()

    return jsonify({
        'total_students': total_students,
        'completed_students': completed_students,
        'completion_rate': completion_rate,
        'average_rating': avg_rating,
        'total_reviews': len(reviews),
        'lesson_stats': lesson_stats,
        'study_time_distribution': [{'bucket': int(s[0]), 'count': s[1]} for s in study_time_dist if s[0] is not None]
    }), 200

@instructor_bp.route('/stats', methods=['GET'])
def get_instructor_stats():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    if current_user['role'] != 'instructor':
        return jsonify({'message': 'Only instructors can access this'}), 403

    courses = Course.query.filter_by(instructor_id=current_user['id']).all()
    course_ids = [c.id for c in courses]

    total_students = 0
    total_ratings = 0
    avg_rating = 0

    if course_ids:
        total_students = Enrollment.query.filter(
            Enrollment.course_id.in_(course_ids)
        ).count()

        total_ratings = Review.query.filter(
            Review.course_id.in_(course_ids)
        ).count()

        avg_rating = db.session.query(
            func.avg(Review.rating)
        ).filter(Review.course_id.in_(course_ids)).scalar() or 0

    return jsonify({
        'total_courses': len(courses),
        'total_students': total_students,
        'total_ratings': total_ratings,
        'average_rating': avg_rating
    }), 200
