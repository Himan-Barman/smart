import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { WEST_BENGAL_GOVERNMENT_HOLIDAYS_2026 } from '../src/lib/government-holidays.js';

const prisma = new PrismaClient();

const toDate = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

const day = (value: string): string => {
  const map: Record<string, string> = {
    Monday: 'MONDAY',
    Tuesday: 'TUESDAY',
    Wednesday: 'WEDNESDAY',
    Thursday: 'THURSDAY',
    Friday: 'FRIDAY',
    Saturday: 'SATURDAY',
  };
  return map[value];
};

async function main(): Promise<void> {
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.room.deleteMany();
  await prisma.grievance.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.scheduleSlot.deleteMany();
  await prisma.departmentSubject.deleteMany();
  await prisma.departmentSemester.deleteMany();
  await prisma.department.deleteMany();
  await prisma.internship.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.academicSemester.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();
  await prisma.registeredPerson.deleteMany();

  const registeredPersons = [
    { id: 'STU001', name: 'Rahul Sharma', email: 'rahul@university.edu', role: 'STUDENT', department: 'Computer Science', enrollmentNo: 'CS2024001', semester: 4, course: 'B.Tech CSE', phone: '9876543210' },
    { id: 'STU002', name: 'Priya Patel', email: 'priya@university.edu', role: 'STUDENT', department: 'Computer Science', enrollmentNo: 'CS2024002', semester: 4, course: 'B.Tech CSE', phone: '9876543211' },
    { id: 'STU003', name: 'Amit Kumar', email: 'amit@university.edu', role: 'STUDENT', department: 'Electronics', enrollmentNo: 'EC2024001', semester: 6, course: 'B.Tech ECE', phone: '9876543212' },
    { id: 'STU004', name: 'Neha Gupta', email: 'neha@university.edu', role: 'STUDENT', department: 'Mechanical', enrollmentNo: 'ME2024001', semester: 2, course: 'B.Tech ME', phone: '9876543213' },
    { id: 'STU005', name: 'Ankit Singh', email: 'ankit@university.edu', role: 'STUDENT', department: 'Computer Science', enrollmentNo: 'CS2024003', semester: 6, course: 'B.Tech CSE', phone: '9876543214' },
    { id: 'TCH001', name: 'Dr. Rajesh Kumar', email: 'rajesh.k@university.edu', role: 'TEACHER', department: 'Computer Science', employeeId: 'EMP001', subjects: 'Data Structures,Algorithms', phone: '9876500001' },
    { id: 'TCH002', name: 'Prof. Meena Iyer', email: 'meena.i@university.edu', role: 'TEACHER', department: 'Computer Science', employeeId: 'EMP002', subjects: 'Machine Learning,AI', phone: '9876500002' },
    { id: 'TCH003', name: 'Dr. Sanjay Verma', email: 'sanjay.v@university.edu', role: 'TEACHER', department: 'Electronics', employeeId: 'EMP003', subjects: 'Digital Electronics,Signals', phone: '9876500003' },
  ];

  for (const person of registeredPersons) {
    await prisma.registeredPerson.create({ data: person });
  }

  const [adminPasswordHash, teacherPasswordHash, studentPasswordHash] = await Promise.all([
    bcrypt.hash('admin123', 10),
    bcrypt.hash('teacher123', 10),
    bcrypt.hash('student123', 10),
  ]);

  const demoUsers = [
    {
      id: 'ADMIN001',
      name: 'Admin Staff',
      email: 'admin@university.edu',
      role: 'ADMIN',
      department: 'Administration',
      passwordHash: adminPasswordHash,
      createdAt: toDate('2026-01-01'),
    },
    {
      id: 'TCH001',
      name: 'Dr. Rajesh Kumar',
      email: 'rajesh.k@university.edu',
      role: 'TEACHER',
      department: 'Computer Science',
      employeeId: 'EMP001',
      subjects: 'Data Structures,Algorithms',
      phone: '9876500001',
      passwordHash: teacherPasswordHash,
      registeredPersonId: 'TCH001',
      createdAt: toDate('2026-01-02'),
    },
    {
      id: 'STU001',
      name: 'Rahul Sharma',
      email: 'rahul@university.edu',
      role: 'STUDENT',
      department: 'Computer Science',
      enrollmentNo: 'CS2024001',
      semester: 4,
      course: 'B.Tech CSE',
      phone: '9876543210',
      passwordHash: studentPasswordHash,
      registeredPersonId: 'STU001',
      createdAt: toDate('2026-01-03'),
    },
  ];

  for (const user of demoUsers) {
    await prisma.user.create({ data: user });
  }

  const feedbacks = [
    { id: 'f1', type: 'COURSE', subject: 'Data Structures & Algorithms', message: 'Excellent course content and practical assignments. The lab sessions are very helpful.', rating: 5, anonymous: false, date: toDate('2026-04-24'), status: 'REVIEWED', userId: 'ADMIN001' },
    { id: 'f2', type: 'INFRASTRUCTURE', subject: 'Computer Lab - Block A', message: 'Some systems in Lab 3 are running slow. Need hardware upgrade for better performance.', rating: 3, anonymous: true, date: toDate('2026-04-23'), status: 'PENDING', userId: 'ADMIN001' },
    { id: 'f3', type: 'FACULTY', subject: 'Prof. Meena - Machine Learning', message: 'Very engaging teaching style. Makes complex topics easy to understand with real-world examples.', rating: 5, anonymous: false, date: toDate('2026-04-22'), status: 'RESOLVED', userId: 'ADMIN001' },
  ];

  for (const feedback of feedbacks) {
    await prisma.feedback.create({ data: feedback });
  }

  const skills = [
    { id: 's1', name: 'Python', category: 'Programming', level: 'ADVANCED', userId: 'STU001' },
    { id: 's2', name: 'React', category: 'Web Development', level: 'INTERMEDIATE', userId: 'STU001' },
    { id: 's3', name: 'Machine Learning', category: 'AI/ML', level: 'INTERMEDIATE', userId: 'STU001' },
    { id: 's4', name: 'SQL', category: 'Database', level: 'ADVANCED', userId: 'STU001' },
    { id: 's5', name: 'Docker', category: 'DevOps', level: 'BEGINNER', userId: 'ADMIN001' },
    { id: 's6', name: 'TypeScript', category: 'Programming', level: 'INTERMEDIATE', userId: 'TCH001' },
    { id: 's7', name: 'Node.js', category: 'Backend', level: 'INTERMEDIATE', userId: 'TCH001' },
    { id: 's8', name: 'Figma', category: 'Design', level: 'BEGINNER', userId: 'ADMIN001' },
  ];

  for (const skill of skills) {
    await prisma.skill.create({ data: skill });
  }

  const internships = [
    { id: 'i1', title: 'Full Stack Developer Intern', company: 'Google', location: 'Bangalore, India', duration: '3 months', skills: 'React,TypeScript,Node.js', stipend: 'INR 80,000/month', deadline: toDate('2026-05-15'), description: 'Work on Google Cloud Platform dashboards using React and TypeScript. Collaborate with senior engineers on production-grade applications.', type: 'HYBRID' },
    { id: 'i2', title: 'ML Research Intern', company: 'Microsoft Research', location: 'Hyderabad, India', duration: '6 months', skills: 'Python,Machine Learning,PyTorch', stipend: 'INR 60,000/month', deadline: toDate('2026-05-20'), description: 'Research on large language models and NLP. Publish papers and contribute to open-source projects.', type: 'ONSITE' },
    { id: 'i3', title: 'Backend Engineer Intern', company: 'Amazon', location: 'Remote', duration: '4 months', skills: 'Python,SQL,Docker', stipend: 'INR 50,000/month', deadline: toDate('2026-05-10'), description: 'Build scalable microservices for Amazon Web Services. Work with distributed systems and cloud infrastructure.', type: 'REMOTE' },
    { id: 'i4', title: 'Data Analytics Intern', company: 'Flipkart', location: 'Bangalore, India', duration: '3 months', skills: 'Python,SQL,Machine Learning', stipend: 'INR 45,000/month', deadline: toDate('2026-05-25'), description: 'Analyze customer behavior patterns and build recommendation systems. Work with big data tools and ML pipelines.', type: 'ONSITE' },
    { id: 'i5', title: 'UI/UX Design Intern', company: 'Swiggy', location: 'Remote', duration: '2 months', skills: 'Figma,React', stipend: 'INR 30,000/month', deadline: toDate('2026-06-01'), description: 'Redesign key user flows for the Swiggy app. Conduct user research and create high-fidelity prototypes.', type: 'REMOTE' },
    { id: 'i6', title: 'DevOps Intern', company: 'Razorpay', location: 'Bangalore, India', duration: '3 months', skills: 'Docker,Node.js,Python', stipend: 'INR 40,000/month', deadline: toDate('2026-05-30'), description: 'Automate CI/CD pipelines and manage Kubernetes clusters. Work on infrastructure as code using Terraform.', type: 'HYBRID' },
  ];

  for (const internship of internships) {
    await prisma.internship.create({ data: internship });
  }

  const rooms = [
    { id: 'r1', name: 'Lecture Hall A-101', type: 'CLASSROOM', capacity: 120, floor: 1, building: 'Block A', amenities: 'Projector,AC,Smart Board,WiFi', available: true },
    { id: 'r2', name: 'Computer Lab B-201', type: 'LAB', capacity: 60, floor: 2, building: 'Block B', amenities: '60 PCs,Projector,AC,Printer', available: true },
    { id: 'r3', name: 'Seminar Hall C-301', type: 'SEMINAR_HALL', capacity: 200, floor: 3, building: 'Block C', amenities: 'Projector,Sound System,AC,Video Conferencing', available: false },
    { id: 'r4', name: 'AI Research Lab D-102', type: 'LAB', capacity: 30, floor: 1, building: 'Block D', amenities: 'GPU Workstations,AC,Whiteboard', available: true },
    { id: 'r5', name: 'Main Auditorium', type: 'AUDITORIUM', capacity: 500, floor: 0, building: 'Main Block', amenities: 'Stage,Sound System,Projector,AC,Green Room', available: true },
    { id: 'r6', name: 'Electronics Lab B-303', type: 'LAB', capacity: 40, floor: 3, building: 'Block B', amenities: 'Oscilloscopes,Signal Generators,AC,Soldering Stations', available: true },
  ];

  for (const room of rooms) {
    await prisma.room.create({ data: room });
  }

  const bookings = [
    { id: 'b1', roomId: 'r1', roomName: 'Lecture Hall A-101', bookedByName: 'Dr. Amit Singh', date: toDate('2026-04-25'), startTime: '09:00', endTime: '11:00', purpose: 'Data Structures Lecture', status: 'CONFIRMED' },
    { id: 'b2', roomId: 'r3', roomName: 'Seminar Hall C-301', bookedByName: 'Student Council', date: toDate('2026-04-25'), startTime: '14:00', endTime: '17:00', purpose: 'Tech Talk: Future of AI', status: 'CONFIRMED' },
    { id: 'b3', roomId: 'r5', roomName: 'Main Auditorium', bookedByName: 'Cultural Committee', date: toDate('2026-04-26'), startTime: '10:00', endTime: '16:00', purpose: 'Annual Cultural Fest Rehearsal', status: 'PENDING' },
  ];

  for (const booking of bookings) {
    await prisma.booking.create({ data: booking });
  }

  const grievances = [
    { id: 'g1', type: 'INFRASTRUCTURE', subject: 'Broken AC in Block B - Room 204', description: 'The air conditioning unit in Room 204, Block B has not been working for the past 2 weeks. Classes are becoming uncomfortable, especially during afternoon sessions.', priority: 'HIGH', status: 'IN_PROGRESS', submittedBy: 'Rahul Sharma', submitterRole: 'STUDENT', assignedTo: 'TEACHER', date: toDate('2026-04-20'), resolution: 'Maintenance team has been notified. Parts ordered, expected fix by April 28.', submitterId: 'STU001' },
    { id: 'g2', type: 'ACADEMIC', subject: 'Incorrect Internal Marks Posted', description: 'My internal assessment marks for CS301 - Database Management show 18/30 but I had scored 24/30 as per the returned answer sheets.', priority: 'MEDIUM', status: 'SUBMITTED', submittedBy: 'Priya Patel', submitterRole: 'STUDENT', assignedTo: 'TEACHER', date: toDate('2026-04-22') },
    { id: 'g3', type: 'ADMINISTRATIVE', subject: 'Scholarship Amount Not Credited', description: 'The merit scholarship amount of INR 25,000 for Spring 2026 has not been credited to my bank account despite approval confirmation 3 weeks ago.', priority: 'HIGH', status: 'IN_PROGRESS', submittedBy: 'Ankit Kumar', submitterRole: 'STUDENT', assignedTo: 'ADMIN', date: toDate('2026-04-18'), resolution: 'Finance department is processing. Expected credit within 5 business days.' },
    { id: 'g4', type: 'INFRASTRUCTURE', subject: 'Wi-Fi Connectivity Issues in Hostel Block 3', description: 'The Wi-Fi network in Hostel Block 3 (floors 2-4) has been extremely unreliable for the past month. Frequent disconnections making it impossible to attend online classes.', priority: 'CRITICAL', status: 'RESOLVED', submittedBy: 'Neha Gupta', submitterRole: 'STUDENT', assignedTo: 'ADMIN', date: toDate('2026-04-15'), resolution: 'New access points installed on all affected floors. Issue resolved as of April 22.' },
  ];

  for (const grievance of grievances) {
    await prisma.grievance.create({ data: grievance });
  }

  const schedule = [
    { id: 'SCH01', day: 'Monday', startTime: '09:00', endTime: '10:00', subject: 'Data Structures', courseCode: 'CS301', faculty: 'Dr. Rajesh Kumar', facultyId: 'TCH001', room: 'LH-A101', type: 'LECTURE', department: 'Computer Science', semester: 4, course: 'B.Tech CSE' },
    { id: 'SCH02', day: 'Monday', startTime: '10:15', endTime: '11:15', subject: 'Machine Learning', courseCode: 'CS402', faculty: 'Prof. Meena Iyer', facultyId: 'TCH002', room: 'LH-A102', type: 'LECTURE', department: 'Computer Science', semester: 4, course: 'B.Tech CSE' },
    { id: 'SCH03', day: 'Monday', startTime: '11:30', endTime: '13:00', subject: 'DSA Lab', courseCode: 'CS301L', faculty: 'Dr. Rajesh Kumar', facultyId: 'TCH001', room: 'Lab-C1', type: 'LAB', department: 'Computer Science', semester: 4, course: 'B.Tech CSE' },
    { id: 'SCH04', day: 'Tuesday', startTime: '09:00', endTime: '10:00', subject: 'Algorithms', courseCode: 'CS302', faculty: 'Dr. Rajesh Kumar', facultyId: 'TCH001', room: 'LH-A101', type: 'LECTURE', department: 'Computer Science', semester: 4, course: 'B.Tech CSE' },
    { id: 'SCH05', day: 'Tuesday', startTime: '10:15', endTime: '11:15', subject: 'Artificial Intelligence', courseCode: 'CS403', faculty: 'Prof. Meena Iyer', facultyId: 'TCH002', room: 'LH-A103', type: 'LECTURE', department: 'Computer Science', semester: 4, course: 'B.Tech CSE' },
    { id: 'SCH06', day: 'Tuesday', startTime: '14:00', endTime: '15:30', subject: 'ML Lab', courseCode: 'CS402L', faculty: 'Prof. Meena Iyer', facultyId: 'TCH002', room: 'Lab-C2', type: 'LAB', department: 'Computer Science', semester: 4, course: 'B.Tech CSE' },
    { id: 'SCH07', day: 'Wednesday', startTime: '09:00', endTime: '10:00', subject: 'Data Structures', courseCode: 'CS301', faculty: 'Dr. Rajesh Kumar', facultyId: 'TCH001', room: 'LH-A101', type: 'LECTURE', department: 'Computer Science', semester: 4, course: 'B.Tech CSE' },
    { id: 'SCH08', day: 'Wednesday', startTime: '10:15', endTime: '11:15', subject: 'Machine Learning', courseCode: 'CS402', faculty: 'Prof. Meena Iyer', facultyId: 'TCH002', room: 'LH-A102', type: 'LECTURE', department: 'Computer Science', semester: 4, course: 'B.Tech CSE' },
    { id: 'SCH09', day: 'Wednesday', startTime: '11:30', endTime: '12:30', subject: 'Digital Electronics', courseCode: 'EC201', faculty: 'Dr. Sanjay Verma', facultyId: 'TCH003', room: 'LH-B201', type: 'LECTURE', department: 'Electronics', semester: 6, course: 'B.Tech ECE' },
    { id: 'SCH10', day: 'Thursday', startTime: '09:00', endTime: '10:00', subject: 'Algorithms', courseCode: 'CS302', faculty: 'Dr. Rajesh Kumar', facultyId: 'TCH001', room: 'LH-A101', type: 'LECTURE', department: 'Computer Science', semester: 4, course: 'B.Tech CSE' },
    { id: 'SCH11', day: 'Thursday', startTime: '10:15', endTime: '11:15', subject: 'Signals & Systems', courseCode: 'EC202', faculty: 'Dr. Sanjay Verma', facultyId: 'TCH003', room: 'LH-B202', type: 'LECTURE', department: 'Electronics', semester: 6, course: 'B.Tech ECE' },
    { id: 'SCH12', day: 'Thursday', startTime: '14:00', endTime: '15:30', subject: 'DSA Tutorial', courseCode: 'CS301T', faculty: 'Dr. Rajesh Kumar', facultyId: 'TCH001', room: 'LH-A104', type: 'TUTORIAL', department: 'Computer Science', semester: 4, course: 'B.Tech CSE' },
    { id: 'SCH13', day: 'Friday', startTime: '09:00', endTime: '10:00', subject: 'Artificial Intelligence', courseCode: 'CS403', faculty: 'Prof. Meena Iyer', facultyId: 'TCH002', room: 'LH-A103', type: 'LECTURE', department: 'Computer Science', semester: 4, course: 'B.Tech CSE' },
    { id: 'SCH14', day: 'Friday', startTime: '10:15', endTime: '12:15', subject: 'DE Lab', courseCode: 'EC201L', faculty: 'Dr. Sanjay Verma', facultyId: 'TCH003', room: 'Lab-E1', type: 'LAB', department: 'Electronics', semester: 6, course: 'B.Tech ECE' },
    { id: 'SCH15', day: 'Friday', startTime: '14:00', endTime: '15:00', subject: 'Seminar', courseCode: 'CS499', faculty: 'Prof. Meena Iyer', facultyId: 'TCH002', room: 'Seminar Hall', type: 'SEMINAR', department: 'Computer Science', semester: 4, course: 'B.Tech CSE' },
  ];

  for (const slot of schedule) {
    await prisma.scheduleSlot.create({ data: { ...slot, day: day(slot.day) } });
  }

  const cse = await prisma.department.create({
    data: {
      id: 'DEPT01',
      name: 'Computer Science',
      code: 'CSE',
      course: 'B.Tech CSE',
      totalSemesters: 8,
      hod: 'Dr. Rajesh Kumar',
    },
  });

  const ece = await prisma.department.create({
    data: {
      id: 'DEPT02',
      name: 'Electronics',
      code: 'ECE',
      course: 'B.Tech ECE',
      totalSemesters: 8,
      hod: 'Dr. Sanjay Verma',
    },
  });

  const cseSem1 = await prisma.departmentSemester.create({ data: { departmentId: cse.id, semester: 1 } });
  const cseSem4 = await prisma.departmentSemester.create({ data: { departmentId: cse.id, semester: 4 } });
  const eceSem6 = await prisma.departmentSemester.create({ data: { departmentId: ece.id, semester: 6 } });

  const subjects = [
    { semesterId: cseSem1.id, id: 'CS101', name: 'Programming in C', code: 'CS101', credits: 4, type: 'CORE' },
    { semesterId: cseSem1.id, id: 'CS102', name: 'Digital Logic', code: 'CS102', credits: 3, type: 'CORE' },
    { semesterId: cseSem1.id, id: 'CS101L', name: 'C Programming Lab', code: 'CS101L', credits: 2, type: 'LAB' },
    { semesterId: cseSem4.id, id: 'CS301', name: 'Data Structures', code: 'CS301', credits: 4, type: 'CORE' },
    { semesterId: cseSem4.id, id: 'CS302', name: 'Algorithms', code: 'CS302', credits: 4, type: 'CORE' },
    { semesterId: cseSem4.id, id: 'CS301L', name: 'DSA Lab', code: 'CS301L', credits: 2, type: 'LAB' },
    { semesterId: cseSem4.id, id: 'CS301T', name: 'DSA Tutorial', code: 'CS301T', credits: 1, type: 'CORE' },
    { semesterId: cseSem4.id, id: 'CS402', name: 'Machine Learning', code: 'CS402', credits: 3, type: 'ELECTIVE' },
    { semesterId: cseSem4.id, id: 'CS402L', name: 'ML Lab', code: 'CS402L', credits: 2, type: 'LAB' },
    { semesterId: cseSem4.id, id: 'CS403', name: 'Artificial Intelligence', code: 'CS403', credits: 3, type: 'ELECTIVE' },
    { semesterId: cseSem4.id, id: 'CS499', name: 'Seminar', code: 'CS499', credits: 1, type: 'PROJECT' },
    { semesterId: eceSem6.id, id: 'EC201', name: 'Digital Electronics', code: 'EC201', credits: 4, type: 'CORE' },
    { semesterId: eceSem6.id, id: 'EC202', name: 'Signals & Systems', code: 'EC202', credits: 4, type: 'CORE' },
    { semesterId: eceSem6.id, id: 'EC201L', name: 'DE Lab', code: 'EC201L', credits: 2, type: 'LAB' },
  ];

  for (const subject of subjects) {
    await prisma.departmentSubject.create({ data: subject });
  }

  const notifications = [
    { title: 'Grievance Updated', desc: 'Your grievance #102 is marked resolved.', date: new Date('2026-04-24T07:00:00.000Z'), type: 'SUCCESS', userId: 'ADMIN001' },
    { title: 'Room Booking Confirmed', desc: 'Lecture Hall A booked for tomorrow at 10:00 AM.', date: new Date('2026-04-23T09:00:00.000Z'), type: 'INFO', userId: 'TCH001' },
    { title: 'Assignment Due', desc: 'CS301 Data Structures assignment is due tomorrow.', date: new Date('2026-04-23T14:30:00.000Z'), type: 'WARNING', userId: 'STU001' },
  ];

  for (const notification of notifications) {
    await prisma.notification.create({ data: notification });
  }

  const ay2026 = await prisma.academicYear.create({
    data: {
      id: 'ay-2026',
      label: '2026-2027',
      startDate: toDate('2026-07-21'),
      endDate: toDate('2027-07-20'),
      isCurrent: true,
    },
  });

  const ay2025 = await prisma.academicYear.create({
    data: {
      id: 'ay-2025',
      label: '2025-2026',
      startDate: toDate('2025-07-22'),
      endDate: toDate('2026-07-20'),
      isCurrent: false,
    },
  });

  const sem2026Odd = await prisma.academicSemester.create({ data: { yearId: ay2026.id, semNum: 1, startDate: toDate('2026-07-21'), endDate: toDate('2026-11-30') } });
  const sem2026Even = await prisma.academicSemester.create({ data: { yearId: ay2026.id, semNum: 2, startDate: toDate('2027-01-03'), endDate: toDate('2027-05-31') } });
  const sem2025Odd = await prisma.academicSemester.create({ data: { yearId: ay2025.id, semNum: 1, startDate: toDate('2025-07-22'), endDate: toDate('2025-11-28') } });
  const sem2025Even = await prisma.academicSemester.create({ data: { yearId: ay2025.id, semNum: 2, startDate: toDate('2026-01-05'), endDate: toDate('2026-05-30') } });

  const events = [
    { id: 'e1', semesterId: sem2026Odd.id, title: 'Semester Begins', startDate: '2026-07-21', type: 'academic', description: 'All departments commence classes' },
    { id: 'e2', semesterId: sem2026Odd.id, title: 'Last Date for Admission', startDate: '2026-08-05', type: 'registration', description: 'Final date for new student enrollment' },
    { id: 'e3', semesterId: sem2026Odd.id, title: 'Mid-Sem Exams', startDate: '2026-09-15', endDate: '2026-09-25', type: 'exam', description: 'Internal assessment for all semesters' },
    { id: 'e4', semesterId: sem2026Odd.id, title: 'Independence Day', startDate: '2026-08-15', type: 'holiday', description: 'National Holiday' },
    { id: 'e5', semesterId: sem2026Odd.id, title: 'Tech Symposium', startDate: '2026-10-10', endDate: '2026-10-12', type: 'event', description: 'Annual inter-college technical event' },
    { id: 'e6', semesterId: sem2026Odd.id, title: 'End-Sem Exams', startDate: '2026-11-10', endDate: '2026-11-30', type: 'exam', description: 'Final exams for Odd Semester' },
    { id: 'e7', semesterId: sem2026Even.id, title: 'Semester Begins', startDate: '2027-01-03', type: 'academic', description: 'Even semester commences' },
    { id: 'e8', semesterId: sem2026Even.id, title: 'Republic Day', startDate: '2027-01-26', type: 'holiday', description: 'National Holiday' },
    { id: 'e9', semesterId: sem2026Even.id, title: 'Mid-Sem Exams', startDate: '2027-03-03', endDate: '2027-03-12', type: 'exam', description: 'Internal assessment' },
    { id: 'e10', semesterId: sem2026Even.id, title: 'Cultural Fest', startDate: '2027-02-20', endDate: '2027-02-22', type: 'event', description: 'Annual cultural event' },
    { id: 'e11', semesterId: sem2026Even.id, title: 'End-Sem Exams', startDate: '2027-04-28', endDate: '2027-05-20', type: 'exam', description: 'Final exams for Even Semester' },
    { id: 'e12', semesterId: sem2026Even.id, title: 'Summer Break', startDate: '2027-05-21', endDate: '2027-07-20', type: 'holiday', description: 'Annual summer vacation' },
    { id: 'p1', semesterId: sem2025Odd.id, title: 'Semester Began', startDate: '2025-07-22', type: 'academic' },
    { id: 'p2', semesterId: sem2025Odd.id, title: 'Mid-Sem Exams', startDate: '2025-09-16', endDate: '2025-09-26', type: 'exam' },
    { id: 'p3', semesterId: sem2025Odd.id, title: 'Independence Day', startDate: '2025-08-15', type: 'holiday' },
    { id: 'p4', semesterId: sem2025Odd.id, title: 'Tech Symposium', startDate: '2025-10-08', endDate: '2025-10-10', type: 'event' },
    { id: 'p5', semesterId: sem2025Odd.id, title: 'End-Sem Exams', startDate: '2025-11-08', endDate: '2025-11-28', type: 'exam' },
    { id: 'p6', semesterId: sem2025Even.id, title: 'Semester Began', startDate: '2026-01-05', type: 'academic' },
    { id: 'p7', semesterId: sem2025Even.id, title: 'Mid-Sem Exams', startDate: '2026-03-02', endDate: '2026-03-11', type: 'exam' },
    { id: 'p8', semesterId: sem2025Even.id, title: 'End-Sem Exams', startDate: '2026-04-27', endDate: '2026-05-18', type: 'exam' },
  ];

  for (const event of events) {
    await prisma.calendarEvent.create({
      data: {
        id: event.id,
        semesterId: event.semesterId,
        title: event.title,
        description: event.description,
        startDate: toDate(event.startDate),
        endDate: event.endDate ? toDate(event.endDate) : undefined,
        type: event.type,
      },
    });
  }

  const seededSemesters = await prisma.academicSemester.findMany();
  for (const holiday of WEST_BENGAL_GOVERNMENT_HOLIDAYS_2026) {
    const startDate = toDate(holiday.date);
    const semester = seededSemesters.find(
      (candidate) =>
        startDate.getTime() >= candidate.startDate.getTime() &&
        startDate.getTime() <= candidate.endDate.getTime(),
    );

    if (!semester) continue;

    const existing = await prisma.calendarEvent.findFirst({
      where: {
        semesterId: semester.id,
        title: holiday.title,
        startDate,
        type: 'holiday',
      },
    });

    if (existing) {
      await prisma.calendarEvent.update({
        where: { id: existing.id },
        data: { description: holiday.description },
      });
      continue;
    }

    await prisma.calendarEvent.create({
      data: {
        semesterId: semester.id,
        title: holiday.title,
        description: holiday.description,
        startDate,
        type: 'holiday',
      },
    });
  }

  console.log('Database seeded successfully');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

