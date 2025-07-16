import type { PartyKitServer } from "partykit/server";

// Store per-room active user maps:
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

const ChatRoom: PartyKitServer = {
  onConnect(connection, room) {
    // Initialize user info with defaults
    let userName = "Anonymous";
    let userId = connection.id;

    // Ensure map exists for this room
    if (!activeUserMap.has(room.id)) {
      activeUserMap.set(room.id, new Map());
    }
    const userMap = activeUserMap.get(room.id)!;

    // Add a helper to broadcast current active users list
    const broadcastActiveUsers = () => {
      const users = Array.from(userMap.values()).map((u) => u.userName);
      room.broadcast(
        JSON.stringify({
          type: "activeUsers",
          users,
        })
      );
    };

    // Listen for messages from client
    connection.addEventListener("message", (event) => {
      let data: any;
      try {
        data = JSON.parse((event as MessageEvent).data);
      } catch {
        console.error("Failed to parse message:", event.data);
        return;
      }

      // First message should be init with user info
      if (data.type === "init") {
        userName = data.userName ?? userName;
        userId = data.userId ?? userId;

        // Store user info keyed by connection.id
        userMap.set(connection.id, { userId, userName });

        console.log(`User ${userName} connected with ID ${userId} to room ${room.id}`);

        // Broadcast presence join to everyone
        room.broadcast(
          JSON.stringify({
            type: "presence",
            userId,
            userName,
            status: "joined",
          })
        );

        broadcastActiveUsers();

        return;
      }

      // Handle other message types only after init
      if (!userMap.has(connection.id)) {
        console.warn("Received message before init:", data);
        return;
      }

      switch (data.type) {
        case "chat":
          room.broadcast(
            JSON.stringify({
              type: "chat",
              userId,
              userName,
              text: data.text,
              timestamp: Date.now(),
            })
          );
          break;

        case "typing":
          room.broadcast(
            JSON.stringify({
              type: "typing",
              userId,
              userName,
              isTyping: data.isTyping,
            }),
            [connection.id] // optionally exclude sender
          );
          break;
      }
    });

    connection.addEventListener("close", () => {
      // Remove user from map
      userMap.delete(connection.id);

      // Broadcast presence left if user no longer connected with any other connection
      const stillConnected = [...room.getConnections()].some((conn) => userMap.has(conn.id));

      if (!stillConnected) {
        room.broadcast(
          JSON.stringify({
            type: "presence",
            userId,
            userName,
            status: "left",
          })
        );
      }

      broadcastActiveUsers();

      // Cleanup empty room map
      if (userMap.size === 0) {
        activeUserMap.delete(room.id);
      }
    });
  },
};

export default ChatRoom;
