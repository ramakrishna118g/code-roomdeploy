import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: false,
  },
  originalname: {
    type: String,
    required: false,
    default: function () {
      return this.username;
    },
  },
  email: {
    type: String,
    required: true,
  },
  googleId: {
    type: String,
    required: false,
  },
  picture: {
    type: String,
    required: false,
  },
});

userSchema.pre("save", async function () {
  if (!this.password || !this.isModified("password")) {
    return;
  }
  this.password = await bcrypt.hash(this.password, 10);
});

export default mongoose.model("User", userSchema);
