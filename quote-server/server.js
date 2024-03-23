// server.js
// This is where your node app starts

//load the 'express' module which makes writing webservers easy
import express, { request, response } from "express";
//load the quotes JSON
import quotes from "./quotes.json" assert { type: "json" };

const app = express();
// Now register handlers for some routes:
//   /                  - Return some helpful welcome info (text)
//   /quotes            - Should return all quotes (json)
//   /quotes/random     - Should return ONE quote (json)
app.get("/quotes", (req, res) => {
  res.send(quotes);
});

app.get("/quote", (req, res) => {
  res.send(pickFromArray(quotes));
});

app.get("/quotes/search", (req, res) => {
  let searchQuery = req.query.term.toLowerCase();
  const foundQuote = quotes.find((quote) => {
    return (
      quote.quote.toLowerCase().includes(searchQuery) || quote.author.toLowerCase().includes(searchQuery)
    );
  });
  res.send(foundQuote);
});


//START OF YOUR CODE...

//...END OF YOUR CODE

//You can use this function to pick one element at random from a given array
//example: pickFromArray([1,2,3,4]), or
//example: pickFromArray(myContactsArray)
//
const pickFromArray = (arrayofQuotes) =>
  arrayofQuotes[Math.floor(Math.random() * arrayofQuotes.length)];

//Start our server so that it listens for HTTP requests!
const listener = app.listen(3001, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
