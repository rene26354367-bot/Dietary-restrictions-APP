require('dotenv').config();
const key = process.env.VITE_GOOGLE_CLOUD_VISION_KEY || process.env.GOOGLE_CLOUD_VISION_KEY;
if (!key) {
    console.log("DIAGNOSTIC_RESULT: MISSING_KEY");
} else {
    console.log("DIAGNOSTIC_RESULT: KEY_FOUND_LENGTH_" + key.length);
}
