export type Context = {
  data: Record<string, any>;
  traceId: string;
  date: Date;
};

export type ActionHandler<REQUEST = any, RESPONSE = any> = (ctx: Context, request: REQUEST) => Promise<RESPONSE>;

export type Decorator = { name: string; data: any };

export type FuncMetadata = {
  /** Component name: the return type annotation, exactly as written. */
  name: string;
  /** Parameter type annotations, in parameter order. */
  dependencies: string[];
  mainDecorator: Decorator;
  additionalDecorators: Decorator[];
};

export type WrapperHandler = (actionHandler: ActionHandler, functionMetadata: FuncMetadata) => ActionHandler;

/** What the scan leaves out when `SkeletoOptions.exclude` is not given. */
export const DEFAULT_EXCLUDE: readonly string[] = Object.freeze(["node_modules", "*.d.ts", "*.test.ts", "*.spec.ts"]);

export type SkeletoOptions = {
  decorators?: string[];
  /** Replaces `DEFAULT_EXCLUDE`. An entry is a folder or file name at any depth, or `*` followed by the ending of file names. */
  exclude?: readonly string[];
};

export class FuncInstanceMetadata {
  private readonly instance: any;
  private readonly metadata: FuncMetadata;

  constructor(instance: any, metadata: FuncMetadata) {
    this.instance = instance;
    this.metadata = metadata;
  }

  getInstance(): any {
    return this.instance;
  }

  getMetadata(): FuncMetadata {
    return this.metadata;
  }
}

export function newContext(): Context {
  return { data: {}, traceId: "", date: new Date() };
}
