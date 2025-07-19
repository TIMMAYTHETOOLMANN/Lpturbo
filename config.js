require('dotenv').config();

const USER_ADDRESS = process.env.USER_ADDRESS;
const USER_KEY = process.env.USER_KEY;

if (!USER_ADDRESS || !USER_KEY) {
  throw new Error("Missing USER_ADDRESS or USER_KEY in environment variables.");
}

module.exports = {
  USER_ADDRESS,
  USER_KEY
};