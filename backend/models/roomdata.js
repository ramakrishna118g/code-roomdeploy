import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomid: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  hostid: {
    type: String,
    required: true,
  },
  roomtype: {
    type: String,
    required: true,
  },
});

const RoomData = mongoose.model("Roomdata", roomSchema);
export default RoomData;
