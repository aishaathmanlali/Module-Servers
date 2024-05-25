// import all the stuff we need
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
import moment from "moment";
import bookings from "./bookings.json" with { type: "json" };

// initialise the server
const app = express();

app.use(express.json());
app.use(cors());

const saveBookings = async () => {
  await fs.writeFile("./bookings.json", JSON.stringify(bookings, null, 2));
};

const getNextId = () => {
  return bookings.length > 0 ? Math.max(...bookings.map(b => b.id)) + 1 : 1;
};

const validateBooking = (booking) => {
  const requiredFields = ["roomId", "title", "firstName", "surname", "email", "checkInDate", "checkOutDate"];
  return requiredFields.every(field => booking[field] && booking[field].toString().trim() !== "");
};

// Read all bookings
app.get("/bookings", (request, response) => {
  response.json(bookings);
});

// Get bookings by search(date)
app.get("/bookings/search", (request, response) => {
  const { date } = request.query;

  if (!date) {
    return response.status(400).json({ error: "Date query parameter is required" });
  }

  const searchDate = moment(date, "YYYY-MM-DD");
  if (!searchDate.isValid()) {
    return response.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
  }

  console.log(`Searching for bookings on date: ${searchDate.format("YYYY-MM-DD")}`);

  const results = bookings.filter(booking => {
    const checkInDate = moment(booking.checkInDate, "YYYY-MM-DD");
    const checkOutDate = moment(booking.checkOutDate, "YYYY-MM-DD");
    const isInRange = searchDate.isBetween(checkInDate, checkOutDate, null, '[]');
    console.log(`Booking ID: ${booking.id}, Check-in: ${checkInDate.format("YYYY-MM-DD")}, Check-out: ${checkOutDate.format("YYYY-MM-DD")}, Is in range: ${isInRange}`);
    return isInRange;
  });

  response.json(results);
});

//Read one specific booking by Id
app.get("/bookings/:id", (request, response) => {
  const id = Number(request.params.id);
  const chosenBooking = bookings.find((booking) => booking.id === id);
  if (chosenBooking) {
    response.send(chosenBooking);
  } else {
    response.status(404).send({ error: "Booking not found" });
  }
});

//To create a new booking
app.post("/bookings", async (request, response) => {
  const { roomId, title, firstName, surname, email, checkInDate, checkOutDate } = request.body;

  const newBooking = {
    id: getNextId(),
    roomId,
    title,
    firstName,
    surname,
    email,
    checkInDate,
    checkOutDate
  };

  if (!validateBooking(newBooking)) {
    return response.status(400).json({ error: "All fields are required and must not be empty" });
  }

  bookings.push(newBooking);

  try {
    await saveBookings();
    response.status(201).json(newBooking);
  } catch (error) {
    response.status(500).json({ error: "Failed to save booking" });
  }
});

// To delete a booking specified by Id
app.delete("/bookings/:id", async (request, response) => {
  const id = Number(request.params.id);
  const index = bookings.findIndex(booking => booking.id === id);

  if (index === -1) {
    return response.status(404).json({ error: "Booking not found" });
  }

  const [deletedBooking] = bookings.splice(index, 1);

  try {
    await saveBookings();
    response.json(deletedBooking);
  } catch (error) {
    response.status(500).json({ error: "Failed to delete booking" });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

// Render simple views for testing and exploring
// You can safely delete everything below if you wish

// Set EJS as the templating engine for the app
app.set("view engine", "ejs");
// Calculate __dirname in ES module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.set("views", path.join(__dirname, "views"));
// HERE WE MAKE ROUTES SAME AS ANY ENDPOINT, BUT USE RENDER INSTEAD OF SIMPLY RETURNING DATA
app.get("/", (req, res) => {
  // Use render to load up an ejs view file
  res.render("index", { title: "Hotel Booking Server" });
});
app.get("/guests", (req, res) => {
  res.render("guests", { bookings });
});
