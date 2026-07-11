import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    const dbUser = await db.adminUser.findUnique({
      where: { email: emailLower },
    });

    // Initialize Supabase admin client
    const supabase = getSupabaseServerClient();

    // Check if user already exists in Supabase auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error("List users error:", listError);
      return NextResponse.json({ error: "Failed to verify user credentials" }, { status: 500 });
    }

    const existingUser = users.find(u => u.email?.toLowerCase() === emailLower);

    if (existingUser) {
      // Check if the user has an empty password hash in auth.users database table
      const rawUserRows = await db.$queryRawUnsafe<{ encrypted_password?: string }[]>(
        `SELECT encrypted_password FROM auth.users WHERE email = $1 LIMIT 1`,
        emailLower
      );
      
      const hasEmptyPassword = !rawUserRows || rawUserRows.length === 0 || !rawUserRows[0].encrypted_password || rawUserRows[0].encrypted_password.length < 10;

      if (hasEmptyPassword) {
        // Set password for the first time
        const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
          password: password,
          email_confirm: true
        });

        if (updateError) {
          console.error("Update user password error:", updateError);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // Also update AdminUser record with authUserId if not set
        if (dbUser && !dbUser.authUserId) {
          await db.adminUser.update({
            where: { email: emailLower },
            data: { authUserId: existingUser.id },
          });
        }
      }
    } else {
      // If the user does not exist in Supabase auth, create it
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: emailLower,
        password: password,
        email_confirm: true,
      });

      if (createError) {
        console.error("Create auth user error:", createError);
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      if (dbUser && newUser.user) {
        await db.adminUser.update({
          where: { email: emailLower },
          data: { authUserId: newUser.user.id },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Login helper error:", err);
    return NextResponse.json({ error: err.message || "Authentication helper failed" }, { status: 500 });
  }
}
