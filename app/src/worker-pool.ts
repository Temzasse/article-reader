import * as Comlink from "comlink";

type WorkerApi = typeof import("./worker.js");

type Task<T> = {
  fn: (worker: Comlink.Remote<WorkerApi>) => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
};

export class WorkerPool {
  private workers: Comlink.Remote<WorkerApi>[] = [];
  private queue: Task<any>[] = [];
  private busy: boolean[] = [];

  constructor(private size: number) {
    this.init();
  }

  private async init() {
    for (let i = 0; i < this.size; i++) {
      const worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
      const wrapped = Comlink.wrap<WorkerApi>(worker);
      this.workers.push(wrapped);
      this.busy.push(false);
    }
  }

  private async runNext() {
    const idleIndex = this.busy.findIndex((b) => !b);
    if (idleIndex === -1 || this.queue.length === 0) return;

    const task = this.queue.shift();
    if (!task) return;

    this.busy[idleIndex] = true;
    const worker = this.workers[idleIndex];

    try {
      const result = await task.fn(worker);
      task.resolve(result);
    } catch (err) {
      task.reject(err);
    } finally {
      this.busy[idleIndex] = false;
      this.runNext(); // Process the next task
    }
  }

  public exec<T>(
    fn: (worker: Comlink.Remote<WorkerApi>) => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.runNext();
    });
  }
}
