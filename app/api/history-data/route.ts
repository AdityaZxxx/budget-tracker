import prisma from "@/lib/prisma";
import { Period, Timeframe } from "@/lib/types";
import { currentUser } from "@clerk/nextjs/server";
import { getDaysInMonth } from "date-fns";
import { redirect } from "next/navigation";
import { z } from "zod";

type HistoryData = {
  year: number;
  month: number;
  expense: number;
  income: number;
  day?: number;
};

const getHistoryDataSchema = z.object({
  timeframe: z.enum(["month", "year"]),
  month: z.coerce.number().min(0).max(11).default(0),
  year: z.coerce.number().min(2000).max(3000),
});

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get("timeframe");
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const queryParams = getHistoryDataSchema.safeParse({
    timeframe,
    month,
    year,
  });

  if (!queryParams.success) {
    return Response.json(queryParams.error.message, { status: 400 });
  }

  const data = await getHistoryData(user.id, queryParams.data.timeframe, {
    month: queryParams.data.month,
    year: queryParams.data.year,
  });

  return Response.json(data);
}

export type GetHistoryDataResponseType = Awaited<
  ReturnType<typeof getHistoryData>
>;

async function getHistoryData(
  userId: string,
  timeframe: Timeframe,
  period: Period
) {
  switch (timeframe) {
    case "year":
      return await getYearHistoryData(userId, period.year);
    case "month":
      return await getMonthHistoryData(userId, period.year, period.month);
  }
}

async function getYearHistoryData(userId: string, year: number) {
  const result = await prisma.yearHistory.groupBy({
    by: ["month"],
    where: { userId, year },
    _sum: { expense: true, income: true },
    orderBy: [{ month: "asc" }],
  });

  if (!result || result.length === 0) return [];

  const dataMap = new Map(result.map((row) => [row.month, row._sum]));
  const history: HistoryData[] = [];

  for (let i = 0; i < 12; i++) {
    const monthData = dataMap.get(i);
    history.push({
      year,
      month: i,
      expense: monthData?.expense || 0,
      income: monthData?.income || 0,
    });
  }
  return history;
}

async function getMonthHistoryData(
  userId: string,
  year: number,
  month: number
) {
  const result = await prisma.monthHistory.groupBy({
    by: ["day"],
    where: { userId, year, month },
    _sum: { expense: true, income: true },
    orderBy: [{ day: "asc" }],
  });

  if (!result || result.length === 0) return [];

  const history: HistoryData[] = [];
  const dataMap = new Map(result.map((row) => [row.day, row._sum]));

  const daysInMonth = getDaysInMonth(new Date(year, month));
  for (let i = 1; i <= daysInMonth; i++) {
    const dayData = dataMap.get(i);
    history.push({
      expense: dayData?.expense || 0,
      income: dayData?.income || 0,
      year,
      month,
      day: i,
    });
  }

  return history;
}
