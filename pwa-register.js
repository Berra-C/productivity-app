
if('serviceWorker' in navigator && location.protocol !== 'file:'){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch(err=>{
      console.warn('Service worker kaydı başarısız:', err);
    });
  });
}
