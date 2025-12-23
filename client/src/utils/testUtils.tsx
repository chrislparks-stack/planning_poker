import {User} from "@/types";

export function withTestUsers(testUserCount: number, users?: User[]): User[] {
  const safeUsers = users ?? [];

  if (!import.meta.env.DEV) return safeUsers;

  return [
    ...safeUsers,
    ...Array.from({ length: testUserCount }, (_, i) => ({
      id: `test-user-${i}`,
      username: `Test User ${i + 1}`,
    })),
  ];
}