const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Gemini API key from Google Cloud
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// ✅ MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ MongoDB error", err));

// ✅ Schema
const RouteSchema = new mongoose.Schema({
  route: String,
  hotels: [String],
  cafes: [String],
  genre: [String],
  popularity: String,
  travelTime: String,
  distance: String
});
const Route = mongoose.model("Route", RouteSchema);

// ✅ Chat endpoint
app.post("/chat", async (req, res) => {
  const { message } = req.body;


  const lowerMsg = message.toLowerCase().trim();

  // ✅ Casual greetings and human-style replies
  const casualReplies = {
    "hi": "Hey there! 👋 How can I help you plan your day in Mysore?",
    "hello": "Hello! 😊 Looking for some travel suggestions in Mysore?",
    "hey": "Hey! Need help exploring Mysore?",
    "good morning": "Good morning! Ready to plan a lovely day in Mysore?",
    "good evening": "Good evening! Want a peaceful Mysore itinerary?",
    "how are you": "I'm doing great! Excited to help you plan your day. 😊"
  };

  // ✅ If casual greeting, respond immediately
  if (casualReplies[lowerMsg]) {
    return res.json({ reply: casualReplies[lowerMsg] });
  }


  
  const routes = await Route.find({});

  const context = routes.map(r =>
    `Route: ${r.route}\nGenre: ${r.genre.join(", ")}\nDistance: ${r.distance}\nTime: ${r.travelTime}\nHotels: ${r.hotels.join(", ")}\nCafes: ${r.cafes.join(", ")}\n`
  ).join("\n");

  // ✅ Detect if table format is requested
  const wantsTable = message.toLowerCase().includes("timetable") ||
                     message.toLowerCase().includes("schedule") ||
                     message.toLowerCase().includes("table");

  // ✅ Dynamically build prompt
  let prompt = "";

  if (wantsTable) {
    prompt = `
  You are a Mysore travel planner AI assistant.
  
  Create a one-day **timetable** in table format ONLY. Use the hotels and cafes **only from the list below** (not made-up names). Include:
  
  Time | Period | Place | Activity | Cost (INR) | Notes
  
  Split into:
  - Morning (7 AM – 12 PM)
  - Afternoon (12 PM – 4 PM)
  - Evening (4 PM – 7 PM)
  - Night (7 PM onwards)
  
  Strict rules:
  - Only use hotels/cafes mentioned in the data.
  - Mention specific **timings** for each activity (e.g., 08:30 AM – 09:00 AM)
  - Mention **opening hours** of cafes/restaurants if possible.
  - Use travel time and distance between places (e.g., 2.5 km, 12 mins by auto)
  - Don’t include extra bullet points or markdown formatting.
  - At the end, say: Estimated Total Cost: Rs. XXXX
  
  Here is the place data:\n\n${context}\n\nUser Request:\n${message}
    `;
  } else {
    prompt = `
  You are a helpful Mysore travel planning assistant.
  
  Create a day plan split into:
  - Morning (7 AM – 12 PM)
  - Afternoon (12 PM – 4 PM)
  - Evening (4 PM – 7 PM)
  - Night (7 PM onward)
  
  Instructions:
  - Use only hotels/cafes that are listed in the data.
  - Add realistic **timing** for each activity.
  - Mention **opening hours**, **distance**, and **travel time** between places.
  - Use Rs. instead of ₹ for money.
  - Mention hidden gems if available.
  - Keep it plain and paragraph-style with clean line breaks (no markdown).
  
  Here is the place data:\n\n${context}\n\nUser Request:\n${message}
    `;
  }
  

  try {
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-pro" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const reply = result.response.text();
    res.json({ reply });

  } catch (err) {
    console.error("❌ Gemini Error:", err);
    res.status(500).json({ error: "Gemini API failed" });
  }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
