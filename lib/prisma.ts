import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  const adapter = new PrismaPg({
    connectionString: process.env.POSTGRES_PRISMA_URL,
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
