from app.database.database import Base, engine

from app.models import *
def create_tables():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    create_tables()
    print("Database created successfully!")