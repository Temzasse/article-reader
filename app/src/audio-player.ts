export class AudioStreamPlayer {
  private context: AudioContext | null = null;
  private queue: AudioBuffer[] = [];
  private isPlaying = false;
  private lastEndTime = 0;
  private sources: AudioBufferSourceNode[] = [];

  constructor() {
    this.init();
  }

  private init() {
    if (!this.context) {
      this.context = new AudioContext();
    }
  }

  async enqueue(blob: Blob) {
    if (!this.context) return;

    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
    this.queue.push(audioBuffer);

    // Auto-start playback if this is the first blob
    if (!this.isPlaying) {
      this.play();
    }
  }

  play() {
    if (!this.context) return;

    if (this.context.state === "suspended") {
      this.context.resume();
    }

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.playNext();
    }
  }

  stop() {
    if (!this.context) return;

    this.sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Ignore errors if the source is already stopped
      }
    });

    this.sources = [];
    this.queue = [];
    this.lastEndTime = 0;
    this.isPlaying = false;
  }

  private playNext() {
    if (!this.context || this.queue.length === 0) return;

    const buffer = this.queue.shift();
    if (!buffer) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);

    const startTime = Math.max(this.context.currentTime, this.lastEndTime);
    source.start(startTime);
    this.lastEndTime = startTime + buffer.duration;

    this.sources.push(source);

    source.onended = () => {
      this.sources = this.sources.filter((s) => s !== source);
      if (this.queue.length > 0) {
        this.playNext();
      } else {
        this.isPlaying = false;
      }
    };
  }
}

export const audioPlayer = new AudioStreamPlayer();