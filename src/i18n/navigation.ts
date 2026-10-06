import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { redirect, usePathname, getPathname } =
  createNavigation(routing);
export { Link, useRouter } from "./navigation-client";
