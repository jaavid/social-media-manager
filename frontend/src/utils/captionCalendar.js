/**
 * Calendar URLs do not share the same workspace query contract.
 * Admin CalendarPage reads client; dashboard scope reads workspace.
 * The id comes from the access-checked useWorkspaceScope hook.
 */
export function captionCalendarHref(calendarPath, workspaceId, platform, text) {
  const params = new URLSearchParams({ draft: text, platform });
  if (Number.isSafeInteger(workspaceId) && workspaceId > 0) {
    params.set(calendarPath.startsWith('/admin/') ? 'client' : 'workspace', String(workspaceId));
  }
  return `${calendarPath}?${params.toString()}`;
}
