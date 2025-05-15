const socket = io();
let userEmail = null;
let userPassword = null;
let locationHistory = {};
const markers = {};
let devicesCount = 0;

function login(event) {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!email || !password) return alert("Please enter email and password");

  userEmail = email;
  userPassword = password;

  socket.emit("login", { email });
  document.getElementById("user-email").textContent = userEmail;

  document.getElementById("login-container").style.display = "none";
  document.getElementById("container").style.display = "flex";

  setTimeout(() => map.invalidateSize(), 300);
  startTracking();
}

function logout() {
  socket.disconnect();
  location.reload(); // Quick reset
}

function startTracking() {
  if (!navigator.geolocation) return alert("Geolocation not supported.");
  setInterval(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        socket.emit("send-location", { email: userEmail, latitude, longitude });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  }, 5000);
}

// Map setup
const map = L.map("map").setView([0, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

// Update map bounds
function updateMapBounds() {
  const markerList = Object.values(markers);
  if (markerList.length === 0) return;
  const group = new L.featureGroup(markerList);
  map.fitBounds(group.getBounds().pad(0.2));
}

// Add device to list
function updateDeviceList() {
  const list = document.getElementById("device-list");
  list.innerHTML = "";
  Object.keys(markers).forEach((key) => {
    const li = document.createElement("li");
    li.textContent = key.replace("_", " (Device ") + ")";
    list.appendChild(li);
  });
}

socket.on("receive-location", ({ email, deviceNumber, latitude, longitude }) => {
  const key = `${email}_${deviceNumber}`;
  const label = `${email} (Device ${deviceNumber})`;

  if (!locationHistory[key]) locationHistory[key] = [];
  locationHistory[key].push([latitude, longitude]);

  if (markers[key]) {
    markers[key].setLatLng([latitude, longitude]);
  } else {
    markers[key] = L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(label)
      .openPopup();
  }

  // Draw trail
  const polyline = L.polyline(locationHistory[key], { color: "blue" }).addTo(map);
  updateMapBounds();
  updateDeviceList();
});

socket.on("user-disconnected", ({ email, deviceNumber }) => {
  const key = `${email}_${deviceNumber}`;
  if (markers[key]) {
    map.removeLayer(markers[key]);
    delete markers[key];
    updateMapBounds();
    updateDeviceList();
  }
});

socket.on("device-logged-in", () => {
  devicesCount++;
  document.getElementById("device-count").textContent = devicesCount;
});

socket.on("device-logged-out", () => {
  devicesCount--;
  if (devicesCount < 0) devicesCount = 0;
  document.getElementById("device-count").textContent = devicesCount;
});
