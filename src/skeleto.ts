import type { FuncInstanceMetadata, SkeletoOptions } from "./type.js";

// Placeholder: it fixes the public shape so other modules can compile against it. The startup ticket replaces the body.
export class Skeleto {
  private readonly container = new Map<string, FuncInstanceMetadata>();

  static async start(directory: string = "src", options?: SkeletoOptions): Promise<Skeleto> {
    void options;
    throw new Error(`Skeleto.start("${directory}") is not implemented`);
  }

  getContainer(): Map<string, FuncInstanceMetadata> {
    return this.container;
  }
}
