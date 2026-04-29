from app import create_app, db
from app.models import User
from werkzeug.security import generate_password_hash

app = create_app()

def init_default_users():
    with app.app_context():
        default_teacher = User.query.filter_by(username='teacher').first()
        if not default_teacher:
            teacher = User(
                username='teacher',
                email='teacher@example.com',
                password_hash=generate_password_hash('teacher123'),
                role='instructor'
            )
            db.session.add(teacher)
            print('Created default instructor account: teacher / teacher123')
        
        default_student = User.query.filter_by(username='student').first()
        if not default_student:
            student = User(
                username='student',
                email='student@example.com',
                password_hash=generate_password_hash('student123'),
                role='student'
            )
            db.session.add(student)
            print('Created default student account: student / student123')
        
        db.session.commit()

init_default_users()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
