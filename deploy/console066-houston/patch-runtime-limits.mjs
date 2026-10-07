import {readFile,writeFile} from 'node:fs/promises';
const file=process.argv[2]||'/houston/packages/host/src/launcher/process.ts';
let source=await readFile(file,'utf8');
const replace=(before,after)=>{if(!source.includes(before))throw new Error('Houston revision does not match the reviewed runtime patch');source=source.replace(before,after);};
replace('private closed = false;',`private closed = false;
  private readonly lastTouch = new Map<AgentId, number>();
  private idleSweepBusy = false;
  private readonly warmLimit = Math.max(1, Number(process.env.HOUSTON_MAX_WARM_RUNTIMES || 3));

  private async sweepIdle(): Promise<void> {
    if (this.closed || this.idleSweepBusy) return;
    this.idleSweepBusy = true;
    try {
      for (const [id, r] of this.running) {
        const touched = this.lastTouch.get(id) || 0;
        if (id.endsWith('/.setup/connect') || this.booting.has(id) || r.draining || Date.now() - touched < 15000) continue;
        try {
          const response = await fetch('http://127.0.0.1:' + r.handle.port + '/busy', {signal: AbortSignal.timeout(2000)});
          if (!response.ok) continue;
          const state = await response.json() as {busy?: boolean; loginPending?: boolean};
          // Unknown, working and pending-login runtimes stay alive. A new
          // request changes lastTouch before it can start a turn.
          if (state.busy === false && state.loginPending === false && this.lastTouch.get(id) === touched && !this.closed) await this.sleep(id);
        } catch { /* A failed probe never kills a potentially working agent. */ }
      }
    } finally { this.idleSweepBusy = false; }
  }`);
replace('this.allocatePort = opts.allocatePort ?? osAllocatePort;',`const idleTimer = setInterval(() => { void this.sweepIdle(); }, 5000);
    idleTimer.unref();
    this.allocatePort = opts.allocatePort ?? osAllocatePort;`);
replace('if (this.held.has(agent.id)) throw new AgentRenamingError(agent.id);',`if (this.held.has(agent.id)) throw new AgentRenamingError(agent.id);
    this.lastTouch.set(agent.id, Date.now());`);
replace('const boot = spawnUntilHealthy(',`if (this.running.size >= this.warmLimit) throw new Error('Runtime capacity temporarily busy; retry after idle agents sleep');
    const boot = spawnUntilHealthy(`);
await writeFile(file,source);
