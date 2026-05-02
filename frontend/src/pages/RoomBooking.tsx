import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  X, Users, Wifi, Monitor, Projector, Wind, Calendar,
  Clock, CheckCircle, XCircle, AlertCircle,
  School, FlaskConical, Mic2, Theater, MapPin, Lock, Search, BadgeCheck, Circle,
} from 'lucide-react';
import type { Room } from '../types';

const roomTypeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  classroom:    { icon: <School size={14} />,      label: 'Classroom',   color: 'var(--accent-blue)' },
  lab:          { icon: <FlaskConical size={14} />, label: 'Laboratory',  color: 'var(--accent-green)' },
  seminar_hall: { icon: <Mic2 size={14} />,         label: 'Seminar Hall',color: 'var(--accent-purple)' },
  auditorium:   { icon: <Theater size={14} />,      label: 'Auditorium',  color: 'var(--accent-orange)' },
};

const amenityIcons: Record<string, React.ReactNode> = {
  WiFi: <Wifi size={14} />,
  Projector: <Projector size={14} />,
  AC: <Wind size={14} />,
  'Smart Board': <Monitor size={14} />,
};

const RoomBooking: React.FC = () => {
  const { rooms, bookings, addBooking, cancelBooking } = useApp();
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'student';
  const canBook = role === 'admin' || role === 'teacher';
  const [showBookForm, setShowBookForm] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [showBookings, setShowBookings] = useState(false);

  const [form, setForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    purpose: '',
    bookedBy: '',
  });

  const filteredRooms = rooms.filter(r => filterType === 'all' || r.type === filterType);

  const handleBook = (room: Room) => {
    setSelectedRoom(room);
    setShowBookForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !form.date || !form.startTime || !form.endTime || !form.purpose) return;
    addBooking({
      roomId: selectedRoom.id,
      roomName: selectedRoom.name,
      bookedBy: form.bookedBy || 'Current User',
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      purpose: form.purpose,
    });
    setForm({ date: '', startTime: '', endTime: '', purpose: '', bookedBy: '' });
    setShowBookForm(false);
    setSelectedRoom(null);
  };

  return (
    <div className="page">
      <div className="page__toolbar">
        <div className="page__filters">
          {['all', 'classroom', 'lab', 'seminar_hall', 'auditorium'].map(t => (
            <button
              key={t}
              className={`filter-chip ${filterType === t ? 'filter-chip--active' : ''}`}
              onClick={() => setFilterType(t)}
            >
              {t === 'all'
                ? <><Search size={13}/> All</>
                : <>{roomTypeConfig[t]?.icon} {roomTypeConfig[t]?.label}</>}
            </button>
          ))}
        </div>
        <button className="btn btn--outline" onClick={() => setShowBookings(!showBookings)}>
          <Calendar size={16} /> {showBookings ? 'Show Rooms' : 'My Bookings'}
        </button>
      </div>

      {/* Booking Form Modal */}
      {showBookForm && selectedRoom && (
        <div className="modal-overlay" onClick={() => setShowBookForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3 style={{display:'flex',alignItems:'center',gap:'8px'}}><School size={18}/> Book: {selectedRoom.name}</h3>
              <button className="modal__close" onClick={() => setShowBookForm(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal__form">
              <div className="form-group">
                <label>Your Name</label>
                <input
                  type="text"
                  placeholder="Enter your name..."
                  value={form.bookedBy}
                  onChange={e => setForm({ ...form, bookedBy: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => setForm({ ...form, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={e => setForm({ ...form, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Purpose</label>
                <textarea
                  placeholder="Purpose of booking..."
                  value={form.purpose}
                  onChange={e => setForm({ ...form, purpose: e.target.value })}
                  rows={3}
                  required
                />
              </div>
              <button type="submit" className="btn btn--primary btn--full">
                Confirm Booking
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Rooms Grid */}
      {!showBookings && (
        <div className="rooms-grid">
          {filteredRooms.map(room => {
            const tc = roomTypeConfig[room.type];
            return (
              <div key={room.id} className="room-card">
                <div className="room-card__header">
                  <div className="room-card__type" style={{ color: tc.color, display:'flex', alignItems:'center', gap:'5px' }}>
                    {tc.icon} {tc.label}
                  </div>
                  <span
                    className={`room-card__status ${room.available ? 'room-card__status--available' : 'room-card__status--booked'}`}
                  >
                    {room.available
                      ? <><BadgeCheck size={13} color="var(--accent-green)"/> Available</>
                      : <><Circle size={13} color="var(--accent-red)" fill="var(--accent-red)"/> Occupied</>}
                  </span>
                </div>
                <h4 className="room-card__name">{room.name}</h4>
                <div className="room-card__info">
                  <span><Users size={14} /> Capacity: {room.capacity}</span>
                  <span><MapPin size={14} /> {room.building} · Floor {room.floor}</span>
                </div>
                <div className="room-card__amenities">
                  {room.amenities.map(a => (
                    <span key={a} className="amenity-tag">
                      {amenityIcons[a] || '✦'} {a}
                    </span>
                  ))}
                </div>
                {canBook ? (
                  <button
                    className="btn btn--primary btn--full"
                    disabled={!room.available}
                    onClick={() => handleBook(room)}
                  >
                    {room.available ? 'Book Now' : 'Not Available'}
                  </button>
                ) : (
                  <div className="room-card__viewonly" style={{display:'flex',alignItems:'center',gap:'6px'}}>
                    <Lock size={13}/> View Only — Booking restricted to faculty
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bookings List */}
      {showBookings && (
        <div className="bookings-list">
          {bookings.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon"><Calendar size={48} strokeWidth={1}/></span>
              <h3>No bookings yet</h3>
              <p>Book a room to see it here.</p>
            </div>
          ) : (
            bookings.map(booking => (
              <div key={booking.id} className={`booking-card booking-card--${booking.status}`}>
                <div className="booking-card__left">
                  <div className="booking-card__time">
                    <Clock size={14} />
                    <span>{booking.startTime} - {booking.endTime}</span>
                  </div>
                  <h4>{booking.purpose}</h4>
                  <p>{booking.roomName} · Booked by {booking.bookedBy}</p>
                </div>
                <div className="booking-card__right">
                  <span className={`booking-status booking-status--${booking.status}`}>
                    {booking.status === 'confirmed' && <><CheckCircle size={14} /> Confirmed</>}
                    {booking.status === 'pending' && <><AlertCircle size={14} /> Pending</>}
                    {booking.status === 'cancelled' && <><XCircle size={14} /> Cancelled</>}
                  </span>
                  <span className="booking-card__date"><Calendar size={14} /> {booking.date}</span>
                  {booking.status !== 'cancelled' && (
                    <button
                      className="btn btn--danger btn--sm"
                      onClick={() => cancelBooking(booking.id)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!showBookings && filteredRooms.length === 0 && (
        <div className="empty-state">
          <span className="empty-state__icon"><School size={48} strokeWidth={1}/></span>
          <h3>No rooms found</h3>
          <p>Try changing the filter.</p>
        </div>
      )}
    </div>
  );
};

export default RoomBooking;
