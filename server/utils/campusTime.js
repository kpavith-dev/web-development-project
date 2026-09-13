export const CAMPUS_TIME_ZONE = 'Asia/Colombo';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CAMPUS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: CAMPUS_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

const partsToObject = (parts) => Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));

export const campusDateKey = (value = new Date()) => {
  const { year, month, day } = partsToObject(dateFormatter.formatToParts(value));
  return `${year}-${month}-${day}`;
};

export const campusTime = (value = new Date()) => {
  const { hour, minute } = partsToObject(timeFormatter.formatToParts(value));
  return `${hour}:${minute}`;
};

export const parseCampusDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
};

export const campusDateBounds = (value) => {
  const date = typeof value === 'string' ? parseCampusDate(value) : parseCampusDate(campusDateKey(value));
  if (!date) return null;
  return { date, nextDate: new Date(date.getTime() + 24 * 60 * 60 * 1000) };
};

// Sri Lanka has a fixed UTC+05:30 offset and does not observe daylight saving time.
export const campusDateTime = (bookingDate, time) => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) return null;
  const dateKey = typeof bookingDate === 'string' ? bookingDate : campusDateKey(bookingDate);
  const date = parseCampusDate(dateKey);
  if (!date) return null;
  const [hour, minute] = time.split(':').map(Number);
  return new Date(date.getTime() + ((hour * 60 + minute) - 330) * 60 * 1000);
};
