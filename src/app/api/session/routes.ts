// src/app/api/session/route.ts
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb/connect";
import User from "@/lib/mongodb/models/User";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    await connectToDatabase();

    const existingUser = await User.findOne({ clerkId: user.id });
    if (!existingUser) {
      const newUser = await User.create({
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        name: user.firstName + " " + user.lastName,
        image: user.imageUrl,
      });
      return Response.json(newUser);
    }

    return Response.json(existingUser);
  } catch (error) {
    console.error("Session error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
