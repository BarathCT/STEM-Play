import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { performance } from 'perf_hooks';

// Models
import ClassModel from './src/models/Class.js';
import User from './src/models/User.js';

// Configuration
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/userManagementDB';
const DB_NAME = MONGO_URI.split('/').pop();

// School data configuration - Simple passwords
const TEACHER_PASSWORD = 'teacher';
const STUDENT_PASSWORD = 'student';
const MIN_STUDENTS = 35;
const MAX_STUDENTS = 50;

// CLI flags
const RESET = process.argv.includes('--reset');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');

// School structure
const GRADES = [6, 7, 8, 9, 10, 11, 12]; // 7 grades
const SECTIONS = ['A', 'B', 'C', 'D', 'E']; // 5 sections each
const TOTAL_CLASSES = GRADES.length * SECTIONS.length; // 35 classes
const TOTAL_TEACHERS = TOTAL_CLASSES; // 1 teacher per class-section = 35 teachers

// Name generators
const TEACHER_TITLES = ['Mr.', 'Ms.', 'Mrs.', 'Dr.'];
const FIRST_NAMES = [
  'Rajesh', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Kavya', 'Suresh', 'Meera', 'Ravi', 'Divya',
  'Kiran', 'Pooja', 'Manoj', 'Nisha', 'Ajay', 'Sunita', 'Deepak', 'Rekha', 'Sanjay', 'Anita',
  'Rohit', 'Geeta', 'Arun', 'Lata', 'Ramesh', 'Usha', 'Vinod', 'Shanti', 'Prakash', 'Sita',
  'Naveen', 'Maya', 'Kishore', 'Radha', 'Mahesh', 'Lakshmi', 'Ganesh', 'Parvati', 'Sunil', 'Devi'
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Shah', 'Jain', 'Agarwal', 'Mehta', 'Reddy',
  'Nair', 'Rao', 'Iyer', 'Menon', 'Pillai', 'Chandra', 'Prasad', 'Sinha', 'Mishra', 'Tiwari',
  'Pandey', 'Saxena', 'Verma', 'Shukla', 'Dubey', 'Joshi', 'Bhatt', 'Trivedi', 'Desai', 'Modi'
];

// Utility functions
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generateName = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
const generateTeacherName = () => `${pick(TEACHER_TITLES)} ${pick(LAST_NAMES)}`;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Gmail format email generators
const makeTeacherEmail = (grade, section) => {
  const lastName = pick(LAST_NAMES).toLowerCase();
  const randomNum = random(10, 99);
  return `${lastName}.teacher${grade}${section.toLowerCase()}${randomNum}@gmail.com`;
};

const makeParentEmail = (grade, section, studentNum) => {
  const lastName = pick(LAST_NAMES).toLowerCase();
  const randomNum = random(100, 999);
  return `${lastName}.parent${grade}${section.toLowerCase()}${String(studentNum).padStart(2, '0')}${randomNum}@gmail.com`;
};

const makeStaffId = (grade, section) => `T${grade}${section}`;
const makeRegisterId = (grade, section, studentNum) => 
  `${grade}${section}${String(studentNum).padStart(3, '0')}`;

// Logging utilities
const log = (...args) => console.log(...args);
const logVerbose = (...args) => VERBOSE && console.log('  ', ...args);
const logProgress = (current, total, label) => {
  const percent = Math.round((current / total) * 100);
  const barLength = 40;
  const filled = Math.floor((percent / 100) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  process.stdout.write(`\r${label}: [${bar}] ${percent}% (${current}/${total})`);
  if (current === total) process.stdout.write('\n');
};

// Timer utility
class Timer {
  constructor(label) {
    this.label = label;
    this.start = performance.now();
  }
  
  end() {
    const duration = Math.round(performance.now() - this.start);
    log(`⏱️  ${this.label}: ${duration}ms`);
    return duration;
  }
}

async function connectDB() {
  const timer = new Timer('Database connection');
  try {
    await mongoose.connect(MONGO_URI, { 
      dbName: DB_NAME,
      serverSelectionTimeoutMS: 5000,
    });
    timer.end();
    log(`✅ Connected to MongoDB: ${DB_NAME}`);
  } catch (error) {
    log(`❌ Database connection failed:`, error.message);
    process.exit(1);
  }
}

async function ensureIndexes() {
  const timer = new Timer('Index creation');
  try {
    await Promise.all([
      ClassModel.syncIndexes?.() || ClassModel.ensureIndexes?.() || Promise.resolve(),
      User.syncIndexes?.() || User.ensureIndexes?.() || Promise.resolve(),
    ]);
    timer.end();
    log(`✅ Database indexes ensured`);
  } catch (error) {
    log(`⚠️  Index creation warning:`, error.message);
  }
}

async function resetMockData() {
  if (DRY_RUN) {
    log('🔄 [DRY-RUN] Would reset existing mock data');
    return { teachers: 0, students: 0 };
  }

  const timer = new Timer('Reset mock data');
  
  // Delete mock teachers and students based on pattern matching
  const [teacherResult, studentResult] = await Promise.all([
    User.deleteMany({ 
      role: 'teacher', 
      email: { $regex: /teacher\d+[a-e]\d+@gmail\.com$/i }
    }),
    User.deleteMany({ 
      role: 'student', 
      parentEmail: { $regex: /parent\d+[a-e]\d+\d+@gmail\.com$/i }
    })
  ]);

  timer.end();
  log(`🗑️  Deleted mock data: ${teacherResult.deletedCount} teachers, ${studentResult.deletedCount} students`);
  
  return {
    teachers: teacherResult.deletedCount,
    students: studentResult.deletedCount
  };
}

async function createClasses() {
  const timer = new Timer('Class creation');
  const operations = [];

  for (const grade of GRADES) {
    for (const section of SECTIONS) {
      operations.push({
        updateOne: {
          filter: { class: grade, section },
          update: { 
            $setOnInsert: { 
              class: grade, 
              section
            }
          },
          upsert: true
        }
      });
    }
  }

  if (DRY_RUN) {
    log(`🏫 [DRY-RUN] Would create ${operations.length} classes`);
    timer.end();
    return new Map();
  }

  const result = await ClassModel.bulkWrite(operations, { ordered: false });
  timer.end();
  
  log(`🏫 Classes: ${operations.length} processed (Grades ${GRADES.join(', ')}, Sections ${SECTIONS.join(', ')})`);
  log(`    ${result.upsertedCount} new classes created`);

  // Fetch and map all classes
  const classes = await ClassModel.find({
    class: { $in: GRADES },
    section: { $in: SECTIONS }
  }).lean();
  
  const classMap = new Map();
  
  for (const cls of classes) {
    const key = `${cls.class}-${cls.section}`;
    classMap.set(key, cls);
    logVerbose(`Class ${cls.class}-${cls.section} -> ID: ${cls._id}`);
  }

  return classMap;
}

async function createTeachers(classMap) {
  const timer = new Timer('Teacher creation');
  
  // Pre-hash password for all teachers
  const passwordHash = await bcrypt.hash(TEACHER_PASSWORD, 10);
  log(`🔐 Password hash generated for teachers (password: "${TEACHER_PASSWORD}")`);

  const operations = [];
  const teacherEmailMap = new Map(); // Store email mapping for student creation

  for (const grade of GRADES) {
    for (const section of SECTIONS) {
      const classKey = `${grade}-${section}`;
      const classDoc = classMap.get(classKey);
      
      if (!classDoc) {
        log(`⚠️  No class found for ${classKey}, skipping teacher`);
        continue;
      }

      const email = makeTeacherEmail(grade, section);
      const staffId = makeStaffId(grade, section);
      const name = generateTeacherName();

      // Store email mapping for later reference
      teacherEmailMap.set(classKey, email);

      operations.push({
        updateOne: {
          filter: { email },
          update: {
            $setOnInsert: {
              name,
              email,
              staffId,
              passwordHash,
              role: 'teacher',
              classIds: [classDoc._id]
            }
          },
          upsert: true
        }
      });

      logVerbose(`Teacher: ${name} -> ${email} [${staffId}] -> Class ${grade}-${section}`);
    }
  }

  if (DRY_RUN) {
    log(`👨‍🏫 [DRY-RUN] Would create ${operations.length} teachers`);
    timer.end();
    return { map: new Map(), emailMap: teacherEmailMap };
  }

  const result = await User.bulkWrite(operations, { ordered: false });
  timer.end();
  
  log(`👨‍🏫 Teachers: ${operations.length} processed, ${result.upsertedCount} created`);
  log(`    Distribution: ${GRADES.length} grades × ${SECTIONS.length} sections = ${TOTAL_TEACHERS} teachers`);

  // Wait a bit and then fetch fresh teacher data
  await sleep(100);

  // Fetch teachers with populated class information
  const teachers = await User.find({
    role: 'teacher',
    email: { $regex: /teacher\d+[a-e]\d+@gmail\.com$/i }
  })
  .populate('classIds', 'class section')
  .lean();

  log(`📋 Found ${teachers.length} teachers in database for student assignment`);

  const teacherMap = new Map();
  for (const teacher of teachers) {
    teacherMap.set(teacher.email, teacher);
    
    if (teacher.classIds && teacher.classIds.length > 0) {
      const cls = teacher.classIds[0];
      logVerbose(`Mapped teacher: ${teacher.email} -> Class ${cls.class}-${cls.section} (ID: ${teacher._id})`);
    } else {
      log(`⚠️  Teacher ${teacher.email} has no class assigned`);
    }
  }

  return { map: teacherMap, emailMap: teacherEmailMap };
}

async function createStudents(classMap, teacherInfo) {
  const timer = new Timer('Student creation');
  
  // Pre-hash password for all students
  const passwordHash = await bcrypt.hash(STUDENT_PASSWORD, 10);
  log(`🔐 Password hash generated for students (password: "${STUDENT_PASSWORD}")`);

  const operations = [];
  const stats = {
    totalPlanned: 0,
    byGrade: new Map(),
    byClass: new Map()
  };

  // Initialize grade stats
  for (const grade of GRADES) {
    stats.byGrade.set(grade, 0);
  }

  log(`🔍 Starting student creation for ${teacherInfo.map.size} teachers`);

  // Generate students for each class-section
  for (const grade of GRADES) {
    for (const section of SECTIONS) {
      const classKey = `${grade}-${section}`;
      const classDoc = classMap.get(classKey);
      const teacherEmail = teacherInfo.emailMap.get(classKey);
      const teacher = teacherEmail ? teacherInfo.map.get(teacherEmail) : null;

      logVerbose(`Processing ${classKey}: class=${classDoc ? 'found' : 'missing'}, teacher=${teacher ? 'found' : 'missing'}`);

      if (!classDoc) {
        log(`⚠️  No class document found for ${classKey}`);
        continue;
      }

      if (!teacher) {
        log(`⚠️  No teacher found for ${classKey} (looking for ${teacherEmail || 'unknown email'})`);
        continue;
      }

      // Verify teacher has the correct class assigned
      const teacherClass = teacher.classIds?.[0];
      if (!teacherClass || teacherClass.class !== grade || teacherClass.section !== section) {
        log(`⚠️  Teacher ${teacherEmail} class mismatch: expected ${grade}-${section}, got ${teacherClass?.class}-${teacherClass?.section}`);
        continue;
      }

      // Random number of students per class (35-50)
      const studentCount = random(MIN_STUDENTS, MAX_STUDENTS);
      stats.byClass.set(classKey, studentCount);
      stats.totalPlanned += studentCount;
      
      const currentGradeTotal = stats.byGrade.get(grade) || 0;
      stats.byGrade.set(grade, currentGradeTotal + studentCount);

      log(`✓ Planning ${studentCount} students for class ${grade}-${section} (Teacher: ${teacher.name})`);

      // Generate students for this class
      for (let i = 1; i <= studentCount; i++) {
        const name = generateName();
        const parentEmail = makeParentEmail(grade, section, i);
        const registerId = makeRegisterId(grade, section, i);

        operations.push({
          updateOne: {
            filter: { registerId },
            update: {
              $setOnInsert: {
                name,
                parentEmail,
                registerId,
                passwordHash,
                role: 'student',
                assignedTeacherId: teacher._id,
                assignedClassId: classDoc._id,
                classIds: [classDoc._id]
              }
            },
            upsert: true
          }
        });
      }
    }
  }

  log(`👥 Planning ${stats.totalPlanned} students across ${TOTAL_CLASSES} classes`);

  if (DRY_RUN) {
    log(`👦👧 [DRY-RUN] Would create ${operations.length} students`);
    timer.end();
    return stats;
  }

  if (operations.length === 0) {
    log(`❌ No student operations to perform - check teacher-class assignments`);
    timer.end();
    return stats;
  }

  // Bulk insert students in batches
  const BATCH_SIZE = 400;
  const batches = [];
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    batches.push(operations.slice(i, i + BATCH_SIZE));
  }

  let totalInserted = 0;
  let processedOperations = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const result = await User.bulkWrite(batch, { ordered: false });
    
    totalInserted += result.upsertedCount || 0;
    processedOperations += batch.length;
    
    logProgress(processedOperations, operations.length, 'Creating students');
    
    if (i < batches.length - 1) {
      await sleep(5);
    }
  }

  timer.end();
  log(`👦👧 Students: ${operations.length} processed, ${totalInserted} created`);

  // Log distribution by grade
  log(`📊 Student distribution by grade:`);
  for (const grade of GRADES) {
    const count = stats.byGrade.get(grade) || 0;
    log(`    Grade ${grade}: ${count} students (${SECTIONS.length} sections)`);
  }

  if (VERBOSE) {
    log(`📊 Detailed distribution by class:`);
    for (const [classKey, count] of stats.byClass) {
      log(`    ${classKey}: ${count} students`);
    }
  }

  return { ...stats, actualInserted: totalInserted };
}

async function generateSummaryReport() {
  log('\n📋 SCHOOL DATA SUMMARY REPORT');
  log('='.repeat(60));
  
  const actualClasses = await ClassModel.countDocuments({
    class: { $in: GRADES },
    section: { $in: SECTIONS }
  });
  
  const actualTeachers = await User.countDocuments({ 
    role: 'teacher', 
    email: { $regex: /teacher\d+[a-e]\d+@gmail\.com$/i }
  });
  
  const actualStudents = await User.countDocuments({ 
    role: 'student', 
    parentEmail: { $regex: /parent\d+[a-e]\d+\d+@gmail\.com$/i }
  });

  log(`🏫 School Structure:`);
  log(`    Grades: ${GRADES.join(', ')} (${GRADES.length} grades)`);
  log(`    Sections per grade: ${SECTIONS.join(', ')} (${SECTIONS.length} sections)`);
  log(`    Total classes: ${actualClasses} (expected: ${TOTAL_CLASSES})`);
  log(`    Students per class: ${MIN_STUDENTS}-${MAX_STUDENTS}`);
  
  log(`\n👥 People:`);
  log(`    Teachers: ${actualTeachers} (1 per class)`);
  log(`    Students: ${actualStudents}`);
  
  log(`\n🔑 Login Information:`);
  log(`    Email format: Gmail (@gmail.com)`);
  log(`    Teacher password: "${TEACHER_PASSWORD}" (for ALL teachers)`);
  log(`    Student password: "${STUDENT_PASSWORD}" (for ALL students)`);
  
  // Show sample logins
  log(`\n🔍 Sample teacher login:`);
  const sampleTeacher = await User.findOne({ 
    role: 'teacher', 
    email: { $regex: /teacher\d+[a-e]\d+@gmail\.com$/i }
  }).select('email name staffId');
  
  if (sampleTeacher) {
    log(`    Email: ${sampleTeacher.email}`);
    log(`    Password: ${TEACHER_PASSWORD}`);
    log(`    Name: ${sampleTeacher.name} (${sampleTeacher.staffId})`);
  }
  
  log(`\n🔍 Sample student login (parent email):`);
  const sampleStudent = await User.findOne({ 
    role: 'student', 
    parentEmail: { $regex: /parent\d+[a-e]\d+\d+@gmail\.com$/i }
  }).select('parentEmail name registerId');
  
  if (sampleStudent) {
    log(`    Email: ${sampleStudent.parentEmail}`);
    log(`    Password: ${STUDENT_PASSWORD}`);
    log(`    Student: ${sampleStudent.name} (${sampleStudent.registerId})`);
  }

  // Grade-wise breakdown
  log(`\n📊 Grade-wise breakdown:`);
  for (const grade of GRADES) {
    const gradeTeachers = await User.countDocuments({
      role: 'teacher',
      email: { $regex: /teacher\d+[a-e]\d+@gmail\.com$/i },
      staffId: { $regex: `^T${grade}` }
    });
    
    const gradeStudents = await User.countDocuments({
      role: 'student',
      registerId: { $regex: `^${grade}` }
    });
    
    log(`    Grade ${grade}: ${gradeTeachers} teachers, ${gradeStudents} students`);
  }

  // Show a few more sample emails for easy testing
  log(`\n📧 Quick test credentials:`);
  const moreTeachers = await User.find({ 
    role: 'teacher', 
    email: { $regex: /teacher\d+[a-e]\d+@gmail\.com$/i }
  }).select('email name staffId').limit(3).lean();
  
  moreTeachers.forEach((t, i) => {
    log(`    Teacher ${i + 1}: ${t.email} / ${TEACHER_PASSWORD}`);
  });

  const moreStudents = await User.find({ 
    role: 'student', 
    parentEmail: { $regex: /parent\d+[a-e]\d+\d+@gmail\.com$/i }
  }).select('parentEmail name').limit(3).lean();
  
  moreStudents.forEach((s, i) => {
    log(`    Student ${i + 1}: ${s.parentEmail} / ${STUDENT_PASSWORD}`);
  });

  log(`\n💡 Login Tips:`);
  log(`    • Teachers: Use any teacher email with password "teacher"`);
  log(`    • Students: Use any parent email with password "student"`);
  log(`    • Admin: admin@stemplay.local / Admin@1234 (if seeded)`);
}

// Main execution
async function main() {
  const totalTimer = new Timer('Total seeding time');
  
  log('🚀 Starting School Mock Data Generation');
  log('='.repeat(60));
  log(`📊 Configuration:`);
  log(`   Database: ${MONGO_URI}`);
  log(`   School Structure: Grades ${GRADES[0]}-${GRADES[GRADES.length-1]}, Sections ${SECTIONS.join(', ')}`);
  log(`   Teachers: 1 per class-section (${TOTAL_TEACHERS} total)`);
  log(`   Students: ${MIN_STUDENTS}-${MAX_STUDENTS} per class`);
  log(`   Email format: Gmail (@gmail.com)`);
  log(`   Teacher password: "${TEACHER_PASSWORD}"`);
  log(`   Student password: "${STUDENT_PASSWORD}"`);
  log(`   Reset mode: ${RESET ? 'YES' : 'NO'}`);
  log(`   Dry run: ${DRY_RUN ? 'YES' : 'NO'}`);
  log(`   Verbose: ${VERBOSE ? 'YES' : 'NO'}`);
  log('');

  try {
    await connectDB();
    await ensureIndexes();

    if (RESET) {
      await resetMockData();
    }

    log('📋 Creating classes...');
    const classMap = await createClasses();

    log('📋 Creating teachers...');
    const teacherInfo = await createTeachers(classMap);

    log('📋 Creating students...');
    const studentStats = await createStudents(classMap, teacherInfo);

    await generateSummaryReport();
    
    totalTimer.end();
    log('\n🎉 School mock data generation completed successfully!');
    log(`📈 Summary: ${TOTAL_CLASSES} classes, ${teacherInfo.map.size} teachers, ~${studentStats.totalPlanned} students`);

  } catch (error) {
    log('\n❌ Seeding failed:', error.message);
    if (VERBOSE) {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log('🔌 Database connection closed');
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  log('\n🛑 Seeding interrupted by user');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  log('❌ Unhandled rejection:', error.message);
  process.exit(1);
});

// Run the script
main();