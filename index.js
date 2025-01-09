const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const SocketIOFileUpload = require("socketio-file-upload");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const PORT = 3001;
const CORS_ORIGIN = "*";
const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true }); // Create the directory if it doesn't exist
    console.log("Uploads directory created:", uploadsDir);
}

const users = {};
const rooms = {};

const app = express();
app.use(cors());
app.use(SocketIOFileUpload.router);
app.use("/uploads", express.static(uploadsDir)); // Serve the uploads directory

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

    const uploader = new SocketIOFileUpload();
    uploader.dir = uploadsDir; // Use the uploads directory
    uploader.listen(socket);

    uploader.on("saved", (event) => {
        console.log("File saved:", event.file.name);
        const fileMessage = {
            room: event.file.meta.room,
            id: socket.id,
            author: event.file.meta.username,
            fileName: event.file.name,
            filePath: `${BASE_URL}/uploads/${event.file.name}`,
            fileType: event.file.meta.type,
            time: new Date().toLocaleTimeString(),
        };
        socket.to(event.file.meta.room).emit("receive_file", fileMessage);
    });

    uploader.on("error", (event) => {
        console.error("Error in file upload:", event);
    });

    socket.on("join_room", ({ username, room }) => {
        if (users[username]) {
            socket.leave(users[username].room);
        }
        users[username] = { room, socketId: socket.id };
        socket.join(room);
        console.log(`${username} joined room: ${room}`);

        if (!rooms[room]) {
            rooms[room] = [];
        }
        rooms[room].push({ username, socketId: socket.id });

        socket.to(room).emit("receive_message", {
            author: "",
            message: `${username} has joined the room.`,
            time: new Date().toLocaleTimeString(),
        });

        socket.to(room).emit("user_joined", { username, id: socket.id });
        io.to(room).emit("update_users", rooms[room]);
    });

    socket.on("send_message", (data) => {
        console.log("Message received:", data);
        socket.to(data.room).emit("receive_message", data);
    });

    socket.on("ice_candidate", ({ candidate, targetId }) => {
        socket.to(targetId).emit("ice_candidate", { candidate, from: socket.id });
    });

    socket.on("offer", ({ offer, targetId }) => {
        socket.to(targetId).emit("offer", { offer, from: socket.id });
    });

    socket.on("answer", ({ answer, targetId }) => {
        socket.to(targetId).emit("answer", { answer, from: socket.id });
    });

    socket.on("disconnect", () => {
        console.log(`User Disconnected: ${socket.id}`);
        for (const [username, userData] of Object.entries(users)) {
            if (userData.socketId === socket.id) {
                const room = userData.room;
                socket.to(room).emit("user_left", { username, id: socket.id });
                delete users[username];
                if (rooms[room]) {
                    rooms[room] = rooms[room].filter((user) => user.socketId !== socket.id);
                    io.to(room).emit("update_users", rooms[room]);
                }
                break;
            }
        }
    });

    socket.on("reconnect_user", (username) => {
        if (users[username]) {
            const { room } = users[username];
            socket.join(room);
            console.log(`${username} reconnected to room: ${room}`);
            socket.to(room).emit("user_reconnected", { username });
        }
    });

    socket.on("media_state_change", ({ room, userId, type, isMuted, isEnabled, isSharing }) => {
        socket.to(room).emit("media_state_change", { userId, type, isMuted, isEnabled, isSharing });
    });

    socket.on("end_call", ({ room, ender }) => {
        io.to(room).emit("call_ended", { ender });
    });
});

server.listen(PORT, () => {
    console.log("SERVER RUNNING ON PORT", PORT);
});