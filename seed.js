const mongoose = require("mongoose");
const data = require("./data");

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

mongoose.connect("mongodb+srv://ayu:ayu@cluster0.1ieog.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
  .then(async () => {
    await Route.deleteMany({});
    await Route.insertMany(data);
    console.log("✅ Data inserted");
    mongoose.disconnect();
  }).catch(err => console.error("❌", err));