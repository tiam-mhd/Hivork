import { getSharedMessages, mergeMessages } from '@hivork/i18n';
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

import { routing } from './routing';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('hivork-locale')?.value;
  const locale =
    cookieLocale === 'en' || cookieLocale === 'fa'
      ? cookieLocale
      : routing.defaultLocale;

  const shared = getSharedMessages(locale);
  const appMessages =
    locale === 'en'
      ? (await import('../messages/en.json')).default
      : (await import('../messages/fa.json')).default;

  return {
    locale,
    messages: mergeMessages(shared, appMessages),
  };
});
