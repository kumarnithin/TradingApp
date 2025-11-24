from app.database import SessionLocal, User

db = SessionLocal()
try:
    u = db.query(User).filter(User.id == 1).first()
    if not u:
        u = User(id=1, username='dev', email='dev@example.com')
        db.add(u)
        db.commit()
        print('created user id=1')
    else:
        print('user 1 exists')
finally:
    db.close()
