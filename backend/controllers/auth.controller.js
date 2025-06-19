import userModel from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import generateToken from "../lib/jwt.js";
import "dotenv/config.js";

const salt = 8;

const signUp = async (req, res) => {
  try {
    const reqBody = req.body;
    console.log(reqBody);

    const user = {
      fullName: reqBody.fullName,
      userID: reqBody.userID,
      email: reqBody.email,
      password: bcrypt.hashSync(reqBody.password, salt),
      userType: "USER",
    };

    if (reqBody.userType) {
      user.userType = reqBody.userType;
    }

    const ret = await userModel.create(user);
    console.log("user successfully created", ret);

    const userData = {
      userID: reqBody.userID,
      userType: reqBody.userType,
      userReferenceId: ret._id,
    };

    const token = generateToken(userData, res);
    res.status(200).send(userData);
  } catch (err) {
    console.log("error while creating user", err);
    res.status(500).send({ message: "error while creating user" });
  }
};

const signInHelper = async (req, res, user) => {
  const reqBody = req.body;
  try {
    const isPassValid = bcrypt.compareSync(reqBody.password, user.password);
    if (!isPassValid) {
      console.log("wrong password");
      return res.status(401).send({ message: "wrong password" });
    }

    console.log("Valid user, password matched");

    const userData = {
      userID: reqBody.userID,
      userType: reqBody.userType,
      userReferenceId: req.body.userReferenceId,
    };

    const token = generateToken(userData, res);
    res.status(200).send(userData);
  } catch (err) {
    console.log("error occurred while signing in", err);
    res.status(500).send({ message: "error occurred while signing in" });
  }
};

const signIn = async (req, res) => {
  try {
    const reqBody = req.body;

    let user;
    if (reqBody.email) {
      user = await userModel.findOne({ email: reqBody.email });
    } else {
      user = await userModel.findOne({ userID: reqBody.userID });
    }

    signInHelper(req, res, user);
  } catch (err) {
    console.log("error occurred while signing in", err);
    res.status(500).send({ message: "error occurred while signing in" });
  }
};

const authCheck = async (req, res) => {
  try {
    const token = req.cookies?.jwt;

    const tokenDetails = jwt.verify(token, process.env.JWT_SECRET);

    const userData = {
      userID: tokenDetails.userID,
      userType: tokenDetails.userType,
      userReferenceId: tokenDetails.userReferenceId,
    };

    res.status(200).send(userData);
  } catch (err) {
    console.log("Not a Valid token for authCheck request", err.message);
    return res.status(401).send({
      message: "Not a Valid token for authCheck request",
    });
  }
};

const logout = async (req, res) => {
  console.log("Logout requested");
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
    console.log("Logged out successfully");
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export { signUp, signIn, authCheck, logout };
