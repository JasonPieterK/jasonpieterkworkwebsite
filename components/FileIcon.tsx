import { createElement } from "react";
import type { IconProps } from "@phosphor-icons/react";
import { fileIconFor } from "@/lib/fileIcon";

/**
 * Renders the Phosphor icon matching a file's extension.
 *
 * The icon is looked up from a static map and rendered with createElement —
 * assigning the result to a capitalized local and using it as JSX reads as
 * "component defined during render" to the linter, which would remount the
 * icon subtree on every render.
 */
export default function FileIcon({ name, ...props }: { name: string } & IconProps) {
  return createElement(fileIconFor(name), props);
}
