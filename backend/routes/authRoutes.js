import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) {
    return res.status(404).json({ success: false, message: "User Not Found" });
  }
  if (!user.password) {
    return res.status(400).json({ success: false, message: "Please log in with Google OAuth" });
  }
  const ismatch = await bcrypt.compare(password, user.password);
  if (!ismatch) {
    return res.status(401).json({ success: false, message: "Invalid Credentials" });
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7h" });
  res.status(200).json({ success: true, token, username: user.username });
});

router.post("/signup", async (req, res) => {
  const { username, password, originalname, email } = req.body;
  const isused = await User.findOne({ username });
  if (isused) {
    return res.status(400).json({ success: false, message: "Username already taken" });
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    return res.status(400).json({ success: false, message: "Email already registered" });
  }

  const newuser = new User({
    username: username.trim(),
    password,
    originalname: originalname.trim(),
    email: email.trim(),
  });
  await newuser.save();

  const token = jwt.sign({ userId: newuser._id }, process.env.JWT_SECRET, { expiresIn: "7h" });
  res.status(200).json({ success: true, message: "Account created successfully", token, username: newuser.username });
});

router.post("/google-login", async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ success: false, message: "No Google credential provided" });
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || "720236882950-o27s2siimnpaa7jnb890aoifc9v2glja.apps.googleusercontent.com";
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    const { email, name, sub: googleId, picture } = payload;

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      let baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
      let username = baseUsername;
      let counter = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter++}`;
      }

      user = new User({
        username,
        originalname: name || username,
        email,
        googleId,
        picture,
      });
      await user.save();
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (picture) user.picture = picture;
      if (!user.originalname) user.originalname = name || user.username;
      await user.save();
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7h" });
    res.status(200).json({
      success: true,
      token,
      username: user.username,
      originalname: user.originalname,
    });
  } catch (err) {
    console.error("Google auth verification error:", err);
    res.status(401).json({ success: false, message: "Google authentication failed" });
  }
});

export default router;
