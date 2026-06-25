import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { artifacts } from "@/lib/db/models";
import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const artifactRows = await db
        .select()
        .from(artifacts)
        .where(eq(artifacts.id, id))
        .limit(1);
        
      const artifact = artifactRows[0];

      if (!artifact) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (artifact.userId !== userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      return NextResponse.json(artifact);
    }

    // List all artifacts
    const userArtifacts = await db
      .select({
        id: artifacts.id,
        title: artifacts.title,
        type: artifacts.type,
        projectId: artifacts.projectId,
        createdAt: artifacts.createdAt,
        updatedAt: artifacts.updatedAt,
      })
      .from(artifacts)
      .where(eq(artifacts.userId, userId))
      .orderBy(desc(artifacts.createdAt));

    return NextResponse.json(userArtifacts);
  } catch (error) {
    console.error("Failed to fetch artifacts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
