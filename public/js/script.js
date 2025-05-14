const socket = io();
let userEmail = null;
let userPassword = null;

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

function startTracking() {
  if (!navigator.geolocation) return alert("Geolocation not supported.");
  setInterval(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        socket.emit("send-location", { latitude, longitude });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  }, 5000);
}

const map = L.map("map").setView([0, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const markers = {};
let devicesCount = 0;

function updateMapBounds() {
  const markerList = Object.values(markers);
  if (markerList.length === 0) return;
  const group = new L.featureGroup(markerList);
  map.fitBounds(group.getBounds().pad(0.2));
}

socket.on("receive-location", ({ email, deviceNumber, latitude, longitude }) => {
  const key = `${email}_${deviceNumber}`;
  const label = `${email} (Device ${deviceNumber})`;
  if (markers[key]) {
    markers[key].setLatLng([latitude, longitude]);
  } else {
    markers[key] = L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(label)
      .openPopup();
  }
  updateMapBounds();
});

socket.on("user-disconnected", ({ email, deviceNumber }) => {
  const key = `${email}_${deviceNumber}`;
  if (markers[key]) {
    map.removeLayer(markers[key]);
    delete markers[key];
    updateMapBounds();
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

