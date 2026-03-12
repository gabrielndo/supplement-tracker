/**
 * Returns today's date as YYYY-MM-DD in the device's LOCAL timezone.
 * Unlike toISOString().split('T')[0] which uses UTC, this ensures
 * the day rolls over at local midnight.
 */
export const getLocalDateStr = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
