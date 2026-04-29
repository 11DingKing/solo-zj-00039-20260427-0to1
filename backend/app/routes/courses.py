from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_
from app import db
from app.models import Course, Chapter, Lesson, Category, User, Enrollment

courses_bp = Blueprint('courses', __name__)

def require_auth():
    from flask_jwt_extended import verify_jwt_in_request
    from flask import jsonify
    try:
        verify_jwt_in_request()
    except Exception as e:
        return jsonify({'message': 'Authentication required', 'error': str(e)}), 401
    return None

def get_course_total_lessons(course):
    total = 0
    for chapter in course.chapters:
        total += chapter.lessons.count()
    return total

def course_to_dict(course, include_details=False):
    data = {
        'id': course.id,
        'title': course.title,
        'description': course.description,
        'cover_image': course.cover_image,
        'category_id': course.category_id,
        'category_name': course.category.name if course.category else None,
        'difficulty': course.difficulty,
        'is_free': course.is_free,
        'instructor_id': course.instructor_id,
        'instructor_name': course.instructor.username if course.instructor else None,
        'instructor_avatar': course.instructor.avatar if course.instructor else None,
        'status': course.status,
        'view_count': course.view_count,
        'student_count': course.student_count,
        'average_rating': course.average_rating,
        'rating_count': course.rating_count,
        'created_at': course.created_at.isoformat(),
        'updated_at': course.updated_at.isoformat()
    }

    if include_details:
        chapters_data = []
        for chapter in course.chapters:
            lessons_data = []
            for lesson in chapter.lessons:
                lessons_data.append({
                    'id': lesson.id,
                    'title': lesson.title,
                    'lesson_type': lesson.lesson_type,
                    'duration': lesson.duration,
                    'video_duration': lesson.video_duration,
                    'order_index': lesson.order_index
                })
            chapters_data.append({
                'id': chapter.id,
                'title': chapter.title,
                'description': chapter.description,
                'order_index': chapter.order_index,
                'lessons': lessons_data
            })
        data['chapters'] = chapters_data

    return data

@courses_bp.route('/categories', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    return jsonify([{'id': c.id, 'name': c.name} for c in categories]), 200

@courses_bp.route('', methods=['GET'])
def get_courses():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    category_id = request.args.get('category_id')
    difficulty = request.args.get('difficulty')
    keyword = request.args.get('keyword')
    sort = request.args.get('sort', 'newest')
    status = request.args.get('status', 'published')

    query = Course.query.filter_by(status=status)

    if category_id:
        query = query.filter_by(category_id=category_id)

    if difficulty and difficulty in ['beginner', 'intermediate', 'advanced']:
        query = query.filter_by(difficulty=difficulty)

    if keyword:
        query = query.filter(
            or_(
                Course.title.ilike(f'%{keyword}%'),
                Course.description.ilike(f'%{keyword}%')
            )
        )

    if sort == 'hot':
        query = query.order_by(Course.student_count.desc())
    elif sort == 'newest':
        query = query.order_by(Course.created_at.desc())
    elif sort == 'rating':
        query = query.order_by(Course.average_rating.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    courses_data = [course_to_dict(c) for c in pagination.items]

    return jsonify({
        'courses': courses_data,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200

@courses_bp.route('/<course_id>', methods=['GET'])
def get_course(course_id):
    course = Course.query.get(course_id)

    if not course:
        return jsonify({'message': 'Course not found'}), 404

    course.view_count += 1
    db.session.commit()

    return jsonify(course_to_dict(course, include_details=True)), 200

@courses_bp.route('', methods=['POST'])
def create_course():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()

    if current_user['role'] != 'instructor':
        return jsonify({'message': 'Only instructors can create courses'}), 403

    data = request.get_json()

    if not data or 'title' not in data:
        return jsonify({'message': 'Title is required'}), 400

    course = Course(
        title=data['title'],
        description=data.get('description'),
        cover_image=data.get('cover_image'),
        category_id=data.get('category_id'),
        difficulty=data.get('difficulty', 'beginner'),
        is_free=data.get('is_free', True),
        instructor_id=current_user['id']
    )

    db.session.add(course)
    db.session.commit()

    return jsonify({
        'message': 'Course created successfully',
        'course': course_to_dict(course)
    }), 201

@courses_bp.route('/<course_id>', methods=['PUT'])
def update_course(course_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()
    course = Course.query.get(course_id)

    if not course:
        return jsonify({'message': 'Course not found'}), 404

    if course.instructor_id != current_user['id']:
        return jsonify({'message': 'You can only update your own courses'}), 403

    data = request.get_json()

    if 'title' in data:
        course.title = data['title']
    if 'description' in data:
        course.description = data['description']
    if 'cover_image' in data:
        course.cover_image = data['cover_image']
    if 'category_id' in data:
        course.category_id = data['category_id']
    if 'difficulty' in data:
        course.difficulty = data['difficulty']
    if 'is_free' in data:
        course.is_free = data['is_free']
    if 'status' in data:
        course.status = data['status']

    db.session.commit()

    return jsonify({
        'message': 'Course updated successfully',
        'course': course_to_dict(course)
    }), 200

@courses_bp.route('/<course_id>/chapters', methods=['POST'])
def create_chapter(course_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()
    course = Course.query.get(course_id)

    if not course:
        return jsonify({'message': 'Course not found'}), 404

    if course.instructor_id != current_user['id']:
        return jsonify({'message': 'You can only modify your own courses'}), 403

    data = request.get_json()

    if not data or 'title' not in data:
        return jsonify({'message': 'Title is required'}), 400

    max_order = db.session.query(db.func.max(Chapter.order_index)).filter_by(course_id=course_id).scalar() or 0

    chapter = Chapter(
        title=data['title'],
        description=data.get('description'),
        course_id=course_id,
        order_index=max_order + 1
    )

    db.session.add(chapter)
    db.session.commit()

    return jsonify({
        'message': 'Chapter created successfully',
        'chapter': {
            'id': chapter.id,
            'title': chapter.title,
            'description': chapter.description,
            'order_index': chapter.order_index
        }
    }), 201

@courses_bp.route('/chapters/<chapter_id>', methods=['PUT'])
def update_chapter(chapter_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()
    chapter = Chapter.query.get(chapter_id)

    if not chapter:
        return jsonify({'message': 'Chapter not found'}), 404

    course = Course.query.get(chapter.course_id)
    if course.instructor_id != current_user['id']:
        return jsonify({'message': 'You can only modify your own courses'}), 403

    data = request.get_json()

    if 'title' in data:
        chapter.title = data['title']
    if 'description' in data:
        chapter.description = data['description']
    if 'order_index' in data:
        chapter.order_index = data['order_index']

    db.session.commit()

    return jsonify({
        'message': 'Chapter updated successfully',
        'chapter': {
            'id': chapter.id,
            'title': chapter.title,
            'description': chapter.description,
            'order_index': chapter.order_index
        }
    }), 200

@courses_bp.route('/chapters/<chapter_id>', methods=['DELETE'])
def delete_chapter(chapter_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()
    chapter = Chapter.query.get(chapter_id)

    if not chapter:
        return jsonify({'message': 'Chapter not found'}), 404

    course = Course.query.get(chapter.course_id)
    if course.instructor_id != current_user['id']:
        return jsonify({'message': 'You can only modify your own courses'}), 403

    for lesson in chapter.lessons:
        db.session.delete(lesson)

    db.session.delete(chapter)
    db.session.commit()

    return jsonify({'message': 'Chapter deleted successfully'}), 200

@courses_bp.route('/chapters/reorder', methods=['POST'])
def reorder_chapters():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()
    data = request.get_json()

    chapter_ids = data.get('chapter_ids', [])

    for index, chapter_id in enumerate(chapter_ids):
        chapter = Chapter.query.get(chapter_id)
        if chapter:
            course = Course.query.get(chapter.course_id)
            if course.instructor_id != current_user['id']:
                continue
            chapter.order_index = index + 1

    db.session.commit()

    return jsonify({'message': 'Chapters reordered successfully'}), 200

@courses_bp.route('/chapters/<chapter_id>/lessons', methods=['POST'])
def create_lesson(chapter_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()
    chapter = Chapter.query.get(chapter_id)

    if not chapter:
        return jsonify({'message': 'Chapter not found'}), 404

    course = Course.query.get(chapter.course_id)
    if course.instructor_id != current_user['id']:
        return jsonify({'message': 'You can only modify your own courses'}), 403

    data = request.get_json()

    if not data or 'title' not in data or 'lesson_type' not in data:
        return jsonify({'message': 'Title and lesson_type are required'}), 400

    lesson_type = data['lesson_type']
    if lesson_type not in ['video', 'text', 'quiz']:
        return jsonify({'message': 'Invalid lesson type'}), 400

    max_order = db.session.query(db.func.max(Lesson.order_index)).filter_by(chapter_id=chapter_id).scalar() or 0

    lesson = Lesson(
        title=data['title'],
        lesson_type=lesson_type,
        chapter_id=chapter_id,
        order_index=max_order + 1,
        duration=data.get('duration', 0)
    )

    if lesson_type == 'video':
        lesson.video_url = data.get('video_url')
        lesson.video_duration = data.get('video_duration', 0)
    elif lesson_type == 'text':
        lesson.text_content = data.get('text_content')
    elif lesson_type == 'quiz':
        lesson.quiz_questions = data.get('quiz_questions')

    db.session.add(lesson)
    db.session.commit()

    return jsonify({
        'message': 'Lesson created successfully',
        'lesson': {
            'id': lesson.id,
            'title': lesson.title,
            'lesson_type': lesson.lesson_type,
            'order_index': lesson.order_index
        }
    }), 201

@courses_bp.route('/lessons/<lesson_id>', methods=['PUT'])
def update_lesson(lesson_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()
    lesson = Lesson.query.get(lesson_id)

    if not lesson:
        return jsonify({'message': 'Lesson not found'}), 404

    chapter = Chapter.query.get(lesson.chapter_id)
    course = Course.query.get(chapter.course_id)
    if course.instructor_id != current_user['id']:
        return jsonify({'message': 'You can only modify your own courses'}), 403

    data = request.get_json()

    if 'title' in data:
        lesson.title = data['title']
    if 'order_index' in data:
        lesson.order_index = data['order_index']
    if 'duration' in data:
        lesson.duration = data['duration']

    if lesson.lesson_type == 'video':
        if 'video_url' in data:
            lesson.video_url = data['video_url']
        if 'video_duration' in data:
            lesson.video_duration = data['video_duration']
    elif lesson.lesson_type == 'text':
        if 'text_content' in data:
            lesson.text_content = data['text_content']
    elif lesson.lesson_type == 'quiz':
        if 'quiz_questions' in data:
            lesson.quiz_questions = data['quiz_questions']

    db.session.commit()

    return jsonify({
        'message': 'Lesson updated successfully',
        'lesson': {
            'id': lesson.id,
            'title': lesson.title,
            'lesson_type': lesson.lesson_type,
            'order_index': lesson.order_index
        }
    }), 200

@courses_bp.route('/lessons/<lesson_id>', methods=['GET'])
def get_lesson(lesson_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    lesson = Lesson.query.get(lesson_id)

    if not lesson:
        return jsonify({'message': 'Lesson not found'}), 404

    chapter = Chapter.query.get(lesson.chapter_id)
    course = Course.query.get(chapter.course_id)

    lesson_data = {
        'id': lesson.id,
        'title': lesson.title,
        'lesson_type': lesson.lesson_type,
        'chapter_id': lesson.chapter_id,
        'course_id': course.id,
        'order_index': lesson.order_index,
        'duration': lesson.duration,
        'video_url': lesson.video_url,
        'video_duration': lesson.video_duration,
        'text_content': lesson.text_content,
        'quiz_questions': lesson.quiz_questions
    }

    return jsonify(lesson_data), 200

@courses_bp.route('/lessons/<lesson_id>', methods=['DELETE'])
def delete_lesson(lesson_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()
    lesson = Lesson.query.get(lesson_id)

    if not lesson:
        return jsonify({'message': 'Lesson not found'}), 404

    chapter = Chapter.query.get(lesson.chapter_id)
    course = Course.query.get(chapter.course_id)
    if course.instructor_id != current_user['id']:
        return jsonify({'message': 'You can only modify your own courses'}), 403

    db.session.delete(lesson)
    db.session.commit()

    return jsonify({'message': 'Lesson deleted successfully'}), 200

@courses_bp.route('/lessons/reorder', methods=['POST'])
def reorder_lessons():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    current_user = get_jwt_identity()
    data = request.get_json()

    lesson_ids = data.get('lesson_ids', [])

    for index, lesson_id in enumerate(lesson_ids):
        lesson = Lesson.query.get(lesson_id)
        if lesson:
            chapter = Chapter.query.get(lesson.chapter_id)
            course = Course.query.get(chapter.course_id)
            if course.instructor_id != current_user['id']:
                continue
            lesson.order_index = index + 1

    db.session.commit()

    return jsonify({'message': 'Lessons reordered successfully'}), 200
