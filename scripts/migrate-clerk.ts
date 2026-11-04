/**
 * One-off script to migrate users from Clerk to Better Auth.
 *
 * Steps:
 *   1. Export users from the Clerk dashboard (CSV) and save it as
 *      `exported_users.csv` in the project root.
 *   2. Make sure `CLERK_SECRET_KEY` and the Postgres env vars are set (e.g. in `.env.local`).
 *   3. Run: pnpm migrate:clerk
 *
 * Migrated users keep their original Clerk IDs, so existing rows in the
 * app tables (userId) stay valid. Clerk passwords are bcrypt hashes, which
 * lib/auth.ts verifies, so users can sign in with their existing passwords.
 */
import { parse } from "csv-parse/sync";
import { readFileSync } from "node:fs";
import { auth } from "@/lib/auth";

type ClerkCsvRow = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  primary_email_address: string;
  primary_phone_number: string;
  verified_email_addresses: string;
  unverified_email_addresses: string;
  verified_phone_numbers: string;
  unverified_phone_numbers: string;
  totp_secret: string;
  password_digest: string;
  password_hasher: string;
};

type ClerkApiUser = {
  id: string;
  image_url: string;
  created_at: number;
  updated_at: number;
  external_accounts?: {
    id: string;
    provider: string;
    provider_user_id: string;
    identification_id: string;
    approved_scopes: string;
    email_address: string;
    created_at: number;
    updated_at: number;
  }[];
};

function getCSVData(csv: string): ClerkCsvRow[] {
  return parse(csv, {
    columns: true,
    skip_empty_lines: true,
  }) as ClerkCsvRow[];
}

function safeDateConversion(timestamp?: number): Date {
  if (!timestamp) return new Date();
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return new Date();
  const year = date.getFullYear();
  if (year < 2000 || year > 2100) return new Date();
  return date;
}

async function getClerkUsers(totalUsers: number): Promise<ClerkApiUser[]> {
  const clerkUsers: ClerkApiUser[] = [];
  for (let i = 0; i < totalUsers; i += 500) {
    const response = await fetch(
      `https://api.clerk.com/v1/users?offset=${i}&limit=${500}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }
    const data = await response.json();
    clerkUsers.push(...(data as ClerkApiUser[]));
  }
  return clerkUsers;
}

async function migrateFromClerk() {
  const exportedUserCSV = readFileSync("exported_users.csv", "utf8");
  const jsonData = getCSVData(exportedUserCSV);
  const clerkUsers = await getClerkUsers(jsonData.length);
  const ctx = await auth.$context;

  for (const user of jsonData) {
    const {
      id,
      first_name,
      last_name,
      primary_email_address,
      verified_email_addresses,
      password_digest,
    } = user;
    const clerkUser = clerkUsers.find((u) => u.id === id);

    const createdUser = await ctx.adapter
      .create<{ id: string }>({
        model: "user",
        data: {
          id,
          email: primary_email_address,
          emailVerified: verified_email_addresses.length > 0,
          name: `${first_name} ${last_name}`.trim(),
          image: clerkUser?.image_url,
          createdAt: safeDateConversion(clerkUser?.created_at),
          updatedAt: safeDateConversion(clerkUser?.updated_at),
        },
        forceAllowId: true,
      })
      .catch(async () => {
        return await ctx.adapter.findOne<{ id: string }>({
          model: "user",
          where: [{ field: "id", value: id }],
        });
      });

    if (!createdUser) {
      throw new Error(`Unable to create or find user ${id}`);
    }

    // Credential account: Clerk's bcrypt password digest, verified by the
    // bcrypt config in lib/auth.ts.
    if (password_digest) {
      await ctx.adapter.create({
        model: "account",
        data: {
          providerId: "credential",
          accountId: createdUser.id,
          userId: createdUser.id,
          password: password_digest,
          createdAt: safeDateConversion(clerkUser?.created_at),
          updatedAt: safeDateConversion(clerkUser?.updated_at),
        },
      });
    }

    // External (OAuth) accounts.
    for (const externalAccount of clerkUser?.external_accounts ?? []) {
      await ctx.adapter.create({
        model: "account",
        data: {
          id: externalAccount.id,
          providerId: externalAccount.provider.replace("oauth_", ""),
          accountId: externalAccount.provider_user_id,
          scope: externalAccount.approved_scopes,
          userId: createdUser.id,
          createdAt: safeDateConversion(externalAccount.created_at),
          updatedAt: safeDateConversion(externalAccount.updated_at),
        },
        forceAllowId: true,
      });
    }

    console.log(`Migrated user ${primary_email_address}`);
  }
}

migrateFromClerk()
  .then(() => {
    console.log("Migration completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
