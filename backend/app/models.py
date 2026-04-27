from app import db
from datetime import datetime
import uuid

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    avatar = db.Column(db.String(255), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    courses_taught = db.relationship('Course', backref='instructor', lazy='dynamic')
    enrollments = db.relationship('Enrollment', backref='student', lazy='dynamic')
    reviews = db.relationship('Review', backref='student', lazy='dynamic')
    certificates = db.relationship('Certificate', backref='student', lazy='dynamic')
    study_records = db.relationship('StudyRecord', backref='student', lazy='dynamic')

class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(50), unique=True, nullable=False)
    
    courses = db.relationship('Course', backref='category', lazy='dynamic')

class Course(db.Model):
    __tablename__ = 'courses'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    cover_image = db.Column(db.String(255), nullable=True)
    category_id = db.Column(db.String(36), db.ForeignKey('categories.id'), nullable=True)
    difficulty = db.Column(db.String(20), default='beginner')
    is_free = db.Column(db.Boolean, default=True)
    instructor_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='draft')
    view_count = db.Column(db.Integer, default=0)
    student_count = db.Column(db.Integer, default=0)
    average_rating = db.Column(db.Float, default=0.0)
    rating_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    chapters = db.relationship('Chapter', backref='course', lazy='dynamic', order_by='Chapter.order_index')
    enrollments = db.relationship('Enrollment', backref='course', lazy='dynamic')
    reviews = db.relationship('Review', backref='course', lazy='dynamic')

class Chapter(db.Model):
    __tablename__ = 'chapters'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    course_id = db.Column(db.String(36), db.ForeignKey('courses.id'), nullable=False)
    order_index = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    lessons = db.relationship('Lesson', backref='chapter', lazy='dynamic', order_by='Lesson.order_index')

class Lesson(db.Model):
    __tablename__ = 'lessons'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(200), nullable=False)
    lesson_type = db.Column(db.String(20), nullable=False)
    chapter_id = db.Column(db.String(36), db.ForeignKey('chapters.id'), nullable=False)
    order_index = db.Column(db.Integer, default=0)
    duration = db.Column(db.Integer, default=0)
    
    video_url = db.Column(db.String(255), nullable=True)
    video_duration = db.Column(db.Integer, default=0)
    
    text_content = db.Column(db.Text, nullable=True)
    
    quiz_questions = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Enrollment(db.Model):
    __tablename__ = 'enrollments'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    course_id = db.Column(db.String(36), db.ForeignKey('courses.id'), nullable=False)
    progress = db.Column(db.Float, default=0.0)
    total_lessons = db.Column(db.Integer, default=0)
    completed_lessons = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='in_progress')
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    last_accessed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('student_id', 'course_id'),)

class LessonProgress(db.Model):
    __tablename__ = 'lesson_progress'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    lesson_id = db.Column(db.String(36), db.ForeignKey('lessons.id'), nullable=False)
    course_id = db.Column(db.String(36), db.ForeignKey('courses.id'), nullable=False)
    
    video_progress = db.Column(db.Float, default=0.0)
    video_duration = db.Column(db.Integer, default=0)
    
    text_read = db.Column(db.Boolean, default=False)
    
    quiz_score = db.Column(db.Integer, nullable=True)
    quiz_total = db.Column(db.Integer, nullable=True)
    quiz_answers = db.Column(db.Text, nullable=True)
    
    is_completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    last_accessed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('student_id', 'lesson_id'),)

class Review(db.Model):
    __tablename__ = 'reviews'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = db.Column(db.String(36), db.ForeignKey('courses.id'), nullable=False)
    student_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    instructor_reply = db.Column(db.Text, nullable=True)
    instructor_reply_at = db.Column(db.DateTime, nullable=True)
    is_anonymous = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('student_id', 'course_id'),)

class Certificate(db.Model):
    __tablename__ = 'certificates'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    certificate_number = db.Column(db.String(50), unique=True, nullable=False)
    student_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    course_id = db.Column(db.String(36), db.ForeignKey('courses.id'), nullable=False)
    issue_date = db.Column(db.DateTime, default=datetime.utcnow)
    course_title = db.Column(db.String(200), nullable=False)
    instructor_name = db.Column(db.String(80), nullable=False)
    student_name = db.Column(db.String(80), nullable=False)
    
    course = db.relationship('Course', backref='certificates')

class StudyRecord(db.Model):
    __tablename__ = 'study_records'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    course_id = db.Column(db.String(36), db.ForeignKey('courses.id'), nullable=True)
    lesson_id = db.Column(db.String(36), db.ForeignKey('lessons.id'), nullable=True)
    action = db.Column(db.String(50), nullable=False)
    study_duration = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    course = db.relationship('Course', backref='study_records')
