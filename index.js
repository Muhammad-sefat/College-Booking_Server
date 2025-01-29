require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();

// Middleware

app.use(
  cors({
    origin: "*", // Allow all origins (for testing; restrict in production)
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dbn21dt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Change to specific domain in production
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res.status(204).send();
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const CollegeCollection = client
      .db("College_finder")
      .collection("College_Data");
    const admissionsCollection = client
      .db("College_finder")
      .collection("Admissions");
    const reviewsCollection = client
      .db("College_finder")
      .collection("reviewData");

    //   get data
    app.get("/colleges", async (req, res) => {
      const result = await CollegeCollection.find().toArray();
      res.send(result);
    });

    // save admission data
    app.post("/admissions", async (req, res) => {
      const { email, college } = req.body;

      if (!email || !college) {
        return res
          .status(400)
          .send({ message: "Email and College are required." });
      }

      try {
        // Check if an admission already exists for the user and the college
        const existingAdmission = await admissionsCollection.findOne({
          email,
          college,
        });
        if (existingAdmission) {
          return res.status(409).send({
            message:
              "You have already submitted an admission for this college.",
          });
        }

        const result = await admissionsCollection.insertOne(req.body);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error saving admission.", error });
      }
    });

    //   get data
    app.get("/admission-data", async (req, res) => {
      const userEmail = req.query.email;

      if (!userEmail) {
        return res
          .status(400)
          .send({ message: "Email is required to fetch data." });
      }

      try {
        const result = await admissionsCollection
          .find({ email: userEmail })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error fetching data.", error });
      }
    });
    // send data
    app.post("/add-review", async (req, res) => {
      const { email, name, review, rating } = req.body;

      if (!email || !name || !review || !rating) {
        return res.status(400).json({ message: "All fields are required." });
      }

      try {
        const reviewData = {
          email,
          name,
          review,
          rating: parseFloat(rating),
          createdAt: new Date(),
        };

        // Insert the review into the "reviews" collection
        const result = await reviewsCollection.insertOne(reviewData);

        // Check if the operation was successful
        if (result.insertedId) {
          res.status(201).json({ message: "Review added successfully." });
        } else {
          res.status(500).json({ message: "Failed to add review." });
        }
      } catch (error) {
        console.error("Error adding review:", error);
        res.status(500).json({ message: "Internal server error." });
      }
    });

    // get data
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    // Search for a college by name
    app.get("/search-college", async (req, res) => {
      const { name } = req.query;

      if (!name) {
        return res.status(400).json({ message: "College name is required." });
      }

      try {
        const result = await CollegeCollection.findOne({
          name: { $regex: name, $options: "i" },
        });

        if (result) {
          res.status(200).json(result);
        } else {
          res.status(404).json({ message: "College not found." });
        }
      } catch (error) {
        console.error("Error searching for college:", error);
        res.status(500).json({ message: "Internal server error." });
      }
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

// Routes
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
