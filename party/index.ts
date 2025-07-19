// party/index.ts
import type { PartyKitServer } from "partykit/server";
import * as Y from "yjs";

// Store per-room Y.Doc instances
const rooms: Map<string, Y.Doc> = new Map();

// Store per-room active user maps for chat:
// Map<roomId, Map<connectionId, { userId, userName }>>
const activeUserMap: Map<
  string,
  Map<
    string,
    {
      userId: string;
      userName: string;
    }
  >
> = new Map();

const server: PartyKitServer = {
  onConnect(connection, room) {
    // Get or create Y.Doc for this room
    if (!rooms.has(room.id)) {
      rooms.set(room.id, new Y.Doc());
    }
    const ydoc = rooms.get(room.id)!;

    // Initialize chat user info with defaults
    let userName = "Anonymous";
    let userId = connection.id;

    // Ensure chat user map exists for this room
    if (!activeUserMap.has(room.id)) {
      activeUserMap.set(room.id, new Map());
    }
    const userMap = activeUserMap.get(room.id)!;

    // Helper to broadcast current active users list for chat
    const broadcastActiveUsers = () => {
      const users = Array.from(userMap.values()).map((u) => u.userName);
      room.broadcast(
        JSON.stringify({
          type: "chatActiveUsers",
          users,
        })
      );
    };

    // Send current Y.Doc state to the new connection
    const sendYjsUpdate = () => {
      const update = Y.encodeStateAsUpdate(ydoc);
      if (update.length > 0) {
        connection.send(new Uint8Array([0, ...update]));
      }
    };

    // Send initial state
    sendYjsUpdate();

    // Listen for messages from client
    connection.addEventListener("message", (event) => {
      const data = event.data;

      // Handle binary Y.js updates
      if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        const update = new Uint8Array(data);
        
        // Apply update to Y.Doc
        Y.applyUpdate(ydoc, update.slice(1));
        
        // Broadcast to all other connections
        room.broadcast(data, [connection.id]);
        return;
      }

      // Handle text/JSON messages (chat functionality)
      let parsedData: any;
      try {
        parsedData = JSON.parse(data as string);
      } catch {
        console.error("Failed to parse message:", data);
        return;
      }

      // Handle chat initialization
      if (parsedData.type === "chatInit") {
        userName = parsedData.userName ?? userName;
        userId = parsedData.userId ?? userId;

        // Store user info keyed by connection.id
        userMap.set(connection.id, { userId, userName });

        console.log(`User ${userName} connected to chat in room ${room.id}`);

        // Broadcast presence join to everyone
        room.broadcast(
          JSON.stringify({
            type: "chatPresence",
            userId,
            userName,
            status: "joined",
          })
        );

        broadcastActiveUsers();
        return;
      }

      // Handle collaborative editing user info (for Y.js awareness)
      if (parsedData.type === "editorInit") {
        // Handle editor initialization if needed
        console.log(`Editor user ${parsedData.userName} connected to room ${room.id}`);
        return;
      }

      // Handle other chat message types only after chat init
      if (!userMap.has(connection.id)) {
        console.warn("Received chat message before chatInit:", parsedData);
        return;
      }

      switch (parsedData.type) {
        case "chat":
          room.broadcast(
            JSON.stringify({
              type: "chat",
              userId,
              userName,
              text: parsedData.text,
              timestamp: Date.now(),
            })
          );
          break;

        case "chatTyping":
          room.broadcast(
            JSON.stringify({
              type: "chatTyping",
              userId,
              userName,
              isTyping: parsedData.isTyping,
            }),
            [connection.id] // exclude sender
          );
          break;
      }
    });

    connection.addEventListener("close", () => {
      // Clean up chat user from map
      userMap.delete(connection.id);

      // Broadcast presence left if user no longer connected with any other connection
      const stillConnected = [...room.getConnections()].some((conn) => 
        userMap.has(conn.id)
      );

      if (!stillConnected) {
        room.broadcast(
          JSON.stringify({
            type: "chatPresence",
            userId,
            userName,
            status: "left",
          })
        );
      }

      broadcastActiveUsers();

      // Cleanup empty chat user map
      if (userMap.size === 0) {
        activeUserMap.delete(room.id);
      }

      // Clean up Y.Doc if no connections remain
      if (room.getConnections().size === 0) {
        rooms.delete(room.id);
      }
    });
  },
};

export default server;
