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

BEGIN = "/* BEGIN generated keyframes — scripts/sync-keyframes.py */"
END = "/* END generated keyframes */"

NOTE = (
    BEGIN + "\n"
    "/*\n"
    "  Turbopack scopes every animation-name in a CSS module, so a keyframe that\n"
    "  lives only in globals.css never resolves here and the animation silently\n"
    "  does nothing. Local copies of the shared keyframes this file uses.\n"
    "  Edits inside this block are overwritten; put real rules above it.\n"
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

    # Replace only what sits between the markers. Truncating from the marker to
    # end-of-file silently deleted any rule written after the generated block.
    start, stop = css.find(BEGIN), css.find(END)
    if start != -1 and stop != -1:
        css = (css[:start].rstrip() + "\n\n" + css[stop + len(END) :].lstrip()).rstrip() + "\n"
    elif start != -1:
        css = css[:start].rstrip() + "\n"
    else:
        # Pre-marker generations ended the file; strip from the old header.
        legacy = css.find("/*\n  Turbopack scopes every animation-name")
        if legacy != -1:
            css = css[:legacy].rstrip() + "\n"
    local = set(re.findall(r"@keyframes\s+([\w-]+)", css))
    missing = sorted((used_names(css) & frames.keys()) - local)
    if not missing:
        open(path, "w", encoding="utf-8").write(css)
        continue
    body = "\n\n".join(frames[n] for n in missing)
    open(path, "w", encoding="utf-8").write(
        css.rstrip() + "\n\n" + NOTE + "\n" + body + "\n\n" + END + "\n"
    )
    changed += 1
    print(f"  {os.path.relpath(path, ROOT):46s} + {', '.join(missing)}")

print(f"{changed} module(s) updated from {len(frames)} shared keyframes")
