const jwt = require("jsonwebtoken");

const generateToken = (userOrId) => {
  // Extract ID whether a full Mongoose user document or ID string is passed
  const id = typeof userOrId === "object" && userOrId?._id ? userOrId._id : userOrId;

  return jwt.sign({ id }, process.env.JWT_SECRET || "default_jwt_secret", {
    expiresIn: "30d",
  });
};

module.exports = generateToken;