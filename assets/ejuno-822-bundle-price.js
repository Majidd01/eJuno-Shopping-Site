/* Trello 822: Patch bundle pricing payload to include calculatedPrice.
   Wraps ejunoBuildVendorConfirmationPayload to add price fields for services. */
(function(){
var orig=window.ejunoBuildVendorConfirmationPayload;
if(typeof orig!=='function')return;
window.ejunoBuildVendorConfirmationPayload=function(r){
var out=orig.call(this,r);
if(r&&r.capacity>0&&out&&!out.calculatedPrice){
var pd=window.productDetails;
if(pd&&pd.priceType==='bundle'){
var v=pd.variants,vid=r.variantId||out.variantId,sv=null;
if(v&&v.length){for(var i=0;i<v.length;i++){if(v[i].variantId==vid||v[i].id==vid){sv=v[i];break;}}if(!sv)sv=v[0];}
if(sv){
var pp=sv.price||0,gc=r.capacity;
var ao=(typeof getSelectedAddOnsTotal==='function')?getSelectedAddOnsTotal(pd):0;
out.calculatedPrice=pp*gc+ao;
out.basePrice=pp;
}}}
return out;
};
window.ejunoBuildVendorConfirmationPayload._822=true;
})();
