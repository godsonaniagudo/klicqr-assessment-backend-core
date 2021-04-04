const express = require("express");
const app = express();
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const { default: axios } = require("axios");
const PORT = process.env.PORT || 8087;
require("dotenv").config();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Create database connection object
console.log(process.env.HOST);
const connection = mysql.createConnection({
  host: process.env.HOST,
  database: process.env.DATABASE,
  user: process.env.USER,
  password: process.env.PASSWORD,
});

//Connect to database
connection.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("Connected");
  }
});

//Declare endpoint for retrieving all users
app.get("/users", (req, res) => {
  //Query database for all user records
  connection.query(
    "SELECT users.id, users.first_name, users.last_name, users.avatar, users.created_at, COUNT(users.id) as count FROM users INNER JOIN transactions on users.id=transactions.user_id GROUP BY users.id,users.first_name, users.last_name, users.avatar, users.created_at",
    (err, rows, fields) => {
      if (err) {
        //Return error if query fails
        res.status(400).send({ response: "Failed", error: err });
      } else {
        //Return response if query is successful
        res.send({ status: 200, data: rows });
      }
    }
  );
});

//Declare endpoint for retrieving individual user details
app.get("/users/:id", (req, res) => {
  if (req.params.id) {
    //Query user details from database
    connection.query(
      `SELECT type,SUM(amount)
      FROM transactions 
      WHERE user_id=${req.params.id}
      GROUP BY type;`,
      async (err, rows, fields) => {
        if (err) {
          res.status(400).send({ response: "Failed", error: err });
        } else {
          //Retrieve trends from Trends service
          try {
            const trendsResponse = await axios.get(
              "http://localhost:8086/trends/" + req.params.id
            );

            console.log("Getting similarities");
            //Retrieve similarities from similarities service
            const similaritiesResponse = await axios.get(
              "http://localhost:8089/similarities/" + req.params.id
            );

            //return responses from user stats, trends and similarities
            res.send({
              status: 200,
              stats: rows,
              trends: trendsResponse.data,
              similarities: similaritiesResponse.data.data,
            });
          } catch (error) {
            res.status(400).send({ response: "Failed", error });
          }
        }
      }
    );
  }
});

app.listen(PORT, () => {
  console.log("Server started on port 8087");
});
