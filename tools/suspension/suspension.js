(() => {
  function convert(amount, strength, direction) {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) throw new Error('Enter a finite amount of zero or greater.');
    if (![125,250].includes(strength)) throw new Error('Choose one of the listed suspension strengths.');
    if (!['mg-to-ml','ml-to-mg'].includes(direction)) throw new Error('Choose a conversion direction.');
    const concentration=strength/5;
    const result=direction==='mg-to-ml'?amount/concentration:amount*concentration;
    if (!Number.isFinite(result) || (amount>0 && result===0)) throw new Error('This amount is outside the calculator’s numeric range.');
    return result;
  }
  if(typeof module!=='undefined')module.exports={convert};
  if(typeof document==='undefined')return;
  const $=id=>document.getElementById(id);
  function init(){
    if(!$('suspension-tool'))return;
    const format=n=>Number(n.toPrecision(12)).toLocaleString('en-CA',{maximumSignificantDigits:12});
    function render(submitted=false){
      const direction=$('direction').value, toVolume=direction==='mg-to-ml', unit=toVolume?'mL':'mg';
      $('amount-label').textContent=`Amount in ${toVolume?'mg':'mL'}`;
      $('amount').placeholder=toVolume?'e.g. 250':'e.g. 5';
      $('result-label').textContent=toVolume?'Volume':'Amount of medication';
      $('conversion-error').textContent='';$('amount').removeAttribute('aria-invalid');
      $('conversion-result').textContent=`— ${unit}`;
      $('conversion-formula').textContent='Enter an amount to see the conversion.';
      try{
        if($('amount').validity.badInput)throw new Error('Enter a valid number.');
        if($('amount').value.trim()===''){if(submitted)throw new Error('Enter an amount to convert.');return;}
        const amount=Number($('amount').value), strength=Number($('strength').value);
        const result=convert(amount,strength,direction), rounded=Number(result.toPrecision(12))!==result;
        $('conversion-result').textContent=`${rounded?'≈ ':''}${format(result)} ${unit}`;
        $('conversion-formula').textContent=toVolume?`${format(amount)} mg ÷ ${strength/5} mg/mL = ${format(result)} mL`:`${format(amount)} mL × ${strength/5} mg/mL = ${format(result)} mg`;
        if(rounded)$('conversion-formula').textContent+=' (display rounded)';
      }catch(error){$('conversion-error').textContent=error.message;$('amount').setAttribute('aria-invalid','true');$('conversion-formula').textContent='Check the entered amount.';}
    }
    $('conversion-form').addEventListener('submit',event=>{event.preventDefault();render(true);});
    $('amount').addEventListener('input',()=>render());
    $('strength').addEventListener('change',()=>render());
    $('direction').addEventListener('change',()=>{$('amount').value='';render();$('amount').focus();});
    $('conversion-form').addEventListener('reset',()=>setTimeout(()=>render(),0));
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
