export function dateTimeLocal(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
