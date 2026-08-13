export const OWNER = "JasonPieterK";
export const REPO = "jasonpieterkwork";
export const BRANCH = "main";
export const ROOT_PREFIX = "!!jasonpieterkwork/";

export function githubTreeUrl(subjectName: string, semester?: string): string {
  const path = semester ? `${subjectName}/${semester}` : subjectName;
  return `https://github.com/${OWNER}/${REPO}/tree/${BRANCH}/${encodeURI(ROOT_PREFIX + path)}`;
}
