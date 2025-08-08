
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
  
const port = process.env.PORT || 8000;

app.use(
  cors({
    origin: ["http://localhost:3000","https://khetsheba.vercel.app"],
    credentials: true,
  })
);

app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.DB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    console.log("Connected to MongoDB");

     const usersCollection = client.db("khetsheba").collection("users");
 
    app.get("/users", async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

   
 

    app.get("/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
      } catch (err) {
        res.status(500).send(err);
      }
    });

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } finally {
    process.on("SIGINT", async () => {});
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("WayGo is sitting");
});
