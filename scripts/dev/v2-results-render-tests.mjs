import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadSource} from './source-test-loader.mjs';
const {deriveNextSteps,stepText}=loadSource('src/lib/legal/next-steps.ts');
const {curatedSources}=loadSource('src/lib/legal/corpus.ts');
let locale='ar';
const doubles={'next-intl':{useLocale:()=>locale},'@/lib/legal/next-steps':{deriveNextSteps,stepText},'@/lib/legal/corpus':{curatedSources},'@/components/shared/risk-badge':{RiskBadge:({level})=>React.createElement('span',null,level)}};
const {ResultsSummary,ResultsFindings}=loadSource('src/components/citizen/results-brief.tsx',doubles);
const text='Synthetic exact clause <script>attack()</script>',source=curatedSources[0];
const document={id:'d',userId:'u',documentType:'employment',citizenDescription:text};
const analysis={documentId:'d',userId:'u',overallRisk:'unknown',summaryAr:'ملخص تجريبي',summaryEn:'Synthetic summary',legalSources:[source],coverage:{analyzedCharacters:10,totalCharacters:100,coveragePercent:10,isTruncated:false}};
const clauses=[{id:'c',documentId:'d',clauseNumber:'1',riskLevel:'unknown',clauseTextAr:text,clauseTextEn:text,sourceText:text,sourceStart:0,sourceEnd:text.length,legalSourceId:source.id,explanationAr:'شرح غير متحقق',explanationEn:'Unverified explanation'}];
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
for(locale of ['ar','en']){
 const render=(Component,props={})=>renderToStaticMarkup(React.createElement(Component,{document,analysis,clauses,...props}));
 test(`${locale}: real typed contracts render partial/unknown summary and truthful count`,()=>{const html=render(ResultsSummary);assert.match(html,/data-coverage/);assert.match(html,/data-attention-count/);assert.match(html,/unknown/);assert.ok(html.includes(locale==='ar'?'جزئي':'partial'));});
 test(`${locale}: exact clause + source limitations + next steps, escaped markup`,()=>{const html=render(ResultsFindings);assert.match(html,/source_text_checked/);assert.ok(html.includes(source.article));assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/professional_review/);});
 test(`${locale}: empty analysis truthful`,()=>{const html=render(ResultsFindings,{clauses:[]});assert.doesNotMatch(html,/data-action-finding/);assert.ok(html.includes(locale==='ar'?'لا توجد':'no priority'));});
 test(`${locale}: unmapped general concerns preserved, not falsely counted or denied`,()=>{const a={...analysis,concernsAr:['ملاحظة عامة'],concernsEn:['Unmapped general note']};const summary=render(ResultsSummary,{analysis:a,clauses:[]}),findings=render(ResultsFindings,{analysis:a,clauses:[]});assert.ok(summary.includes(locale==='ar'?'ملاحظات عامة':'general notes'));assert.ok(findings.includes(locale==='ar'?'ملاحظة عامة':'Unmapped general note'));});
 test(`${locale}: missing coverage and missing sources explicit`,()=>{assert.ok(render(ResultsSummary,{analysis:{...analysis,coverage:undefined}}).includes(locale==='ar'?'غير متحقق':'unverified'));assert.match(render(ResultsFindings,{analysis:{...analysis,legalSources:[]}}),/data-evidence-state="missing"/);});
 test(`${locale}: top three with remaining inside accessible native disclosure`,()=>{const html=render(ResultsFindings,{clauses:Array.from({length:5},(_,i)=>({...clauses[0],id:`c${i}`}))});assert.match(html,/data-more-findings/);assert.equal((html.match(/data-action-finding/g)||[]).length,5);});
 test(`${locale}: wrong analysis does not disclose summary`,()=>{const html=render(ResultsSummary,{analysis:{...analysis,userId:'other',summaryAr:'private-secret',summaryEn:'private-secret'}});assert.doesNotMatch(html,/private-secret/);});
}
console.log(`v2-results-render-tests: ${passed} synthetic render cases passed (no browser/provider/SQL).`);
