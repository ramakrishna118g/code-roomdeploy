import mongoose from "mongoose";

const confSchema = new mongoose.Schema({
  conftype: {
    type: String,
    required: true,
  },
  confid: {
    type: String,
    required: true,
  },
  hostid: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

const ConferenceData = mongoose.model("confData", confSchema);
export default ConferenceData;
