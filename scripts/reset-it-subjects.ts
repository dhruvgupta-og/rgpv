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

  { semester: 3, code: "ES-301", name: "Energy and Environmental Engineering" },
  { semester: 3, code: "CS-302", name: "Discrete Structure" },
  { semester: 3, code: "CS-303", name: "Data Structure" },
  { semester: 3, code: "CS-304", name: "Object Oriented Programming and Methodology" },
  { semester: 3, code: "CS-305", name: "Digital Circuits and Systems" },

  { semester: 4, code: "BT-401", name: "Mathematics-III" },
  { semester: 4, code: "CS-402", name: "Computer Organization and Architecture" },
  { semester: 4, code: "CS-403", name: "Analysis and Design of Algorithm" },
  { semester: 4, code: "CS-404", name: "Analog and Digital Communication" },
  { semester: 4, code: "CS-405", name: "Database Management System" },

  { semester: 5, code: "IT-501", name: "Operating System" },
  { semester: 5, code: "IT-502", name: "Computer Networks" },
  { semester: 5, code: "IT-503", name: "Theory of Computation" },
  { semester: 5, code: "IT-504", name: "Java Programming" },

  { semester: 6, code: "IT-601", name: "Computer Graphics and Multimedia" },
  { semester: 6, code: "IT-602", name: "Wireless and Mobile Computing" },
  { semester: 6, code: "IT-603", name: "Compiler Design" },
  { semester: 6, code: "IT-604", name: "Software Engineering" },

  { semester: 7, code: "IT-701", name: "Soft Computing" },
  { semester: 7, code: "IT-702", name: "Cloud Computing" },
  { semester: 7, code: "IT-703", name: "Internet of Things" },

  { semester: 8, code: "IT-801", name: "Information Security" },
  { semester: 8, code: "IT-802", name: "Machine Learning" },
  { semester: 8, code: "IT-803", name: "Blockchain Technology" },
];

function slugifyCode(code: string) {
  return code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function deleteSubjectData(subjectIds: string[]) {
  const db = getFirestore();
  const collections = ["syllabusUnits", "papers", "videos", "pyqAnalytics"];
  for (const col of collections) {
    const snaps = await Promise.all(
      subjectIds.map((id) => db.collection(col).where("subjectId", "==", id).get()),
    );
    const docs = snaps.flatMap((s) => s.docs);
    for (let i = 0; i < docs.length; i += 450) {
      const batch = db.batch();
      docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
}

async function main() {
  const db = getFirestore();
  const existing = await db.collection("subjects").where("branchId", "==", "it").get();
  const existingIds = existing.docs.map((d) => d.id);
  if (existingIds.length) {
    await deleteSubjectData(existingIds);
    for (let i = 0; i < existing.docs.length; i += 450) {
      const batch = db.batch();
      existing.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  const batch = db.batch();
  const now = FieldValue.serverTimestamp();
  for (const s of subjects) {
    const id = `it-${s.semester}-${slugifyCode(s.code)}`;
    const ref = db.collection("subjects").doc(id);
    batch.set(ref, {
      id,
      name: s.name,
      code: s.code,
      branchId: "it",
      semester: s.semester,
      createdAt: now,
      updatedAt: now,
    });
  }
  await batch.commit();
  console.log("IT subjects reset and seeded.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
