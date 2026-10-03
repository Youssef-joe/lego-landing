'use client';

import { useMemo, useState } from 'react';

import type { ClientHost } from '../host/contract';
import { durationMinutes, isFree } from '../domain/grouping';
import type { SlotPickerViewProps, SlotView } from '../domain/types';
import styles from './slot-picker.module.css';

/**
 * The brick's own English strings.
 *
 * `I18nPort.t` must fall back to these when the host has no translation for a
 * key, so a brick dropped into an app with a different message catalogue shows
 * English rather than raw keys or blanks. The host decides the shape of its
 * catalogue; the brick only guarantees it is never empty.
 */
const DEFAULTS: Record<string, string> = {
  'slotPicker.title': 'Book a time with {name}',
  'slotPicker.timesShownIn': 'Times shown in {zone}',
  'slotPicker.noSlots': 'No times available in this range.',
  'slotPicker.free': 'Free',
  'slotPicker.minutes': '{n} min',
  'slotPicker.signInToBook': 'Sign in to book a session.',
  'slotPicker.notAllowed': 'You do not have permission to book.',
  'slotPicker.booking': 'Booking…',
  'slotPicker.booked': 'Booked. Check your email for the details.',
  'slotPicker.taken': 'That time was just taken. Please pick another.',
  'slotPicker.failed': 'Could not book that time. Please try again.',
};

function translate(host: ClientHost, key: string, params?: Record<string, string | number>): string {
  const translated = host.i18n.t(key, params);
  // A host that returns the key unchanged has no entry for it; fall back.
  if (translated && translated !== key) return translated;

  const fallback = DEFAULTS[key] ?? key;
  if (!params) return fallback;
  return Object.entries(params).reduce(
    (acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)),
    fallback,
  );
}

export interface SlotPickerProps extends SlotPickerViewProps {
  host: ClientHost;
}

export function SlotPicker({
  host,
  ownerName,
  days,
  timeZone,
  principal,
  canBook,
  onBook,
}: SlotPickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ level: 'info' | 'error'; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(host.i18n.locale, { timeZone, hour: '2-digit', minute: '2-digit' }),
    [host.i18n.locale, timeZone],
  );
  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(host.i18n.locale, {
        timeZone,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    [host.i18n.locale, timeZone],
  );

  const t = (key: string, params?: Record<string, string | number>) => translate(host, key, params);

  async function handleBook(slot: SlotView) {
    if (!principal) {
      setStatus({ level: 'error', text: t('slotPicker.signInToBook') });
      return;
    }
    if (!canBook) {
      setStatus({ level: 'error', text: t('slotPicker.notAllowed') });
      return;
    }

    setSelectedId(slot.id);
    setPending(true);
    setStatus({ level: 'info', text: t('slotPicker.booking') });

    try {
      const result = await onBook(slot);
      if (result.ok) {
        const text = result.message ?? t('slotPicker.booked');
        setStatus({ level: 'info', text });
        host.feedback.toast({ level: 'success', title: text });
      } else {
        const text = result.message ?? t('slotPicker.failed');
        setStatus({ level: 'error', text });
        host.feedback.toast({ level: 'error', title: text });
      }
    } catch {
      const text = t('slotPicker.failed');
      setStatus({ level: 'error', text });
      host.feedback.toast({ level: 'error', title: text });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles['root']} data-brick="slot-picker" data-testid="slot-picker-root">
      <header className={styles['header']}>
        <h2 className={styles['title']}>{t('slotPicker.title', { name: ownerName })}</h2>
        <span className={styles['zone']}>{t('slotPicker.timesShownIn', { zone: timeZone })}</span>
      </header>

      {days.length === 0 ? (
        <p className={styles['empty']}>{t('slotPicker.noSlots')}</p>
      ) : (
        days.map((day) => (
          <div key={day.dayKey} className={styles['day']}>
            <h3 className={styles['dayLabel']}>
              {dayFormatter.format(new Date(day.slots[0]?.startsAt ?? `${day.dayKey}T12:00:00Z`))}
            </h3>
            <ul className={styles['slots']}>
              {day.slots.map((slot) => (
                <li key={slot.id}>
                  <button
                    type="button"
                    className={`${styles['slot']} ${selectedId === slot.id ? styles['selected'] : ''}`}
                    disabled={pending}
                    aria-pressed={selectedId === slot.id}
                    onClick={() => void handleBook(slot)}
                  >
                    <span className={styles['slotTime']}>
                      {timeFormatter.format(new Date(slot.startsAt))}
                    </span>
                    <span className={styles['slotMeta']}>
                      {isFree(slot)
                        ? t('slotPicker.free')
                        : host.i18n.formatMoney({
                            amountMinor: slot.priceMinor ?? 0,
                            currency: slot.currency ?? 'USD',
                          })}
                      {' · '}
                      {t('slotPicker.minutes', { n: durationMinutes(slot) })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      {status && (
        <p className={`${styles['status']} ${status.level === 'error' ? styles['error'] : ''}`} role="status">
          {status.text}
        </p>
      )}
    </section>
  );
}
