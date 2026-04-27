from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import LessonProgress, Enrollment, Course, Chapter, Lesson, StudyRecord

progress_bp = Blueprint('progress', __name__)

def update_enrollment_progress(enrollment):
    course = Course.query.get(enrollment.course_id)
    total_lessons = 0
    completed_lessons = 0
    
    for chapter in course.chapters:
        for lesson in chapter.lessons:
            total_lessons += 1
            progress = LessonProgress.query.filter_by(
                student_id=enrollment.student_id,
                lesson_id=lesson.id
            ).first()
            if progress and progress.is_completed:
                completed_lessons += 1
    
    enrollment.total_lessons = total_lessons
    enrollment.completed_lessons = completed_lessons
    enrollment.progress = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
    
    if enrollment.progress >= 100 and enrollment.status != 'completed':
        enrollment.status = 'completed'
        enrollment.completed_at = datetime.utcnow()
    
    db.session.commit()

@progress_bp.route('/enroll/<course_id>', methods=['POST'])
@jwt_required()
def enroll_course(course_id):
    current_user = get_jwt_identity()
    
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'message': 'Course not found'}), 404
    
    existing_enrollment = Enrollment.query.filter_by(
        student_id=current_user['id'],
        course_id=course_id
    ).first()
    
    if existing_enrollment:
        return jsonify({'message': 'Already enrolled in this course'}), 400
    
    enrollment = Enrollment(
        student_id=current_user['id'],
        course_id=course_id
    )
    
    course.student_count += 1
    db.session.add(enrollment)
    db.session.commit()
    
    return jsonify({
        'message': 'Enrolled successfully',
        'enrollment': {
            'id': enrollment.id,
            'course_id': enrollment.course_id,
            'progress': enrollment.progress,
            'status': enrollment.status,
            'enrolled_at': enrollment.enrolled_at.isoformat()
        }
    }), 201

@progress_bp.route('/enrollment/<course_id>', methods=['GET'])
@jwt_required()
def get_enrollment(course_id):
    current_user = get_jwt_identity()
    
    enrollment = Enrollment.query.filter_by(
        student_id=current_user['id'],
        course_id=course_id
    ).first()
    
    if not enrollment:
        return jsonify({'message': 'Not enrolled in this course'}), 404
    
    return jsonify({
        'id': enrollment.id,
        'course_id': enrollment.course_id,
        'progress': enrollment.progress,
        'total_lessons': enrollment.total_lessons,
        'completed_lessons': enrollment.completed_lessons,
        'status': enrollment.status,
        'enrolled_at': enrollment.enrolled_at.isoformat(),
        'last_accessed_at': enrollment.last_accessed_at.isoformat()
    }), 200

@progress_bp.route('/lesson/<lesson_id>', methods=['GET'])
@jwt_required()
def get_lesson_progress(lesson_id):
    current_user = get_jwt_identity()
    
    progress = LessonProgress.query.filter_by(
        student_id=current_user['id'],
        lesson_id=lesson_id
    ).first()
    
    if not progress:
        return jsonify({'message': 'No progress found'}), 404
    
    return jsonify({
        'id': progress.id,
        'lesson_id': progress.lesson_id,
        'video_progress': progress.video_progress,
        'text_read': progress.text_read,
        'quiz_score': progress.quiz_score,
        'quiz_total': progress.quiz_total,
        'is_completed': progress.is_completed,
        'completed_at': progress.completed_at.isoformat() if progress.completed_at else None
    }), 200

@progress_bp.route('/lesson/<lesson_id>/video', methods=['POST'])
@jwt_required()
def update_video_progress(lesson_id):
    current_user = get_jwt_identity()
    data = request.get_json()
    
    lesson = Lesson.query.get(lesson_id)
    if not lesson:
        return jsonify({'message': 'Lesson not found'}), 404
    
    if lesson.lesson_type != 'video':
        return jsonify({'message': 'Not a video lesson'}), 400
    
    progress = LessonProgress.query.filter_by(
        student_id=current_user['id'],
        lesson_id=lesson_id
    ).first()
    
    if not progress:
        progress = LessonProgress(
            student_id=current_user['id'],
            lesson_id=lesson_id,
            course_id=lesson.chapter.course_id
        )
        db.session.add(progress)
    
    current_progress = data.get('progress', 0)
    total_duration = data.get('total_duration', lesson.video_duration)
    
    progress.video_progress = current_progress
    progress.video_duration = total_duration
    progress.last_accessed_at = datetime.utcnow()
    
    if current_progress >= 90 and not progress.is_completed:
        progress.is_completed = True
        progress.completed_at = datetime.utcnow()
    
    enrollment = Enrollment.query.filter_by(
        student_id=current_user['id'],
        course_id=lesson.chapter.course_id
    ).first()
    
    if enrollment:
        enrollment.last_accessed_at = datetime.utcnow()
        update_enrollment_progress(enrollment)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Progress updated',
        'progress': {
            'video_progress': progress.video_progress,
            'is_completed': progress.is_completed
        }
    }), 200

@progress_bp.route('/lesson/<lesson_id>/text', methods=['POST'])
@jwt_required()
def mark_text_read(lesson_id):
    current_user = get_jwt_identity()
    
    lesson = Lesson.query.get(lesson_id)
    if not lesson:
        return jsonify({'message': 'Lesson not found'}), 404
    
    if lesson.lesson_type != 'text':
        return jsonify({'message': 'Not a text lesson'}), 400
    
    progress = LessonProgress.query.filter_by(
        student_id=current_user['id'],
        lesson_id=lesson_id
    ).first()
    
    if not progress:
        progress = LessonProgress(
            student_id=current_user['id'],
            lesson_id=lesson_id,
            course_id=lesson.chapter.course_id
        )
        db.session.add(progress)
    
    progress.text_read = True
    progress.is_completed = True
    progress.completed_at = datetime.utcnow()
    progress.last_accessed_at = datetime.utcnow()
    
    enrollment = Enrollment.query.filter_by(
        student_id=current_user['id'],
        course_id=lesson.chapter.course_id
    ).first()
    
    if enrollment:
        enrollment.last_accessed_at = datetime.utcnow()
        update_enrollment_progress(enrollment)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Text marked as read',
        'progress': {
            'text_read': progress.text_read,
            'is_completed': progress.is_completed
        }
    }), 200

@progress_bp.route('/lesson/<lesson_id>/quiz', methods=['POST'])
@jwt_required()
def submit_quiz(lesson_id):
    current_user = get_jwt_identity()
    data = request.get_json()
    
    lesson = Lesson.query.get(lesson_id)
    if not lesson:
        return jsonify({'message': 'Lesson not found'}), 404
    
    if lesson.lesson_type != 'quiz':
        return jsonify({'message': 'Not a quiz lesson'}), 400
    
    import json
    quiz_questions = json.loads(lesson.quiz_questions) if lesson.quiz_questions else []
    user_answers = data.get('answers', {})
    
    correct_count = 0
    total_count = len(quiz_questions)
    
    for question in quiz_questions:
        qid = question.get('id')
        if str(qid) in user_answers and user_answers[str(qid)] == question.get('correct_answer'):
            correct_count += 1
    
    progress = LessonProgress.query.filter_by(
        student_id=current_user['id'],
        lesson_id=lesson_id
    ).first()
    
    if not progress:
        progress = LessonProgress(
            student_id=current_user['id'],
            lesson_id=lesson_id,
            course_id=lesson.chapter.course_id
        )
        db.session.add(progress)
    
    progress.quiz_score = correct_count
    progress.quiz_total = total_count
    progress.quiz_answers = json.dumps(user_answers)
    progress.is_completed = True
    progress.completed_at = datetime.utcnow()
    progress.last_accessed_at = datetime.utcnow()
    
    enrollment = Enrollment.query.filter_by(
        student_id=current_user['id'],
        course_id=lesson.chapter.course_id
    ).first()
    
    if enrollment:
        enrollment.last_accessed_at = datetime.utcnow()
        update_enrollment_progress(enrollment)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Quiz submitted',
        'result': {
            'score': correct_count,
            'total': total_count,
            'percentage': (correct_count / total_count * 100) if total_count > 0 else 0
        },
        'is_completed': progress.is_completed
    }), 200

@progress_bp.route('/course/<course_id>/all', methods=['GET'])
@jwt_required()
def get_all_lesson_progress(course_id):
    current_user = get_jwt_identity()
    
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'message': 'Course not found'}), 404
    
    progress_map = {}
    progresses = LessonProgress.query.filter_by(
        student_id=current_user['id'],
        course_id=course_id
    ).all()
    
    for p in progresses:
        progress_map[p.lesson_id] = {
            'is_completed': p.is_completed,
            'video_progress': p.video_progress,
            'text_read': p.text_read,
            'quiz_score': p.quiz_score
        }
    
    return jsonify({
        'course_id': course_id,
        'progress_map': progress_map
    }), 200
