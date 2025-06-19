import movieModel from "../models/movieModel.js";

const validateMovie = async (req, res, next) => {
  console.log("Movie validation middleware called");

  try {
    const reqBody = req.body;
    console.log(reqBody);

    if (!reqBody.title) {
      console.log("title not provided for movie");
      return res.status(400).send({
        message: "title not provided for movie",
      });
    }

    if (
      reqBody.durationMinutes === undefined ||
      typeof reqBody.durationMinutes !== "number" ||
      reqBody.durationMinutes < 1
    ) {
      console.log("Invalid or missing durationMinutes");
      return res.status(400).send({
        message: "Invalid or missing durationMinutes",
      });
    }

    if (!reqBody.releaseDate || isNaN(Date.parse(reqBody.releaseDate))) {
      console.log("Invalid or missing releaseDate");
      return res.status(400).send({
        message: "Invalid or missing releaseDate",
      });
    }

    next();
  } catch (err) {
    console.log("Error occurred while verifying movie body", err.message);
    return res.status(500).send({
      message: "Error occurred while verifying movie body",
    });
  }
};

export { validateMovie };
