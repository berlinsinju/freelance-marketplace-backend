require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User");
const Service = require("./models/Service");
const Job = require("./models/Job");

const run = async () => {
  await connectDB();

  await Promise.all([
    User.deleteMany(),
    Service.deleteMany(),
    Job.deleteMany(),
  ]);

  const freelancer = await User.create({
    name: "Asha Rao",
    email: "freelancer@demo.com",
    password: "password123",
    role: "freelancer",
    bio: "Full-stack developer specializing in the MERN stack.",
    skills: ["React", "Node.js", "MongoDB", "TailwindCSS"],
    hourlyRate: 35,
    location: "Bengaluru, India",
  });

  const client = await User.create({
    name: "Priya Menon",
    email: "client@demo.com",
    password: "password123",
    role: "client",
    companyName: "BrightPath Startups",
    location: "Mumbai, India",
  });

  await Service.create({
    freelancer: freelancer._id,
    title: "I will build a full-stack MERN web application",
    description:
      "End-to-end MERN development including auth, payments, and deployment.",
    category: "Web Development",
    price: 500,
    priceType: "fixed",
    deliveryDays: 14,
    tags: ["MERN", "React", "Node.js"],
  });

  await Job.create({
    client: client._id,
    title: "Need a React developer for an e-commerce site",
    description:
      "Looking for an experienced React developer to build a storefront with cart and checkout.",
    category: "Web Development",
    budgetMin: 800,
    budgetMax: 1500,
    budgetType: "fixed",
    skillsRequired: ["React", "Node.js", "Stripe"],
  });

  console.log("Seed data created:");
  console.log("  freelancer@demo.com / password123");
  console.log("  client@demo.com / password123");
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
