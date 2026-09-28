(() => {
  const $ = (id) => document.getElementById(id);
  const ui = {bankroll:$("bankroll"),wager:$("wager"),betLabel:$("bet-label"),dealerHand:$("dealer-hand"),playerHand:$("player-hand"),dealerScore:$("dealer-score"),playerScore:$("player-score"),eyebrow:$("eyebrow"),status:$("status"),substatus:$("substatus"),betting:$("betting-controls"),playing:$("play-controls"),deal:$("deal"),hit:$("hit"),stand:$("stand"),double:$("double"),again:$("new-round"),error:$("error")};
  let bankroll = 1000, wager = 0, game = null, busy = false;
  const money = (n) => new Intl.NumberFormat("en-US", {style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(n)||0);
  const escape = (s) => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[c]);
  function cardData(card) {
    if (!card || card.hidden || card.rank === "?" || card === "hidden") return {hidden:true};
    if (typeof card === "string") {
      const match = card.trim().match(/^(10|[2-9AJQK])(?:[ _-]?)([SHDC♠♥♦♣])$/i);
      if (!match) return {rank:card.slice(0,-1)||card,suit:card.slice(-1)};
      card = {rank:match[1],suit:match[2]};
    }
    const suits = {S:"♠",H:"♥",D:"♦",C:"♣",spades:"♠",hearts:"♥",diamonds:"♦",clubs:"♣"};
    return {rank:card.rank || card.value || "?", suit:suits[card.suit] || suits[String(card.suit).toLowerCase()] || card.suit || "♠"};
  }
  function renderCard(raw) {
    const c=cardData(raw); if(c.hidden) return '<div class="card back" aria-label="Face-down card"></div>';
    const red=c.suit==="♥"||c.suit==="♦"; const label=escape(c.rank)+escape(c.suit);
    return `<div class="card ${red?"red":""}" aria-label="${label}"><div class="corner">${escape(c.rank)}<span>${escape(c.suit)}</span></div><div class="card-suit">${escape(c.suit)}</div><div class="corner bottom">${escape(c.rank)}<span>${escape(c.suit)}</span></div></div>`;
  }
  function hand(node, cards) { node.innerHTML=(cards||[]).map(renderCard).join(""); }
  function normalizedStatus(g) { return String(g.status||"").toLowerCase().replace(/[ _-]/g,""); }
  function finished(g) { const s=normalizedStatus(g); return !!g.result || ["complete","completed","finished","gameover","won","lost","push","blackjack"].includes(s); }
  function message(g) {
    const result=String(g.result||"").toLowerCase();
    if (!finished(g)) return {eye:"YOUR MOVE",title:"What will you do?",sub:"Hit, stand, or double down"};
    if(result.includes("blackjack")) return {eye:"BLACKJACK",title:"Natural twenty-one",sub:"A perfect hand"};
    if(result.includes("push")||result.includes("tie")) return {eye:"PUSH",title:"Evenly matched",sub:"Your wager is returned"};
    if(result.includes("win")||result==="player") return {eye:"YOU WIN",title:"The table is yours",sub:"Nicely played"};
    if(result.includes("bust")) return {eye:"HAND COMPLETE",title:result.includes("dealer")?"Jev went over":"You went over",sub:result.includes("dealer")?"You win":"Better luck next hand"};
    return {eye:"HAND COMPLETE",title:result.includes("lose")||result==="dealer"?"Jev takes the hand":"Round complete",sub:"Ready for another?"};
  }
  function render(g) {
    game=g; if(g.bankroll!=null||g.chips!=null) bankroll=Number(g.bankroll??g.chips); if(g.wager!=null) wager=Number(g.wager);
    ui.bankroll.textContent=money(bankroll); ui.wager.textContent=money(wager); ui.betLabel.textContent=wager?`${money(wager)} wagered`:"No wager";
    hand(ui.playerHand,g.player?.cards||g.player?.hand||g.playerCards); hand(ui.dealerHand,g.dealer?.cards||g.dealer?.hand||g.dealerCards);
    ui.playerScore.textContent=g.player?.value??g.playerValue??"—"; ui.dealerScore.textContent=g.dealer?.value??g.dealerValue??"—";
    const done=finished(g), m=message(g), decision=g.jevDecision; ui.eyebrow.textContent=m.eye;ui.status.textContent=m.title;ui.substatus.textContent=decision?`Jev chose ${decision.move.toUpperCase()} · ${Math.round((decision.confidence||0)*100)}% confidence`:m.sub;
    ui.betting.hidden=true; ui.playing.hidden=false; ui.again.hidden=!done;
    const allowed=g.allowedActions||g.allowed_actions||g.availableActions||["hit","stand","double"];
    ["hit","stand","double"].forEach(a=>{ui[a].hidden=done||!allowed.includes(a);ui[a].disabled=busy;});
  }
  function reset() { game=null;wager=0;ui.wager.textContent=money(0);ui.betLabel.textContent="No wager";ui.dealerHand.innerHTML="";ui.playerHand.innerHTML="";ui.dealerScore.textContent="—";ui.playerScore.textContent="—";ui.eyebrow.textContent="THE TABLE IS OPEN";ui.status.textContent="Place your wager";ui.substatus.textContent="Blackjack pays 3 to 2 · Jev calls his own shots";ui.betting.hidden=false;ui.playing.hidden=true;ui.deal.disabled=true;ui.error.textContent=""; }
  async function request(url, options) { const res=await fetch(url,{headers:{"Content-Type":"application/json"},...options}); let data=null;try{data=await res.json()}catch{} if(!res.ok) throw new Error(data?.error||data?.message||`Request failed (${res.status})`); return data; }
  async function deal() { if(!wager||busy)return; setBusy(true);try{const g=await request("/api/games",{method:"POST",body:JSON.stringify({wager,bankroll,chips:bankroll})});render(g);}catch(e){fail(e)}finally{setBusy(false)} }
  async function action(name) { if(!game||busy||finished(game))return;setBusy(true);try{const g=await request(`/api/games/${encodeURIComponent(game.id)}/actions`,{method:"POST",body:JSON.stringify({action:name})});render(g);}catch(e){fail(e)}finally{setBusy(false)} }
  function fail(e){ui.error.textContent=e.message||"Something went wrong. Please try again."}
  function setBusy(value){busy=value;document.querySelectorAll("button").forEach(b=>{if(!b.matches("#clear-bet,.chip"))b.disabled=value||(b===ui.deal&&!wager)});if(game)render(game)}
  document.querySelectorAll(".chip").forEach(chip=>chip.addEventListener("click",()=>{const amount=Number(chip.dataset.value);if(wager+amount<=bankroll){wager+=amount;ui.wager.textContent=money(wager);ui.betLabel.textContent=`${money(wager)} wagered`;ui.deal.disabled=false;ui.error.textContent=""}else ui.error.textContent="That wager is larger than your bankroll."}));
  $("clear-bet").addEventListener("click",()=>{wager=0;ui.wager.textContent=money(0);ui.betLabel.textContent="No wager";ui.deal.disabled=true});
  ui.deal.addEventListener("click",deal);ui.hit.addEventListener("click",()=>action("hit"));ui.stand.addEventListener("click",()=>action("stand"));ui.double.addEventListener("click",()=>action("double"));ui.again.addEventListener("click",reset);
  addEventListener("keydown",e=>{if(e.repeat||/input|textarea|select/i.test(e.target.tagName))return;const key=e.key.toLowerCase();if(key===" "&&!game&&wager){e.preventDefault();deal()}else if(key===" "&&game&&finished(game)){e.preventDefault();reset()}else if(key==="h")action("hit");else if(key==="s")action("stand");else if(key==="d")action("double")});
  reset();
})();
