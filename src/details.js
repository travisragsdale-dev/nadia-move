(() => {
"use strict";
/* Step-by-step help for each to-do on the "All steps" page.
   {partner} is replaced with the partner's name from settings (kept out of this public code). */
const S = window.__S;

S.DETAILS = {
  credit: {
    why: "Most NYC landlords look for a credit score of roughly 650–700 or higher. Checking now leaves time to fix mistakes before you apply.",
    steps: [
      ["Get your free credit reports", "Go to annualcreditreport.com, the official free site. You can pull reports from Equifax, Experian and TransUnion. They list your accounts and payment history, but not your score."],
      ["Look for mistakes", "Check for late payments you don't recognize, accounts that aren't yours, or old debts that should be closed. If something's wrong, dispute it on that bureau's website. It's free and usually fixed within about 30 days."],
      ["Find your score", "Your bank or credit card app often shows it for free. Credit Karma and the Experian app do too."],
      ["Write it down", "Add your score range to the Renter profile guide so it goes into your PDF."],
    ],
    tips: [
      "Checking your own credit never lowers your score.",
      "Until you sign a lease, pay every bill on time and avoid opening new cards or loans.",
      "If your score is lower than you'd like, a guarantor usually solves it. That's the next step.",
    ],
    links: [["annualcreditreport.com", "https://www.annualcreditreport.com"]],
  },

  parent: {
    why: "NYC landlords usually want you to earn 40 times the monthly rent per year. A guarantor who earns about 80 times the rent co-signs and covers the gap.",
    steps: [
      ["Know the numbers", "For a $2,000 apartment, landlords look for about $80,000 a year from you, or a guarantor earning about $160,000. For $2,400, that's $96,000 from you or $192,000 from a guarantor."],
      ["Pick who to ask", "A parent with steady income and good credit is ideal. Many landlords want the guarantor to live in the US, and some prefer New York, New Jersey or Connecticut, so ask."],
      ["Explain what it means", "They're legally responsible for the rent if you can't pay, for the length of the lease (usually 12 months). It's a real commitment, so give them time to think."],
      ["Line up their paperwork", "They'll usually need a photo ID, their last two pay stubs or last year's tax return, a recent bank statement, and sometimes a credit check. Have it scanned as PDFs ahead of time."],
      ["Be ready to sign fast", "Good apartments go in a day or two. Make sure they can sign online the same day you're approved."],
    ],
    tips: [
      "If no one can sign, a guarantor company can do it for a fee (see “Get pre-approved by a guarantor service”).",
      "By law, the security deposit is capped at one month's rent, so a bigger deposit can't stand in for a guarantor.",
    ],
  },

  hc: {
    why: "Housing Connect is NYC's official lottery for income-restricted apartments. Rents can be well below market, but it takes time, so start early.",
    steps: [
      ["Create an account", "Go to housingconnect.nyc.gov and sign up with your email."],
      ["Fill in your profile", "Enter your household size (just you), all income including tips, and your current address. Be accurate, because it's checked if you're picked."],
      ["Apply to open lotteries", "Browse open listings and apply to every one your income fits. It's free, and each lottery is a separate entry."],
      ["Watch your email", "If you're picked, you'll be asked for documents like pay stubs, tax returns and bank statements, usually with a short deadline. Reply quickly."],
    ],
    tips: [
      "Applying is always free. Never pay anyone to apply for you.",
      "Each listing shows its exact income range. As a guide, 2026 limits for one person are about $47,250 (50% of the area median), $56,700 (60%) and $75,600 (80%).",
      "Results can take months, so keep searching regular listings at the same time.",
    ],
    links: [["housingconnect.nyc.gov", "https://housingconnect.nyc.gov"]],
  },

  guarantor: {
    why: "If no family member can co-sign, a guarantor company will, for a fee. Many NYC landlords accept them.",
    steps: [
      ["Compare the main companies", "TheGuarantors, Insurent and Leap are widely used in NYC. Each has a quick online application."],
      ["Get pre-approved", "Share your income and credit details. They'll tell you the highest rent they'll guarantee."],
      ["Know the cost", "It's usually about 65–110% of one month's rent, paid once per year of the lease. A lower credit score means a higher fee."],
      ["Check with the landlord", "Before you apply for a specific apartment, ask which guarantor companies that building accepts."],
    ],
    tips: [
      "Pre-approval is usually free. You pay only when you use it for a lease.",
      "Only do this if a parent can't sign. It costs real money.",
    ],
    links: [["TheGuarantors", "https://www.theguarantors.com"], ["Insurent", "https://www.insurent.com"]],
  },

  car: {
    why: "A car in NYC costs a lot and usually isn't needed for getting to work. Deciding early makes the move simpler.",
    steps: [
      ["Add up the real cost", "Car insurance in NYC is often much higher than where you're coming from. Garage parking can run a few hundred dollars a month. Street parking is free but has alternate-side rules, so you move the car for street cleaning."],
      ["Think about how you'd use it", "For work and most errands, the subway is usually faster. A car is mostly useful for trips out of the city."],
      ["Choose", "Bring it, leave it with family for now, or sell it. Leaving it is an easy way to put off the decision."],
      ["If you bring it", "You'll need to register it in New York and switch to NY insurance within 30 days of moving. See “Get a NY driver's license”."],
    ],
  },

  quotes: {
    why: "Getting 2 or 3 prices early means better dates and no last-minute surprises.",
    steps: [
      ["Know your size", "Your things fit in a small van's worth of space. For a long-distance move, that means a 10-foot truck or one moving container."],
      ["Truck option", "U-Haul and Penske rent one-way 10-foot trucks. U-Haul cargo vans are local only, so they won't work for this move."],
      ["Container option", "With U-Pack ReloCube or PODS, you load a container and they drive it. You can drive the car or fly while it's in transit."],
      ["Compare the total", "Include fuel, insurance, drop-off fees and the number of days. Ask where you can return a truck or pick up a container in NYC."],
    ],
    tips: [
      "Parking a container on a NYC street can need a permit. Picking it up at the company's local depot avoids that.",
      "Unloading a truck on a NYC street is easier early in the morning or on a weekday.",
    ],
  },

  book: {
    why: "Locking it in early gets the dates you want and a better price.",
    steps: [
      ["Pick the option", "Choose the truck or container quote that fits your budget and timing best."],
      ["Choose dates", "Aim to load around January 8–10, so you arrive by January 15 with a day or two to spare."],
      ["Book and save the confirmation", "Screenshot it and save the confirmation email. Note the pickup and drop-off addresses and times."],
      ["Get supplies", "Boxes, tape, markers and a few moving blankets. Pack a 'first night' bag with clothes, chargers, toiletries and the pets' food and meds."],
    ],
    tips: ["Add basic moving insurance if it's cheap. It's peace of mind for a few dollars."],
  },

  jobletter: {
    why: "Landlords want proof of income. A letter from the restaurant shows you have a job lined up in NYC.",
    steps: [
      ["Ask your manager", "Email or text is fine. You can copy this: “Hi! I'm moving back and applying for apartments. Could you write a short letter on restaurant letterhead confirming my position, my return date, and my expected weekly hours and pay? A PDF is perfect. Thank you!”"],
      ["Make sure it includes", "Restaurant letterhead, your name, position (server or host), start or return date, expected hours per week, and pay: hourly plus average tips, or a yearly estimate. It also needs the manager's name, phone number and signature."],
      ["Save it", "Keep the PDF on your phone in your apartment-application folder."],
    ],
    tips: ["Once you're back at work, add your 2 most recent pay stubs. Landlords like seeing both."],
  },

  vet: {
    why: "The vet visit keeps the pets healthy for the drive and gets you the paperwork landlords and NYC ask for.",
    steps: [
      ["Book the visit", "Schedule it 1–2 weeks before you leave."],
      ["Ask for paperwork", "Get rabies certificates (you'll need the dog's for her NYC license) and full vaccine records, as PDFs if possible."],
      ["Ask about travel", "Ask whether you need a health certificate for crossing state lines. It's quick to get at the same visit. Also ask about anything for car sickness or anxiety on a long drive."],
      ["Check microchips", "Make sure both pets are chipped. Update the chip contact info with your phone number."],
      ["Stock up", "Refill flea/tick and heartworm meds, plus a few weeks of food in case their brand is hard to find at first."],
    ],
    tips: ["Add the records to the Pet résumé guide. Landlords love seeing them."],
  },

  drive: {
    why: "It's a long two-day drive with a dog and a cat. A little planning makes it much easier on everyone.",
    steps: [
      ["Plan the route and a stop", "It's about 18 hours of driving. Book a pet-friendly hotel about halfway, around Ohio or Indiana, ahead of time."],
      ["Pack a pet bag", "Food, water, bowls, leash, poop bags, a small litter box and litter, meds, a favorite blanket and the vet records."],
      ["Keep everyone safe", "The cat rides in a carrier. The dog gets a seatbelt harness or a crate. Never leave them alone in a parked car."],
      ["Take breaks", "Stop every 2–3 hours for water, a walk for the dog and a stretch for you."],
      ["Plan the arrival", "Tell {partner} your expected arrival time, and set up a quiet room for the cat first."],
    ],
    tips: ["Leave early on day one, so you reach the hotel before dark."],
  },

  apply: {
    why: "Good places in NYC go in a day or two. Having everything ready lets you apply the same day you see a place.",
    steps: [
      ["Have your folder ready", "Keep these on your phone: photo ID, Renter profile PDF, job letter or pay stubs, your last 2 bank statements, guarantor documents and the Pet résumé."],
      ["Tour and ask", "Ask whether a 50 lb dog is OK (and get it in writing), what the total move-in cost is, what utilities you'll pay, and the lease length and start date."],
      ["Apply", "In New York, the application fee is capped at $20. Under the FARE Act, you don't pay a broker fee if the landlord hired the broker."],
      ["Follow up the same day", "Send a short thank-you with your intro letter attached."],
      ["If approved", "Ask for the lease to review before paying anything beyond the application fee."],
    ],
    tips: [
      "Never send money before seeing the apartment, in person or on a live video tour.",
      "Big red flags: rent far below everything else nearby, a landlord who is “out of the country”, or requests to pay by wire, Zelle or gift card.",
    ],
  },

  lease: {
    why: "Read before you sign. Once it's signed, it's hard to change.",
    steps: [
      ["Check the basics", "Rent, start date, lease length and who pays which utilities."],
      ["Check the pet clause", "It should name the dog and the cat. In New York, there's no extra pet deposit on top of the one-month cap."],
      ["Check the money", "The security deposit can be no more than one month's rent. You pay first month plus deposit. Get receipts and pay by check or bank transfer, never cash."],
      ["Get promises in writing", "Anything the landlord agreed to, like a repair, paint or a later start date, should be in the lease or an email."],
      ["Move-in day", "Take dated photos of every room before unpacking. Set up renters insurance; it's often about $10–20 a month, and some buildings require it."],
    ],
    tips: ["If the apartment is rent-stabilized, the lease should come with a rent-stabilization rider. Keep it."],
  },

  dmv: {
    why: "New York asks new residents to switch to a NY driver's license within 30 days of moving.",
    steps: [
      ["Gather documents", "Your current out-of-state license, proof of your Social Security number, and proof of your NY address, like your lease or a utility bill. NY uses a points system for ID; the DMV's online document guide shows what counts."],
      ["Book an appointment", "Reserve a visit at a NYC DMV office on dmv.ny.gov. Walk-ins are slow."],
      ["At the DMV", "Hand in your old license, take the eye test and pay the fee. You'll get a temporary paper license; the card comes by mail."],
      ["If you brought the car", "Get NY car insurance first, then register the car and get NY plates. Get it inspected at a licensed shop soon after."],
    ],
    tips: ["Choose REAL ID if you'll fly with your license as ID."],
    links: [["dmv.ny.gov", "https://dmv.ny.gov"]],
  },

  doglic: {
    why: "NYC requires every dog to be licensed. It also helps her get home if she's ever lost.",
    steps: [
      ["Have the paperwork", "You'll need her rabies certificate from the vet visit and proof she's spayed, if she is."],
      ["Apply online", "Search “NYC dog license” and use the nyc.gov (NYC Health) page. It only takes a few minutes."],
      ["Pay the fee", "It's $8.50 a year for a spayed or neutered dog, and more if not."],
      ["Put the tag on", "The tag comes by mail. Clip it to her collar."],
    ],
  },
};

const esc = (s) => S.ui.esc(String(s));
const fill = (s) => esc(s).replace(/\{partner\}/g, esc(S.cfg?.().partner || "your partner"));

S.openDetails = (st, { done, onToggle }) => {
  const d = S.DETAILS[st.id]; if (!d) return;
  const sheet = S.openSheet(`
    <button class="close sheet-x" data-close aria-label="Close">${S.ui.X}</button>
    <div class="dt-head"><div class="section-label">${esc(st.phaseName)}${st.dueLabel ? " · " + esc(st.dueLabel) : ""}</div>
      <h2>${esc(st.what)}</h2><p>${fill(d.why)}</p></div>
    <ol class="dt-steps">${d.steps.map(([t, b]) => `<li><b>${fill(t)}</b><span>${fill(b)}</span></li>`).join("")}</ol>
    ${d.tips?.length ? `<div class="card dt-tips"><div class="section-label">Good to know</div><ul>${d.tips.map((t) => `<li>${fill(t)}</li>`).join("")}</ul></div>` : ""}
    ${d.links?.length ? `<div class="btnrow">${d.links.map(([t, u]) => `<a class="btn" href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} ↗</a>`).join("")}</div>` : ""}
    ${st.auto ? "" : `<div class="btnrow"><button class="btn ${done ? "ghost" : "primary"}" id="dtDone">${done ? "Done ✓ · Undo" : "Mark as done"}</button></div>`}`, { label: st.what });
  sheet.querySelector("#dtDone")?.addEventListener("click", () => { S.closeSheet(); onToggle(!done); });
};
})();
