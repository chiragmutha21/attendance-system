import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  const companyId = "00000000-0000-0000-0000-000000000000";
  let admin = await prisma.adminUser.findFirst();

  if (!admin) {
    console.log("No existing AdminUser found. Looking for an unused user in auth.users...");
    const unusedUserRows = await prisma.$queryRawUnsafe<{ id: string; email: string | null }[]>(
      `SELECT id, email FROM auth.users WHERE id::text NOT IN (SELECT auth_user_id::text FROM authentication) LIMIT 1`
    );
    const unusedUser = unusedUserRows[0];

    if (!unusedUser) {
      console.error("Error: No unused users found in auth.users. Please create a user in Supabase auth first.");
      process.exit(1);
    }

    const email = unusedUser.email || "admin@example.com";
    console.log(`Creating AdminUser for user: ${email}`);
    admin = await prisma.adminUser.create({
      data: {
        authUserId: unusedUser.id,
        name: email.split("@")[0],
        email: email,
        role: "SUPER_ADMIN",
        status: "active",
      },
    });
  } else {
    console.log(`Using existing AdminUser: ${admin.email} (ID: ${admin.id})`);
  }

  console.log("Seeding completed successfully. Dummy company and mock employees skipped.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
