from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, desc
from app import db
from app.models import Course, Enrollment, Category

recommendations_bp = Blueprint('recommendations', __name__)

@recommendations_bp.route('/home', methods=['GET'])
@jwt_required(optional=True)
def get_home_recommendations():
    current_user = get_jwt_identity()
    
    popular_courses = Course.query.filter_by(
        status='published'
    ).order_by(
        desc(Course.student_count)
    ).limit(8).all()
    
    new_courses = Course.query.filter_by(
        status='published'
    ).order_by(
        desc(Course.created_at)
    ).limit(8).all()
    
    top_rated_courses = Course.query.filter_by(
        status='published'
    ).filter(
        Course.rating_count >= 5
    ).order_by(
        desc(Course.average_rating)
    ).limit(8).all()
    
    personalized = []
    if current_user:
        enrolled_course_ids = [
            e.course_id for e in Enrollment.query.filter_by(
                student_id=current_user['id']
            ).all()
        ]
        
        if enrolled_course_ids:
            enrolled_courses = Course.query.filter(
                Course.id.in_(enrolled_course_ids)
            ).all()
            
            category_ids = set()
            for course in enrolled_courses:
                if course.category_id:
                    category_ids.add(course.category_id)
            
            if category_ids:
                personalized = Course.query.filter_by(
                    status='published'
                ).filter(
                    Course.category_id.in_(category_ids),
                    Course.id.notin_(enrolled_course_ids)
                ).order_by(
                    desc(Course.student_count)
                ).limit(8).all()
    
    def course_to_dict(course):
        return {
            'id': course.id,
            'title': course.title,
            'description': course.description[:100] + '...' if course.description and len(course.description) > 100 else course.description,
            'cover_image': course.cover_image,
            'category_name': course.category.name if course.category else None,
            'difficulty': course.difficulty,
            'is_free': course.is_free,
            'instructor_name': course.instructor.username if course.instructor else None,
            'instructor_avatar': course.instructor.avatar if course.instructor else None,
            'student_count': course.student_count,
            'average_rating': course.average_rating,
            'rating_count': course.rating_count,
            'created_at': course.created_at.isoformat()
        }
    
    return jsonify({
        'popular': [course_to_dict(c) for c in popular_courses],
        'new': [course_to_dict(c) for c in new_courses],
        'top_rated': [course_to_dict(c) for c in top_rated_courses],
        'personalized': [course_to_dict(c) for c in personalized]
    }), 200

@recommendations_bp.route('/similar/<course_id>', methods=['GET'])
def get_similar_courses(course_id):
    course = Course.query.get(course_id)
    
    if not course:
        return jsonify({'message': 'Course not found'}), 404
    
    similar = []
    if course.category_id:
        similar = Course.query.filter_by(
            status='published',
            category_id=course.category_id
        ).filter(
            Course.id != course_id
        ).order_by(
            desc(Course.student_count)
        ).limit(6).all()
    
    def course_to_dict(c):
        return {
            'id': c.id,
            'title': c.title,
            'cover_image': c.cover_image,
            'instructor_name': c.instructor.username if c.instructor else None,
            'student_count': c.student_count,
            'average_rating': c.average_rating
        }
    
    return jsonify({
        'similar_courses': [course_to_dict(c) for c in similar]
    }), 200
