from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Time, Boolean, select
from sqlalchemy.orm import declarative_base, relationship, Session

engine = create_engine("sqlite+pysqlite:///timetable.db")
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


class TrooperOrder(Base):
    __tablename__ = "trooper_order"
    trooper_id = Column(Integer, primary_key=True)
    order =  Column(Integer, primary_key=True)
    trooper = relationship("Trooper", back_populates="TrooperOrder")


class Role(Base):
    __tablename__ = "role"
    id = Column(Integer, primary_key=True)
    name = Column(String(128))
    color = Column(String(30))
    timings = relationship("RoleTiming", back_populates="role")

class RoleTiming(Base):
    __tablename__ = "role_timing"
    id = Column(Integer, primary_key=True)
    role_id = Column(Integer, ForeignKey("role.id"))
    timing = Column(Time)
    role = relationship("Role", back_populates="role_timing")


class GlobalSetting(Base):
    __tablename__ = "global_setting"
    setting_name = Column(String(256), primary_key=True)
    setting_value = Column(String(256), primary_key=True)


# Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)

