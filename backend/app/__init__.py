from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from datetime import datetime, timedelta
import os

db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://course_user:course_password@localhost:5432/course_platform')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'course_platform_jwt_secret_key_2026')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)
    app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', './uploads')
    app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_CONTENT_LENGTH', 500 * 1024 * 1024))
    
    CORS(app, supports_credentials=True)
    db.init_app(app)
    jwt.init_app(app)
    
    from app.routes.auth import auth_bp
    from app.routes.courses import courses_bp
    from app.routes.progress import progress_bp
    from app.routes.reviews import reviews_bp
    from app.routes.certificates import certificates_bp
    from app.routes.instructor import instructor_bp
    from app.routes.student import student_bp
    from app.routes.recommendations import recommendations_bp
    from app.routes.upload import upload_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(courses_bp, url_prefix='/api/courses')
    app.register_blueprint(progress_bp, url_prefix='/api/progress')
    app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
    app.register_blueprint(certificates_bp, url_prefix='/api/certificates')
    app.register_blueprint(instructor_bp, url_prefix='/api/instructor')
    app.register_blueprint(student_bp, url_prefix='/api/student')
    app.register_blueprint(recommendations_bp, url_prefix='/api/recommendations')
    app.register_blueprint(upload_bp, url_prefix='/api/upload')
    
    with app.app_context():
        db.create_all()
        init_categories()
    
    return app

def init_categories():
    from app.models import Category
    categories = ['前端开发', '后端开发', '移动开发', '人工智能', '数据库', '云计算', '运维', '设计', '产品', '测试']
    for cat in categories:
        if not Category.query.filter_by(name=cat).first():
            category = Category(name=cat)
            db.session.add(category)
    db.session.commit()
