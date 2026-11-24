// Code audit, Phase 2 (D1054): the Vite plugin's virtual modules (tools/touch/pieces-split.ts).
declare module "virtual:pieces-stub" {
  const stubs: unknown;
  export default stubs;
}
declare module "virtual:pieces-loaders" {
  const loaders: Record<string, () => Promise<unknown>>;
  export default loaders;
}
