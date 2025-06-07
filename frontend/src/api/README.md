ts api is pretty simple, 
to put it shortly, its gurting
first, server.ts starts & uses serverWs.ts to connect to providers, serverProvider.ts runs on some llm provider, then it causes it to connect to server.ts
Anyone running ai.sharesyllabus.me will be able to connect to server.ts, and that will facilitate connection to the llm provider
ai.sharesyllabus.me website <-> server.ts <-> serverWs.ts <-> serverProvider.ts