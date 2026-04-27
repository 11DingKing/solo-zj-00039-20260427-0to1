from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import Review, Course, Enrollment

reviews_bp = Blueprint('reviews', __name__)

def update_course_rating(course_id):
    course = Course.query.get(course_id)
    if not course:
        return
    
    reviews = Review.query.filter_by(course_id=course_id).all()
    if len(reviews) == 0:
        course.average_rating = 0.0
        course.rating_count = 0
    else:
        total_rating = sum(r.rating for r in reviews)
        course.average_rating = total_rating / len(reviews)
        course.rating_count = len(reviews)
    
    db.session.commit()

@reviews_bp.route('/course/<course_id>', methods=['GET'])
def get_course_reviews(course_id):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    pagination = Review.query.filter_by(course_id=course_id).order_by(
        Review.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    
    reviews_data = []
    for review in pagination.items:
        student = review.student
        reviews_data.append({
            'id': review.id,
            'course_id': review.course_id,
            'student_id': review.student_id,
            'student_name': '匿名用户' if review.is_anonymous else student.username,
            'student_avatar': None if review.is_anonymous else student.avatar,
            'rating': review.rating,
            'comment': review.comment,
            'instructor_reply': review.instructor_reply,
            'instructor_reply_at': review.instructor_reply_at.isoformat() if review.instructor_reply_at else None,
            'is_anonymous': review.is_anonymous,
            'created_at': review.created_at.isoformat()
        })
    
    return jsonify({
        'reviews': reviews_data,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200

@reviews_bp.route('/course/<course_id>', methods=['POST'])
@jwt_required()
def create_review(course_id):
    current_user = get_jwt_identity()
    
    enrollment = Enrollment.query.filter_by(
        student_id=current_user['id'],
        course_id=course_id
    ).first()
    
    if not enrollment:
        return jsonify({'message': 'You must enroll in the course first'}), 403
    
    if enrollment.status != 'completed':
        return jsonify({'message': 'You must complete the course first'}), 403
    
    existing_review = Review.query.filter_by(
        student_id=current_user['id'],
        course_id=course_id
    ).first()
    
    if existing_review:
        return jsonify({'message': 'You have already reviewed this course'}), 400
    
    data = request.get_json()
    
    rating = data.get('rating')
    if not rating or rating < 1 or rating > 5:
        return jsonify({'message': 'Rating must be between 1 and 5'}), 400
    
    review = Review(
        course_id=course_id,
        student_id=current_user['id'],
        rating=rating,
        comment=data.get('comment'),
        is_anonymous=data.get('is_anonymous', False)
    )
    
    db.session.add(review)
    db.session.commit()
    
    update_course_rating(course_id)
    
    return jsonify({
        'message': 'Review created successfully',
        'review': {
            'id': review.id,
            'rating': review.rating,
            'comment': review.comment,
            'created_at': review.created_at.isoformat()
        }
    }), 201

@reviews_bp.route('/<review_id>', methods=['PUT'])
@jwt_required()
def update_review(review_id):
    current_user = get_jwt_identity()
    
    review = Review.query.get(review_id)
    if not review:
        return jsonify({'message': 'Review not found'}), 404
    
    if review.student_id != current_user['id']:
        return jsonify({'message': 'You can only update your own reviews'}), 403
    
    data = request.get_json()
    
    if 'rating' in data:
        rating = data['rating']
        if rating < 1 or rating > 5:
            return jsonify({'message': 'Rating must be between 1 and 5'}), 400
        review.rating = rating
    
    if 'comment' in data:
        review.comment = data['comment']
    
    if 'is_anonymous' in data:
        review.is_anonymous = data['is_anonymous']
    
    db.session.commit()
    update_course_rating(review.course_id)
    
    return jsonify({'message': 'Review updated successfully'}), 200

@reviews_bp.route('/<review_id>/reply', methods=['POST'])
@jwt_required()
def reply_to_review(review_id):
    current_user = get_jwt_identity()
    
    if current_user['role'] != 'instructor':
        return jsonify({'message': 'Only instructors can reply to reviews'}), 403
    
    review = Review.query.get(review_id)
    if not review:
        return jsonify({'message': 'Review not found'}), 404
    
    course = Course.query.get(review.course_id)
    if course.instructor_id != current_user['id']:
        return jsonify({'message': 'You can only reply to reviews of your own courses'}), 403
    
    data = request.get_json()
    
    if not data or 'reply' not in data:
        return jsonify({'message': 'Reply content is required'}), 400
    
    review.instructor_reply = data['reply']
    review.instructor_reply_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'message': 'Reply sent successfully',
        'instructor_reply': review.instructor_reply,
        'instructor_reply_at': review.instructor_reply_at.isoformat()
    }), 200
