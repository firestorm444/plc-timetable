from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Time, Boolean, select, func, delete
from sqlalchemy.orm import declarative_base, relationship, Session
import sys, os

def resource_path(relative_path):      
    """ Get absolute path to resource, works for dev and for PyInstaller """       
    try:           # PyInstaller creates a temp folder and stores path in _MEIPASS           
        base_path = sys._MEIPASS       
    except Exception:           
        base_path = os.path.abspath(".")       
    return os.path.join(base_path, relative_path)


db_path = resource_path("timetable.db")

engine = create_engine(r"sqlite+pysqlite:///{}".format(db_path))
session = Session(engine)
Base = declarative_base()

class Trooper(Base):
    __tablename__ = "trooper"
    id = Column(Integer, primary_key=True)
    name = Column(String(128))
    trooper_type = Column(String(30))
    status = Column(String(30))
    is_permanent = Column(Boolean)
    archived = Column(Boolean)
    excuse_rmj = Column(Boolean)
    order = relationship("TrooperOrder", back_populates="trooper")

class TrooperOrder(Base):
    __tablename__ = "trooper_order"
    id = Column(Integer, primary_key=True, autoincrement=True)
    trooper_id = Column(Integer, ForeignKey("trooper.id"))
    order =  Column(Integer)
    trooper = relationship("Trooper", back_populates="order")


class Role(Base):
    __tablename__ = "role"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128))
    color = Column(String(30))
    timing = relationship("RoleTiming", back_populates="role")

class RoleTiming(Base):
    __tablename__ = "role_timing"
    id = Column(Integer, primary_key=True, autoincrement=True)
    role_id = Column(Integer, ForeignKey("role.id"))
    timing = Column(Time)
    role = relationship("Role", back_populates="timing")


class GlobalSetting(Base):
    __tablename__ = "global_setting"
    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String(256))
    name = Column(String(256))
    value = Column(String(256))


# Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)

