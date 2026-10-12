const {studioWorkbenchView}=await import('/public/centro-066/studio-workbench.js');
window.__studioHarness={messages:[],stop:null};
window.__studioHarness.stop=studioWorkbenchView(document.querySelector('#studio-mount'),message=>window.__studioHarness.messages.push(message));
