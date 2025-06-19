import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";

const signUp = async (req, res, next) => {
  console.log("signup API called");
  try {
    req.user = req.user || {};
    const reqBody = req.body;
    console.log(reqBody);

    if (!reqBody.fullName) {
      console.log("name not provided for signUP");
      return res.status(400).send({ message: "name not provided for signUP" });
    }
    if (!reqBody.userID) {
      console.log("userID not provided for signUP");
      return res.status(400).send({ message: "userID not provided for signUP" });
    }
    if (!reqBody.email) {
      console.log("email not provided for signUP");
      return res.status(400).send({ message: "email not provided for signUP" });
    }
    if (!reqBody.password) {
      console.log("password not provided for signUP");
      return res.status(400).send({ message: "password not provided for signUP" });
    }

    const user1 = await userModel.findOne({ userID: reqBody.userID });
    if (user1) {
      console.log("user with provided userID already exists:", reqBody.userID);
      return res.status(409).send({ message: "user with provided userID already exists" });
    }

    const user2 = await userModel.findOne({ email: reqBody.email });
    if (user2) {
      console.log("user with provided email already exists:", reqBody.email);
      return res.status(409).send({ message: "user with provided email already exists" });
    }

    next();
  } catch (err) {
    console.log("Error occurred while verifying signUp body:", err);
    return res.status(500).send({ message: "Error occurred while verifying signUp body" });
  }
};

const signIn = async (req, res, next) => {
  try {
    req.user = req.user || {};
    const reqBody = req.body;

    if (!reqBody.email && !reqBody.userID) {
      return res.status(400).send({ message: "Neither email ID provided nor userID" });
    }

    if (!reqBody.password) {
      return res.status(400).send({ message: "password not provided for login" });
    }

    let user;
    if (reqBody.userID) {
      user = await userModel.findOne({ userID: reqBody.userID });
      if (!user) {
        return res.status(401).send({ message: "user with provided userID does not exist" });
      }
    } else {
      user = await userModel.findOne({ email: reqBody.email });
      if (!user) {
        return res.status(401).send({ message: "user with provided email does not exist" });
      }
    }
    // console.log(user.userType)
    req.user.userID = user.userID
    req.user.userType = user.userType;
    req.user.userReferenceId = user._id;

    next();
  } catch (err) {
    console.log("Error occurred while verifying signIn body:", err);
    res.status(500).send({ message: "Error occurred while verifying signIn body" });
  }
};

const authCheck = (req, res, next) => {
  try {
    req.user = req.user || {};
    const token = req.cookies?.jwt;

    if (!token) {
      return res.status(401).json({ message: "Token not provided" });
    }

    const tokenDetails = jwt.verify(token, process.env.JWT_SECRET);

    req.user.userID = tokenDetails.userID;
    req.user.userType = tokenDetails.userType;
    req.user.userReferenceId = tokenDetails.userReferenceId;

    next();
  } catch (err) {
    console.log("Not a valid token for authCheck request:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export { signUp, signIn, authCheck };
