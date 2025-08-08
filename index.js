const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 8000;

app.use(
    cors({
        origin: ["http://localhost:3000", "https://khetsheba.vercel.app"],
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
        const usersCollection = client.db("khetsheba").collection("users");

        app.post("/register", async (req, res) => {
            const { name, contact, password, nid, location, frontNidPhoto, backNidPhoto, role = "user" } = req.body;

            if (!name || !contact || !password || !nid || !location) {
                return res.status(400).json({ error: "All fields are required" });
            }

            const existingUser = await usersCollection.findOne({
                $or: [
                    { contact: contact },
                    { nid: nid }
                ]
            });

            if (existingUser) {
                if (existingUser.contact === contact) {
                    return res.status(400).json({ error: "Phone/Email already exists" });
                }
                if (existingUser.nid === nid) {
                    return res.status(400).json({ error: "NID already registered" });
                }
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = {
                name,
                contact,
                password: hashedPassword,
                nid,
                location,
                frontNidPhoto,
                backNidPhoto,
                role,
                verified: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await usersCollection.insertOne(newUser);
            const token = jwt.sign(
                { userId: result.insertedId.toString() },
                process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            const userResponse = {
                _id: result.insertedId,
                name: newUser.name,
                contact: newUser.contact,
                role: newUser.role,
                nid: newUser.nid,
                location: newUser.location
            };

            res.status(201).json({ user: userResponse, token });
        });

        app.get("/users", async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });







        app.post("/login", async (req, res) => {
            try {
                const { contact, password } = req.body;

                if (!contact || !password) {
                    return res.status(400).json({
                        success: false,
                        message: "Both contact (email/phone) and password are required"
                    });
                }

                const user = await usersCollection.findOne({
                    contact: contact
                });

                if (!user) {
                    return res.status(401).json({
                        success: false,
                        message: "Invalid credentials - user not found"
                    });
                }

                const isPasswordValid = await bcrypt.compare(password, user.password);
                if (!isPasswordValid) {
                    return res.status(401).json({
                        success: false,
                        message: "Invalid credentials - wrong password"
                    });
                }

                const token = jwt.sign(
                    {
                        userId: user._id.toString(),
                        role: user.role
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: '30d' }
                );

                const { password: _, ...userData } = user;

                res.status(200).json({
                    success: true,
                    message: "Login successful",
                    token,
                    user: userData
                });

            } catch (error) {
                console.error("Login error:", error);
                res.status(500).json({
                    success: false,
                    message: "Internal server error during login"
                });
            }
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
        process.on("SIGINT", async () => { });
    }
}

run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("KhetSheba is Running");
});