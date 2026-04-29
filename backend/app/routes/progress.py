from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import Enrollment, LessonProgress, Course, Chapter, Lesson

progress_bp = Blueprint('progress', __name__)

def require_auth():
    from flask_jwt_extended import verify_jwt_in_request
    from flask import jsonify
    try:
        verify_jwt_in_request()
    except Exception as e:
        return jsonify({'message': 'Authentication required', 'error': str(e)}), 401
    return None

@progress_bp.route('/enroll/<course_id>', methods=['POST'])
def enroll_course(course_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    course = Course.query.get(course_id)
    if not course:
        return jsonify({'message': 'Course not found'}), 404

    existing_enrollment = Enrollment.query.filter_by(
        student_id=current_user['id'],
        course_id=course_id
    ).first()

    if existing_enrollment:
        return jsonify({
            'message': 'Already enrolled in this course',
            'enrollment': {
                'id': existing_enrollment.id,
                'progress': existing_enrollment.progress,
                'status': existing_enrollment.status
            }
        }), 200

    chapters = Chapter.query.filter_by(course_id=course_id).order_by(Chapter.order_index).all()
    total_lessons = 0
    for chapter in chapters:
        total_lessons += Lesson.query.filter_by(chapter_id=chapter.id).count()

    enrollment = Enrollment(
        student_id=current_user['id'],
        course_id=course_id,
        progress=0,
        total_lessons=total_lessons,
        completed_lessons=0,
        status='in_progress',
        enrolled_at=datetime.utcnow(),
        last_accessed_at=datetime.utcnow()
    )

    course.student_count += 1

    db.session.add(enrollment)
    db.session.commit()

    return jsonify({
        'message': 'Enrolled in course successfully',
        'enrollment': {
            'id': enrollment.id,
            'course_id': enrollment.course_id,
            'progress': enrollment.progress,
            'total_lessons': enrollment.total_lessons,
            'status': enrollment.status
        }
    }), 201

@progress_bp.route('/enrollment/<course_id>', methods=['GET'])
def get_enrollment(course_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
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
        'enrolled_at': enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
        'completed_at': enrollment.completed_at.isoformat() if enrollment.completed_at else None,
        'last_accessed_at': enrollment.last_accessed_at.isoformat() if enrollment.last_accessed_at else None
    }), 200

@progress_bp.route('/lesson/<lesson_id>', methods=['GET'])
def get_lesson_progress(lesson_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    lesson = Lesson.query.get(lesson_id)
    if not lesson:
        return jsonify({'message': 'Lesson not found'}), 404

    chapter = Chapter.query.get(lesson.chapter_id)

    progress = LessonProgress.query.filter_by(
        lesson_id=lesson_id,
        student_id=current_user['id']
    ).first()

    progress_data = {
        'lesson_id': lesson_id,
        'is_completed': False,
        'video_progress': 0,
        'text_read': False,
        'quiz_score': None,
        'quiz_total': None
    }

    if progress:
        progress_data = {
            'lesson_id': lesson_id,
            'is_completed': progress.is_completed,
            'video_progress': progress.video_progress or 0,
            'text_read': progress.text_read or False,
            'quiz_score': progress.quiz_score,
            'quiz_total': progress.quiz_total,
            'completed_at': progress.completed_at.isoformat() if progress.completed_at else None
        }

    return jsonify(progress_data), 200

@progress_bp.route('/lesson/<lesson_id>/video', methods=['POST'])
def update_video_progress(lesson_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    lesson = Lesson.query.get(lesson_id)
    if not lesson:
        return jsonify({'message': 'Lesson not found'}), 404

    chapter = Chapter.query.get(lesson.chapter_id)
    if not chapter:
        return jsonify({'message': 'Chapter not found'}), 404

    enrollment = Enrollment.query.filter_by(
        student_id=current_user['id'],
        course_id=chapter.course_id
    ).first()

    if not enrollment:
        return jsonify({'message': 'Not enrolled in this course'}), 403

    data = request.get_json()
    video_progress = data.get('progress', 0)
    total_duration = data.get('total_duration', 0)

    progress = LessonProgress.query.filter_by(
        lesson_id=lesson_id,
        student_id=current_user['id']
    ).first()

    if not progress:
        progress = LessonProgress(
            lesson_id=lesson_id,
            course_id=chapter.course_id,
            student_id=current_user['id'],
            video_progress=video_progress,
            video_duration=total_duration
        )
        db.session.add(progress)
    else:
        progress.video_progress = video_progress
        progress.video_duration = total_duration

    if video_progress >= 90:
        progress.is_completed = True
        progress.completed_at = datetime.utcnow()

        enrollment.completed_lessons = LessonProgress.query.filter_by(
            student_id=current_user['id'],
            course_id=chapter.course_id,
            is_completed=True
        ).count()

        enrollment.progress = (enrollment.completed_lessons / enrollment.total_lessons * 100) if enrollment.total_lessons > 0 else 0

        if enrollment.completed_lessons >= enrollment.total_lessons:
            enrollment.status = 'completed'
            enrollment.completed_at = datetime.utcnow()

    enrollment.last_accessed_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        'message': 'Video progress updated',
        'progress': {
            'video_progress': video_progress,
            'is_completed': progress.is_completed
        }
    }), 200

@progress_bp.route('/lesson/<lesson_id>/text', methods=['POST'])
def mark_text_read(lesson_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    lesson = Lesson.query.get(lesson_id)
    if not lesson:
        return jsonify({'message': 'Lesson not found'}), 404

    chapter = Chapter.query.get(lesson.chapter_id)

    enrollment = Enrollment.query.filter_by(
        student_id=current_user['id'],
        course_id=chapter.course_id
    ).first()

    if not enrollment:
        return jsonify({'message': 'Not enrolled in this course'}), 403

    progress = LessonProgress.query.filter_by(
        lesson_id=lesson_id,
        student_id=current_user['id']
    ).first()

    if not progress:
        progress = LessonProgress(
            lesson_id=lesson_id,
            course_id=chapter.course_id,
            student_id=current_user['id'],
            text_read=True,
            is_completed=True,
            completed_at=datetime.utcnow()
        )
        db.session.add(progress)
    else:
        progress.text_read = True
        progress.is_completed = True
        progress.completed_at = datetime.utcnow()

    enrollment.completed_lessons = LessonProgress.query.filter_by(
        student_id=current_user['id'],
        course_id=chapter.course_id,
        is_completed=True
    ).count()

    enrollment.progress = (enrollment.completed_lessons / enrollment.total_lessons * 100) if enrollment.total_lessons > 0 else 0

    if enrollment.completed_lessons >= enrollment.total_lessons:
        enrollment.status = 'completed'
        enrollment.completed_at = datetime.utcnow()

    enrollment.last_accessed_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        'message': 'Lesson marked as read',
        'is_completed': progress.is_completed
    }), 200

@progress_bp.route('/lesson/<lesson_id>/quiz', methods=['POST'])
def submit_quiz(lesson_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    lesson = Lesson.query.get(lesson_id)
    if not lesson:
        return jsonify({'message': 'Lesson not found'}), 404

    chapter = Chapter.query.get(lesson.chapter_id)

    enrollment = Enrollment.query.filter_by(
        student_id=current_user['id'],
        course_id=chapter.course_id
    ).first()

    if not enrollment:
        return jsonify({'message': 'Not enrolled in this course'}), 403

    data = request.get_json()
    answers = data.get('answers', {})

    quiz_questions = lesson.quiz_questions or []
    total_score = 0
    for question in quiz_questions:
        correct_answer = question.get('correct_answer')
        if correct_answer and answers.get(str(question.get('id'))) == correct_answer:
            total_score += 1

    progress = LessonProgress.query.filter_by(
        lesson_id=lesson_id,
        student_id=current_user['id']
    ).first()

    if not progress:
        progress = LessonProgress(
            lesson_id=lesson_id,
            course_id=chapter.course_id,
            student_id=current_user['id'],
            quiz_score=total_score,
            quiz_total=len(quiz_questions),
            quiz_answers=answers
        )
        db.session.add(progress)
    else:
        progress.quiz_score = total_score
        progress.quiz_total = len(quiz_questions)
        progress.quiz_answers = answers

    passing_score = len(quiz_questions) * 0.6
    if total_score >= passing_score:
        progress.is_completed = True
        progress.completed_at = datetime.utcnow()

        enrollment.completed_lessons = LessonProgress.query.filter_by(
            student_id=current_user['id'],
            course_id=chapter.course_id,
            is_completed=True
        ).count()

        enrollment.progress = (enrollment.completed_lessons / enrollment.total_lessons * 100) if enrollment.total_lessons > 0 else 0

        if enrollment.completed_lessons >= enrollment.total_lessons:
            enrollment.status = 'completed'
            enrollment.completed_at = datetime.utcnow()

    enrollment.last_accessed_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        'message': 'Quiz submitted',
        'score': total_score,
        'total': len(quiz_questions),
        'is_completed': progress.is_completed,
        'passing_score': passing_score
    }), 200

@progress_bp.route('/course/<course_id>/all', methods=['GET'])
def get_all_lesson_progress(course_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    enrollment = Enrollment.query.filter_by(
        student_id=current_user['id'],
        course_id=course_id
    ).first()

    if not enrollment:
        return jsonify({'message': 'Not enrolled in this course'}), 404

    chapters = Chapter.query.filter_by(course_id=course_id).order_by(Chapter.order_index).all()

    progress_data = []
    for chapter in chapters:
        chapter_progress = {
            'chapter_id': chapter.id,
            'chapter_title': chapter.title,
            'lessons': []
        }

        lessons = Lesson.query.filter_by(chapter_id=chapter.id).order_by(Lesson.order_index).all()
        for lesson in lessons:
            progress = LessonProgress.query.filter_by(
                lesson_id=lesson.id,
                student_id=current_user['id']
            ).first()

            chapter_progress['lessons'].append({
                'lesson_id': lesson.id,
                'lesson_title': lesson.title,
                'lesson_type': lesson.lesson_type,
                'is_completed': progress.is_completed if progress else False,
                'video_progress': progress.video_progress if progress else 0,
                'quiz_score': progress.quiz_score if progress else None
            })

        progress_data.append(chapter_progress)

    return jsonify({
        'progress': enrollment.progress,
        'completed_lessons': enrollment.completed_lessons,
        'total_lessons': enrollment.total_lessons,
        'status': enrollment.status,
        'chapters': progress_data
    }), 200
