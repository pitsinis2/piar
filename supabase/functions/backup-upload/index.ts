import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

interface BackupRequest {
  backup: {
    version: string;
    exportedAt: string;
    orgCode: string;
    backupId: string;
    data: {
      projects: unknown[];
      areas: unknown[];
      notes: unknown[];
      tasks: unknown[];
      teamMembers: unknown[];
    };
    stats: {
      projectCount: number;
      areaCount: number;
      noteCount: number;
      taskCount: number;
      memberCount: number;
    };
    integrity: {
      checksum: string;
      rowCounts: unknown;
    };
  };
  googleAccessToken: string;
}

function getEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

async function ensureBackupFolder(
  accessToken: string,
  orgCode: string,
  orgName?: string
): Promise<string> {
  // Find or create "ProjectManagerWeb Backups" folder
  const folderName = "ProjectManagerWeb Backups";
  let parentFolderId = "root";

  // Search for existing folder
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (searchResponse.ok) {
    const searchData = await searchResponse.json();
    if (searchData.files && searchData.files.length > 0) {
      parentFolderId = searchData.files[0].id;
    }
  }

  // If not found, create it
  if (parentFolderId === "root") {
    const createResponse = await fetch(
      "https://www.googleapis.com/drive/v3/files",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
        }),
      }
    );

    if (createResponse.ok) {
      const folderData = await createResponse.json();
      parentFolderId = folderData.id;
    }
  }

  // Create org-specific subfolder
  const orgFolderName = `${orgCode}_${orgName || orgCode}`;
  let orgFolderId = "root";

  const orgSearchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${orgFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentFolderId}' in parents&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (orgSearchResponse.ok) {
    const orgSearchData = await orgSearchResponse.json();
    if (orgSearchData.files && orgSearchData.files.length > 0) {
      orgFolderId = orgSearchData.files[0].id;
    }
  }

  // If not found, create it
  if (orgFolderId === "root") {
    const createOrgResponse = await fetch(
      "https://www.googleapis.com/drive/v3/files",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: orgFolderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentFolderId],
        }),
      }
    );

    if (createOrgResponse.ok) {
      const orgFolderData = await createOrgResponse.json();
      orgFolderId = orgFolderData.id;
    }
  }

  return orgFolderId;
}

async function uploadToGoogleDrive(
  accessToken: string,
  fileName: string,
  fileContent: string,
  folderId: string
): Promise<{ fileId: string; fileName: string; sizeKB: number }> {
  const metadata = {
    name: fileName,
    mimeType: "application/json",
    parents: [folderId],
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", new Blob([fileContent], { type: "application/json" }));

  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload to Google Drive failed: ${error}`);
  }

  const result = await response.json();
  const fileSizeKB = Math.round(fileContent.length / 1024);
  return {
    fileId: result.id,
    fileName: result.name,
    sizeKB: fileSizeKB,
  };
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { backup, googleAccessToken } = (await req.json()) as BackupRequest;

    if (!backup || !googleAccessToken) {
      return new Response(
        JSON.stringify({ error: "Missing backup data or Google token" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify request is from authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Prepare backup JSON
    const backupJson = JSON.stringify(backup, null, 2);

    // Create filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "")
      .replace(/Z$/, "");
    const fileName = `backup_${timestamp}.json`;

    // Ensure backup folder exists
    const folderId = await ensureBackupFolder(
      googleAccessToken,
      backup.orgCode
    );

    // Upload to Google Drive
    const uploadResult = await uploadToGoogleDrive(
      googleAccessToken,
      fileName,
      backupJson,
      folderId
    );

    // Record in backup_history via Supabase
    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Get user ID from JWT if available
    const token = authHeader.substring(7);
    let userId: string | null = null;
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      userId = decoded.sub;
    } catch {
      // If JWT decode fails, we'll use null for created_by_user_id
    }

    await supabase.from("backup_history").insert([
      {
        org_code: backup.orgCode,
        backup_file_id: uploadResult.fileId,
        backup_file_name: uploadResult.fileName,
        backup_size_kb: uploadResult.sizeKB,
        backup_checksum: backup.integrity.checksum,
        backup_status: "success",
        created_by_user_id: userId,
        notes: "Manual backup via app",
      },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        fileId: uploadResult.fileId,
        fileName: uploadResult.fileName,
        sizeKB: uploadResult.sizeKB,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Backup upload error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
