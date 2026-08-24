"""Copy the shared keyframes each CSS module uses into that module.

Turbopack scopes every `animation-name` inside a CSS module, so a keyframe that
only exists in globals.css never resolves and the animation silently does
nothing. Re-run this after adding or changing a shared keyframe:

    python sync_keyframes.py <project-root>
"""
import glob
import os
import re
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
GLOBALS = os.path.join(ROOT, "app", "globals.css")

NOTE = (
    "/*\n"
    "  Turbopack scopes every animation-name in a CSS module, so a keyframe that\n"
    "  lives only in globals.css never resolves here and the animation silently\n"
    "  does nothing. Local copies of the shared keyframes this file uses.\n"
    "  Generated — re-run scripts/sync-keyframes to refresh.\n"
    "*/\n"
)


def top_level_keyframes(css: str) -> dict[str, str]:
    """Keyframes declared at brace depth 0 only (ignores @media overrides)."""
    out, depth, i = {}, 0, 0
    while i < len(css):
        if css[i] == "{":
            depth += 1
        elif css[i] == "}":
            depth -= 1
        elif depth == 0:
            m = re.match(r"@keyframes\s+([\w-]+)\s*\{", css[i:])
            if m:
                name = m.group(1)
                j, d = i + m.end() - 1, 0
                while j < len(css):
                    if css[j] == "{":
                        d += 1
                    elif css[j] == "}":
                        d -= 1
                        if d == 0:
                            break
                    j += 1
                out[name] = css[i : j + 1]
                i = j
        i += 1
    return out


def used_names(css: str) -> set[str]:
    names = set()
    for m in re.finditer(r"animation(?:-name)?\s*:\s*([^;]+);", css):
        for tok in re.split(r"[,\s]+", m.group(1)):
            names.add(tok.strip())
    return names


frames = top_level_keyframes(open(GLOBALS, encoding="utf-8").read())
targets = glob.glob(os.path.join(ROOT, "components", "*.module.css")) + glob.glob(
    os.path.join(ROOT, "app", "**", "*.module.css"), recursive=True
)

changed = 0
for path in targets:
    css = open(path, encoding="utf-8").read()
    i = css.find(NOTE[:60])
    if i != -1:  # drop a previous generation before regenerating
        css = css[:i].rstrip() + "\n"
    local = set(re.findall(r"@keyframes\s+([\w-]+)", css))
    missing = sorted((used_names(css) & frames.keys()) - local)
    if not missing:
        open(path, "w", encoding="utf-8").write(css)
        continue
    body = "\n\n".join(frames[n] for n in missing)
    open(path, "w", encoding="utf-8").write(css.rstrip() + "\n\n" + NOTE + "\n" + body + "\n")
    changed += 1
    print(f"  {os.path.relpath(path, ROOT):46s} + {', '.join(missing)}")

print(f"{changed} module(s) updated from {len(frames)} shared keyframes")
