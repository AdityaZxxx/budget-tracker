import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// pg v8 warns that `sslmode` values like `require` will change meaning in
// pg v9, so drop the param from the URL; TLS is configured via `ssl` below.
const stripSslMode = (url: string | undefined) => {
  if (!url) return url;
  const parsed = new URL(url);
  parsed.searchParams.delete("sslmode");
  return parsed.toString();
};

const prismaClientSingleton = () => {
  const adapter = new PrismaPg({
    connectionString: stripSslMode(process.env.POSTGRES_PRISMA_URL),
    // Postgres hosts like Neon require TLS; pass it explicitly instead of
    // relying on the sslmode query param in the connection string.
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
