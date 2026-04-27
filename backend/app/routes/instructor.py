from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from app import db
from app.models import Course, Enrollment, LessonProgress, Review, Chapter, Lesson, User

instructor_bp = Blueprint('instructor', __name__)

@instructor_bp.route('/courses', methods=['GET'])
@jwt_required()
def get_instructor_courses():
    current_user = get_jwt_identity()
    
    if current_user['role'] != 'instructor':
        return jsonify({'message': 'Only instructors can access this'}), 403
    
    courses = Course.query.filter_by(
        instructor_id=current_user['id']
    ).order_by(Course.created_at.desc()).all()
    
    courses_data = []
    for course in courses:
        total_lessons = 0
        for chapter in course.chapters:
            total_lessons += chapter.lessons.count()
        
        courses_data.append({
            'id': course.id,
            'title': course.title,
            'cover_image': course.cover_image,
            'status': course.status,
            'student_count': course.student_count,
            'average_rating': course.average_rating,
            'rating_count': course.rating_count,
            'view_count': course.view_count,
            'total_lessons': total_lessons,
            'created_at': course.created_at.isoformat()
        })
    
    return jsonify({'courses': courses_data}), 200

@instructor_bp.route('/course/<course_id>/students', methods=['GET'])
@jwt_required()
def get_course_students(course_id):
    current_user = get_jwt_identity()
    
    if current_user['role'] != 'instructor':
        return jsonify({'message': 'Only instructors can access this'}), 403
    
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'message': 'Course not found'}), 404
    
    if course.instructor_id != current_user['id']:
        return jsonify({'message': 'You can only view your own courses'}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    pagination = Enrollment.query.filter_by(
        course_id=course_id
    ).order_by(Enrollment.enrolled_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    students_data = []
    for enrollment in pagination.items:
        student = enrollment.student
        students_data.append({
            'student_id': student.id,
            'student_name': student.username,
            'student_avatar': student.avatar,
            'progress': enrollment.progress,
            'status': enrollment.status,
            'total_lessons': enrollment.total_lessons,
            'completed_lessons': enrollment.completed_lessons,
            'enrolled_at': enrollment.enrolled_at.isoformat(),
            'last_accessed_at': enrollment.last_accessed_at.isoformat(),
            'completed_at': enrollment.completed_at.isoformat() if enrollment.completed_at else None
        })
    
    return jsonify({
        'students': students_data,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200

@instructor_bp.route('/course/<course_id>/progress/<student_id>', methods=['GET'])
@jwt_required()
def get_student_detail_progress(course_id, student_id):
    current_user = get_jwt_identity()
    
    if current_user['role'] != 'instructor':
        return jsonify({'message': 'Only instructors can access this'}), 403
    
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'message': 'Course not found'}), 404
    
    if course.instructor_id != current_user['id']:
        return jsonify({'message': 'You can only view your own courses'}), 403
    
    enrollment = Enrollment.query.filter_by(
        student_id=student_id,
        course_id=course_id
    ).first()
    
    if not enrollment:
        return jsonify({'message': 'Student not enrolled in this course'}), 404
    
    progresses = LessonProgress.query.filter_by(
        student_id=student_id,
        course_id=course_id
    ).all()
    
    progress_map = {}
    for p in progresses:
        progress_map[p.lesson_id] = {
            'is_completed': p.is_completed,
            'video_progress': p.video_progress,
            'text_read': p.text_read,
            'quiz_score': p.quiz_score,
            'quiz_total': p.quiz_total,
            'completed_at': p.completed_at.isoformat() if p.completed_at else None
        }
    
    chapters_data = []
    for chapter in course.chapters:
        lessons_data = []
        for lesson in chapter.lessons:
            lesson_progress = progress_map.get(lesson.id, {
                'is_completed': False,
                'video_progress': 0,
                'text_read': False
            })
            lessons_data.append({
                'id': lesson.id,
                'title': lesson.title,
                'lesson_type': lesson.lesson_type,
                'order_index': lesson.order_index,
                'progress': lesson_progress
            })
        chapters_data.append({
            'id': chapter.id,
            'title': chapter.title,
            'order_index': chapter.order_index,
            'lessons': lessons_data
        })
    
    student = User.query.get(student_id)
    
    return jsonify({
        'student': {
            'id': student.id,
            'username': student.username,
            'avatar': student.avatar
        },
        'enrollment': {
            'progress': enrollment.progress,
            'status': enrollment.status,
            'total_lessons': enrollment.total_lessons,
            'completed_lessons': enrollment.completed_lessons,
            'enrolled_at': enrollment.enrolled_at.isoformat(),
            'last_accessed_at': enrollment.last_accessed_at.isoformat()
        },
        'chapters': chapters_data
    }), 200

@instructor_bp.route('/course/<course_id>/stats', methods=['GET'])
@jwt_required()
def get_course_stats(course_id):
    current_user = get_jwt_identity()
    
    if current_user['role'] != 'instructor':
        return jsonify({'message': 'Only instructors can access this'}), 403
    
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'message': 'Course not found'}), 404
    
    if course.instructor_id != current_user['id']:
        return jsonify({'message': 'You can only view your own courses'}), 403
    
    total_students = Enrollment.query.filter_by(course_id=course_id).count()
    completed_students = Enrollment.query.filter_by(
        course_id=course_id, status='completed'
    ).count()
    
    completion_rate = (completed_students / total_students * 100) if total_students > 0 else 0
    
    all_lessons = []
    for chapter in course.chapters:
        for lesson in chapter.lessons:
            all_lessons.append(lesson)
    
    lesson_completion_rates = []
    for lesson in all_lessons:
        total_enrolled = total_students
        completed_count = LessonProgress.query.filter_by(
            lesson_id=lesson.id,
            is_completed=True
        ).count()
        lesson_completion_rates.append({
            'lesson_id': lesson.id,
            'lesson_title': lesson.title,
            'lesson_type': lesson.lesson_type,
            'completion_rate': (completed_count / total_enrolled * 100) if total_enrolled > 0 else 0
        })
    
    avg_progress = db.session.query(
        func.avg(Enrollment.progress)
    ).filter_by(course_id=course_id).scalar() or 0
    
    return jsonify({
        'course_id': course_id,
        'course_title': course.title,
        'total_students': total_students,
        'completed_students': completed_students,
        'completion_rate': completion_rate,
        'average_rating': course.average_rating,
        'rating_count': course.rating_count,
        'view_count': course.view_count,
        'average_progress': avg_progress,
        'lesson_completion_rates': lesson_completion_rates
    }), 200

@instructor_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_instructor_stats():
    current_user = get_jwt_identity()
    
    if current_user['role'] != 'instructor':
        return jsonify({'message': 'Only instructors can access this'}), 403
    
    courses = Course.query.filter_by(instructor_id=current_user['id']).all()
    course_ids = [c.id for c in courses]
    
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
