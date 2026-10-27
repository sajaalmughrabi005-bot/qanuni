import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadSource} from './source-test-loader.mjs';

// src/app/[locale]/citizen/analyze/[id]/page.tsx: demo analysis data lives only
// in the in-memory zustand store (src/lib/demo/store.ts) and is rebuilt fresh on
// reload. Before the fix, a missing demo document fell into the same silent,
// unexplained empty state real (non-demo) users get on a genuine not-found.
// These tests cover only that empty-state branch, not the full page render.

let locale = 'en';
let params = {id: 'missing-doc'};
let session = {userId: 'u'}, sessionLoading = false, isDemoSession = false, profile = undefined;
let demoState = {documents: [], analyses: [], clauses: []};
const scopedQueryState = {data: undefined, loading: false, error: null};

const translations = {
  ar: {overview: 'نظرة عامة على المستند'},
  en: {overview: 'Document Overview'},
};

const noop = () => null;
const {default: Page} = loadSource('src/app/[locale]/citizen/analyze/[id]/page.tsx', {
  'next/navigation': {useParams: () => params},
  'next-intl': {
    useLocale: () => locale,
    useTranslations: () => (key) => translations[locale][key] ?? key,
  },
  'lucide-react': {FileQuestion: noop, Briefcase: noop},
  '@/components/ui/tabs': {Tabs: noop, TabsContent: noop, TabsList: noop, TabsTrigger: noop},
  '@/components/ui/button': {
    Button: ({asChild, className, children, ...rest}) =>
      asChild
        ? React.cloneElement(React.Children.only(children), {className, ...rest})
        : React.createElement('button', {className, ...rest}, children),
  },
  '@/components/shared/empty-state': {
    EmptyState: ({icon: Icon, title, description, action}) =>
      React.createElement('div', {'data-empty-state': true},
        Icon && React.createElement(Icon, null),
        React.createElement('p', {'data-title': true}, title),
        description && React.createElement('p', {'data-description': true}, description),
        action || null,
      ),
  },
  '@/components/citizen/analysis-export': {AnalysisExport: noop},
  '@/components/citizen/source-document': {SourceDocument: noop},
  '@/i18n/navigation': {Link: ({href, children, ...rest}) => React.createElement('a', {href, ...rest}, children)},
  '@/components/citizen/legal-evidence': {LegalEvidence: noop},
  '@/components/citizen/document-overview': {DocumentOverview: noop},
  '@/components/citizen/clause-map': {ClauseMap: noop},
  '@/components/citizen/case-understanding': {CaseUnderstanding: noop},
  '@/components/citizen/risk-overview': {RiskOverview: noop},
  '@/components/citizen/ask-the-law-panel': {AskTheLawPanel: noop},
  '@/components/citizen/scenario-simulator-panel': {ScenarioSimulatorPanel: noop},
  '@/components/citizen/term-simplifier-card': {TermSimplifierCard: noop},
  '@/components/cases/case-request-dialog': {CaseRequestDialog: noop},
  '@/lib/auth/use-lawyer': {useLawyerDirectory: () => ({lawyers: [], error: null, loading: false, refetch: () => {}})},
  '@/components/shared/data-load-error': {DataLoadError: () => React.createElement('p', {role: 'alert'}, 'load failed')},
  '@/components/citizen/results-brief': {ResultsSummary: noop, ResultsFindings: noop},
  '@/lib/data/use-scoped-query': {useScopedQuery: () => ({...scopedQueryState, refetch: async () => true})},
  '@/lib/auth/use-session': {useSession: () => ({session, loading: sessionLoading, isDemo: isDemoSession, profile})},
  '@/lib/ai/engine': {matchLawyersToCase: () => []},
  '@/lib/governorates': {governorateKey: (c) => c},
  '@/lib/supabase/client': {createSupabaseBrowserClient: () => null},
  '@/lib/supabase/mappers': {mapAnalysis: (r) => r, mapClause: (r) => r, mapDocument: (r) => r},
  '@/lib/mock-data': {demoAnalysis: {}, demoClauses: [], demoDocument: {}, DEMO_DOCUMENT_ID: 'sample-doc-id'},
  '@/lib/demo/store': {useDemoStore: (select) => select(demoState)},
  '@/lib/legal/next-steps': {deriveNextSteps: () => ({generalSteps: []}), stepText: () => ''},
  '@/lib/legal/corpus': {curatedSources: []},
});

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }
const render = () => renderToStaticMarkup(React.createElement(Page));

test('non-demo: missing document keeps the existing generic empty state, unchanged', () => {
  isDemoSession = false; params = {id: 'missing-doc'}; locale = 'en';
  const html = render();
  assert.match(html, /data-empty-state/);
  assert.ok(html.includes('Document Overview'));
  assert.doesNotMatch(html, /data-description/);
  assert.doesNotMatch(html, /reset/i);
  assert.doesNotMatch(html, /<a /);
});

test('demo: missing document explains the session reset and offers a way back (en)', () => {
  isDemoSession = true; params = {id: 'missing-doc'}; locale = 'en'; demoState = {documents: [], analyses: [], clauses: []};
  const html = render();
  assert.match(html, /data-empty-state/);
  assert.ok(html.includes('This demo session has reset'));
  assert.match(html, /data-description/);
  assert.ok(html.includes('is temporary and'));
  assert.ok(html.includes('resets automatically'));
  assert.ok(html.includes('Nothing real was lost'));
  assert.match(html, /<a href="\/citizen\/analyze\/new"/);
  assert.ok(html.includes('Start a new analysis'));
  assert.doesNotMatch(html, /Document Overview/);
});

test('demo: missing document explains the session reset and offers a way back (ar)', () => {
  isDemoSession = true; params = {id: 'missing-doc'}; locale = 'ar'; demoState = {documents: [], analyses: [], clauses: []};
  const html = render();
  assert.ok(html.includes('انتهت بيانات هذه التجربة'));
  assert.ok(html.includes('لم يُفقد أي شيء حقيقي'));
  assert.match(html, /<a href="\/citizen\/analyze\/new"/);
  assert.ok(html.includes('ابدأ تحليلاً جديداً'));
});

test('demo: a document present in the live demo store is not treated as reset', () => {
  isDemoSession = true; params = {id: 'present-doc'}; locale = 'en';
  demoState = {
    documents: [{id: 'present-doc', documentType: 'general'}],
    analyses: [{documentId: 'present-doc', questionsForLawyerAr: [], questionsForLawyerEn: []}],
    clauses: [],
  };
  const html = render();
  assert.doesNotMatch(html, /data-empty-state/);
  assert.doesNotMatch(html, /This demo session has reset/);
});

console.log(`v2-demo-reset-tests: ${passed} cases passed (actual analysis-results page, isolated adapters; no SQL/provider).`);
