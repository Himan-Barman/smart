export interface SubjectItem {
  name: string;
  code: string;
  credits: number;
  type: 'core' | 'elective' | 'lab' | 'project';
}

export interface SemesterData {
  semester: number;
  subjects: SubjectItem[];
}

export interface FacultyMember {
  name: string;
  designation: string;
  specialization: string;
}

export interface CourseInfo {
  name: string;
  abbreviation: string;
  duration: string;
  semesters: number;
  icon: string;
  description: string;
  eligibility: string;
  highlights: string[];
  careerPaths: string[];
  totalCredits: number;
  annualFee: string;
  accreditation: string;
  faculty: FacultyMember[];
  semesterData: SemesterData[];
}

export interface CourseCategory {
  id: string;
  title: string;
  emoji: string;
  tagline: string;
  color: string;
  courses: CourseInfo[];
}

// Helper to generate sample semesters
const genSemesters = (count: number, prefix: string): SemesterData[] =>
  Array.from({ length: Math.min(count, 4) }, (_, i) => ({
    semester: i + 1,
    subjects: [
      { name: `${prefix} Fundamentals ${i + 1}`, code: `${prefix.slice(0,2).toUpperCase()}${(i+1)*100+1}`, credits: 4, type: 'core' as const },
      { name: `${prefix} Theory ${i + 1}`, code: `${prefix.slice(0,2).toUpperCase()}${(i+1)*100+2}`, credits: 3, type: 'core' as const },
      { name: `Applied ${prefix} ${i + 1}`, code: `${prefix.slice(0,2).toUpperCase()}${(i+1)*100+3}`, credits: 3, type: 'elective' as const },
      { name: `${prefix} Lab ${i + 1}`, code: `${prefix.slice(0,2).toUpperCase()}${(i+1)*100+4}L`, credits: 2, type: 'lab' as const },
      { name: i >= 2 ? `${prefix} Project ${i + 1}` : `${prefix} Practical ${i + 1}`, code: `${prefix.slice(0,2).toUpperCase()}${(i+1)*100+5}`, credits: 2, type: i >= 2 ? 'project' as const : 'lab' as const },
    ],
  }));

const genFaculty = (dept: string): FacultyMember[] => [
  { name: `Dr. ${dept === 'CS' ? 'Rajesh Kumar' : dept === 'BU' ? 'Neha Sharma' : 'Amit Verma'}`, designation: 'Professor & HOD', specialization: `${dept} Research` },
  { name: `Prof. ${dept === 'CS' ? 'Meena Iyer' : dept === 'BU' ? 'Ravi Patel' : 'Sunita Roy'}`, designation: 'Associate Professor', specialization: `Advanced ${dept}` },
  { name: `Dr. ${dept === 'CS' ? 'Sanjay Verma' : dept === 'BU' ? 'Priya Gupta' : 'Karan Singh'}`, designation: 'Assistant Professor', specialization: `Applied ${dept}` },
  { name: `Prof. ${dept === 'CS' ? 'Anita Das' : dept === 'BU' ? 'Vikram Shah' : 'Deepa Nair'}`, designation: 'Assistant Professor', specialization: `${dept} Innovation` },
];

const mkCourse = (name: string, abbr: string, dur: string, sem: number, icon: string, desc: string, elig: string, hl: string[], cp: string[], credits: number, fee: string, acc: string, deptKey: string): CourseInfo => ({
  name, abbreviation: abbr, duration: dur, semesters: sem, icon, description: desc, eligibility: elig, highlights: hl, careerPaths: cp, totalCredits: credits, annualFee: fee, accreditation: acc, faculty: genFaculty(deptKey), semesterData: genSemesters(sem, abbr.replace(/[^a-zA-Z]/g, '')),
});

export const courseCategories: CourseCategory[] = [
  {
    id: 'ug', title: 'Undergraduate (UG) Courses', emoji: 'ug',
    tagline: 'Foundation of knowledge — the first step of the journey', color: '#3b6cf5',
    courses: [
      mkCourse('Bachelor of Architecture', 'B.Arch', '5 Years', 10, 'arch', 'A professional degree program focused on architectural design, urban planning, and sustainable construction.', '10+2 with Mathematics, minimum 50% marks, valid NATA score', ['5-year professional program', 'NATA accredited', 'Studio-based learning', 'Industry internships'], ['Architect', 'Urban Planner', 'Interior Designer', 'Landscape Architect', 'Construction Manager'], 250, '₹1,80,000/year', 'COA Approved', 'AR'),
      mkCourse('Bachelor of Business Administration', 'BBA', '3 Years', 6, 'biz', 'Comprehensive undergraduate program in business management, entrepreneurship, and organizational leadership.', '10+2 from recognized board with minimum 50% marks', ['Industry-integrated curriculum', 'Live projects', 'Management internships', 'Entrepreneurship incubator'], ['Business Manager', 'Marketing Executive', 'HR Manager', 'Entrepreneur', 'Business Analyst'], 132, '₹1,20,000/year', 'UGC Approved', 'BU'),
      mkCourse('Bachelor of Business Administration (Hons.)', 'BBA Hons.', '4 Years', 8, 'biz', 'Honours program with advanced specialization tracks in finance, marketing, and international business.', '10+2 from recognized board with minimum 55% marks', ['Research-oriented', 'Dual specialization', 'Global exchange programs', 'Industry mentorship'], ['Senior Analyst', 'Investment Banker', 'Brand Manager', 'Strategy Consultant', 'CFO Track'], 180, '₹1,40,000/year', 'UGC Approved', 'BU'),
      mkCourse('Bachelor of Computer Application', 'BCA', '3 Years', 6, 'cs', 'Undergraduate program in computer science and application development with hands-on programming skills.', '10+2 with Mathematics or Computer Science, minimum 50% marks', ['Programming-intensive', 'Cloud & AI modules', 'Hackathon culture', 'Placement support'], ['Software Developer', 'Web Developer', 'System Administrator', 'Database Admin', 'IT Consultant'], 132, '₹1,00,000/year', 'UGC Approved', 'CS'),
      mkCourse('Bachelor of Computer Application (Hons.)', 'BCA Hons.', '4 Years', 8, 'cs', 'Honours program with deep specialization in AI, cybersecurity, and full-stack development.', '10+2 with Mathematics, minimum 55% marks', ['AI & ML specialization', 'Research projects', 'Industry certifications', 'Advanced labs'], ['AI Engineer', 'Full-Stack Developer', 'Security Analyst', 'Data Scientist', 'Tech Lead'], 180, '₹1,20,000/year', 'UGC Approved', 'CS'),
      mkCourse('Bachelor of Design', 'B.Des', '4 Years', 8, 'design', 'Creative program covering UI/UX, product design, visual communication, and design thinking.', '10+2 from recognized board, valid design aptitude test', ['Design thinking methodology', 'Studio culture', 'Industry portfolio', 'International exposure'], ['UI/UX Designer', 'Product Designer', 'Graphic Designer', 'Design Researcher', 'Creative Director'], 160, '₹1,50,000/year', 'UGC Approved', 'DE'),
      mkCourse('Bachelor of Laws', 'LL.B', '3 Years', 6, 'law', 'Professional law degree covering constitutional, criminal, civil, and corporate law.', 'Graduation in any discipline with minimum 45% marks', ['Moot court training', 'Legal aid clinics', 'Court visits', 'Internship with law firms'], ['Advocate', 'Legal Advisor', 'Judge', 'Corporate Lawyer', 'Legal Researcher'], 132, '₹90,000/year', 'BCI Approved', 'LW'),
      mkCourse('Bachelor of Pharmacy', 'B.Pharm', '4 Years', 8, 'pharma', 'Professional program in pharmaceutical sciences, drug development, and clinical pharmacy.', '10+2 with PCM/PCB, minimum 50% marks', ['PCI accredited', 'Clinical training', 'Research labs', 'Industry exposure'], ['Pharmacist', 'Drug Inspector', 'Clinical Researcher', 'Pharma Sales', 'Quality Analyst'], 180, '₹1,60,000/year', 'PCI Approved', 'PH'),
      mkCourse('Bachelor of Physiotherapy', 'BPT', '4 Years + 6 Months Internship', 8, 'physio', 'Healthcare program focused on physical rehabilitation, sports medicine, and therapeutic sciences.', '10+2 with PCB, minimum 50% marks', ['Clinical rotations', 'Hospital internship', 'Sports medicine', 'Rehabilitation focus'], ['Physiotherapist', 'Sports Therapist', 'Rehabilitation Specialist', 'Clinic Owner', 'Research Associate'], 180, '₹1,40,000/year', 'IAP Approved', 'PT'),
      mkCourse('Bachelor of Science (Nursing)', 'B.Sc Nursing', '4 Years', 8, 'nursing', 'Professional nursing program with clinical training in hospitals and community health centers.', '10+2 with PCB, minimum 45% marks, age 17-35 years', ['Hospital clinical training', 'Community health', 'ICU & OT exposure', 'Government job eligibility'], ['Staff Nurse', 'Nursing Supervisor', 'Community Health Officer', 'Nursing Educator', 'ICU Specialist'], 160, '₹1,20,000/year', 'INC Approved', 'NU'),
      mkCourse('Bachelor of Technology', 'B.Tech', '4 Years', 8, 'eng', 'Premier engineering program with specializations in CSE, ECE, ME, CE, and emerging technologies.', '10+2 with PCM, minimum 60% marks, valid JEE/entrance exam', ['AICTE approved', 'Research-driven', 'Industry partnerships', 'Smart labs & workshops'], ['Software Engineer', 'Hardware Engineer', 'Data Scientist', 'System Architect', 'Tech Entrepreneur'], 200, '₹1,80,000/year', 'AICTE & NBA', 'CS'),
      mkCourse('Bachelor of Technology (Hons.)', 'B.Tech Hons.', '4 Years', 8, 'eng', 'Honours engineering with research thesis and advanced specialization in cutting-edge domains.', '10+2 with PCM, minimum 65% marks, valid JEE/entrance exam', ['Research thesis required', 'Advanced specialization', 'Industry co-ops', 'Publication support'], ['Research Engineer', 'ML Engineer', 'Tech Architect', 'R&D Scientist', 'CTO Track'], 220, '₹2,00,000/year', 'AICTE & NBA', 'CS'),
    ],
  },
  {
    id: 'pg', title: 'Postgraduate (PG) Courses', emoji: 'pg',
    tagline: 'Where specialization sharpens the mind into a tool of mastery', color: '#6c52e8',
    courses: [
      mkCourse('Master of Business Administration', 'MBA', '2 Years', 4, 'mba', 'Advanced management program with specializations in Finance, Marketing, HR, and Operations.', 'Graduation with 50% marks, valid CAT/MAT/XAT score', ['Case-study pedagogy', 'Corporate immersion', 'Dual specialization', 'Global exposure'], ['CEO', 'CFO', 'Management Consultant', 'Investment Banker', 'Product Manager'], 120, '₹2,50,000/year', 'AICTE Approved', 'BU'),
      mkCourse('Master of Computer Application', 'MCA', '2 Years', 4, 'cs', 'Postgraduate program in advanced computing, software engineering, and emerging technologies.', 'BCA/B.Sc CS or Graduation with Mathematics, minimum 55% marks', ['Advanced programming', 'Cloud architecture', 'AI/ML focus', 'Industry projects'], ['Senior Developer', 'Solution Architect', 'DevOps Engineer', 'Tech Manager', 'AI Researcher'], 100, '₹1,40,000/year', 'AICTE Approved', 'CS'),
      mkCourse('Master of Laws', 'LL.M', '1 Year', 2, '⚖️', 'Specialized postgraduate law program in Constitutional, Corporate, or International Law.', 'LL.B with minimum 50% marks', ['Specialization tracks', 'Research dissertation', 'Judicial exam prep', 'International law focus'], ['Senior Advocate', 'Judge', 'Legal Scholar', 'Policy Advisor', 'Corporate Counsel'], 60, '₹1,10,000/year', 'BCI Approved', 'LW'),
      mkCourse('Master of Technology', 'M.Tech', '2 Years', 4, 'research', 'Research-intensive engineering postgraduate program with thesis and advanced labs.', 'B.Tech/BE with 60% marks, valid GATE score preferred', ['Thesis-based', 'GATE scholarships', 'Research publications', 'Industry R&D collaborations'], ['Research Scientist', 'Principal Engineer', 'R&D Manager', 'Professor', 'Tech Strategist'], 100, '₹1,60,000/year', 'AICTE Approved', 'CS'),
    ],
  },
  {
    id: 'diploma', title: 'Diploma Courses', emoji: 'diploma',
    tagline: 'Skill-oriented, practical pathways to professional life', color: '#1a9d5c',
    courses: [
      mkCourse('Diploma in Engineering', 'Diploma', '3 Years', 6, 'diploma', 'Polytechnic program building hands-on engineering skills in mechanical, electrical, and civil trades.', '10th pass with minimum 35% marks', ['Practical-focused', 'Workshop training', 'Lateral entry to B.Tech', 'Industry apprenticeships'], ['Junior Engineer', 'Technician', 'Site Supervisor', 'Maintenance Engineer', 'Workshop Manager'], 120, '₹60,000/year', 'AICTE Approved', 'EN'),
      mkCourse('Diploma in General Nursing and Midwifery', 'GNM', '3.5 Years', 6, '🩺', 'Nursing diploma with clinical training in hospitals, community health, and midwifery.', '10+2 with Science, minimum 40% marks, age 17-35', ['Hospital training', 'Midwifery specialization', 'Community posting', 'Government eligibility'], ['Staff Nurse', 'Midwife', 'Community Health Worker', 'ANM Supervisor', 'Nursing Assistant'], 100, '₹70,000/year', 'INC Approved', 'NU'),
      mkCourse('Diploma in Pharmacy', 'D.Pharm', '2 Years', 4, '💊', 'Pharmacy diploma focused on dispensing, drug formulation, and pharmaceutical retail management.', '10+2 with PCM/PCB, minimum 50% marks', ['PCI accredited', 'Pharmacy practice', 'Hospital training', 'Retail pharmacy'], ['Pharmacist', 'Drug Store Manager', 'Pharma Sales Rep', 'Lab Technician', 'QC Inspector'], 80, '₹80,000/year', 'PCI Approved', 'PH'),
    ],
  },
  {
    id: 'integrated', title: 'Integrated Courses', emoji: 'integrated',
    tagline: 'A seamless bridge — saving time, strengthening continuity', color: '#c49520',
    courses: [
      mkCourse('Bachelor of Arts + Bachelor of Laws', 'B.A.LL.B', '5 Years', 10, '⚖️', 'Integrated law program combining arts and legal studies for comprehensive legal education.', '10+2 with 45% marks, valid CLAT/entrance exam', ['Dual degree', 'Moot court', 'Legal research', '5-year integrated'], ['Advocate', 'Legal Advisor', 'Judge', 'Policy Maker', 'Diplomat'], 280, '₹1,20,000/year', 'BCI Approved', 'LW'),
      mkCourse('Bachelor of Business Administration + Bachelor of Laws', 'BBA.LL.B', '5 Years', 10, '⚖️', 'Integrated program merging business management with legal expertise for corporate law careers.', '10+2 with 45% marks, valid entrance exam', ['Business + Law dual degree', 'Corporate law focus', 'Industry internships', 'Placement assistance'], ['Corporate Lawyer', 'Legal Manager', 'Compliance Officer', 'Business Consultant', 'IP Attorney'], 280, '₹1,30,000/year', 'BCI Approved', 'LW'),
      mkCourse('Bachelor of Commerce + Bachelor of Laws', 'B.Com.LL.B', '5 Years', 10, '⚖️', 'Integrated commerce and law program preparing students for taxation, corporate, and financial law.', '10+2 with Commerce, 45% marks, valid entrance exam', ['Tax law specialization', 'Financial regulation', 'Commerce integration', 'Dual expertise'], ['Tax Lawyer', 'Financial Regulator', 'Company Secretary', 'Auditor-Lawyer', 'Banking Law Specialist'], 280, '₹1,25,000/year', 'BCI Approved', 'LW'),
      mkCourse('BBA + MBA', 'BBA + MBA', '5 Years', 10, '💼', 'Seamless integrated business program from undergraduate to postgraduate management.', '10+2 with 55% marks', ['Seamless 5-year path', 'Early specialization', 'Corporate mentorship', 'Global exchange'], ['Business Leader', 'Management Consultant', 'Startup Founder', 'Brand Director', 'VP Operations'], 300, '₹1,50,000/year', 'UGC Approved', 'BU'),
      mkCourse('BCA + MCA', 'BCA + MCA', '5 Years', 10, '💻', 'Integrated computing program from fundamentals to advanced software engineering and research.', '10+2 with Mathematics, 55% marks', ['Continuous 5-year track', 'Advanced CS depth', 'Research opportunity', 'Industry placement'], ['Senior Developer', 'Tech Architect', 'AI Specialist', 'Cloud Engineer', 'CTO Path'], 280, '₹1,20,000/year', 'UGC Approved', 'CS'),
      mkCourse('B.Tech + MBA', 'B.Tech + MBA', '5 Years', 10, 'mba', 'Integrated engineering and management program for tech-savvy business leaders.', '10+2 with PCM, 60% marks, valid entrance exam', ['Engineering + MBA', 'Tech management', 'Dual competency', 'Industry leadership'], ['Tech Manager', 'Product Manager', 'IT Director', 'Management Consultant', 'Startup Founder'], 320, '₹2,00,000/year', 'AICTE Approved', 'CS'),
      mkCourse('B.Tech + M.Tech', 'B.Tech + M.Tech', '5 Years', 10, 'research', 'Integrated engineering program leading directly to a masters in technology with research focus.', '10+2 with PCM, 65% marks, valid JEE score', ['Research-driven', 'GATE exemption', 'Publication track', 'Advanced labs'], ['Research Engineer', 'R&D Scientist', 'Principal Engineer', 'Professor', 'Tech Innovator'], 320, '₹1,90,000/year', 'AICTE Approved', 'CS'),
      mkCourse('B.Tech + M.Tech + Ph.D', 'B.Tech + M.Tech + Ph.D', '8+ Years', 16, 'phd', 'The ultimate integrated program from engineering to doctoral research for future academicians.', '10+2 with PCM, 70% marks, exceptional academic record', ['Direct PhD path', 'Full scholarship eligible', 'International research', 'Teaching assistantship'], ['Professor', 'Chief Scientist', 'Research Director', 'Lab Head', 'Policy Scientist'], 500, '₹2,20,000/year', 'AICTE & UGC', 'CS'),
      mkCourse('MCA + Ph.D', 'MCA + Ph.D', '5+ Years', 10, 'lab', 'Integrated postgraduate to doctoral program in advanced computing and research.', 'BCA/B.Sc CS with 60% marks', ['Direct doctoral path', 'Research fellowship', 'Advanced computing', 'Publication mandate'], ['CS Professor', 'Research Scientist', 'Lab Director', 'AI Researcher', 'Tech Strategist'], 300, '₹1,50,000/year', 'UGC Approved', 'CS'),
      mkCourse('M.Tech + Ph.D', 'M.Tech + Ph.D', '5+ Years', 10, 'research', 'Integrated masters to doctoral engineering research program with industry collaboration.', 'B.Tech/BE with 65% marks, valid GATE score', ['GATE scholarship', 'Industry co-labs', 'Research immersion', 'Conference funding'], ['Principal Scientist', 'R&D Director', 'Professor', 'Chief Engineer', 'Innovation Head'], 300, '₹1,80,000/year', 'AICTE & UGC', 'CS'),
    ],
  },
  {
    id: 'lateral', title: 'Lateral Entry Programs', emoji: 'lateral',
    tagline: 'For those who join the river midway, yet reach the same ocean', color: '#1596c4',
    courses: [
      mkCourse('Bachelor of Technology (Lateral)', 'B.Tech Lateral', '3 Years', 6, '⚙️', 'Direct 2nd year entry for diploma holders into the B.Tech engineering program.', 'Diploma in Engineering with 60% marks', ['Skip 1st year', 'Diploma credit transfer', 'Same B.Tech degree', 'Full placement access'], ['Software Engineer', 'Hardware Engineer', 'Project Manager', 'System Analyst', 'Tech Lead'], 160, '₹1,80,000/year', 'AICTE Approved', 'CS'),
      mkCourse('B.Tech + MBA (Lateral)', 'B.Tech + MBA Lateral', '4 Years', 8, 'mba', 'Lateral entry into the integrated engineering and management program.', 'Diploma in Engineering with 60% marks', ['Dual degree in 4 years', 'Tech + business skills', 'Management capstone', 'Industry mentors'], ['Tech Manager', 'Product Owner', 'Business Analyst', 'Operations Head', 'Entrepreneur'], 240, '₹2,00,000/year', 'AICTE Approved', 'CS'),
      mkCourse('B.Tech + M.Tech (Lateral)', 'B.Tech + M.Tech Lateral', '4 Years', 8, 'research', 'Lateral entry into the integrated engineering and research program.', 'Diploma in Engineering with 65% marks', ['Research focus from day one', 'GATE preparation', 'Lab-intensive', 'Thesis track'], ['Research Engineer', 'R&D Specialist', 'Senior Engineer', 'Tech Consultant', 'Professor'], 240, '₹1,90,000/year', 'AICTE Approved', 'CS'),
      mkCourse('Diploma + B.Tech', 'Diploma + B.Tech', '4 Years', 8, 'diploma', 'Combined diploma and engineering degree for a complete technical education journey.', '10th pass with 35% marks', ['Complete technical path', 'Diploma to degree', 'Workshop + lab training', 'Industry-ready'], ['Engineer', 'Technical Manager', 'Site Engineer', 'Quality Engineer', 'Process Engineer'], 200, '₹1,00,000/year', 'AICTE Approved', 'EN'),
    ],
  },
];
