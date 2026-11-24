import { cookies } from "next/headers";

/**
 * Use this hook to get the user id from a server component. Useful because server components don't have access to the user context.
 * @returns
 */
export default async function useServerUser() {
  const cookieStore = await cookies();
  const uid = cookieStore.get("uid");

  return {
    uid,
  };
}
