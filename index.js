const express = require("express");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const port = 3000 || process.env.PORT;
const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

const emailToDevices = {};
const socketToInfo = {};

io.on("connection", (socket) => {
  socket.on("login", ({ email }) => {
    if (!emailToDevices[email]) emailToDevices[email] = [];

    const deviceNumber = emailToDevices[email].length + 1;
    emailToDevices[email].push({ socketId: socket.id, deviceNumber });
    socketToInfo[socket.id] = { email, deviceNumber };

    io.emit("device-logged-in");
    console.log(`🔌 ${email} logged in as Device ${deviceNumber}`);
  });

  socket.on("send-location", ({ email, latitude, longitude }) => {
    const info = socketToInfo[socket.id];
    if (!info || info.email !== email) {
      console.warn("🚨 Invalid location attempt");
      return;
    }

    const { deviceNumber } = info;
    io.emit("receive-location", { email, deviceNumber, latitude, longitude });
  });

  socket.on("disconnect", () => {
    const info = socketToInfo[socket.id];
    if (!info) return;
    const { email, deviceNumber } = info;

    emailToDevices[email] = emailToDevices[email].filter(d => d.socketId !== socket.id);
    if (emailToDevices[email].length === 0) delete emailToDevices[email];

    delete socketToInfo[socket.id];
    io.emit("user-disconnected", { email, deviceNumber });
    io.emit("device-logged-out");
    console.log(`❌ ${email} (Device ${deviceNumber}) disconnected`);
  });
});

app.get("/", (req, res) => {
  res.render("index");
});

server.listen(port, '0.0.0.0', () => {
  console.log("✅ Server running on http://localhost:3000");
});
