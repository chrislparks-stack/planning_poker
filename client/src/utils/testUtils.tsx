import { User } from "@/types";

/**
 * Set this to the number of synthetic players needed while testing room
 * layouts locally. Test users are never added in production builds.
 */
export const DEV_TEST_USER_COUNT = 0;

export function withTestUsers(testUserCount: number, users?: User[]): User[] {
  const safeUsers = users ?? [];

  if (!import.meta.env.DEV) return safeUsers;

  return [
    ...safeUsers,
    ...Array.from({ length: testUserCount }, (_, i) => ({
      id: `test-user-${i}`,
      username: `Test User ${i + 1}`,
      handRaised: false,
      voteUncensored: false
    }))
  ];
}
