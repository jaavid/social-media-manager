// Celery Beat's schedule helper, served externally to keep inline scripts blocked.
document.addEventListener('DOMContentLoaded', () => {
  const data = document.getElementById('readable-crontabs');
  const field = document.getElementById('id_crontab');
  if (!data || !field) return;
  const translations = JSON.parse(data.textContent);
  const value = document.getElementById('crontab-description');
  if (!value) return;
  const update = () => { value.textContent = translations[field.value] || '—'; };
  field.addEventListener('change', update);
  update();
});
