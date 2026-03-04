import "dotenv/config";
import { getFirestore } from "../server/firebase";

async function upsertBranch(id: string, name: string, shortName: string, icon: string, color: string) {
  const db = getFirestore();
  const ref = db.collection("branches").doc(id);
  await ref.set(
    {
      id,
      name,
      shortName,
      icon,
      color,
      createdAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

async function main() {
  await upsertBranch("aiml", "Artificial Intelligence & Machine Learning", "AIML", "cpu", "#7C3AED");
  await upsertBranch("ds", "Data Science", "DS", "activity", "#0EA5E9");
  console.log("Branches added/updated: AIML, DS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
