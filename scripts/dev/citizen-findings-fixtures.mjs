// Test-only projections of the actual UI. No fixtures, data adapters or fallbacks
// are registered in the application; checked excerpts come from its existing corpus.
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadSource} from './source-test-loader.mjs';
const domain=loadSource('src/lib/legal/next-steps.ts');
const {curatedSources}=loadSource('src/lib/legal/corpus.ts');
const {demoDocument,demoAnalysis,demoClauses}=loadSource('src/lib/mock-data/contract.ts');
let locale='ar';
const {ResultsSummary,ResultsFindings}=loadSource('src/components/citizen/results-brief.tsx',{
  'next-intl':{useLocale:()=>locale},'@/lib/legal/next-steps':domain,
  '@/lib/legal/corpus':{curatedSources},
  '@/components/shared/risk-badge':{RiskBadge:({level})=>React.createElement('span',null,level)},
});
export const findingCases=['rental','empty','unknown','no-citation','checked-citation','partial','long','repeated'];
export function renderFindingFixture(kind,language) {
  locale=language;
  const text='MOCK QA contract: the employee requests annual leave in writing.\nMOCK QA: this is fictional input, not a legal opinion.';
  const clause={...demoClauses[2],id:'qa-clause',documentId:'qa-document',clauseNumber:'7(b)',sourceText:text,sourceStart:0,sourceEnd:text.length,clauseTextAr:text,clauseTextEn:text,riskLevel:'unknown',legalSourceId:curatedSources[0].id,concernAr:'MOCK QA: طريقة توثيق اتفاق الطرفين غير واضحة في النص التجريبي.',concernEn:'MOCK QA: how the parties record their agreement is unclear in the synthetic text.',explanationAr:'MOCK QA: اطلب توضيح النص؛ الأثر القانوني على ظروفك غير متحقق.',explanationEn:'MOCK QA: clarify the text; its legal effect on your circumstances is unverified.'};
  let document={...demoDocument,id:'qa-document',userId:'qa-user',documentType:'employment',citizenDescription:text};
  let analysis={...demoAnalysis,documentId:document.id,userId:document.userId,summaryAr:'MOCK QA: بيانات اصطناعية لفحص الواجهة فقط.',summaryEn:'MOCK QA: synthetic presentation fixture only.',legalSources:[curatedSources[0]],concernsAr:['MOCK QA: ملاحظة عامة لا تُحسب كنقطة مستقلة.'],concernsEn:['MOCK QA: general note, not a separate finding.'],coverage:{totalCharacters:text.length,analyzedCharacters:text.length,coveragePercent:100,isTruncated:false}};
  let clauses=[clause];
  if(kind==='rental'){document=demoDocument;analysis=demoAnalysis;clauses=demoClauses;}
  if(kind==='empty')clauses=[];
  if(kind==='no-citation')analysis={...analysis,legalSources:[]};
  if(kind==='partial')analysis={...analysis,coverage:{totalCharacters:text.length,analyzedCharacters:10,coveragePercent:5,isTruncated:true}};
  if(kind==='long'){
    const long=Array.from({length:350},(_,i)=>locale==='ar'?`كلمة${i}`:`word${i}`).join(' ');
    clauses=[{...clause,clauseTextAr:long,clauseTextEn:long,sourceText:undefined,concernAr:long,concernEn:long,explanationAr:long,explanationEn:long}];
  }
  if(kind==='repeated')clauses=[clause,{...clause}];
  return renderToStaticMarkup(React.createElement('main',{className:'mx-auto max-w-4xl space-y-6 p-4'},
    React.createElement('p',null,'MOCK QA — synthetic UI fixture only'),
    React.createElement(ResultsSummary,{document,analysis,clauses}),
    React.createElement(ResultsFindings,{document,analysis,clauses,onViewOriginalAction:()=>{}})));
}
