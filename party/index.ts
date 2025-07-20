// party/index.ts
import type * as Party from "partykit/server";
import { onConnect } from "y-partykit";

export default class YjsServer implements Party.Server {
  constructor(public party: Party.Room) {}

  async onConnect(conn: Party.Connection) {
    return onConnect(conn, this.party, {
      // Persist the Yjs document to PartyKit's built-in storage
      persist: {
        mode: "snapshot",
      },
      // You can also add a callback to sync the final document
      // to your MongoDB database after users stop editing.
      callback: {
        handler: async (yDoc) => {
          // This function is called after a period of inactivity.
          const content = yDoc.getText('codemirror').toString();
          const title = yDoc.getText('title').toString();
          
          console.log(`Saving document ${this.party.id}: ${title}`);
          
          // Here, you would add your logic to save to MongoDB.
          // For now, we'll just log it. You can implement the actual
          // database save later based on your existing API endpoints.
          
          // Example of how you might save to your database:
          // try {
          //   const response = await fetch(`${process.env.NEXTJS_URL}/api/notes/${this.party.id}`, {
          //     method: 'PUT',
          //     headers: { 'Content-Type': 'application/json' },
          //     body: JSON.stringify({ title, content }),
          //   });
          //   if (response.ok) {
          //     console.log(`Successfully saved document ${this.party.id} to database`);
          //   } else {
          //     console.error(`Failed to save document ${this.party.id} to database`);
          //   }
          // } catch (error) {
          //   console.error(`Error saving document ${this.party.id}:`, error);
          // }
        },
      }
    });
  }
}
