// import all the stuff we need
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
import moment from "moment";
import validator from "validator";
import bookings from "./bookings.json" with { type: "json" };
import pkg from "pg";
const {Pool} = pkg;

const db = new Pool({
  user: "aisha",
  host: "localhost",
  database: "my_hotels",
  password: "",
  port: 5432,
});

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
  const hasRequiredFields = requiredFields.every(field => booking[field] && booking[field].toString().trim() !== "");

  if (!hasRequiredFields) {
    return { isValid: false, message: "All fields are required and must not be empty" };
  }

  if (!validator.isEmail(booking.email)) {
    return { isValid: false, message: "Invalid email address" };
  }

  const checkInDate = moment(booking.checkInDate, "YYYY-MM-DD");
  const checkOutDate = moment(booking.checkOutDate, "YYYY-MM-DD");

  if (!checkInDate.isValid() || !checkOutDate.isValid()) {
    return { isValid: false, message: "Invalid date format. Use YYYY-MM-DD" };
  }

  if (!checkOutDate.isAfter(checkInDate)) {
    return { isValid: false, message: "Check-out date must be after check-in date" };
  }

  return { isValid: true };
};

// Read all bookings
app.get("/bookings", function (request, response) {
  db.query("SELECT customers.id, customers.name, customers.email, reservations.room_no, reservations.checkin_date, reservations.checkout_date FROM customers INNER JOIN reservations ON customers.id = reservations.cust_id;")
    .then((result) => {
      response.status(200).json({ bookings: result.rows });
    })
    .catch((err) => {
      console.log(err);
    });
});

// Get bookings by search(term) or search(date)
app.get("/bookings/search", (request, response) => {
  const { date, term } = request.query;

  if (date) {
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

    return response.json(results);
  }

  if (term) {
    const searchTerm = term.toLowerCase();

    console.log(`Searching for bookings with term: ${searchTerm}`);


    const tw = "() OR ()"
    const results = bookings.filter(booking => {
      const matchesEmail = booking.email && booking.email.toLowerCase().includes(searchTerm);
      const matchesFirstName = booking.firstName && booking.firstName.toLowerCase().includes(searchTerm);
      const matchesSurname = booking.surname && booking.surname.toLowerCase().includes(searchTerm);

      console.log(`Booking ID: ${booking.id}, Email: ${matchesEmail}, FirstName: ${matchesFirstName}, Surname: ${matchesSurname}`);

      return matchesEmail || matchesFirstName || matchesSurname;
    });

    let sql = "SELECT c.id, c.name, c.email, r.room_no, r.checkin_date, r.checkout_date FROM customers AS c INNER JOIN reservations AS r ON c.id = r.cust_id WHERE ";

  if (date) {
    const searchDate = moment(date, "YYYY-MM-DD");
    if (!searchDate.isValid()) {
      return response.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }
    console.log(`Searching for bookings on date: ${searchDate.format("YYYY-MM-DD")}`);
    sql += "(searchDate BETWEEN r.checkin_date AND r.checkout_date)"
  }
  if (term) {
    if (date) {
      sql += " AND ";
    }
    sql += "() OR ()"
  }

    return response.json(results);
  }

  return response.status(400).json({ error: "A search term or date query parameter is required" });
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
