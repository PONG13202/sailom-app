import { io } from "socket.io-client";
import { config } from "./config";

export const socket = io(config.apiUrl, {
  transports: ["websocket"], // เพิ่มเพื่อความเสถียร
  autoConnect: true,
});
