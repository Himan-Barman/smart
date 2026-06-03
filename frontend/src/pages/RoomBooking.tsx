import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle,
  Circle,
  Clock,
  Edit3,
  FlaskConical,
  Lock,
  MapPin,
  Mic2,
  Monitor,
  Plus,
  Projector,
  Search,
  School,
  SlidersHorizontal,
  Theater,
  Trash2,
  Users,
  Wifi,
  Wind,
  X,
  XCircle,
} from 'lucide-react';
import type { Booking, Room, RoomPayload } from '../types';

type ViewMode = 'rooms' | 'bookings';
type BookingTargetRole = NonNullable<Booking['targetRole']>;

type RoomFormState = {
  name: string;
  building: string;
  floor: string;
  type: Room['type'];
  capacity: string;
  amenities: string[];
  available: boolean;
};

type BookingFormState = {
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  targetRole: BookingTargetRole;
  targetDepartment: string;
  targetSemester: string;
  targetCourse: string;
};

const roomTypeConfig: Record<Room['type'], { icon: React.ReactNode; label: string; color: string }> = {
  classroom: { icon: <School size={14} />, label: 'Classroom', color: 'var(--accent-blue)' },
  lab: { icon: <FlaskConical size={14} />, label: 'Laboratory', color: 'var(--accent-green)' },
  seminar_hall: { icon: <Mic2 size={14} />, label: 'Seminar Hall', color: 'var(--accent-purple)' },
  auditorium: { icon: <Theater size={14} />, label: 'Auditorium', color: 'var(--accent-orange)' },
};

const amenityOptions = ['WiFi', 'Projector', 'AC', 'Smart Board', 'Audio System', 'Whiteboard', 'Computer Systems'];

const amenityIcons: Record<string, React.ReactNode> = {
  WiFi: <Wifi size={14} />,
  Projector: <Projector size={14} />,
  AC: <Wind size={14} />,
  'Smart Board': <Monitor size={14} />,
};

const emptyRoomForm: RoomFormState = {
  name: '',
  building: '',
  floor: '',
  type: 'classroom',
  capacity: '',
  amenities: ['WiFi', 'Projector'],
  available: true,
};

const emptyBookingForm = (department = '', role: BookingTargetRole = 'all'): BookingFormState => ({
  date: '',
  startTime: '',
  endTime: '',
  purpose: '',
  targetRole: role,
  targetDepartment: department,
  targetSemester: '',
  targetCourse: '',
});

const toRoomForm = (room: Room): RoomFormState => ({
  name: room.name,
  building: room.building,
  floor: String(room.floor),
  type: room.type,
  capacity: String(room.capacity),
  amenities: room.amenities,
  available: room.available,
});

const RoomBooking: React.FC = () => {
  const {
    rooms,
    bookings,
    departments,
    addBooking,
    cancelBooking,
    addRoom,
    updateRoom,
  } = useApp();
  const { currentUser } = useAuth();
  const role = currentUser?.role ?? 'student';
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const canBook = isAdmin || isTeacher;

  const [viewMode, setViewMode] = useState<ViewMode>(role === 'student' ? 'bookings' : 'rooms');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | Room['type']>('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [showBookForm, setShowBookForm] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [roomForm, setRoomForm] = useState<RoomFormState>(emptyRoomForm);
  const [bookingForm, setBookingForm] = useState<BookingFormState>(() =>
    emptyBookingForm(isTeacher ? currentUser?.department ?? '' : '', isTeacher ? 'student' : 'all'),
  );

  const floors = useMemo(
    () => [...new Set(rooms.map((room) => room.floor))].sort((a, b) => a - b),
    [rooms],
  );

  const courseOptions = useMemo(
    () => [...new Set(departments.map((department) => department.course).filter(Boolean))],
    [departments],
  );

  const selectedDepartment = useMemo(
    () => departments.find((department) =>
      department.name === bookingForm.targetDepartment ||
      department.code === bookingForm.targetDepartment ||
      department.course === bookingForm.targetDepartment,
    ),
    [bookingForm.targetDepartment, departments],
  );

  const semesterOptions = useMemo(() => {
    const total = selectedDepartment?.totalSemesters ?? 8;
    return Array.from({ length: total }, (_, index) => index + 1);
  }, [selectedDepartment]);

  const filteredRooms = rooms.filter((room) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      room.name.toLowerCase().includes(query) ||
      room.building.toLowerCase().includes(query) ||
      room.amenities.join(' ').toLowerCase().includes(query);
    const matchesType = filterType === 'all' || room.type === filterType;
    const matchesFloor = floorFilter === 'all' || room.floor === Number(floorFilter);
    return matchesSearch && matchesType && matchesFloor;
  });

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return bookings;

    return bookings.filter((booking) =>
      [
        booking.roomName,
        booking.bookedBy,
        booking.purpose,
        booking.date,
        booking.startTime,
        booking.endTime,
        booking.targetLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [bookings, search]);

  const canCancel = (booking: Booking): boolean =>
    role === 'admin' || (role === 'teacher' && booking.bookedById === currentUser?.id);

  const openCreateRoom = () => {
    setEditingRoom(null);
    setRoomForm(emptyRoomForm);
    setRoomError('');
    setShowRoomForm(true);
  };

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomForm(toRoomForm(room));
    setRoomError('');
    setShowRoomForm(true);
  };

  const openBookRoom = (room: Room) => {
    setSelectedRoom(room);
    setBookingForm(emptyBookingForm(isTeacher ? currentUser?.department ?? '' : '', isTeacher ? 'student' : 'all'));
    setBookingError('');
    setShowBookForm(true);
  };

  const toggleAmenity = (amenity: string) => {
    setRoomForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((item) => item !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const submitRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    setRoomError('');

    if (!roomForm.name.trim() || !roomForm.building.trim() || !roomForm.floor || !roomForm.capacity) {
      setRoomError('Room number, building, floor, and capacity are required.');
      return;
    }

    const payload: RoomPayload = {
      name: roomForm.name.trim(),
      building: roomForm.building.trim(),
      floor: Number(roomForm.floor),
      capacity: Number(roomForm.capacity),
      type: roomForm.type,
      amenities: roomForm.amenities,
      available: roomForm.available,
    };

    try {
      setSavingRoom(true);
      if (editingRoom) {
        await updateRoom(editingRoom.id, payload);
      } else {
        await addRoom(payload);
      }
      setShowRoomForm(false);
      setEditingRoom(null);
      setRoomForm(emptyRoomForm);
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Unable to save room.');
    } finally {
      setSavingRoom(false);
    }
  };

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setBookingError('');

    if (!selectedRoom || !currentUser) return;
    if (!bookingForm.date || !bookingForm.startTime || !bookingForm.endTime || !bookingForm.purpose.trim()) {
      setBookingError('Date, time, and purpose are required.');
      return;
    }

    try {
      setSavingBooking(true);
      await addBooking({
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
        bookedBy: currentUser.name,
        date: bookingForm.date,
        startTime: bookingForm.startTime,
        endTime: bookingForm.endTime,
        purpose: bookingForm.purpose.trim(),
        targetRole: isTeacher ? 'student' : bookingForm.targetRole,
        targetDepartment: bookingForm.targetDepartment.trim() || undefined,
        targetSemester: bookingForm.targetSemester ? Number(bookingForm.targetSemester) : undefined,
        targetCourse: bookingForm.targetCourse.trim() || undefined,
      });

      setShowBookForm(false);
      setSelectedRoom(null);
      setBookingForm(emptyBookingForm(isTeacher ? currentUser.department : '', isTeacher ? 'student' : 'all'));
      setViewMode('bookings');
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Unable to book room.');
    } finally {
      setSavingBooking(false);
    }
  };

  return (
    <div className="page room-booking-page">
      <div className="page__toolbar room-toolbar">
        <div className="page__search">
          <Search size={16} />
          <input
            type="text"
            placeholder={viewMode === 'rooms' ? 'Search rooms, building, amenities...' : 'Search visible bookings...'}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="page__filters">
          {role !== 'student' ? (
            <button
              className={`filter-chip ${viewMode === 'rooms' ? 'filter-chip--active' : ''}`}
              onClick={() => setViewMode('rooms')}
              type="button"
            >
              <School size={13} /> Rooms
            </button>
          ) : null}
          <button
            className={`filter-chip ${viewMode === 'bookings' ? 'filter-chip--active' : ''}`}
            onClick={() => setViewMode('bookings')}
            type="button"
          >
            <Calendar size={13} /> Visible Bookings
          </button>
        </div>
        {isAdmin ? (
          <button className="btn btn--primary" onClick={openCreateRoom} type="button">
            <Plus size={16} /> Add Room
          </button>
        ) : null}
      </div>

      {viewMode === 'rooms' ? (
        <>
          <div className="page__toolbar room-toolbar room-toolbar--sub">
            <div className="page__filters">
              {(['all', 'classroom', 'lab', 'seminar_hall', 'auditorium'] as Array<'all' | Room['type']>).map((type) => (
                <button
                  key={type}
                  className={`filter-chip ${filterType === type ? 'filter-chip--active' : ''}`}
                  onClick={() => setFilterType(type)}
                  type="button"
                >
                  {type === 'all' ? <><SlidersHorizontal size={13} /> All types</> : <>{roomTypeConfig[type].icon} {roomTypeConfig[type].label}</>}
                </button>
              ))}
            </div>
            <select className="room-filter-select" value={floorFilter} onChange={(event) => setFloorFilter(event.target.value)}>
              <option value="all">All floors</option>
              {floors.map((floor) => (
                <option key={floor} value={floor}>Floor {floor}</option>
              ))}
            </select>
          </div>

          <div className="rooms-grid">
            {filteredRooms.map((room) => {
              const type = roomTypeConfig[room.type];
              return (
                <div key={room.id} className="room-card">
                  <div className="room-card__header">
                    <div className="room-card__type" style={{ color: type.color, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {type.icon} {type.label}
                    </div>
                    <span className={`room-card__status ${room.available ? 'room-card__status--available' : 'room-card__status--booked'}`}>
                      {room.available
                        ? <><BadgeCheck size={13} color="var(--accent-green)" /> Available</>
                        : <><Circle size={13} color="var(--accent-red)" fill="var(--accent-red)" /> Unavailable</>}
                    </span>
                  </div>
                  <h4 className="room-card__name">{room.name}</h4>
                  <div className="room-card__info">
                    <span><Users size={14} /> Capacity: {room.capacity}</span>
                    <span><MapPin size={14} /> {room.building} / Floor {room.floor}</span>
                  </div>
                  <div className="room-card__amenities">
                    {room.amenities.map((amenity) => (
                      <span key={amenity} className="amenity-tag">
                        {amenityIcons[amenity] ?? <Building2 size={14} />} {amenity}
                      </span>
                    ))}
                  </div>
                  <div className="room-card__actions">
                    {canBook ? (
                      <button
                        className="btn btn--primary btn--full"
                        disabled={!room.available}
                        onClick={() => openBookRoom(room)}
                        type="button"
                      >
                        {room.available ? 'Book Room' : 'Unavailable'}
                      </button>
                    ) : (
                      <div className="room-card__viewonly">
                        <Lock size={13} /> Booking restricted to faculty and admins
                      </div>
                    )}
                    {isAdmin ? (
                      <button className="btn btn--outline btn--full" onClick={() => openEditRoom(room)} type="button">
                        <Edit3 size={14} /> Edit Room
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="bookings-list">
          {filteredBookings.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon"><Calendar size={48} strokeWidth={1} /></span>
              <h3>No visible room bookings</h3>
              <p>Bookings targeted to your role, department, or semester will appear here.</p>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <div key={booking.id} className={`booking-card booking-card--${booking.status}`}>
                <div className="booking-card__left">
                  <div className="booking-card__time">
                    <Clock size={14} />
                    <span>{booking.startTime} - {booking.endTime}</span>
                  </div>
                  <h4>{booking.purpose}</h4>
                  <p>{booking.roomName} / Booked by {booking.bookedBy}</p>
                  <span className="booking-card__audience"><Users size={13} /> {booking.targetLabel ?? 'All users'}</span>
                </div>
                <div className="booking-card__right">
                  <span className={`booking-status booking-status--${booking.status}`}>
                    {booking.status === 'confirmed' && <><CheckCircle size={14} /> Confirmed</>}
                    {booking.status === 'pending' && <><Circle size={14} /> Pending</>}
                    {booking.status === 'cancelled' && <><XCircle size={14} /> Cancelled</>}
                  </span>
                  <span className="booking-card__date"><Calendar size={14} /> {booking.date}</span>
                  {booking.status !== 'cancelled' && canCancel(booking) ? (
                    <button className="btn btn--danger btn--sm" onClick={() => cancelBooking(booking.id)} type="button">
                      <Trash2 size={14} /> Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {viewMode === 'rooms' && filteredRooms.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon"><School size={48} strokeWidth={1} /></span>
          <h3>No rooms found</h3>
          <p>Try changing the search, type, or floor filter.</p>
        </div>
      ) : null}

      {showRoomForm && (
        <div className="modal-overlay" onClick={() => setShowRoomForm(false)}>
          <div className="modal room-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <School size={18} /> {editingRoom ? 'Edit Room' : 'Add Room'}
              </h3>
              <button className="modal__close" onClick={() => setShowRoomForm(false)} type="button">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitRoom} className="modal__form">
              {roomError ? <div className="auth-err">{roomError}</div> : null}
              <div className="form-row">
                <div className="form-group">
                  <label>Room Number / Name</label>
                  <input value={roomForm.name} onChange={(event) => setRoomForm({ ...roomForm, name: event.target.value })} placeholder="Lecture Hall A-101" required />
                </div>
                <div className="form-group">
                  <label>Room Type</label>
                  <select value={roomForm.type} onChange={(event) => setRoomForm({ ...roomForm, type: event.target.value as Room['type'] })}>
                    <option value="classroom">Classroom</option>
                    <option value="lab">Laboratory</option>
                    <option value="seminar_hall">Seminar Hall</option>
                    <option value="auditorium">Auditorium</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Building / Block</label>
                  <input value={roomForm.building} onChange={(event) => setRoomForm({ ...roomForm, building: event.target.value })} placeholder="Main Academic Block" required />
                </div>
                <div className="form-group">
                  <label>Floor</label>
                  <input type="number" value={roomForm.floor} onChange={(event) => setRoomForm({ ...roomForm, floor: event.target.value })} placeholder="1" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Capacity</label>
                  <input type="number" min={1} value={roomForm.capacity} onChange={(event) => setRoomForm({ ...roomForm, capacity: event.target.value })} placeholder="60" required />
                </div>
                <label className="checkbox-group room-availability-toggle">
                  <input type="checkbox" checked={roomForm.available} onChange={(event) => setRoomForm({ ...roomForm, available: event.target.checked })} />
                  <span>Available for booking</span>
                </label>
              </div>
              <div className="form-group">
                <label>Amenities</label>
                <div className="room-amenity-picker">
                  {amenityOptions.map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      className={`filter-chip ${roomForm.amenities.includes(amenity) ? 'filter-chip--active' : ''}`}
                      onClick={() => toggleAmenity(amenity)}
                    >
                      {amenityIcons[amenity] ?? <Building2 size={13} />} {amenity}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn btn--primary btn--full" disabled={savingRoom}>
                {savingRoom ? 'Saving...' : editingRoom ? 'Update Room' : 'Create Room'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showBookForm && selectedRoom && (
        <div className="modal-overlay" onClick={() => setShowBookForm(false)}>
          <div className="modal room-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={18} /> Book: {selectedRoom.name}</h3>
              <button className="modal__close" onClick={() => setShowBookForm(false)} type="button">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitBooking} className="modal__form">
              {bookingError ? <div className="auth-err">{bookingError}</div> : null}
              <div className="form-group">
                <label>Purpose</label>
                <textarea value={bookingForm.purpose} onChange={(event) => setBookingForm({ ...bookingForm, purpose: event.target.value })} placeholder="Class, lab session, meeting, exam, event..." rows={3} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={bookingForm.date} onChange={(event) => setBookingForm({ ...bookingForm, date: event.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Audience</label>
                  <select
                    value={bookingForm.targetRole}
                    onChange={(event) => setBookingForm({ ...bookingForm, targetRole: event.target.value as BookingTargetRole })}
                    disabled={isTeacher}
                  >
                    <option value="all">All users</option>
                    <option value="student">Students</option>
                    <option value="teacher">Teachers</option>
                    {isAdmin ? <option value="admin">Admins</option> : null}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input type="time" value={bookingForm.startTime} onChange={(event) => setBookingForm({ ...bookingForm, startTime: event.target.value })} required />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input type="time" value={bookingForm.endTime} onChange={(event) => setBookingForm({ ...bookingForm, endTime: event.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  {isTeacher ? (
                    <input type="text" value={currentUser?.department ?? ''} disabled />
                  ) : (
                    <select value={bookingForm.targetDepartment} onChange={(event) => setBookingForm({ ...bookingForm, targetDepartment: event.target.value, targetSemester: '' })}>
                      <option value="">All departments</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.name}>{department.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <select value={bookingForm.targetSemester} onChange={(event) => setBookingForm({ ...bookingForm, targetSemester: event.target.value })}>
                    <option value="">All semesters</option>
                    {semesterOptions.map((semester) => (
                      <option key={semester} value={semester}>Semester {semester}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Course</label>
                <select value={bookingForm.targetCourse} onChange={(event) => setBookingForm({ ...bookingForm, targetCourse: event.target.value })}>
                  <option value="">All courses</option>
                  {courseOptions.map((course) => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn--primary btn--full" disabled={savingBooking}>
                {savingBooking ? 'Booking...' : 'Confirm Booking'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomBooking;
