(function (root) {
  const core = {
    emptyWorkspace() {
      return {docs:[],cards:[],activity:[],reviewed:0,chatHistory:[]};
    },
    filterDocs(docs, query = '', status = 'all') {
      const q = query.trim().toLocaleLowerCase();
      return docs.filter(d => (status === 'all' || d.status === status) && `${d.title} ${d.tags.join(' ')}`.toLocaleLowerCase().includes(q));
    },
    validateImport(type, value) {
      if (!value.trim()) return {ok:false,error:'请先填写内容。'};
      if (type === 'text' && value.length > 100000) return {ok:false,error:'单篇最多支持 10 万字，请缩短后再试。'};
      if (type === 'url') {
        try { if (!['http:', 'https:'].includes(new URL(value).protocol)) throw new Error(); }
        catch { return {ok:false,error:'请输入完整的 http 或 https 网页链接。'}; }
      }
      return {ok:true};
    },
    createTextDoc(title, text) {
      const paragraphs = text.trim().split(/\n+/).map(p => p.trim()).filter(Boolean);
      return {id:'local-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),title:title.trim() || paragraphs[0].slice(0,36),kind:'excerpt',status:'ready',type:'文本',source:'我的文本',tags:['我的导入'],words:text.length,minutes:Math.max(1,Math.ceil(text.length/400)),date:new Date().toISOString(),paragraphs,points:paragraphs.slice(0,3).map((text,i)=>({title:`原文摘录 ${i+1}`,text,ref:i+1})),summary:paragraphs[0],color:'sage'};
    },
    scheduleReview(card, grade, now = new Date()) {
      const interval = grade === 'again' ? 1 : grade === 'easy' ? Math.max(4,(card.interval || 1)*3) : Math.max(2,(card.interval || 1)*2);
      return {...card,interval,due:new Date(now.getTime()+interval*86400000).toISOString(),reviewedAt:now.toISOString()};
    },
    escape(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  else root.ThreePagesCore = core;
})(typeof window !== 'undefined' ? window : globalThis);
