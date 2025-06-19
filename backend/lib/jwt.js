import jwt from "jsonwebtoken";
import "dotenv/config";

const generateToken = (userData, res) => {
  const token = jwt.sign(
    {
      userID: userData.userID,
      userType: userData.userType,
      userReferenceId: userData.userReferenceId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "development" ? "Lax" : "None",
    secure: process.env.NODE_ENV !== "development",
  });

  return token;
};

export default generateToken;
