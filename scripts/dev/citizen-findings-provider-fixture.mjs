// Explicit local transport fixture for actual demo-upload/browser verification.
// Never imported by the app. Results are labelled MOCK QA, not live AI evidence.
export const fictionalContract = [
  'MOCK QA written employment contract between fictional employer and employee. Both parties sign two copies and keep the terms in writing.',
  'Clause 7(b): the fictional employee requests annual leave in writing and both parties confirm the arrangement before taking leave.',
  'Clause 9: the fictional employer and employee discuss the documented terms before making any change to their employment contract.',
].join('\n');
export function localProviderResponse(endpoint,body){
  if(endpoint==='/v1/embeddings')return {data:body.input.map((_,index)=>({index,embedding:Array.from({length:1536},(_,i)=>i===0?1:0)}))};
  const name=body.response_format?.json_schema?.name;
  if(!name)return {choices:[{message:{content:'MOCK QA — local fixture only.'}}]};
  const input=JSON.parse(body.messages.find(m=>m.role==='user').content);
  let result;
  if(name==='legal_document_gate')result={outcome:'LEGAL',reasonCode:'legal_structure',evidenceQuotes:[input.document.split('\n')[0]]};
  else if(name==='contract_analysis'){
    const lines=input.document.split('\n'),source=input.verifiedExcerpts[0];
    const clauses=lines.map((sourceText,i)=>({clauseNumber:i===1?'7(b)':i===2?'9':'1',sourceText,clauseTextAr:sourceText,clauseTextEn:sourceText,riskLevel:i===0?'low':i===1?'unknown':'high',category:'contractual',explanationAr:'MOCK QA: تفسير اصطناعي للفحص فقط؛ الأثر على الظروف يحتاج مراجعة بشرية.',explanationEn:'MOCK QA: synthetic interpretation only; the effect on circumstances needs human review.'}));
    result={isLegalDocument:true,notRecognizedReasonAr:'',notRecognizedReasonEn:'',clauses,citations:source?[{clauseNumber:'7(b)',sourceId:source.id,quote:source.excerptAr}]:[],documentType:'employment',overallRisk:'unknown',riskCategories:[],summaryAr:'MOCK QA: عقد توظيف وهمي لفحص الواجهة، وليس رأياً قانونياً.',summaryEn:'MOCK QA: fictional employment contract for UI testing, not a legal opinion.'};
    for(const f of ['yourObligations','otherPartyObligations','deadlines','paymentTerms','cancellationTerms','concerns','questionsForLawyer'])for(const l of ['Ar','En'])result[f+l]=[];
  }else if(name==='contract_answer')result={answer:'MOCK QA: synthetic contract-chat result only, not legal advice.',citations:[],matchedClauseIds:input.clauseIds.slice(0,1)};
  else if(name==='scenario')result={consequenceAr:'MOCK QA: نتيجة افتراضية اصطناعية فقط.',consequenceEn:'MOCK QA: synthetic scenario result only.',affectedClauseId:input.clauseIds[0]||null,questionsAr:[],questionsEn:[],citations:[]};
  else throw Error('Unexpected mock operation');
  return {choices:[{message:{content:JSON.stringify(result)}}]};
}
