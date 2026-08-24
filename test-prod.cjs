const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query } = require("firebase/firestore");
const config = require("./firebase-applet-config.json");
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  try {
    const q = query(collection(db, "medicinalHerbs"));
    await getDocs(q);
    console.log("SUCCESS");
  } catch(e) {
    console.log("ERROR", e);
  }
}
run();
