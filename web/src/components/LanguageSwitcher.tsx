import { useI18n, type Language } from '../i18n';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  return <label className="flex items-center gap-2 text-xs text-white/60"><span>{t('language')}</span><select aria-label={t('language')} value={language} onChange={event => setLanguage(event.target.value as Language)} className="rounded-lg border border-white/15 bg-ink-navy px-2 py-1 text-white"><option value="en">{t('english')}</option><option value="hi">{t('hindi')}</option></select></label>;
}
