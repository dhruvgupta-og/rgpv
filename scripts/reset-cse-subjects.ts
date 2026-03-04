import "dotenv/config";
import { getFirestore, FieldValue } from "../server/firebase";

type SubjectSeed = {
  semester: number;
  code: string;
  name: string;
};

const subjects: SubjectSeed[] = [
  { semester: 1, code: "BT-101", name: "Engineering Chemistry" },
  { semester: 1, code: "BT-202", name: "Mathematics-II" },
  { semester: 1, code: "BT-103", name: "English for Communication" },
  { semester: 1, code: "BT-104", name: "Basic Electrical & Electronics Engineering" },
  { semester: 1, code: "BT-105", name: "Engineering Graphics" },
  { semester: 1, code: "BT-106", name: "Manufacturing Practices" },

  { semester: 2, code: "BT-201", name: "Engineering Physics" },
  { semester: 2, code: "BT-102", name: "Mathematics-I" },
  { semester: 2, code: "BT-203", name: "Basic Mechanical Engineering" },
  { semester: 2, code: "BT-204", name: "Basic Civil Engineering & Mechanics" },
  { semester: 2, code: "BT-205", name: "Basic Computer Engineering" },
  { semester: 2, code: "BT-206", name: "Language Lab & Seminars" },

  { semester: 3, code: "ES-301", name: "Energy & Environmental Engineering" },
  { semester: 3, code: "CS-302", name: "Discrete Structure" },
  { semester: 3, code: "CS-303", name: "Data Structure" },
  { semester: 3, code: "CS-304", name: "Digital Systems" },
  { semester: 3, code: "CS-305", name: "Object Oriented Programming and Methodology" },
  { semester: 3, code: "CS-306", name: "Computer Workshop" },

  { semester: 4, code: "BT-401", name: "Mathematics-III" },
  { semester: 4, code: "CS-402", name: "Analysis Design of Algorithm" },
  { semester: 4, code: "CS-403", name: "Software Engineering" },
  { semester: 4, code: "CS-404", name: "Computer Organization & Architecture" },
  { semester: 4, code: "CS-405", name: "Operating Systems" },
  { semester: 4, code: "CS-406", name: "Programming Practices" },

  { semester: 5, code: "CS-501", name: "Theory of Computation" },
  { semester: 5, code: "CS-502", name: "Database Management Systems" },
  { semester: 5, code: "CS-503A", name: "Data Analytics" },
  { semester: 5, code: "CS-503B", name: "Pattern Recognition" },
  { semester: 5, code: "CS-503C", name: "Cyber Security" },
  { semester: 5, code: "CS-504A", name: "Internet and Web Technology" },
  { semester: 5, code: "CS-504B", name: "Object Oriented Programming" },
  { semester: 5, code: "CS-504C", name: "Introduction to Database Management Systems" },
  { semester: 5, code: "CS-505", name: "Linux Lab" },
  { semester: 5, code: "CS-506", name: "Python Lab" },
  { semester: 5, code: "CS-508", name: "Minor Project-I" },

  { semester: 6, code: "CS-601", name: "Machine Learning" },
  { semester: 6, code: "CS-602", name: "Computer Networks" },
  { semester: 6, code: "CS-603A", name: "Advanced Computer Architecture" },
  { semester: 6, code: "CS-603B", name: "Computer Graphics & Visualization" },
  { semester: 6, code: "CS-603C", name: "Compiler Design" },
  { semester: 6, code: "CS-604A", name: "Knowledge Management" },
  { semester: 6, code: "CS-604B", name: "Project Management" },
  { semester: 6, code: "CS-604C", name: "Rural Technology & Community Development" },
  { semester: 6, code: "CS-605", name: "Data Analytics Lab" },
  { semester: 6, code: "CS-606", name: "Skill Development Lab" },
  { semester: 6, code: "CS-607", name: "Internship-III" },
  { semester: 6, code: "CS-608", name: "Minor Project-II" },

  { semester: 7, code: "CS-701", name: "Software Architectures" },
  { semester: 7, code: "CS-702A", name: "Computational Intelligence" },
  { semester: 7, code: "CS-702B", name: "Deep & Reinforcement Learning" },
  { semester: 7, code: "CS-702C", name: "Wireless & Mobile Computing" },
  { semester: 7, code: "CS-702D", name: "Big Data" },
  { semester: 7, code: "CS-703A", name: "Cryptography & Information Security" },
  { semester: 7, code: "CS-703B", name: "Data Mining and Warehousing" },
  { semester: 7, code: "CS-703C", name: "Agile Software Development" },
  { semester: 7, code: "CS-703D", name: "Disaster Management" },
  { semester: 7, code: "CS-704", name: "Departmental Elective Lab" },
  { semester: 7, code: "CS-705", name: "Open Elective Lab" },
  { semester: 7, code: "CS-706", name: "Major Project-I" },

  { semester: 8, code: "CS-801", name: "Internet of Things" },
  { semester: 8, code: "CS-802A", name: "Block Chain Technologies" },
  { semester: 8, code: "CS-802B", name: "Cloud Computing" },
  { semester: 8, code: "CS-802C", name: "High Performance Computing" },
  { semester: 8, code: "CS-802D", name: "Object Oriented Software Engineering" },
  { semester: 8, code: "CS-803A", name: "Image Processing and Computer Vision" },
  { semester: 8, code: "CS-803B", name: "Game Theory with Engineering Applications" },
  { semester: 8, code: "CS-803C", name: "Internet of Things" },
  { semester: 8, code: "CS-803D", name: "Managing Innovation and Entrepreneurship" },
  { semester: 8, code: "CS-804", name: "Departmental Elective Lab" },
  { semester: 8, code: "CS-805", name: "Major Project-II" },
];

const collectionNames = ["subjects", "syllabusUnits", "papers", "videos", "analytics"];

function slugifyCode(code: string) {
  return code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function deleteAll(collection: string) {
  const db = getFirestore();
  const snap = await db.collection(collection).get();
  let batch = db.batch();
  let count = 0;
  for (const docSnap of snap.docs) {
    batch.delete(docSnap.ref);
    count += 1;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (count % 400 !== 0) {
    await batch.commit();
  }
  return count;
}

async function seedSubjects() {
  const db = getFirestore();
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();
  for (const s of subjects) {
    const id = `cse-${s.semester}-${slugifyCode(s.code)}`;
    const ref = db.collection("subjects").doc(id);
    batch.set(ref, {
      id,
      name: s.name,
      code: s.code,
      branchId: "cse",
      semester: s.semester,
      createdAt: now,
      updatedAt: now,
    });
  }
  await batch.commit();
}

async function main() {
  console.log("Deleting existing data...");
  for (const name of collectionNames) {
    const count = await deleteAll(name);
    console.log(`Deleted ${count} docs from ${name}`);
  }
  console.log("Seeding CSE subjects...");
  await seedSubjects();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
