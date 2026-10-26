import jwt from "jsonwebtoken";

const generateToken = (user) => {
  if (!user?._id) {
    throw new Error(
      "Cannot generate authentication token without a user ID."
    );
  }

  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is missing from the server environment."
    );
  }

  return jwt.sign(
    {
      userId: user._id.toString(),
      tokenVersion: Number(user.tokenVersion || 0),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

export default generateToken;