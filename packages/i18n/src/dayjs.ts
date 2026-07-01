import dayjs from 'dayjs';
import 'dayjs/locale/fa';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import jalaliPlugin from 'jalali-plugin-dayjs';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(jalaliPlugin);

export { dayjs };
