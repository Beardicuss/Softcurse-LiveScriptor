export function getApiBaseUrl(): string {
  return '/api';
}

export async function downloadProjectZip(projectId: string, projectName: string) {
  const response = await fetch(`${getApiBaseUrl()}/projects/${projectId}/download`);
  if (!response.ok) throw new Error('Download failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
