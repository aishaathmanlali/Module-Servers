process.env.PORT = process.env.PORT || 9090;
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

app.use(cors());
app.use(express.json());

// Get __dirname in ES module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const welcomeMessage = {
  id: 0,
  from: "Aisha",
  text: "Welcome to my chat system!",
};

//This array is our "data store".
//We will start with one message in the array.
const messages = [welcomeMessage];

app.get("/", (request, response) => {
  response.sendFile(__dirname + "/index.html");
});

// To read all the messages
app.get("/messages", (request, response) => {
  response.send(messages);
});

//To read one specific message  by Id
app.get("/messages/:id", (request, response) => {
  const id = Number(request.params.id);
  const chosenMessage = messages.find((message) => message.id === id);
  if (chosenMessage) {
    response.send(chosenMessage);
  } else {
    response.status(404).send({ error: "Message not found" });
  }
});

//To create a new message
app.post("/messages", (request, response) => {
  const { from, text } = request.body;

  if (!from || !text) {
    return response
      .status(400)
      .send({ error: "'from' and 'text' fields are required" });
  }
  const newMessage = {
    id: messages.length,
    from: request.body.from,
    text: request.body.text,
  };
  messages.push(newMessage);
  response.status(201).send(newMessage);
});

//To delete a message by Id
app.delete("/messages/:id", (request, response) => {
  const id = Number(request.params.id);
  const messageIndex = messages.findIndex((message) => message.id === id);
  if (messageIndex !== -1) {
    messages.splice(messageIndex, 1);
    response.status(204).send();
  } else {
    response.status(404).json({ error: "Message not found" });
  }
});

//To search a message by text substring
app.get("/messages/search", (request, response) => {
  const searchTerm = request.query.text;
  if(!searchTerm){
    return response
      .status(400)
      .send({ error: "Query parameter 'text' is required" });
  }
  const filteredMessages = messages.filter(message => message.text.includes(searchTerm));
  response.send(filteredMessages);
});

// To get the most recent 10 messages
app.get("/messages/latest", (request, response) => {
  const latestMessages = messages.slice(-10).reverse();
  response.send(latestMessages);
});


app.listen(process.env.PORT, () => {
  console.log(`listening on PORT ${process.env.PORT}...`);
});