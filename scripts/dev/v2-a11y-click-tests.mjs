import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadSource} from './source-test-loader.mjs';

// src/components/citizen/citizen-calendar-view.tsx and
// src/components/shared/notifications-list.tsx: a clickable card must also be
// keyboard-reachable (role="button" + tabindex="0"), but ONLY when it is
// actually interactive on its own — an appointment with no linked case, or a
// notification already wrapped in a real <Link>, must not also announce
// itself as a redundant/empty button. This is a structural (static-markup)
// check: role/tabIndex are real DOM attributes renderToStaticMarkup
// serializes; onClick/onKeyDown are not, so actual Enter/Space activation and
// the no-duplicate-navigation behavior are verified separately, live, in the
// browser (see the task report).

const noop = () => null;
const locale = 'en';

// ---- citizen-calendar-view.tsx ----
let events = [];
const {CitizenCalendarView} = loadSource('src/components/citizen/citizen-calendar-view.tsx', {
  '@/components/shared/data-load-error': {DataLoadError: () => React.createElement('p', {role: 'alert'}, 'err')},
  'next-intl': {useTranslations: () => (k) => k, useLocale: () => locale},
  'lucide-react': {ChevronLeft: noop, ChevronRight: noop, Video: noop, Phone: noop, MapPin: noop, Gavel: noop, AlarmClock: noop, RotateCcw: noop},
  '@/components/ui/card': {
    Card: ({children, ...p}) => React.createElement('div', p, children),
    CardContent: ({children, ...p}) => React.createElement('div', p, children),
  },
  '@/components/ui/button': {Button: ({children, ...p}) => React.createElement('button', p, children)},
  '@/components/ui/badge': {Badge: ({children, ...p}) => React.createElement('span', p, children)},
  '@/i18n/navigation': {
    Link: ({href, children, ...p}) => React.createElement('a', {href, ...p}, children),
    useRouter: () => ({push: () => {}}),
  },
  '@/lib/data/hooks': {useAppointments: () => ({data: events, loading: false, error: null})},
  '@/lib/auth/use-lawyer': {useLawyerDirectory: () => ({lawyers: [], loading: false, error: null})},
  '@/lib/utils': {
    cn: (...a) => a.filter(Boolean).join(' '),
    formatDateTime: () => 'dt', formatMonthYear: () => 'my', formatDayNumber: () => 'd',
    formatWeekdayShort: () => 'w', formatWeekdayLong: () => 'wl',
  },
});

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }
const render = (Component, props = {}) => renderToStaticMarkup(React.createElement(Component, props));

test('calendar: appointment linked to a case is keyboard-reachable (role=button, tabindex=0)', () => {
  events = [{id: 'e1', type: 'video', title: 'Call', startTime: new Date().toISOString(), caseId: 'case-1', lawyerId: null}];
  const html = render(CitizenCalendarView);
  assert.match(html, /role="button"/);
  assert.match(html, /tabindex="0"/);
});

test('calendar: appointment with no linked case is not announced as a button', () => {
  events = [{id: 'e2', type: 'video', title: 'Call', startTime: new Date().toISOString(), caseId: null, lawyerId: null}];
  const html = render(CitizenCalendarView);
  assert.doesNotMatch(html, /role="button"/);
  assert.doesNotMatch(html, /tabindex="0"/);
});

// ---- notifications-list.tsx ----
let notifications = [];
const {NotificationsList} = loadSource('src/components/shared/notifications-list.tsx', {
  '@/components/shared/data-load-error': {DataLoadError: () => React.createElement('p', {role: 'alert'}, 'err')},
  'next-intl': {useTranslations: () => (k) => k, useLocale: () => locale},
  'lucide-react': {Bell: noop, CheckCheck: noop},
  '@/i18n/navigation': {Link: ({href, children, ...p}) => React.createElement('a', {href, ...p}, children)},
  '@/components/ui/card': {
    Card: ({children, ...p}) => React.createElement('div', p, children),
    CardContent: ({children, ...p}) => React.createElement('div', p, children),
  },
  '@/components/ui/button': {Button: ({children, ...p}) => React.createElement('button', p, children)},
  '@/components/ui/badge': {Badge: ({children, ...p}) => React.createElement('span', p, children)},
  '@/components/shared/empty-state': {EmptyState: () => React.createElement('div', {'data-empty': true})},
  '@/lib/auth/use-session': {useSession: () => ({session: {userId: 'u'}})},
  '@/lib/data/hooks': {useNotifications: () => ({data: notifications, loading: false, error: null, refetch: async () => {}})},
  '@/lib/data/actions': {
    markNotificationRead: async () => ({ok: true}),
    markAllNotificationsRead: async () => ({ok: true}),
  },
  'sonner': {toast: {error: () => {}, success: () => {}}},
  '@/lib/utils': {formatDateTime: () => 'dt', cn: (...a) => a.filter(Boolean).join(' ')},
});

const renderN = (ns = 'citizen') => renderToStaticMarkup(React.createElement(NotificationsList, {namespace: ns}));
const baseNotification = {id: 'n', userId: 'u', type: 'x', titleAr: 'ع', titleEn: 'T', bodyAr: '', bodyEn: '', read: false, isDemo: false, createdAt: new Date().toISOString()};

test('notifications: href-less notification is keyboard-reachable, no nested anchor', () => {
  notifications = [{...baseNotification, id: 'n1', href: null}];
  const html = renderN();
  assert.match(html, /role="button"/);
  assert.match(html, /tabindex="0"/);
  assert.doesNotMatch(html, /<a /);
});

test('notifications: href notification keeps the Link wrapper, no redundant button role on the inner card', () => {
  notifications = [{...baseNotification, id: 'n2', href: '/citizen/cases/abc'}];
  const html = renderN();
  assert.match(html, /<a href="\/citizen\/cases\/abc"/);
  assert.doesNotMatch(html, /role="button"/);
});

console.log(`v2-a11y-click-tests: ${passed} cases passed (static markup only; see report for live keyboard-activation verification).`);
